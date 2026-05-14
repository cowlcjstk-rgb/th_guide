"use client";

import { useEffect, useMemo, useRef } from "react";
import maplibregl from "maplibre-gl";
import { buildCategoryColorMap } from "@/lib/map-categories";
import { Place } from "@/lib/types";

type Props = {
  places: Place[];
  allPlaces?: Place[];
  selectedIds: string[];
  focusedPlaceId?: string | null;
  routeMode?: "driving" | "walking";
  onRouteSummaryChange?: (summary: {
    mode: "driving" | "walking";
    distanceM: number;
    durationS: number;
    isFallback: boolean;
  } | null) => void;
  onPlaceInspect?: (placeId: string) => void;
  onViewportBoundsChange?: (bounds: {
    minLng: number;
    minLat: number;
    maxLng: number;
    maxLat: number;
    zoom: number;
  }) => void;
  serverClusters?: Array<{
    count: number;
    latitude: number;
    longitude: number;
    category?: string;
    city?: string;
  }>;
  useServerClusters?: boolean;
};

const CLUSTER_SOURCE_ID = "places-source";
const CLUSTER_LAYER_ID = "places-clusters";
const CLUSTER_COUNT_LAYER_ID = "places-cluster-count";
const UNCLUSTER_LAYER_ID = "places-unclustered";
const ROUTE_SOURCE_ID = "selected-route-source";
const ROUTE_LAYER_ID = "selected-route-line";

function getPoint(place: Place) {
  const lng = Number(place.longitude);
  const lat = Number(place.latitude);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return null;
  return { lng, lat };
}

function buildCategoryColorExpression(categories: string[]) {
  const categoryMap = buildCategoryColorMap(categories);
  const expression: unknown[] = ["match", ["coalesce", ["get", "category"], "General"]];
  categories.forEach((category) => expression.push(category, categoryMap.get(category) ?? "#334155"));
  expression.push("#334155");
  return expression;
}

