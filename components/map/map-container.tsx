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
import { baseLayers, satelliteYears, cadastreOverlay, type BaseLayer, type SatelliteYear } from "@/lib/layers/base-layers";
import { overlaysTilesUrl } from "@/lib/pbf/blob-url";
import { LayerPanel } from "./layer-panel";
import { BaseLayerSwitcher } from "./base-layer-switcher";
import { FeaturePopup, type PopupInfo } from "./feature-popup";
import { FunFacts } from "./fun-facts";
import { ArrowRightLeft, Share2 } from "lucide-react";

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
const LS_CADASTRE = "infra-nancy:cadastre";
const CADASTRE_SOURCE_ID = "cadastre";
const CADASTRE_LAYER_ID = "cadastre-tiles";

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

function buildMapStyle(
  satellite: SatelliteYear | null,
  base: BaseLayer | null
): string | StyleSpecification {
  if (satellite) {
    return {
      version: 8 as const,
      sources: {
        "base-tiles": {
          type: "raster" as const,
          tiles: satellite.tiles,
          tileSize: satellite.tileSize ?? 256,
          attribution: satellite.attribution,
        },
      },
      layers: [{ id: "base-tiles", type: "raster" as const, source: "base-tiles", minzoom: 0, maxzoom: 22 }],
    };
  }
  if (base?.kind === "style") return base.styleUrl;
  if (base?.kind === "raster") {
    return {
      version: 8 as const,
      sources: {
        "base-tiles": {
          type: "raster" as const,
          tiles: base.tiles,
          tileSize: base.tileSize ?? 256,
          attribution: base.attribution,
        },
      },
      layers: [{ id: "base-tiles", type: "raster" as const, source: "base-tiles", minzoom: 0, maxzoom: 22 }],
    };
  }
  if (base?.kind === "blank") {
    return {
      version: 8 as const,
      sources: {},
      layers: [{ id: "background", type: "background" as const, paint: { "background-color": base.color } }],
    };
  }
  return baseLayers[0].kind === "style"
    ? baseLayers[0].styleUrl
    : { version: 8 as const, sources: {}, layers: [] } as StyleSpecification;
}

interface UrlState {
  longitude?: number;
  latitude?: number;
  zoom?: number;
  bearing?: number;
  baseLayerId?: string;
  satelliteYear?: string | null;
  cadastreLeft?: boolean;
  visibleLayers?: LayerCategory[];
  compareMode?: boolean;
  rightBaseLayerId?: string;
  rightSatelliteYear?: string | null;
  cadastreRight?: boolean;
  sliderPct?: number;
}

function parseUrlState(search: string): UrlState {
  const p = new URLSearchParams(search);
  const s: UrlState = {};
  const c = p.get("c");
  if (c) {
    const [lng, lat] = c.split(",").map(Number);
    if (Number.isFinite(lng) && Number.isFinite(lat)) { s.longitude = lng; s.latitude = lat; }
  }
  const z = p.get("z"); if (z && Number.isFinite(Number(z))) s.zoom = Number(z);
  const b = p.get("b"); if (b && Number.isFinite(Number(b))) s.bearing = Number(b);
  const bl = p.get("bl"); if (bl) s.baseLayerId = bl;
  if (p.has("sl")) s.satelliteYear = p.get("sl") || null;
  if (p.has("cl")) s.cadastreLeft = p.get("cl") === "1";
  const v = p.get("v"); if (v !== null) s.visibleLayers = v ? v.split(",") as LayerCategory[] : [];
  if (p.has("cmp")) s.compareMode = p.get("cmp") === "1";
  const br = p.get("br"); if (br !== null) s.rightBaseLayerId = br;
  if (p.has("sr")) s.rightSatelliteYear = p.get("sr") || null;
  if (p.has("cr")) s.cadastreRight = p.get("cr") === "1";
  const sp = p.get("sp"); if (sp && Number.isFinite(Number(sp))) s.sliderPct = Number(sp);
  return s;
}

