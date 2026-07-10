"use client";

/**
 * Leaflet maps for the dispatcher section (overview + warehouse picker), on
 * OpenStreetMap tiles — no API key required. The geofence polygon editor
 * lives in google-geofence-map.tsx on the Google Maps JS API instead.
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

function pinIcon(L: LeafletModule, color: string) {
  return L.divIcon({
    className: "",
    html: `<svg width="30" height="30" viewBox="0 0 24 24" fill="${color}" stroke="#fff" stroke-width="1.5"><path d="M12 22c-4.5-4-8-7.7-8-11.5a8 8 0 1 1 16 0C20 14.3 16.5 18 12 22Z"/><circle cx="12" cy="10" r="3" fill="#fff" stroke="none"/></svg>`,
    iconSize: [30, 30],
    iconAnchor: [15, 28],
  });
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

  return <div ref={containerRef} className={`isolate z-0 w-full rounded-2xl ${className}`} />;
}

const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );

export interface LivePartnerMapPoint {
  name: string;
  lat: number;
  lng: number;
  /** Marker colour — the zone's colour, or a neutral tone when unzoned. */
  color: string;
  zoneName: string | null;
  mobile: string | null;
}

/**
 * Live-ops map for the Teams page: draws every active zone polygon and drops a
 * pin for each currently-active partner at their last known location, coloured
 * by the zone they're inside. Hover shows the partner name; click shows details.
 */
export function LivePartnerMap({
  zones,
  partners,
  className = "h-96",
}: {
  zones: FenceOverlay[];
  partners: LivePartnerMapPoint[];
  className?: string;
}) {
  const layerRef = useRef<Leaflet.LayerGroup | null>(null);
  const zonesRef = useLatest(zones);
  const partnersRef = useLatest(partners);

  const { containerRef, mapRef, moduleRef } = useLeafletMap((L, map) => {
    layerRef.current = L.layerGroup().addTo(map);
    draw(L, map);
  });

  function draw(L: LeafletModule, map: Leaflet.Map) {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    const all: LatLng[] = [];

    for (const zone of zonesRef.current) {
      if (zone.polygon.length < 3) continue;
      all.push(...zone.polygon);
      L.polygon(
        zone.polygon.map((p) => [p.lat, p.lng]),
        { color: zone.color, weight: 2, fillColor: zone.color, fillOpacity: 0.08 },
      )
        .bindTooltip(escapeHtml(zone.name), { sticky: true })
        .addTo(layer);
    }

    for (const p of partnersRef.current) {
      all.push({ lat: p.lat, lng: p.lng });
      L.marker([p.lat, p.lng], { icon: pinIcon(L, p.color) })
        .bindTooltip(escapeHtml(p.name), { direction: "top", offset: [0, -22] })
        .bindPopup(
          `<strong>${escapeHtml(p.name)}</strong>` +
            (p.mobile ? `<br/>${escapeHtml(p.mobile)}` : "") +
            `<br/>${p.zoneName ? `Zone: ${escapeHtml(p.zoneName)}` : "Unzoned"}`,
        )
        .addTo(layer);
    }

    if (all.length >= 2) {
      map.fitBounds(L.latLngBounds(all.map((p) => [p.lat, p.lng])), { padding: [40, 40] });
    } else if (all.length === 1) {
      map.setView([all[0].lat, all[0].lng], 13);
    }
  }

  useEffect(() => {
    const L = moduleRef.current;
    const map = mapRef.current;
    if (L && map) draw(L, map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zones, partners]);

  return <div ref={containerRef} className={`isolate z-0 w-full rounded-2xl ${className}`} />;
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

  return <div ref={containerRef} className={`isolate z-0 w-full rounded-2xl ${className}`} />;
}
