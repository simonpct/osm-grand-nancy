"use client";

import { Popover } from "@base-ui/react/popover";
import { ArrowRightLeft, Check, LandPlot } from "lucide-react";
import { baseLayers, satelliteYears } from "@/lib/layers/base-layers";

interface BaseLayerSwitcherProps {
  current: string;
  satelliteYear: string | null;
  onChange: (id: string) => void;
  onSatelliteYearChange: (year: string) => void;
  cadastre: boolean;
  onCadastreToggle: () => void;
  compareMode: boolean;
  onCompareToggle: () => void;
  rightCurrent: string;
  rightSatelliteYear: string | null;
  onRightChange: (id: string) => void;
  onRightSatelliteYearChange: (year: string) => void;
  rightCadastre: boolean;
  onRightCadastreToggle: () => void;
}

export function BaseLayerSwitcher({
  current,
  satelliteYear,
  onChange,
  onSatelliteYearChange,
  cadastre,
  onCadastreToggle,
  compareMode,
  onCompareToggle,
  rightCurrent,
  rightSatelliteYear,
  onRightChange,
  onRightSatelliteYearChange,
  rightCadastre,
  onRightCadastreToggle,
}: BaseLayerSwitcherProps) {
  return (
    <Popover.Root>
      <Popover.Trigger
        className="absolute bottom-4 left-4 z-10 flex size-9 items-center justify-center rounded-lg bg-white/95 shadow-md backdrop-blur-sm transition-colors hover:bg-gray-100"
        aria-label="Fond de carte"
      >
        <LayersIcon />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner side="top" align="start" sideOffset={8} className="z-100">
          <Popover.Popup
            className={`z-100 rounded-lg bg-white/95 p-3 shadow-lg backdrop-blur-sm ${
              compareMode ? "w-[min(90vw,36rem)]" : "w-56"
            }`}
          >
            <Popover.Arrow className="fill-white/95" />

            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Fond de carte</h2>
              <button
                onClick={onCompareToggle}
                aria-pressed={compareMode}
                title="Comparer deux fonds de carte"
                className={`flex size-7 items-center justify-center rounded-md transition-colors ${
                  compareMode ? "bg-gray-900 text-white hover:bg-gray-800" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <ArrowRightLeft size={14} />
              </button>
            </div>

            <div className={compareMode ? "flex flex-col gap-3 sm:flex-row sm:gap-4 sm:divide-x" : undefined}>
              <div className={compareMode ? "min-w-0 flex-1 sm:pr-4" : undefined}>
                {compareMode && (
                  <h3 className="mb-2 text-xs font-semibold text-gray-500 uppercase">Gauche</h3>
                )}
                <LayerSection
                  current={current}
                  satelliteYear={satelliteYear}
                  onChange={onChange}
                  onSatelliteYearChange={onSatelliteYearChange}
                  cadastre={cadastre}
                  onCadastreToggle={onCadastreToggle}
                />
              </div>

              {compareMode && (
                <div className="min-w-0 flex-1 border-t pt-3 sm:border-t-0 sm:pt-0 sm:pl-4">
                  <h3 className="mb-2 text-xs font-semibold text-gray-500 uppercase">Droite</h3>
                  <LayerSection
                    current={rightCurrent}
                    satelliteYear={rightSatelliteYear}
                    onChange={onRightChange}
                    onSatelliteYearChange={onRightSatelliteYearChange}
                    cadastre={rightCadastre}
                    onCadastreToggle={onRightCadastreToggle}
                  />
                </div>
              )}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

interface LayerSectionProps {
  current: string;
  satelliteYear: string | null;
  onChange: (id: string) => void;
  onSatelliteYearChange: (year: string) => void;
  cadastre: boolean;
  onCadastreToggle: () => void;
}

function LayerSection({ current, satelliteYear, onChange, onSatelliteYearChange, cadastre, onCadastreToggle }: LayerSectionProps) {
  return (
    <>
      <div className="flex flex-col gap-1">
        {baseLayers.map((layer) => {
          const Icon = layer.icon;
          const active = current === layer.id && !satelliteYear;
          return (
            <button
              key={layer.id}
              onClick={() => onChange(layer.id)}
              className={`flex items-center gap-2 rounded px-3 py-1.5 text-left text-sm transition-colors ${
                active ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Icon size={14} className="shrink-0" />
              <span>{layer.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 border-t pt-3">
        <h3 className="mb-2 text-xs font-semibold text-gray-500 uppercase">
          Orthophotos Nancy
        </h3>
        <div className="flex flex-wrap gap-1">
          {satelliteYears.map((sat) => (
            <button
              key={sat.year}
              onClick={() => onSatelliteYearChange(sat.year)}
              className={`rounded px-2 py-1 text-xs transition-colors ${
                satelliteYear === sat.year
                  ? "bg-gray-900 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {sat.year}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 border-t pt-3">
        <h3 className="mb-2 text-xs font-semibold text-gray-500 uppercase">Calques</h3>
        <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100">
          <span
            className={`flex size-4 shrink-0 items-center justify-center rounded border ${
              cadastre ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 bg-white"
            }`}
          >
            {cadastre && <Check size={12} strokeWidth={3} />}
          </span>
          <LandPlot size={14} className="shrink-0" />
          <span>Cadastre</span>
          <input
            type="checkbox"
            checked={cadastre}
            onChange={onCadastreToggle}
            className="sr-only"
          />
        </label>
      </div>
    </>
  );
}

function LayersIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-gray-700"
    >
      <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m2 12 8.58 3.91a2 2 0 0 0 1.66 0L21 12" />
      <path d="m2 17 8.58 3.91a2 2 0 0 0 1.66 0L21 17" />
    </svg>
  );
}
