"use client";

import { useCallback, useEffect, useState } from "react";
import { GOOGLE_MAPS_API_KEY } from "@/src/lib/maps";

export interface LocationState {
  label: string;
  loading: boolean;
  error: string | null;
  coords: { lat: number; lng: number } | null;
}

// Versioned: bumped when the label format changed to full street-level
// addresses, so stale coarse "City, State" caches are ignored and re-detected.
const STORAGE_KEY = "rc.location.v2";

/**
 * Reverse-geocode lat/lng to a precise, full street-level address via the Google
 * Maps Geocoding API — the same source the customer app uses, so the result
 * matches what users expect. Returns null on any failure so the caller can fall
 * back.
 */
async function reverseGeocodeGoogle(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`,
    );
    const data = (await res.json()) as {
      status?: string;
      results?: Array<{ formatted_address?: string }>;
    };
    if (data.status !== "OK" || !data.results?.length) return null;
    return data.results[0].formatted_address || null;
  } catch {
    return null;
  }
}

/** OpenStreetMap (Nominatim) reverse geocoder — free, key-less. Returns the full
 *  street-level address (display_name) like Google Maps. */
async function reverseGeocodeOSM(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      display_name?: string;
      address?: {
        road?: string;
        suburb?: string;
        city?: string;
        town?: string;
        village?: string;
        county?: string;
        state?: string;
      };
    };
    if (data.display_name) return data.display_name;
    const a = data.address ?? {};
    const city = a.city || a.town || a.village || a.suburb || a.county || "";
    const parts = [a.road, city, a.state].filter(Boolean);
    return parts.length ? parts.join(", ") : null;
  } catch {
    return null;
  }
}

/** Resolve coordinates to a full, precise address: Google first, then OSM, then raw coords. */
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
