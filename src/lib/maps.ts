/**
 * Google Maps platform config.
 *
 * This is the partner app's key (FE_partner AndroidManifest) — its Google
 * project actually serves: Geocoding API, legacy Places API (autocomplete +
 * details) and the Android Maps SDK (all verified live 2026-07-05). The old
 * key shared with the customer app (AIzaSyCE-dq…) has NO Maps APIs enabled
 * and every call with it is rejected.
 *
 * Override per-environment with NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
 */
export const GOOGLE_MAPS_API_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ??
  "AIzaSyDSnnf9q7vfPc9ROItgYNFkWSuBoOF2x6Q";
