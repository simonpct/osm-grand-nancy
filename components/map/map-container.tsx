"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, { Layer, Popup, Source, type MapRef, type ViewStateChangeEvent } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { GeoJSON } from "geojson";
import type { MapLayerMouseEvent } from "maplibre-gl";
import type { LayerCategory } from "@/lib/layers/categories";
import { layersConfig } from "@/lib/layers/config";
import { baseLayers, satelliteYears } from "@/lib/layers/base-layers";
import { layerUrl } from "@/lib/pbf/blob-url";
import { LayerPanel } from "./layer-panel";
import { BaseLayerSwitcher } from "./base-layer-switcher";
import { FeaturePopup, type PopupInfo } from "./feature-popup";
import { FunFacts } from "./fun-facts";

const NANCY_CENTER = { longitude: 6.1844, latitude: 48.6921 };
const EMPTY_COLLECTION: GeoJSON = { type: "FeatureCollection", features: [] };

const LS_BASE_LAYER = "infra-nancy:baseLayer";
const LS_SATELLITE_YEAR = "infra-nancy:satelliteYear";
const LS_VISIBLE_LAYERS = "infra-nancy:visibleLayers";
const LS_MAP_VIEW = "infra-nancy:mapView";

function readStoredString(key: string, fallback: string): string {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}

