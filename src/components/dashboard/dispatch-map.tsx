"use client";

/**
 * Leaflet maps for the dispatcher section, on OpenStreetMap tiles — no API
 * key required (deliberately not Google Maps: the existing key lacks the
 * Maps JavaScript API and would render an error page).
 *
 * Leaflet touches `window` at module scope, so it is imported dynamically
 * inside effects; only its types are imported statically.
 */
import { useEffect, useRef } from "react";
import type * as Leaflet from "leaflet";
import type { LatLng } from "@/src/api/api";
import "leaflet/dist/leaflet.css";

/** Fallback view when there is nothing to fit yet (New Delhi). */
const DEFAULT_CENTER: [number, number] = [28.6139, 77.209];
const DEFAULT_ZOOM = 11;

const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export interface FenceOverlay {
  name: string;
  color: string;
  polygon: LatLng[];
}

type LeafletModule = typeof Leaflet;

/** Ref that always holds the latest value — for handlers wired up once. */
function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}

/** Create the map once and keep it alive across re-renders / StrictMode. */
function useLeafletMap(onReady?: (L: LeafletModule, map: Leaflet.Map) => void) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const moduleRef = useRef<LeafletModule | null>(null);
  const onReadyRef = useLatest(onReady);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default as unknown as LeafletModule;
      if (cancelled || !containerRef.current || mapRef.current) return;
      const map = L.map(containerRef.current, { zoomControl: true }).setView(
        DEFAULT_CENTER,
        DEFAULT_ZOOM,
      );
      L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);
      moduleRef.current = L;
      mapRef.current = map;
      onReadyRef.current?.(L, map);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [onReadyRef]);

  return { containerRef, mapRef, moduleRef };
}

function vertexIcon(L: LeafletModule, color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;border-radius:9999px;background:#fff;border:3px solid ${color};box-shadow:0 1px 3px rgba(0,0,0,.4)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function pinIcon(L: LeafletModule, color: string) {
  return L.divIcon({
    className: "",
    html: `<svg width="30" height="30" viewBox="0 0 24 24" fill="${color}" stroke="#fff" stroke-width="1.5"><path d="M12 22c-4.5-4-8-7.7-8-11.5a8 8 0 1 1 16 0C20 14.3 16.5 18 12 22Z"/><circle cx="12" cy="10" r="3" fill="#fff" stroke="none"/></svg>`,
    iconSize: [30, 30],
    iconAnchor: [15, 28],
  });
}

/**
 * Polygon editor: click the map to add a vertex, drag a vertex to move it,
 * right-click a vertex to remove it. Existing zones render read-only for
 * context.
 */
