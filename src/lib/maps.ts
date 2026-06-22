/**
 * Google Maps platform config (shared with the customer app).
 *
 * For the reverse-geocoding web service to work, in the Google Cloud console for
 * this key you must:
 *   1. Enable the "Geocoding API".
 *   2. Allow it under the key's API restrictions.
 * App-restricted keys do NOT apply to web-service calls — use an unrestricted
 * (or HTTP-referrer / IP-restricted) key for browser geocoding.
 *
 * Override per-environment with NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
 */
export const GOOGLE_MAPS_API_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ??
  "AIzaSyCE-dq7dKVVh-4rCiVxNGI2eUXdC3-pIhg";
