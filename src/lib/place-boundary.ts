"use client";

/**
 * Area-boundary lookup for the geofence editor: given a place picked from
 * Google Places autocomplete, fetch its administrative boundary polygon from
 * OSM Nominatim. Google's Places/Geocoding APIs return only a point and a
 * rectangular viewport — the boundary highlight google.com/maps draws comes
 * from private data — so Nominatim (free, keyless, CORS-enabled) is the
 * standard source for the actual polygon.
 *
 * Volume is a couple of requests per place selection, well within
 * Nominatim's fair-use policy (max 1 req/s).
 */

export type BoundaryPoint = { lat: number; lng: number };
/** One closed ring (outer boundary or hole) of the area polygon. */
export type BoundaryRing = BoundaryPoint[];

interface NominatimResult {
  /** [south, north, west, east] as decimal-degree strings. */
  boundingbox?: [string, string, string, string];
  geojson?: { type: string; coordinates: unknown };
}

const ENDPOINT = "https://nominatim.openstreetmap.org/search";

async function search(query: string): Promise<NominatimResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    polygon_geojson: "1",
    // Simplify to ~5 m tolerance — faithful for small localities while still
    // trimming city/district boundaries from tens of thousands of vertices.
    polygon_threshold: "0.00005",
    limit: "5",
    countrycodes: "in", // same bias as the Places autocomplete
    email: "support@restocare.in", // contact requested by Nominatim's usage policy
  });
  const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Nominatim search failed: ${res.status}`);
  return (await res.json()) as NominatimResult[];
}

/** GeoJSON rings ([lng, lat] pairs) → LatLng rings, dropping degenerate ones. */
function polygonRings(coordinates: number[][][]): BoundaryRing[] {
  return coordinates
    .map((ring) => ring.map(([lng, lat]) => ({ lat, lng })))
    .filter((ring) => ring.length >= 3);
}

function toRings(geojson: NominatimResult["geojson"]): BoundaryRing[] {
  if (!geojson) return [];
  if (geojson.type === "Polygon") return polygonRings(geojson.coordinates as number[][][]);
  if (geojson.type === "MultiPolygon")
    return (geojson.coordinates as number[][][][]).flatMap(polygonRings);
  return [];
}

function boxContains(result: NominatimResult, p: BoundaryPoint): boolean {
  if (!result.boundingbox) return false;
  const [south, north, west, east] = result.boundingbox.map(Number);
  return p.lat >= south && p.lat <= north && p.lng >= west && p.lng <= east;
}

/**
 * Fetch the boundary rings for a searched place. `near` (the coordinates
 * Google resolved for the pick) guards against matching a same-named place
 * elsewhere. Returns null when no polygon boundary exists — businesses,
 * street addresses and POIs only have a point, exactly like on google.com/maps.
 */
export async function fetchPlaceBoundary(
  label: string,
  address: string,
  near: BoundaryPoint | null,
): Promise<BoundaryRing[] | null> {
  // Full "label, address" first; label alone as a fallback since Nominatim
  // sometimes rejects over-specified queries that Google autocompleted.
  const queries = [...new Set([address ? `${label}, ${address}` : label, label])];
  for (const [attempt, query] of queries.entries()) {
    const withPolygon = (await search(query)).filter(
      (r) => r.geojson?.type === "Polygon" || r.geojson?.type === "MultiPolygon",
    );
    const contained = near ? withPolygon.find((r) => boxContains(r, near)) : undefined;
    // The looser label-only query must agree with Google's coordinates when
    // we have them; the full query is trusted as-is.
    const best = contained ?? (attempt === 0 || !near ? withPolygon[0] : undefined);
    const rings = best ? toRings(best.geojson) : [];
    if (rings.length > 0) return rings;
  }
  return null;
}