export function GeofenceMapEditor({
  polygon,
  onChange,
  color,
  otherFences = [],
  className = "h-full min-h-105",
}: {
  polygon: LatLng[];
  onChange: (polygon: LatLng[]) => void;
  color: string;
  otherFences?: FenceOverlay[];
  className?: string;
}) {
  const editLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const contextLayerRef = useRef<Leaflet.LayerGroup | null>(null);
  const didFitRef = useRef(false);

  // Latest state for handlers created once (map click) or per-draw (markers).
  const polygonRef = useLatest(polygon);
  const onChangeRef = useLatest(onChange);
  const colorRef = useLatest(color);
  const otherFencesRef = useLatest(otherFences);

  const { containerRef, mapRef, moduleRef } = useLeafletMap((L, map) => {
    contextLayerRef.current = L.layerGroup().addTo(map);
    editLayerRef.current = L.layerGroup().addTo(map);
    map.on("click", (e: Leaflet.LeafletMouseEvent) => {
      onChangeRef.current([
        ...polygonRef.current,
        { lat: +e.latlng.lat.toFixed(6), lng: +e.latlng.lng.toFixed(6) },
      ]);
    });
    drawContext(L);
    drawEditable(L);
    // Initial view: fit whatever exists (the zone being edited wins).
    const fit =
      polygonRef.current.length >= 2
        ? polygonRef.current
        : otherFencesRef.current.flatMap((f) => f.polygon);
    if (fit.length >= 2) {
      map.fitBounds(L.latLngBounds(fit.map((p) => [p.lat, p.lng])), { padding: [40, 40] });
      didFitRef.current = true;
    }
  });

  function drawContext(L: LeafletModule) {
    const layer = contextLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    for (const fence of otherFencesRef.current) {
      if (fence.polygon.length < 3) continue;
      L.polygon(
        fence.polygon.map((p) => [p.lat, p.lng]),
        { color: fence.color, weight: 1.5, fillOpacity: 0.08, dashArray: "4 4" },
      )
        .bindTooltip(fence.name, { sticky: true })
        .addTo(layer);
    }
  }

  function drawEditable(L: LeafletModule) {
    const layer = editLayerRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;
    layer.clearLayers();
    const points = polygonRef.current;
    const c = colorRef.current;

    if (points.length >= 2) {
      const shape =
        points.length >= 3
          ? L.polygon(
              points.map((p) => [p.lat, p.lng]),
              { color: c, weight: 2.5, fillColor: c, fillOpacity: 0.18 },
            )
          : L.polyline(
              points.map((p) => [p.lat, p.lng]),
              { color: c, weight: 2.5, dashArray: "6 6" },
            );
      shape.addTo(layer);
    }

    points.forEach((point, index) => {
      const marker = L.marker([point.lat, point.lng], {
        icon: vertexIcon(L, c),
        draggable: true,
      }).addTo(layer);
      marker.on("dragend", () => {
        const { lat, lng } = marker.getLatLng();
        const next = [...polygonRef.current];
        next[index] = { lat: +lat.toFixed(6), lng: +lng.toFixed(6) };
        onChangeRef.current(next);
      });
      marker.on("contextmenu", () => {
        onChangeRef.current(polygonRef.current.filter((_, i) => i !== index));
      });
    });
  }

  // Redraw when the polygon / colour / context zones change.
  useEffect(() => {
    const L = moduleRef.current;
    if (!L || !mapRef.current) return;
    drawEditable(L);
    drawContext(L);
    if (!didFitRef.current && polygon.length >= 3) {
      mapRef.current.fitBounds(
        L.latLngBounds(polygon.map((p) => [p.lat, p.lng])),
        { padding: [40, 40] },
      );
      didFitRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polygon, color, otherFences]);

  return <div ref={containerRef} className={`w-full rounded-2xl ${className}`} />;
}

/** Read-only overview map showing every zone (geofence list page). */
export function GeofenceOverviewMap({
  fences,
  className = "h-72",
}: {
  fences: FenceOverlay[];
  className?: string;
}) {
  const layerRef = useRef<Leaflet.LayerGroup | null>(null);
  const fencesRef = useLatest(fences);

  const { containerRef, mapRef, moduleRef } = useLeafletMap((L, map) => {
    layerRef.current = L.layerGroup().addTo(map);
    draw(L, map);
  });

  function draw(L: LeafletModule, map: Leaflet.Map) {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    const all: LatLng[] = [];
    for (const fence of fencesRef.current) {
      if (fence.polygon.length < 3) continue;
      all.push(...fence.polygon);
      L.polygon(
        fence.polygon.map((p) => [p.lat, p.lng]),
        { color: fence.color, weight: 2, fillColor: fence.color, fillOpacity: 0.15 },
      )
        .bindTooltip(fence.name, { sticky: true })
        .addTo(layer);
    }
    if (all.length >= 2) {
      map.fitBounds(L.latLngBounds(all.map((p) => [p.lat, p.lng])), { padding: [30, 30] });
    }
  }

  useEffect(() => {
    const L = moduleRef.current;
    const map = mapRef.current;
    if (L && map) draw(L, map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fences]);

  return <div ref={containerRef} className={`w-full rounded-2xl ${className}`} />;
}

/** Click-to-place location picker (warehouse position). */
export function LocationPickerMap({
  value,
  onChange,
  color = "#6366f1",
  className = "h-64",
}: {
  value: LatLng | null;
  onChange: (point: LatLng) => void;
  color?: string;
  className?: string;
}) {
  const markerRef = useRef<Leaflet.Marker | null>(null);
  const valueRef = useLatest(value);
  const onChangeRef = useLatest(onChange);

  const { containerRef, mapRef, moduleRef } = useLeafletMap((L, map) => {
    map.on("click", (e: Leaflet.LeafletMouseEvent) => {
      onChangeRef.current({ lat: +e.latlng.lat.toFixed(6), lng: +e.latlng.lng.toFixed(6) });
    });
    if (valueRef.current) {
      map.setView([valueRef.current.lat, valueRef.current.lng], 13);
      placeMarker(L, map, valueRef.current);
    }
  });

  function placeMarker(L: LeafletModule, map: Leaflet.Map, point: LatLng) {
    if (markerRef.current) {
      markerRef.current.setLatLng([point.lat, point.lng]);
      return;
    }
    const marker = L.marker([point.lat, point.lng], {
      icon: pinIcon(L, color),
      draggable: true,
    }).addTo(map);
    marker.on("dragend", () => {
      const { lat, lng } = marker.getLatLng();
      onChangeRef.current({ lat: +lat.toFixed(6), lng: +lng.toFixed(6) });
    });
    markerRef.current = marker;
  }

  useEffect(() => {
    const L = moduleRef.current;
    const map = mapRef.current;
    if (!L || !map || !value) return;
    placeMarker(L, map, value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <div ref={containerRef} className={`w-full rounded-2xl ${className}`} />;
}
