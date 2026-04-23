"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, { Layer, Popup, Source, type MapRef, type ViewStateChangeEvent } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Protocol } from "pmtiles";
import type { MapLayerMouseEvent, StyleSpecification } from "maplibre-gl";
import type { LayerCategory } from "@/lib/layers/categories";
import { layersConfig, type LayerConfig } from "@/lib/layers/config";
import type { ExpressionSpecification } from "maplibre-gl";
import { baseLayers, satelliteYears } from "@/lib/layers/base-layers";
import { overlaysTilesUrl } from "@/lib/pbf/blob-url";
import { LayerPanel } from "./layer-panel";
import { BaseLayerSwitcher } from "./base-layer-switcher";
import { FeaturePopup, type PopupInfo } from "./feature-popup";
import { FunFacts } from "./fun-facts";

const NANCY_CENTER = { longitude: 6.1844, latitude: 48.6921 };
const OVERLAYS_SOURCE_ID = "overlays";

function paintColor(config: LayerConfig): ExpressionSpecification {
  if (config.colorByTag) {
    const stops = Object.entries(config.colorByTag.values).flatMap(([k, v]) => [k, v]);
    return ["match", ["get", config.colorByTag.key], ...stops, config.color] as unknown as ExpressionSpecification;
  }
  return ["coalesce", ["get", "colour"], config.color] as unknown as ExpressionSpecification;
}

const LS_BASE_LAYER = "infra-nancy:baseLayer";
const LS_SATELLITE_YEAR = "infra-nancy:satelliteYear";
const LS_VISIBLE_LAYERS = "infra-nancy:visibleLayers";
const LS_MAP_VIEW = "infra-nancy:mapView";