function readStoredStringOrNull(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function readStoredMapView(): { longitude: number; latitude: number; zoom: number } | null {
  try {
    const raw = localStorage.getItem(LS_MAP_VIEW);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function readStoredLayers(): LayerCategory[] {
  try {
    const raw = localStorage.getItem(LS_VISIBLE_LAYERS);
    return raw ? JSON.parse(raw) as LayerCategory[] : [];
  } catch { return []; }
}


export default function MapContainer() {
  const mapRef = useRef<MapRef>(null);
  const [visibleLayers, setVisibleLayers] = useState<Set<LayerCategory>>(
    () => new Set(readStoredLayers())
  );
  const [layerData, setLayerData] = useState<Partial<Record<LayerCategory, GeoJSON>>>({});
  const [loadingLayers, setLoadingLayers] = useState<Set<LayerCategory>>(new Set());
  const [baseLayerId, setBaseLayerId] = useState(() => readStoredString(LS_BASE_LAYER, "osm"));
  const [satelliteYear, setSatelliteYear] = useState<string | null>(
    () => readStoredStringOrNull(LS_SATELLITE_YEAR)
  );
  const [popupInfo, setPopupInfo] = useState<PopupInfo | null>(null);

  const storedView = useMemo(() => readStoredMapView(), []);

  const handleMoveEnd = useCallback((e: ViewStateChangeEvent) => {
    try {
      const { longitude, latitude, zoom } = e.viewState;
      localStorage.setItem(LS_MAP_VIEW, JSON.stringify({ longitude, latitude, zoom }));
    } catch { /* quota exceeded / SSR */ }
  }, []);

  // Persist base layer & satellite year
  useEffect(() => {
    try {
      localStorage.setItem(LS_BASE_LAYER, baseLayerId);
      if (satelliteYear) localStorage.setItem(LS_SATELLITE_YEAR, satelliteYear);
      else localStorage.removeItem(LS_SATELLITE_YEAR);
    } catch { /* quota exceeded / SSR */ }
  }, [baseLayerId, satelliteYear]);

  // Persist visible layers
  useEffect(() => {
    try {
      localStorage.setItem(LS_VISIBLE_LAYERS, JSON.stringify([...visibleLayers]));
    } catch { /* quota exceeded / SSR */ }
  }, [visibleLayers]);

  const fetchLayerData = useCallback(async (category: LayerCategory) => {
    if (layerData[category]) return;

    setLoadingLayers((prev) => new Set(prev).add(category));
    try {
      const res = await fetch(layerUrl(category));
      const data = await res.json();
      setLayerData((prev) => ({ ...prev, [category]: data }));
    } catch (error) {
      console.error(`Failed to fetch ${category}:`, error);
      setLayerData((prev) => ({ ...prev, [category]: EMPTY_COLLECTION }));
    } finally {
      setLoadingLayers((prev) => {
        const next = new Set(prev);
        next.delete(category);
        return next;
      });
    }
  }, [layerData]);

  // Fetch data for layers restored from localStorage
  const didRestoreRef = useRef(false);
  useEffect(() => {
    if (didRestoreRef.current) return;
    didRestoreRef.current = true;
    for (const id of visibleLayers) {
      fetchLayerData(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleLayer = useCallback(
    (id: LayerCategory) => {
      setVisibleLayers((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
          fetchLayerData(id);
        }
        return next;
      });
    },
    [fetchLayerData]
  );

  const handleBaseLayerChange = useCallback((id: string) => {
    setBaseLayerId(id);
    setSatelliteYear(null);
  }, []);

  const handleSatelliteYearChange = useCallback((year: string) => {
    setSatelliteYear((prev) => (prev === year ? null : year));
    if (satelliteYear !== year) {
      setBaseLayerId("");
    }
  }, [satelliteYear]);

  const handleMapClick = useCallback((e: MapLayerMouseEvent) => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const visibleConfigs = layersConfig.filter((c) => visibleLayers.has(c.id));
    const queryLayerIds = visibleConfigs.flatMap((c) => [
      `${c.id}-point`, `${c.id}-line`, `${c.id}-polygon`,
    ]);

    if (queryLayerIds.length === 0) return;

    const features = map.queryRenderedFeatures(e.point, { layers: queryLayerIds });
    if (features.length === 0) {
      setPopupInfo(null);
      return;
    }

    const feature = features[0];
    const layerId = feature.layer.id.replace(/-(?:point|line|polygon)$/, "") as LayerCategory;

    setPopupInfo({
      longitude: e.lngLat.lng,
      latitude: e.lngLat.lat,
      properties: feature.properties as Record<string, unknown>,
      layerId,
    });
  }, [visibleLayers]);

  const activeSatellite = satelliteYear
    ? satelliteYears.find((s) => s.year === satelliteYear)
    : null;
  const baseLayer = activeSatellite
    ? null
    : baseLayers.find((l) => l.id === baseLayerId) ?? baseLayers[0];

  const tiles = activeSatellite?.tiles ?? baseLayer?.tiles ?? baseLayers[0].tiles;
  const tileSize = activeSatellite?.tileSize ?? baseLayer?.tileSize ?? 256;
  const attribution =
    activeSatellite?.attribution ?? baseLayer?.attribution ?? baseLayers[0].attribution;

  const mapStyle = useMemo(() => ({
    version: 8 as const,
    sources: {
      "base-tiles": {
        type: "raster" as const,
        tiles,
        tileSize,
        attribution,
      },
    },
    layers: [
      {
        id: "base-tiles",
        type: "raster" as const,
        source: "base-tiles",
        minzoom: 0,
        maxzoom: 22,
      },
    ],
  }), [tiles, tileSize, attribution]);

  return (
    <div className="relative h-screen w-screen">
      <Map
        ref={mapRef}
        initialViewState={storedView ?? { ...NANCY_CENTER, zoom: 12 }}
        mapStyle={mapStyle}
        style={{ width: "100%", height: "100%" }}
        onMoveEnd={handleMoveEnd}
        onClick={handleMapClick}
        interactiveLayerIds={layersConfig
          .filter((c) => visibleLayers.has(c.id))
          .flatMap((c) => [`${c.id}-point`, `${c.id}-line`, `${c.id}-polygon`])}
        cursor={popupInfo ? "default" : undefined}
      >
        {layersConfig.map((config) => {
          const data = layerData[config.id] ?? EMPTY_COLLECTION;
          const visible = visibleLayers.has(config.id);

          return (
            <Source
              key={config.id}
              id={config.id}
              type="geojson"
              data={data}
            >
              <Layer
                id={`${config.id}-line`}
                type="line"
                filter={["==", "$type", "LineString"]}
                layout={{ visibility: visible ? "visible" : "none" }}
                paint={{
                  "line-color": config.color,
                  "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1, 14, 3, 18, 6],
                  "line-opacity": 0.8,
                }}
              />
              <Layer
                id={`${config.id}-polygon`}
                type="fill"
                filter={["==", "$type", "Polygon"]}
                layout={{ visibility: visible ? "visible" : "none" }}
                paint={{
                  "fill-color": config.color,
                  "fill-opacity": 0.3,
                  "fill-outline-color": config.color,
                }}
              />
              {/* Point layer: larger circle for fire hydrants at high zoom to fit text */}
              <Layer
                id={`${config.id}-point`}
                type="circle"
                filter={["==", "$type", "Point"]}
                layout={{ visibility: visible ? "visible" : "none" }}
                paint={{
                  "circle-color": config.color,
                  "circle-radius":
                    config.id === "fire-hydrants"
                      ? ["interpolate", ["linear"], ["zoom"], 14, 4, 16, 12]
                      : 4,
                  "circle-stroke-color": "#fff",
                  "circle-stroke-width": 1,
                  "circle-opacity": 0.8,
                }}
              />
              {/* Fire hydrant ref label inside the circle */}
              {config.id === "fire-hydrants" && (
                <Layer
                  id={`${config.id}-label`}
                  type="symbol"
                  filter={["==", "$type", "Point"]}
                  minzoom={16}
                  layout={{
                    visibility: visible ? "visible" : "none",
                    "text-field": ["coalesce", ["get", "ref"], ""],
                    "text-size": 9,
                    "text-anchor": "center",
                    "text-allow-overlap": true,
                  }}
                  paint={{
                    "text-color": "#fff",
                  }}
                />
              )}
            </Source>
          );
        })}

        {popupInfo && (
          <Popup
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            anchor="bottom"
            onClose={() => setPopupInfo(null)}
            closeOnClick={false}
          >
            <FeaturePopup info={popupInfo} />
          </Popup>
        )}
      </Map>

      <LayerPanel
        visibleLayers={visibleLayers}
        loadingLayers={loadingLayers}
        onToggle={toggleLayer}
      />

      <BaseLayerSwitcher
        current={baseLayerId}
        satelliteYear={satelliteYear}
        onChange={handleBaseLayerChange}
        onSatelliteYearChange={handleSatelliteYearChange}
      />

      <FunFacts onFlyTo={(lng: number, lat: number) => {
        mapRef.current?.flyTo({ center: [lng, lat], zoom: 21, duration: 1500 });
      }} />
    </div>
  );
}

