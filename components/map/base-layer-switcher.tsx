"use client";

import { Popover } from "@base-ui/react/popover";
import { baseLayers, satelliteYears } from "@/lib/layers/base-layers";

interface BaseLayerSwitcherProps {
  current: string;
  satelliteYear: string | null;
  onChange: (id: string) => void;
  onSatelliteYearChange: (year: string) => void;
}

export function BaseLayerSwitcher({
  current,
  satelliteYear,
  onChange,
  onSatelliteYearChange,
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
        <Popover.Positioner side="top" align="start" sideOffset={8}>
          <Popover.Popup className="z-50 w-48 rounded-lg bg-white/95 p-3 shadow-lg backdrop-blur-sm">
            <Popover.Arrow className="fill-white/95" />

            <h2 className="mb-2 text-sm font-semibold text-gray-900">
              Fond de carte
            </h2>
            <div className="flex flex-col gap-1">
              {baseLayers.map((layer) => (
                <button
                  key={layer.id}
                  onClick={() => onChange(layer.id)}
                  className={`rounded px-3 py-1.5 text-left text-sm transition-colors ${
                    current === layer.id && !satelliteYear
                      ? "bg-gray-900 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {layer.label}
                </button>
              ))}
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
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
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