export default function MapView({
  places,
  allPlaces,
  selectedIds,
  focusedPlaceId = null,
  routeMode = "driving",
  onRouteSummaryChange,
  onPlaceInspect,
  onViewportBoundsChange,
  serverClusters = [],
  useServerClusters = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const selectedMarkersRef = useRef<maplibregl.Marker[]>([]);
  const lastRouteKeyRef = useRef("");
  const lastClusterModeRef = useRef<boolean | null>(null);
  const didInitialFitRef = useRef(false);
  const userInteractedRef = useRef(false);
  const onRouteSummaryChangeRef = useRef(onRouteSummaryChange);
  const onPlaceInspectRef = useRef(onPlaceInspect);
  const onViewportBoundsChangeRef = useRef(onViewportBoundsChange);

  useEffect(() => {
    onRouteSummaryChangeRef.current = onRouteSummaryChange;
  }, [onRouteSummaryChange]);
  useEffect(() => {
    onPlaceInspectRef.current = onPlaceInspect;
  }, [onPlaceInspect]);
  useEffect(() => {
    onViewportBoundsChangeRef.current = onViewportBoundsChange;
  }, [onViewportBoundsChange]);

  const geojson = useMemo(() => {
    const serverMode = useServerClusters && serverClusters.length > 0;
    if (serverMode) {
      return {
        type: "FeatureCollection",
        features: serverClusters
          .map((cluster, idx) => {
            const lng = Number(cluster.longitude);
            const lat = Number(cluster.latitude);
            if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
            return {
              type: "Feature",
              geometry: { type: "Point", coordinates: [lng, lat] },
              properties: {
                id: `cluster-${idx}`,
                point_count: cluster.count,
                point_count_abbreviated: String(cluster.count),
                category: cluster.category ?? "General",
                city: cluster.city ?? "",
              },
            } as GeoJSON.Feature<GeoJSON.Point>;
          })
          .filter((x): x is GeoJSON.Feature<GeoJSON.Point> => Boolean(x)),
      } satisfies GeoJSON.FeatureCollection<GeoJSON.Point>;
    }
    return {
      type: "FeatureCollection",
      features: places
        .map((place) => {
          const point = getPoint(place);
          if (!point) return null;
          return {
            type: "Feature",
            geometry: { type: "Point", coordinates: [point.lng, point.lat] },
            properties: {
              id: place.id,
              name: place.name,
              slug: place.slug,
              category: place.category ?? "General",
              address: place.address ?? "",
              city: place.city ?? "",
              google_map_url: place.google_map_url ?? "",
            },
          } as GeoJSON.Feature<GeoJSON.Point>;
        })
        .filter((x): x is GeoJSON.Feature<GeoJSON.Point> => Boolean(x)),
    } satisfies GeoJSON.FeatureCollection<GeoJSON.Point>;
  }, [places, serverClusters, useServerClusters]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/bright",
      center: [100.5018, 13.7563],
      zoom: 6.3,
      scrollZoom: true,
    });
    map.scrollZoom.enable();
    map.scrollZoom.setWheelZoomRate(1 / 450);

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.GeolocateControl({ trackUserLocation: true }), "top-right");

    const markInteracted = () => {
      userInteractedRef.current = true;
    };
    map.on("zoomstart", markInteracted);
    map.on("dragstart", markInteracted);

    map.on("moveend", () => {
      const b = map.getBounds();
      onViewportBoundsChangeRef.current?.({
        minLng: b.getWest(),
        minLat: b.getSouth(),
        maxLng: b.getEast(),
        maxLat: b.getNorth(),
        zoom: map.getZoom(),
      });
    });

    map.on("click", UNCLUSTER_LAYER_ID, (e) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const id = String((feature.properties ?? {}).id ?? "");
      if (id) onPlaceInspectRef.current?.(id);
    });

    map.on("click", CLUSTER_LAYER_ID, (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: [CLUSTER_LAYER_ID] });
      const clusterId = features[0]?.properties?.cluster_id;
      const coords = (features[0]?.geometry as GeoJSON.Point | undefined)?.coordinates as [number, number] | undefined;
      if (!coords) return;
      const source = map.getSource(CLUSTER_SOURCE_ID) as
        | (maplibregl.GeoJSONSource & {
            getClusterExpansionZoom?: (clusterId: number, cb: (err: unknown, zoom: number) => void) => void;
          })
        | undefined;
      if (!source || clusterId == null || typeof source.getClusterExpansionZoom !== "function") {
        map.easeTo({ center: coords, zoom: Math.min(map.getZoom() + 2, 12) });
        return;
      }
      source.getClusterExpansionZoom(clusterId, (_err, zoom) => {
        map.easeTo({ center: coords, zoom: Math.min(zoom, 14) });
      });
    });

    map.on("mouseenter", CLUSTER_LAYER_ID, () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", CLUSTER_LAYER_ID, () => {
      map.getCanvas().style.cursor = "";
    });

    map.on("mouseenter", UNCLUSTER_LAYER_ID, () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", UNCLUSTER_LAYER_ID, () => {
      map.getCanvas().style.cursor = "";
    });

    mapRef.current = map;
    return () => {
      selectedMarkersRef.current.forEach((m) => m.remove());
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!map.isStyleLoaded()) {
      const onLoad = () => map.resize();
      map.once("load", onLoad);
      return;
    }

    const useServerMode = useServerClusters && serverClusters.length > 0 && map.getZoom() <= 10.8;
    const modeChanged = lastClusterModeRef.current == null || lastClusterModeRef.current !== useServerMode;
    lastClusterModeRef.current = useServerMode;

    const source = map.getSource(CLUSTER_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (!source || modeChanged) {
      if (map.getLayer(CLUSTER_LAYER_ID)) map.removeLayer(CLUSTER_LAYER_ID);
      if (map.getLayer(CLUSTER_COUNT_LAYER_ID)) map.removeLayer(CLUSTER_COUNT_LAYER_ID);
      if (map.getLayer(UNCLUSTER_LAYER_ID)) map.removeLayer(UNCLUSTER_LAYER_ID);
      if (map.getSource(CLUSTER_SOURCE_ID)) map.removeSource(CLUSTER_SOURCE_ID);

      map.addSource(CLUSTER_SOURCE_ID, {
        type: "geojson",
        data: geojson,
        cluster: !useServerMode,
        clusterMaxZoom: 11,
        clusterRadius: 45,
      });

      map.addLayer({
        id: CLUSTER_LAYER_ID,
        type: "circle",
        source: CLUSTER_SOURCE_ID,
        ...(useServerMode ? {} : { filter: ["has", "point_count"] }),
        paint: {
          "circle-color": "#475569",
          "circle-radius": ["step", ["get", "point_count"], 12, 20, 14, 60, 17, 150, 20],
          "circle-opacity": 0.88,
        },
      });

      map.addLayer({
        id: CLUSTER_COUNT_LAYER_ID,
        type: "symbol",
        source: CLUSTER_SOURCE_ID,
        ...(useServerMode ? {} : { filter: ["has", "point_count"] }),
        layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["Open Sans Bold"], "text-size": 11 },
        paint: { "text-color": "#ffffff" },
      });

      if (!useServerMode) {
        const categories = Array.from(new Set(places.map((p) => (p.category ?? "General").trim())));
        map.addLayer({
          id: UNCLUSTER_LAYER_ID,
          type: "circle",
          source: CLUSTER_SOURCE_ID,
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": buildCategoryColorExpression(categories) as unknown as string,
            "circle-radius": ["match", ["coalesce", ["get", "category"], "General"], "Rooftop", 6, "Bar", 6, 5],
            "circle-stroke-width": 1.5,
            "circle-stroke-color": "#ffffff",
          },
        });
      }
    } else {
      source.setData(geojson);
      if (map.getLayer(UNCLUSTER_LAYER_ID)) {
        const categories = Array.from(new Set(places.map((p) => (p.category ?? "General").trim())));
        map.setPaintProperty(UNCLUSTER_LAYER_ID, "circle-color", buildCategoryColorExpression(categories));
      }
    }

    if (geojson.features.length > 0 && !didInitialFitRef.current && !userInteractedRef.current && !lastRouteKeyRef.current) {
      const bounds = new maplibregl.LngLatBounds();
      geojson.features.forEach((feature) => bounds.extend(feature.geometry.coordinates as [number, number]));
      map.fitBounds(bounds, { padding: 40, duration: 350, maxZoom: 12 });
      didInitialFitRef.current = true;
    }
  }, [geojson, places, serverClusters, useServerClusters]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusedPlaceId) return;
    const sourcePlaces = allPlaces ?? places;
    const target = sourcePlaces.find((place) => place.id === focusedPlaceId);
    if (!target) return;
    const point = getPoint(target);
    if (!point) return;

    map.easeTo({
      center: [point.lng, point.lat],
      zoom: Math.max(map.getZoom(), 12),
      duration: 350,
    });
  }, [focusedPlaceId, allPlaces, places]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    selectedMarkersRef.current.forEach((m) => m.remove());
    selectedMarkersRef.current = [];

    const basePlaces = allPlaces ?? places;
    const selected = basePlaces
      .map((place) => {
        const point = getPoint(place);
        if (!point) return null;
        return { place, ...point };
      })
      .filter((item): item is { place: Place; lng: number; lat: number } => Boolean(item))
      .filter((item) => selectedIds.includes(item.place.id));

    selected.forEach((item) => {
      const order = selectedIds.indexOf(item.place.id) + 1;
      const el = document.createElement("div");
      el.className =
        "flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow";
      el.textContent = String(order);
      const marker = new maplibregl.Marker({ element: el }).setLngLat([item.lng, item.lat]).addTo(map);
      selectedMarkersRef.current.push(marker);
    });

    const key = `${routeMode}:${selectedIds.join(",")}`;
    if (selected.length < 2) {
      if (map.getLayer(ROUTE_LAYER_ID)) map.removeLayer(ROUTE_LAYER_ID);
      if (map.getSource(ROUTE_SOURCE_ID)) map.removeSource(ROUTE_SOURCE_ID);
      lastRouteKeyRef.current = "";
      onRouteSummaryChangeRef.current?.(null);
      return;
    }

    const renderRoute = async () => {
      let coords: [number, number][] = selected.map((p) => [p.lng, p.lat]);
      let distanceM = 0;
      let durationS = 0;
      let isFallback = true;
      try {
        const res = await fetch("/api/routing/route", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: routeMode,
            points: selected.map((p) => ({ lng: p.lng, lat: p.lat })),
          }),
        });
        const data = (await res.json()) as {
          coordinates?: [number, number][];
          distance_m?: number;
          duration_s?: number;
        };
        if (res.ok && Array.isArray(data.coordinates) && data.coordinates.length > 1) {
          coords = data.coordinates;
          distanceM = Number(data.distance_m ?? 0);
          durationS = Number(data.duration_s ?? 0);
          isFallback = false;
        }
      } catch {}

      if (isFallback) {
        let distance = 0;
        for (let i = 1; i < coords.length; i += 1) {
          const [lng1, lat1] = coords[i - 1];
          const [lng2, lat2] = coords[i];
          const dx = (lng2 - lng1) * 111_320 * Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180));
          const dy = (lat2 - lat1) * 110_540;
          distance += Math.sqrt(dx * dx + dy * dy);
        }
        distanceM = Math.round(distance);
        durationS = Math.round(distanceM / (routeMode === "walking" ? 1.35 : 8.3));
      }

      onRouteSummaryChangeRef.current?.({ mode: routeMode, distanceM, durationS, isFallback });

      const source = map.getSource(ROUTE_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      const routeGeoJson = {
        type: "Feature",
        geometry: { type: "LineString", coordinates: coords },
        properties: {},
      } as GeoJSON.Feature<GeoJSON.LineString>;

      if (!source) {
        map.addSource(ROUTE_SOURCE_ID, { type: "geojson", data: routeGeoJson });
        map.addLayer({
          id: ROUTE_LAYER_ID,
          type: "line",
          source: ROUTE_SOURCE_ID,
          paint: { "line-color": "#e11d48", "line-width": 4, "line-opacity": 0.9 },
        });
      } else {
        source.setData(routeGeoJson);
      }

      if (lastRouteKeyRef.current !== key) {
        const bounds = new maplibregl.LngLatBounds();
        selected.forEach((item) => bounds.extend([item.lng, item.lat]));
        map.fitBounds(bounds, { padding: 60, duration: 350, maxZoom: 14 });
        lastRouteKeyRef.current = key;
      }
    };

    void renderRoute();
  }, [allPlaces, places, selectedIds, routeMode]);

  return <div ref={containerRef} className="h-[68vh] min-h-[420px] w-full rounded-2xl border border-slate-200 bg-slate-50" />;
}
