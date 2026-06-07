"use client";

import { useCallback, useEffect, useState } from "react";

export interface LocationState {
  label: string;
  loading: boolean;
  error: string | null;
  coords: { lat: number; lng: number } | null;
}

const STORAGE_KEY = "rc.location";

/** Reverse-geocode lat/lng to a short human label using a key-less public API. */
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
    );
    if (!res.ok) throw new Error("geocode failed");
    const data = (await res.json()) as {
      locality?: string;
      city?: string;
      principalSubdivision?: string;
    };
    const parts = [data.locality || data.city, data.principalSubdivision].filter(Boolean);
    if (parts.length) return parts.join(", ");
  } catch {
    /* fall through to coordinates */
  }
  return `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
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
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
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
