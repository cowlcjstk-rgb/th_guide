"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { Place } from "@/lib/types";

type Props = {
  places: Place[];
  selectedIds: string[];
};

export default function MapView({ places, selectedIds }: Props) {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const mapTilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;
    const styleUrl = mapTilerKey
      ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${mapTilerKey}`
      : "https://demotiles.maplibre.org/style.json";

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrl,
      center: [100.5018, 13.7563],
      zoom: 11,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.GeolocateControl({ trackUserLocation: true }), "top-right");
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const renderMapContent = () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      const bounds = new maplibregl.LngLatBounds();
      let hasBounds = false;

      places.forEach((place) => {
        if (place.longitude == null || place.latitude == null) return;
        const selectedIndex = selectedIds.indexOf(place.id);
        const selected = selectedIndex >= 0;
        const el = document.createElement("div");
        el.className =
          "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold " +
          (selected
            ? "border-slate-900 bg-slate-900 text-white"
            : "border-slate-300 bg-white text-slate-700");
        el.textContent = selected ? String(selectedIndex + 1) : "";

        const popup = new maplibregl.Popup({ offset: 25 }).setHTML(
          `<strong>${place.name}</strong><br/>${place.district ?? ""}`
        );

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([Number(place.longitude), Number(place.latitude)])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.push(marker);
        bounds.extend([Number(place.longitude), Number(place.latitude)]);
        hasBounds = true;
      });

      if (hasBounds) {
        map.fitBounds(bounds, { padding: 64, maxZoom: 13, duration: 500 });
      }

      const selected = places.filter(
        (p) => selectedIds.includes(p.id) && p.longitude != null && p.latitude != null
      );
      const lineId = "selected-route-line";
      const sourceId = "selected-route-source";

      if (map.getLayer(lineId)) map.removeLayer(lineId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);

      if (selected.length >= 2) {
        map.addSource(sourceId, {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: selected.map((p) => [Number(p.longitude), Number(p.latitude)]),
            },
            properties: {},
          },
        });

        map.addLayer({
          id: lineId,
          type: "line",
          source: sourceId,
          paint: {
            "line-color": "#0f172a",
            "line-width": 3,
            "line-opacity": 0.9,
          },
        });
      }
    };

    if (map.isStyleLoaded()) {
      renderMapContent();
      return;
    }

    map.once("load", renderMapContent);
  }, [places, selectedIds]);

  return <div ref={containerRef} className="h-[70vh] w-full rounded-2xl border border-slate-200" />;
}
