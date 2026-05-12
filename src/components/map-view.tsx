"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { Place } from "@/lib/types";

type Props = {
  places: Place[];
};

export default function MapView({ places }: Props) {
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

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const bounds = new maplibregl.LngLatBounds();
    let hasBounds = false;

    places.forEach((place) => {
      if (place.longitude == null || place.latitude == null) return;

      const popup = new maplibregl.Popup({ offset: 25 }).setHTML(
        `<strong>${place.name}</strong><br/>${place.district ?? ""}`
      );

      const marker = new maplibregl.Marker({ color: "#0f172a" })
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
  }, [places]);

  return <div ref={containerRef} className="h-[70vh] w-full rounded-2xl border border-slate-200" />;
}
