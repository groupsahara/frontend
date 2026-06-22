"use client";

import { useCallback, useEffect, useState } from "react";
import { GOOGLE_MAPS_API_KEY } from "@/src/lib/maps";

export interface LocationState {
  label: string;
  loading: boolean;
  error: string | null;
  coords: { lat: number; lng: number } | null;
}

const STORAGE_KEY = "rc.location";

/**
 * Reverse-geocode lat/lng to a precise street-level label via the Google Maps
 * Geocoding API — the same source the customer app uses, so the result matches
 * what users expect. Returns null on any failure so the caller can fall back.
 */
async function reverseGeocodeGoogle(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`,
    );
    const data = (await res.json()) as {
      status?: string;
      results?: Array<{
        formatted_address?: string;
        address_components?: Array<{ long_name: string; types: string[] }>;
      }>;
    };
    if (data.status !== "OK" || !data.results?.length) return null;

    const best = data.results[0];
    const comps = best.address_components ?? [];
    const pick = (type: string) =>
      comps.find((c) => c.types.includes(type))?.long_name ?? "";

    const city =
      pick("locality") ||
      pick("postal_town") ||
      pick("sublocality") ||
      pick("administrative_area_level_2");
    const state = pick("administrative_area_level_1");

    const parts = [city, state].filter(Boolean);
    if (parts.length) return parts.join(", ");
    if (best.formatted_address) return best.formatted_address;
    return null;
  } catch {
    return null;
  }
}

/** OpenStreetMap (Nominatim) reverse geocoder — free, key-less fallback. */
async function reverseGeocodeOSM(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      address?: {
        city?: string;
        town?: string;
        village?: string;
        suburb?: string;
        county?: string;
        state?: string;
      };
    };
    const a = data.address ?? {};
    const city = a.city || a.town || a.village || a.suburb || a.county || "";
    const parts = [city, a.state].filter(Boolean);
    if (parts.length) return parts.join(", ");
    return null;
  } catch {
    return null;
  }
}

/** Resolve coordinates to a short human label: Google first, then OSM, then raw coords. */
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  return (
    (await reverseGeocodeGoogle(lat, lng)) ??
    (await reverseGeocodeOSM(lat, lng)) ??
    `${lat.toFixed(3)}, ${lng.toFixed(3)}`
  );
}

/**
 * Detects the user's current location via the browser Geolocation API and
 * resolves it to a readable label. Persists the last result in localStorage so
 * the header doesn't flash on every navigation.
 */
function readCachedLocation(): LocationState | null {
  if (typeof window === "undefined") return null;
  try {
    const cached = window.localStorage.getItem(STORAGE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached) as {
      label: string;
      coords: { lat: number; lng: number };
    };
    return { label: parsed.label, loading: false, error: null, coords: parsed.coords };
  } catch {
    return null;
  }
}

export function useCurrentLocation() {
  const [state, setState] = useState<LocationState>({
    label: "Detecting location…",
    loading: true,
    error: null,
    coords: null,
  });

  const detect = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({
        label: "Set location",
        loading: false,
        error: "Geolocation not supported",
        coords: null,
      });
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const label = await reverseGeocode(coords.lat, coords.lng);
        const next = { label, loading: false, error: null, coords };
        setState(next);
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ label, coords }));
        } catch {
          /* ignore quota/availability errors */
        }
      },
      (err) => {
        setState({
          label: "Set location",
          loading: false,
          error: err.message,
          coords: null,
        });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }, []);

  useEffect(() => {
    // Hydrate from the cached label if present (avoids a flash on navigation),
    // otherwise detect the current location. The cache read is deferred to a
    // microtask so we never call setState synchronously inside the effect body.
    const cached = readCachedLocation();
    queueMicrotask(() => {
      if (cached) setState(cached);
      else detect();
    });
  }, [detect]);

  return { ...state, detect };
}