if (typeof window !== "undefined" && !(maplibregl as unknown as { __pmtilesRegistered?: boolean }).__pmtilesRegistered) {
  const protocol = new Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);
  (maplibregl as unknown as { __pmtilesRegistered?: boolean }).__pmtilesRegistered = true;
}

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
  const [baseLayerId, setBaseLayerId] = useState(() => readStoredString(LS_BASE_LAYER, "osm"));
  const [satelliteYear, setSatelliteYear] = useState<string | null>(
    () => readStoredStringOrNull(LS_SATELLITE_YEAR)
  );
  const [popupInfo, setPopupInfo] = useState<PopupInfo | null>(null);
  const [bikeCoverage, setBikeCoverage] = useState(false);

  const storedView = useMemo(() => readStoredMapView(), []);

  const handleMoveEnd = useCallback((e: ViewStateChangeEvent) => {
    try {
      const { longitude, latitude, zoom } = e.viewState;
      localStorage.setItem(LS_MAP_VIEW, JSON.stringify({ longitude, latitude, zoom }));
    } catch { /* quota exceeded / SSR */ }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LS_BASE_LAYER, baseLayerId);
      if (satelliteYear) localStorage.setItem(LS_SATELLITE_YEAR, satelliteYear);
      else localStorage.removeItem(LS_SATELLITE_YEAR);
    } catch { /* quota exceeded / SSR */ }
  }, [baseLayerId, satelliteYear]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_VISIBLE_LAYERS, JSON.stringify([...visibleLayers]));
    } catch { /* quota exceeded / SSR */ }
  }, [visibleLayers]);

  const toggleLayer = useCallback((id: LayerCategory) => {
    setVisibleLayers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

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

  const tilesUrl = overlaysTilesUrl();

  const mapStyle = useMemo<string | StyleSpecification>(() => {
    if (activeSatellite) {
      return {
        version: 8 as const,
        sources: {
          "base-tiles": {
            type: "raster" as const,
            tiles: activeSatellite.tiles,
            tileSize: activeSatellite.tileSize ?? 256,
            attribution: activeSatellite.attribution,
          },
        },
        layers: [{ id: "base-tiles", type: "raster" as const, source: "base-tiles", minzoom: 0, maxzoom: 22 }],
      };
    }
    if (baseLayer?.kind === "style") {
      return baseLayer.styleUrl;
    }
    const raster = baseLayer?.kind === "raster" ? baseLayer : null;
    if (raster) {
      return {
        version: 8 as const,
        sources: {
          "base-tiles": {
            type: "raster" as const,
            tiles: raster.tiles,
            tileSize: raster.tileSize ?? 256,
            attribution: raster.attribution,
          },
        },
        layers: [{ id: "base-tiles", type: "raster" as const, source: "base-tiles", minzoom: 0, maxzoom: 22 }],
      };
    }
    return baseLayers[0].kind === "style"
      ? baseLayers[0].styleUrl
      : {
          version: 8 as const,
          sources: {},
          layers: [],
        } as StyleSpecification;
  }, [activeSatellite, baseLayer]);

  return (
    <div className="relative h-screen w-screen">
      <Map
        ref={mapRef}
        initialViewState={storedView ?? { ...NANCY_CENTER, zoom: 12 }}
        mapStyle={mapStyle}
        style={{ width: "100%", height: "100%" }}
        onMoveEnd={handleMoveEnd}
        onClick={handleMapClick}
        minZoom={11}
        interactiveLayerIds={layersConfig
          .filter((c) => visibleLayers.has(c.id))
          .flatMap((c) => [`${c.id}-point`, `${c.id}-line`, `${c.id}-polygon`])}
        cursor={popupInfo ? "default" : undefined}
      >
        <Source id={OVERLAYS_SOURCE_ID} type="vector" url={`pmtiles://${tilesUrl}`}>
          {layersConfig.flatMap((config) => {
            const visible = visibleLayers.has(config.id);
            const elements = [
              <Layer
                key={`${config.id}-line`}
                id={`${config.id}-line`}
                source-layer={config.id}
                type="line"
                filter={["==", ["geometry-type"], "LineString"]}
                layout={{ visibility: visible ? "visible" : "none" }}
                paint={{
                  "line-color": paintColor(config),
                  "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1, 14, 3, 18, 6],
                  "line-opacity": 0.8,
                }}
              />,
              <Layer
                key={`${config.id}-polygon`}
                id={`${config.id}-polygon`}
                source-layer={config.id}
                type="fill"
                filter={["==", ["geometry-type"], "Polygon"]}
                layout={{ visibility: visible ? "visible" : "none" }}
                paint={{
                  "fill-color": paintColor(config),
                  "fill-opacity": 0.3,
                  "fill-outline-color": paintColor(config),
                }}
              />,
              <Layer
                key={`${config.id}-point`}
                id={`${config.id}-point`}
                source-layer={config.id}
                type="circle"
                filter={["==", ["geometry-type"], "Point"]}
                layout={{ visibility: visible ? "visible" : "none" }}
                paint={{
                  "circle-color": paintColor(config),
                  "circle-radius":
                    config.id === "fire-hydrants"
                      ? ["interpolate", ["linear"], ["zoom"], 14, 4, 16, 12]
                      : 4,
                  "circle-stroke-color": "#fff",
                  "circle-stroke-width": 1,
                  "circle-opacity": 0.8,
                }}
              />,
            ];
            if (config.id === "bike-rental") {
              elements.push(
                <Layer
                  key="bike-rental-coverage"
                  id="bike-rental-coverage"
                  source-layer={config.id}
                  type="circle"
                  filter={["==", ["geometry-type"], "Point"]}
                  layout={{ visibility: visible && bikeCoverage ? "visible" : "none" }}
                  paint={{
                    "circle-color": config.color,
                    "circle-opacity": 0.12,
                    "circle-radius": [
                      "interpolate", ["exponential", 2], ["zoom"],
                      10, 3,
                      12, 12.5,
                      14, 50,
                      16, 200,
                      18, 800,
                    ],
                    "circle-stroke-color": config.color,
                    "circle-stroke-width": 1,
                    "circle-stroke-opacity": 0.3,
                  }}
                />
              );
            }
            if (config.id === "fire-hydrants") {
              elements.push(
                <Layer
                  key={`${config.id}-label`}
                  id={`${config.id}-label`}
                  source-layer={config.id}
                  type="symbol"
                  filter={["==", ["geometry-type"], "Point"]}
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
              );
            }
            return elements;
          })}
        </Source>

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
        loadingLayers={new Set()}
        onToggle={toggleLayer}
        bikeCoverage={bikeCoverage}
        onBikeCoverageToggle={() => setBikeCoverage((v) => !v)}
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
