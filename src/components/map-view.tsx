"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { Place } from "@/lib/types";

type Props = {
  places: Place[];
  selectedIds: string[];
};

const CLUSTER_SOURCE_ID = "places-source";
const CLUSTER_LAYER_ID = "places-clusters";
const CLUSTER_COUNT_LAYER_ID = "places-cluster-count";
const UNCLUSTER_LAYER_ID = "places-unclustered";
const ROUTE_SOURCE_ID = "selected-route-source";
const ROUTE_LAYER_ID = "selected-route-line";

export default function MapView({ places, selectedIds }: Props) {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const selectedMarkersRef = useRef<maplibregl.Marker[]>([]);
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
      zoom: 6.3,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.GeolocateControl({ trackUserLocation: true }), "top-right");
    mapRef.current = map;

    map.on("click", CLUSTER_LAYER_ID, (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: [CLUSTER_LAYER_ID] });
      const clusterId = features[0]?.properties?.cluster_id;
      const source = map.getSource(CLUSTER_SOURCE_ID) as maplibregl.GeoJSONSource & {
        getClusterExpansionZoom: (clusterId: number, cb: (err: unknown, zoom: number) => void) => void;
      };
      if (!source || clusterId == null) return;
      source.getClusterExpansionZoom(clusterId, (_err, zoom) => {
        const coords = (features[0].geometry as GeoJSON.Point).coordinates as [number, number];
        map.easeTo({ center: coords, zoom });
      });
    });

    map.on("mouseenter", CLUSTER_LAYER_ID, () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", CLUSTER_LAYER_ID, () => {
      map.getCanvas().style.cursor = "";
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const renderPlaces = async () => {
      const geojson: GeoJSON.FeatureCollection<GeoJSON.Point> = {
        type: "FeatureCollection",
        features: places
          .filter((p) => p.longitude != null && p.latitude != null)
          .map((p) => ({
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [Number(p.longitude), Number(p.latitude)],
            },
            properties: {
              id: p.id,
              name: p.name,
              district: p.district ?? "",
              category: p.category ?? "",
            },
          })),
      };

      if (map.getLayer(CLUSTER_LAYER_ID)) map.removeLayer(CLUSTER_LAYER_ID);
      if (map.getLayer(CLUSTER_COUNT_LAYER_ID)) map.removeLayer(CLUSTER_COUNT_LAYER_ID);
      if (map.getLayer(UNCLUSTER_LAYER_ID)) map.removeLayer(UNCLUSTER_LAYER_ID);
      if (map.getSource(CLUSTER_SOURCE_ID)) map.removeSource(CLUSTER_SOURCE_ID);

      map.addSource(CLUSTER_SOURCE_ID, {
        type: "geojson",
        data: geojson,
        cluster: true,
        clusterMaxZoom: 11,
        clusterRadius: 45,
      });

      map.addLayer({
        id: CLUSTER_LAYER_ID,
        type: "circle",
        source: CLUSTER_SOURCE_ID,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#0f172a",
          "circle-radius": ["step", ["get", "point_count"], 14, 20, 17, 60, 20],
          "circle-opacity": 0.9,
        },
      });

      map.addLayer({
        id: CLUSTER_COUNT_LAYER_ID,
        type: "symbol",
        source: CLUSTER_SOURCE_ID,
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["Open Sans Bold"],
          "text-size": 11,
        },
        paint: {
          "text-color": "#ffffff",
        },
      });

      map.addLayer({
        id: UNCLUSTER_LAYER_ID,
        type: "circle",
        source: CLUSTER_SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "#334155",
          "circle-radius": 4,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#ffffff",
        },
      });

      selectedMarkersRef.current.forEach((m) => m.remove());
      selectedMarkersRef.current = [];

      const selected = places.filter(
        (p) => selectedIds.includes(p.id) && p.longitude != null && p.latitude != null
      );
      selected.forEach((place) => {
        const order = selectedIds.indexOf(place.id) + 1;
        const el = document.createElement("div");
        el.className = "flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow";
        el.textContent = String(order);
        const popup = new maplibregl.Popup({ offset: 12 }).setHTML(
          `<strong>${place.name}</strong><br/>${place.district ?? ""}`
        );
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([Number(place.longitude), Number(place.latitude)])
          .setPopup(popup)
          .addTo(map);
        selectedMarkersRef.current.push(marker);
      });

      if (map.getLayer(ROUTE_LAYER_ID)) map.removeLayer(ROUTE_LAYER_ID);
      if (map.getSource(ROUTE_SOURCE_ID)) map.removeSource(ROUTE_SOURCE_ID);

      if (selected.length >= 2) {
        const coords = selected.map((p) => `${Number(p.longitude)},${Number(p.latitude)}`).join(";");
        let routeCoords: [number, number][] = selected.map((p) => [Number(p.longitude), Number(p.latitude)]);

        try {
          const osrm = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`
          );
          const data = await osrm.json();
          const geometry = data?.routes?.[0]?.geometry?.coordinates;
          if (Array.isArray(geometry) && geometry.length > 1) {
            routeCoords = geometry;
          }
        } catch {}

        map.addSource(ROUTE_SOURCE_ID, {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: routeCoords,
            },
            properties: {},
          },
        });

        map.addLayer({
          id: ROUTE_LAYER_ID,
          type: "line",
          source: ROUTE_SOURCE_ID,
          paint: {
            "line-color": "#e11d48",
            "line-width": 4,
            "line-opacity": 0.9,
          },
        });
      }
    };

    if (map.isStyleLoaded()) {
      renderPlaces();
    } else {
      map.once("load", renderPlaces);
    }
  }, [places, selectedIds]);

  return <div ref={containerRef} className="h-[70vh] w-full rounded-2xl border border-slate-200" />;
}
