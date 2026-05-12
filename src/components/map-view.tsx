"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { Place } from "@/lib/types";

type Props = {
  places: Place[];
};

export default function MapView({ places }: Props) {
  const mapRef = useRef<maplibregl.Map | null>(null);
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

    places.forEach((place) => {
      if (place.longitude == null || place.latitude == null) return;

      const popup = new maplibregl.Popup({ offset: 25 }).setHTML(
        `<strong>${place.name}</strong><br/>${place.district ?? ""}`
      );

      new maplibregl.Marker()
        .setLngLat([Number(place.longitude), Number(place.latitude)])
        .setPopup(popup)
        .addTo(map);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [places]);

  return <div ref={containerRef} className="h-[65vh] w-full rounded-xl border border-slate-200" />;
}