function buildShareUrl(s: UrlState): string {
  const p = new URLSearchParams();
  if (s.longitude !== undefined && s.latitude !== undefined) {
    p.set("c", `${s.longitude.toFixed(4)},${s.latitude.toFixed(4)}`);
  }
  if (s.zoom !== undefined) p.set("z", s.zoom.toFixed(2));
  if (s.bearing !== undefined && s.bearing !== 0) p.set("b", String(Math.round(s.bearing)));
  if (s.baseLayerId) p.set("bl", s.baseLayerId);
  if (s.satelliteYear) p.set("sl", s.satelliteYear);
  if (s.cadastreLeft) p.set("cl", "1");
  if (s.visibleLayers && s.visibleLayers.length > 0) p.set("v", s.visibleLayers.join(","));
  if (s.compareMode) {
    p.set("cmp", "1");
    if (s.rightBaseLayerId) p.set("br", s.rightBaseLayerId);
    if (s.rightSatelliteYear) p.set("sr", s.rightSatelliteYear);
    if (s.cadastreRight) p.set("cr", "1");
    if (s.sliderPct !== undefined) p.set("sp", String(Math.round(s.sliderPct)));
  }
  return `${window.location.origin}${window.location.pathname}?${p.toString()}`;
}

export default function MapContainer() {
  const mapRef = useRef<MapRef>(null);
  const compareMapRef = useRef<MapRef>(null);
  const compareContainerRef = useRef<HTMLDivElement>(null);
  const urlState = useMemo(
    () => (typeof window !== "undefined" ? parseUrlState(window.location.search) : {}),
    []
  );
  const fromUrl = Object.keys(urlState).length > 0;
  const [visibleLayers, setVisibleLayers] = useState<Set<LayerCategory>>(
    () => new Set(fromUrl ? (urlState.visibleLayers ?? []) : readStoredLayers())
  );
  const [baseLayerId, setBaseLayerId] = useState(
    () => fromUrl ? (urlState.baseLayerId ?? "") : readStoredString(LS_BASE_LAYER, "osm")
  );
  const [satelliteYear, setSatelliteYear] = useState<string | null>(
    () => fromUrl ? (urlState.satelliteYear ?? null) : readStoredStringOrNull(LS_SATELLITE_YEAR)
  );
  const [compareMode, setCompareMode] = useState(() => urlState.compareMode ?? false);
  const [rightBaseLayerId, setRightBaseLayerId] = useState(() => urlState.rightBaseLayerId ?? "");
  const [rightSatelliteYear, setRightSatelliteYear] = useState<string | null>(
    () => urlState.rightSatelliteYear !== undefined ? urlState.rightSatelliteYear : "2012"
  );
  const [popupInfo, setPopupInfo] = useState<PopupInfo | null>(null);
  const [bikeCoverage, setBikeCoverage] = useState(false);
  const [bearing, setBearing] = useState(() => urlState.bearing ?? 0);
  const [cadastreLeft, setCadastreLeft] = useState(
    () => fromUrl ? (urlState.cadastreLeft ?? false) : (readStoredStringOrNull(LS_CADASTRE) === "1")
  );
  const [cadastreRight, setCadastreRight] = useState(() => urlState.cadastreRight ?? false);

  useEffect(() => {
    try {
      if (cadastreLeft) localStorage.setItem(LS_CADASTRE, "1");
      else localStorage.removeItem(LS_CADASTRE);
    } catch { /* quota exceeded / SSR */ }
  }, [cadastreLeft]);

  const resetBearing = useCallback(() => {
    mapRef.current?.getMap().easeTo({ bearing: 0, duration: 400 });
  }, []);

  const storedView = useMemo(() => {
    if (urlState.longitude !== undefined && urlState.latitude !== undefined && urlState.zoom !== undefined) {
      return { longitude: urlState.longitude, latitude: urlState.latitude, zoom: urlState.zoom, bearing: urlState.bearing };
    }
    if (fromUrl) return null;
    return readStoredMapView();
  }, [urlState, fromUrl]);

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

  const handleRightBaseLayerChange = useCallback((id: string) => {
    setRightBaseLayerId(id);
    setRightSatelliteYear(null);
  }, []);

  const handleRightSatelliteYearChange = useCallback((year: string) => {
    setRightSatelliteYear((prev) => (prev === year ? null : year));
    if (rightSatelliteYear !== year) {
      setRightBaseLayerId("");
    }
  }, [rightSatelliteYear]);

  const handleFeatureClick = useCallback((map: maplibregl.Map, e: MapLayerMouseEvent) => {
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

  const handleMapClick = useCallback((e: MapLayerMouseEvent) => {
    const map = mapRef.current?.getMap();
    if (map) handleFeatureClick(map, e);
  }, [handleFeatureClick]);

  const handleCompareMapClick = useCallback((e: MapLayerMouseEvent) => {
    const map = compareMapRef.current?.getMap();
    if (map) handleFeatureClick(map, e);
  }, [handleFeatureClick]);

  const activeSatellite = satelliteYear
    ? satelliteYears.find((s) => s.year === satelliteYear) ?? null
    : null;
  const baseLayer = activeSatellite
    ? null
    : baseLayers.find((l) => l.id === baseLayerId) ?? baseLayers[0];

  const rightActiveSatellite = rightSatelliteYear
    ? satelliteYears.find((s) => s.year === rightSatelliteYear) ?? null
    : null;
  const rightBaseLayer = rightActiveSatellite
    ? null
    : baseLayers.find((l) => l.id === rightBaseLayerId) ?? baseLayers[0];

  const tilesUrl = overlaysTilesUrl();

  const mapStyle = useMemo(
    () => buildMapStyle(activeSatellite, baseLayer),
    [activeSatellite, baseLayer]
  );
  const rightMapStyle = useMemo(
    () => buildMapStyle(rightActiveSatellite, rightBaseLayer),
    [rightActiveSatellite, rightBaseLayer]
  );

  const [sliderPct, setSliderPct] = useState(() => urlState.sliderPct ?? 50);
  const draggingRef = useRef(false);
  const [leftReady, setLeftReady] = useState(false);
  const [rightReady, setRightReady] = useState(false);

  const handleCompareToggle = useCallback(() => {
    setCompareMode((v) => {
      if (v) setRightReady(false);
      return !v;
    });
  }, []);

  const handleShare = useCallback(async () => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const center = map.getCenter();
    const url = buildShareUrl({
      longitude: center.lng,
      latitude: center.lat,
      zoom: map.getZoom(),
      bearing: map.getBearing(),
      baseLayerId,
      satelliteYear,
      cadastreLeft,
      visibleLayers: [...visibleLayers],
      compareMode,
      rightBaseLayerId,
      rightSatelliteYear,
      cadastreRight,
      sliderPct,
    });
    try {
      if (navigator.share) {
        await navigator.share({ url, title: "Infra Nancy" });
        return;
      }
    } catch { /* user cancelled or share failed */ }
    try {
      await navigator.clipboard.writeText(url);
    } catch { /* clipboard blocked */ }
  }, [baseLayerId, satelliteYear, cadastreLeft, visibleLayers, compareMode, rightBaseLayerId, rightSatelliteYear, cadastreRight, sliderPct]);

  useEffect(() => {
    if (!compareMode || !leftReady || !rightReady) return;
    const a = mapRef.current?.getMap();
    const b = compareMapRef.current?.getMap();
    if (!a || !b) return;

    let syncing = false;
    const sync = (from: maplibregl.Map, to: maplibregl.Map) => () => {
      if (syncing) return;
      syncing = true;
      to.jumpTo({ center: from.getCenter(), zoom: from.getZoom(), bearing: from.getBearing(), pitch: from.getPitch() });
      syncing = false;
    };
    const syncAtoB = sync(a, b);
    const syncBtoA = sync(b, a);

    syncAtoB();
    a.on("move", syncAtoB);
    b.on("move", syncBtoA);
    return () => {
      a.off("move", syncAtoB);
      b.off("move", syncBtoA);
    };
  }, [compareMode, leftReady, rightReady]);

  useEffect(() => {
    if (!compareMode) return;
    const container = compareContainerRef.current;
    if (!container) return;

    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      const rect = container.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSliderPct(Math.max(0, Math.min(100, pct)));
    };
    const onUp = () => { draggingRef.current = false; };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [compareMode]);

  const overlayLayers = layersConfig.flatMap((config) => {
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
  });

  return (
    <div className="relative h-screen w-screen">
      <div ref={compareContainerRef} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}>
        <Map
          ref={mapRef}
          initialViewState={storedView ?? { ...NANCY_CENTER, zoom: 12 }}
          mapStyle={mapStyle}
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, width: "100%", height: "100%" }}
          onMoveEnd={handleMoveEnd}
          onRotate={(e) => setBearing(e.viewState.bearing)}
          onLoad={() => setLeftReady(true)}
          onClick={handleMapClick}
          minZoom={11}
          interactiveLayerIds={layersConfig
            .filter((c) => visibleLayers.has(c.id))
            .flatMap((c) => [`${c.id}-point`, `${c.id}-line`, `${c.id}-polygon`])}
          cursor={popupInfo ? "default" : undefined}
        >
          <Source
            id={CADASTRE_SOURCE_ID}
            type="raster"
            tiles={[...cadastreOverlay.tiles]}
            tileSize={cadastreOverlay.tileSize}
            attribution={cadastreOverlay.attribution}
          >
            <Layer
              id={CADASTRE_LAYER_ID}
              type="raster"
              layout={{ visibility: cadastreLeft ? "visible" : "none" }}
            />
          </Source>

          <Source id={OVERLAYS_SOURCE_ID} type="vector" url={`pmtiles://${tilesUrl}`}>
            {overlayLayers}
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

        {compareMode && (
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              clipPath: `inset(0 0 0 ${sliderPct}%)`,
              background: "#fff",
            }}
          >
            <Map
              ref={compareMapRef}
              initialViewState={storedView ?? { ...NANCY_CENTER, zoom: 12 }}
              mapStyle={rightMapStyle}
              style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, width: "100%", height: "100%" }}
              minZoom={11}
              onLoad={() => setRightReady(true)}
              onClick={handleCompareMapClick}
              interactiveLayerIds={layersConfig
                .filter((c) => visibleLayers.has(c.id))
                .flatMap((c) => [`${c.id}-point`, `${c.id}-line`, `${c.id}-polygon`])}
            >
              <Source
                id={CADASTRE_SOURCE_ID}
                type="raster"
                tiles={[...cadastreOverlay.tiles]}
                tileSize={cadastreOverlay.tileSize}
                attribution={cadastreOverlay.attribution}
              >
                <Layer
                  id={CADASTRE_LAYER_ID}
                  type="raster"
                  layout={{ visibility: cadastreRight ? "visible" : "none" }}
                />
              </Source>

              <Source id={OVERLAYS_SOURCE_ID} type="vector" url={`pmtiles://${tilesUrl}`}>
                {overlayLayers}
              </Source>
            </Map>
          </div>
        )}
        {compareMode && (
          <div
            onPointerDown={(e) => {
              draggingRef.current = true;
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${sliderPct}%`,
              width: 2,
              transform: "translateX(-1px)",
              background: "#fff",
              boxShadow: "0 0 0 1px rgba(0,0,0,0.2)",
              cursor: "ew-resize",
              zIndex: 5,
              touchAction: "none",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "#3887be",
                boxShadow: "inset 0 0 0 2px #fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 14,
              }}
            >
              <ArrowRightLeft size={16} />
            </div>
          </div>
        )}
      </div>

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
        cadastre={cadastreLeft}
        onCadastreToggle={() => setCadastreLeft((v) => !v)}
        compareMode={compareMode}
        onCompareToggle={handleCompareToggle}
        rightCurrent={rightBaseLayerId}
        rightSatelliteYear={rightSatelliteYear}
        onRightChange={handleRightBaseLayerChange}
        onRightSatelliteYearChange={handleRightSatelliteYearChange}
        rightCadastre={cadastreRight}
        onRightCadastreToggle={() => setCadastreRight((v) => !v)}
      />

      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={handleShare}
          aria-label="Partager la vue"
          title="Partager la vue"
          className="flex size-9 items-center justify-center rounded-lg bg-white/95 text-gray-700 shadow-md backdrop-blur-sm transition-colors hover:bg-gray-100"
        >
          <Share2 size={18} />
        </button>
        {bearing !== 0 && (
          <button
            onClick={resetBearing}
            aria-label="Orienter vers le nord"
            title="Orienter vers le nord"
            className="flex size-9 items-center justify-center rounded-lg bg-white/95 shadow-md backdrop-blur-sm transition-colors hover:bg-gray-100"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transform: `rotate(${-bearing}deg)` }}
              className="text-gray-700"
            >
              <polygon points="12 2 15 12 12 22 9 12 12 2" fill="currentColor" />
            </svg>
          </button>
        )}
      </div>

      <FunFacts onFlyTo={(lng: number, lat: number) => {
        mapRef.current?.flyTo({ center: [lng, lat], zoom: 21, duration: 1500 });
      }} />
    </div>
  );
}

