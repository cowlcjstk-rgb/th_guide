"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { buildCategoryColorMap } from "@/lib/map-categories";
import { Place } from "@/lib/types";

type Props = {
  places: Place[];
  allPlaces?: Place[];
  selectedIds: string[];
  routeMode?: "driving" | "walking";
  onRouteSummaryChange?: (summary: {
    mode: "driving" | "walking";
    distanceM: number;
    durationS: number;
    isFallback: boolean;
  } | null) => void;
  onPlaceInspect?: (placeId: string) => void;
  onViewportPlaceIdsChange?: (placeIds: string[]) => void;
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

type ValidPoint = { lng: number; lat: number };

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getValidPoint(place: Place): ValidPoint | null {
  const lng = Number(place.longitude);
  const lat = Number(place.latitude);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return null;
  return { lng, lat };
}

function buildCategoryColorExpression(categories: string[]) {
  const categoryMap = buildCategoryColorMap(categories);
  const expression: unknown[] = ["match", ["coalesce", ["get", "category"], "General"]];
  categories.forEach((category) => {
    expression.push(category, categoryMap.get(category) ?? "#334155");
  });
  expression.push("#334155");
  return expression;
}

export default function MapView({
  places,
  allPlaces,
  selectedIds,
  routeMode = "driving",
  onRouteSummaryChange,
  onPlaceInspect,
  onViewportPlaceIdsChange,
  onViewportBoundsChange,
  serverClusters = [],
  useServerClusters = false,
}: Props) {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const selectedMarkersRef = useRef<maplibregl.Marker[]>([]);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const onPlaceInspectRef = useRef(onPlaceInspect);
  const onRouteSummaryChangeRef = useRef(onRouteSummaryChange);
  const onViewportPlaceIdsChangeRef = useRef(onViewportPlaceIdsChange);
  const onViewportBoundsChangeRef = useRef(onViewportBoundsChange);
  const placesRef = useRef(places);
  const didInitialFitRef = useRef(false);
  const lastRouteFitKeyRef = useRef<string>("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    onPlaceInspectRef.current = onPlaceInspect;
  }, [onPlaceInspect]);

  useEffect(() => {
    onRouteSummaryChangeRef.current = onRouteSummaryChange;
  }, [onRouteSummaryChange]);

  useEffect(() => {
    onViewportPlaceIdsChangeRef.current = onViewportPlaceIdsChange;
  }, [onViewportPlaceIdsChange]);

  useEffect(() => {
    onViewportBoundsChangeRef.current = onViewportBoundsChange;
  }, [onViewportBoundsChange]);

  useEffect(() => {
    placesRef.current = places;
  }, [places]);

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
      const coords = (features[0]?.geometry as GeoJSON.Point | undefined)?.coordinates as [number, number] | undefined;
      if (clusterId == null) {
        if (coords) map.easeTo({ center: coords, zoom: Math.min(map.getZoom() + 2, 15) });
        return;
      }
      const source = map.getSource(CLUSTER_SOURCE_ID) as maplibregl.GeoJSONSource & {
        getClusterExpansionZoom: (clusterId: number, cb: (err: unknown, zoom: number) => void) => void;
      };
      if (!source) return;
      source.getClusterExpansionZoom(clusterId, (_err, zoom) => {
        if (!coords) return;
        map.easeTo({ center: coords, zoom });
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

    map.on("click", UNCLUSTER_LAYER_ID, (e) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const point = feature.geometry as GeoJSON.Point;
      const props = (feature.properties ?? {}) as Record<string, string>;
      const lngLat = [Number(point.coordinates[0]), Number(point.coordinates[1])] as [number, number];
      const mapUrl = props.google_map_url || "";
      const detailUrl = props.slug ? `/place/${props.slug}` : "#";

      const html = `
        <div style="min-width:220px;">
          <div style="font-weight:700; font-size:14px;">${escapeHtml(props.name ?? "Place")}</div>
          <div style="margin-top:4px; color:#475569; font-size:12px;">${escapeHtml(props.category || "General")} · ${escapeHtml(props.district || "Unknown")}</div>
          ${props.address ? `<div style="margin-top:6px; color:#64748b; font-size:12px;">${escapeHtml(props.address)}</div>` : ""}
          <div style="margin-top:10px; display:flex; gap:6px; flex-wrap:wrap;">
            <a href="${detailUrl}" style="border:1px solid #cbd5e1;border-radius:8px;padding:5px 8px;font-size:12px;color:#0f172a;text-decoration:none;">상세 보기</a>
            ${mapUrl ? `<a href="${mapUrl}" target="_blank" rel="noreferrer" style="border:1px solid #cbd5e1;border-radius:8px;padding:5px 8px;font-size:12px;color:#0f172a;text-decoration:none;">구글맵</a>` : ""}
          </div>
        </div>
      `;

      popupRef.current?.remove();
      popupRef.current = new maplibregl.Popup({ offset: 10 }).setLngLat(lngLat).setHTML(html).addTo(map);

      if (props.id) onPlaceInspectRef.current?.(props.id);
    });

    map.on("moveend", () => {
      const bounds = map.getBounds();
      const visibleIds = placesRef.current
        .map((place) => {
          const point = getValidPoint(place);
          if (!point) return null;
          return bounds.contains([point.lng, point.lat]) ? place.id : null;
        })
        .filter((id): id is string => Boolean(id));
      onViewportPlaceIdsChangeRef.current?.(visibleIds);
      onViewportBoundsChangeRef.current?.({
        minLng: bounds.getWest(),
        minLat: bounds.getSouth(),
        maxLng: bounds.getEast(),
        maxLat: bounds.getNorth(),
        zoom: map.getZoom(),
      });
    });

    return () => {
      popupRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const renderPlaces = async () => {
      const zoom = map.getZoom();
      const useServerClusterPoints = useServerClusters && serverClusters.length > 0 && zoom <= 10.8;

      const geojson: GeoJSON.FeatureCollection<GeoJSON.Point> = useServerClusterPoints
        ? {
            type: "FeatureCollection",
            features: serverClusters
              .map((cluster, idx) => {
                const lng = Number(cluster.longitude);
                const lat = Number(cluster.latitude);
                if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
                return {
                  type: "Feature",
                  geometry: {
                    type: "Point",
                    coordinates: [lng, lat],
                  },
                  properties: {
                    id: `server-cluster-${idx}`,
                    point_count: cluster.count,
                    point_count_abbreviated: String(cluster.count),
                    name: "Cluster",
                    district: cluster.city ?? "",
                    category: cluster.category ?? "General",
                  },
                } as GeoJSON.Feature<GeoJSON.Point>;
              })
              .filter((feature): feature is GeoJSON.Feature<GeoJSON.Point> => Boolean(feature)),
          }
        : {
            type: "FeatureCollection",
            features: places
              .map((p) => {
                const point = getValidPoint(p);
                if (!point) return null;
                return {
                  type: "Feature",
                  geometry: {
                    type: "Point",
                    coordinates: [point.lng, point.lat],
                  },
                  properties: {
                    id: p.id,
                    name: p.name,
                    slug: p.slug,
                    district: p.district ?? "",
                    category: p.category ?? "",
                    address: p.address ?? "",
                    google_map_url: p.google_map_url ?? "",
                  },
                } as GeoJSON.Feature<GeoJSON.Point>;
              })
              .filter((feature): feature is GeoJSON.Feature<GeoJSON.Point> => Boolean(feature)),
          };

      const categories = Array.from(
        new Set(
          geojson.features
            .map((feature) => (feature.properties?.category || "General").trim())
            .filter(Boolean)
        )
      );
      const categoryColorExpression = buildCategoryColorExpression(categories);

      if (map.getLayer(CLUSTER_LAYER_ID)) map.removeLayer(CLUSTER_LAYER_ID);
      if (map.getLayer(CLUSTER_COUNT_LAYER_ID)) map.removeLayer(CLUSTER_COUNT_LAYER_ID);
      if (map.getLayer(UNCLUSTER_LAYER_ID)) map.removeLayer(UNCLUSTER_LAYER_ID);
      if (map.getSource(CLUSTER_SOURCE_ID)) map.removeSource(CLUSTER_SOURCE_ID);

      map.addSource(CLUSTER_SOURCE_ID, {
        type: "geojson",
        data: geojson,
        cluster: !useServerClusterPoints,
        clusterMaxZoom: 11,
        clusterRadius: 45,
      });

      map.addLayer({
        id: CLUSTER_LAYER_ID,
        type: "circle",
        source: CLUSTER_SOURCE_ID,
        ...(useServerClusterPoints ? {} : { filter: ["has", "point_count"] }),
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
        ...(useServerClusterPoints ? {} : { filter: ["has", "point_count"] }),
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["Open Sans Bold"],
          "text-size": 11,
        },
        paint: {
          "text-color": "#ffffff",
        },
      });

      if (!useServerClusterPoints) {
        map.addLayer({
          id: UNCLUSTER_LAYER_ID,
          type: "circle",
          source: CLUSTER_SOURCE_ID,
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": categoryColorExpression as unknown as string,
            "circle-radius": ["match", ["coalesce", ["get", "category"], "General"], "Rooftop", 6, "Bar", 6, 5],
            "circle-stroke-width": 1.5,
            "circle-stroke-color": "#ffffff",
          },
        });
      }

      selectedMarkersRef.current.forEach((m) => m.remove());
      selectedMarkersRef.current = [];

      const basePlaces = allPlaces ?? places;
      const selected = basePlaces
        .map((p) => {
          const point = getValidPoint(p);
          if (!point) return null;
          return { place: p, ...point };
        })
        .filter((item): item is { place: Place; lng: number; lat: number } => Boolean(item))
        .filter((item) => selectedIds.includes(item.place.id));

      selected.forEach((item) => {
        const order = selectedIds.indexOf(item.place.id) + 1;
        const el = document.createElement("div");
        el.className = "flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow";
        el.textContent = String(order);
        const popup = new maplibregl.Popup({ offset: 12 }).setHTML(
          `<strong>${item.place.name}</strong><br/>${item.place.district ?? ""}`
        );
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([item.lng, item.lat])
          .setPopup(popup)
          .addTo(map);
        selectedMarkersRef.current.push(marker);
      });

      if (map.getLayer(ROUTE_LAYER_ID)) map.removeLayer(ROUTE_LAYER_ID);
      if (map.getSource(ROUTE_SOURCE_ID)) map.removeSource(ROUTE_SOURCE_ID);

      if (selected.length >= 2) {
        const routeFitKey = selectedIds.join(",");
        let routeCoords: [number, number][] = selected.map((p) => [p.lng, p.lat]);
        let distanceM = 0;
        let durationS = 0;
        let isFallback = true;

        try {
          const osrm = await fetch("/api/routing/route", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mode: routeMode,
              points: selected.map((p) => ({ lng: p.lng, lat: p.lat })),
            }),
          });
          const data = (await osrm.json()) as {
            coordinates?: [number, number][];
            distance_m?: number;
            duration_s?: number;
          };
          if (osrm.ok && Array.isArray(data.coordinates) && data.coordinates.length > 1) {
            routeCoords = data.coordinates;
            distanceM = Number(data.distance_m ?? 0);
            durationS = Number(data.duration_s ?? 0);
            isFallback = false;
          }
        } catch {}

        if (isFallback) {
          let distance = 0;
          for (let i = 1; i < routeCoords.length; i += 1) {
            const [lng1, lat1] = routeCoords[i - 1];
            const [lng2, lat2] = routeCoords[i];
            const dx = (lng2 - lng1) * 111_320 * Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180));
            const dy = (lat2 - lat1) * 110_540;
            distance += Math.sqrt(dx * dx + dy * dy);
          }
          distanceM = Math.round(distance);
          durationS = Math.round(distanceM / (routeMode === "walking" ? 1.35 : 8.3));
        }
        onRouteSummaryChangeRef.current?.({
          mode: routeMode,
          distanceM,
          durationS,
          isFallback,
        });

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

        if (lastRouteFitKeyRef.current !== routeFitKey) {
          const selectedBounds = new maplibregl.LngLatBounds();
          selected.forEach((item) => selectedBounds.extend([item.lng, item.lat]));
          map.fitBounds(selectedBounds, { padding: 60, duration: 500, maxZoom: 14 });
          lastRouteFitKeyRef.current = routeFitKey;
        }
        return;
      }

      lastRouteFitKeyRef.current = "";
      onRouteSummaryChangeRef.current?.(null);

      if (geojson.features.length > 0 && !didInitialFitRef.current) {
        if (geojson.features.length === 1) {
          const only = geojson.features[0].geometry.coordinates as [number, number];
          map.easeTo({ center: only, zoom: 13, duration: 500 });
        } else {
          const bounds = new maplibregl.LngLatBounds();
          geojson.features.forEach((feature) => {
            bounds.extend(feature.geometry.coordinates as [number, number]);
          });
          map.fitBounds(bounds, { padding: 40, duration: 500, maxZoom: 12 });
        }
        didInitialFitRef.current = true;
      }
    };

    if (!map.isStyleLoaded()) {
      const onLoad = () => {
        void renderPlaces();
      };
      map.once("load", onLoad);
      return;
    }

    void renderPlaces();
  }, [places, allPlaces, selectedIds, routeMode, serverClusters, useServerClusters]);

  return <div ref={containerRef} className="h-[70vh] w-full rounded-2xl border border-slate-200" />;
}
