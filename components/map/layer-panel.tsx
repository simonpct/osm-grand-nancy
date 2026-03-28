"use client";

import { layersConfig } from "@/lib/layers/config";
import type { LayerCategory } from "@/lib/layers/categories";

interface LayerPanelProps {
  visibleLayers: Set<LayerCategory>;
  loadingLayers: Set<LayerCategory>;
  onToggle: (id: LayerCategory) => void;
}

export function LayerPanel({ visibleLayers, loadingLayers, onToggle }: LayerPanelProps) {
  return (
    <div className="absolute top-4 left-4 z-10 flex max-w-xs flex-wrap gap-2">
      {layersConfig.map((config) => {
        const active = visibleLayers.has(config.id);
        const loading = loadingLayers.has(config.id);

        return (
          <button
            key={config.id}
            onClick={() => onToggle(config.id)}
            disabled={loading}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm transition-all ${
              active
                ? "text-white shadow-md ring-1 ring-white/20"
                : "bg-white/90 text-gray-600 hover:bg-white hover:shadow-md"
            } ${loading ? "animate-pulse" : ""}`}
            style={
              active
                ? { backgroundColor: config.color }
                : undefined
            }
          >
            <span className="emoji text-sm leading-none">{config.icon}</span>
            {config.label}
          </button>
        );
      })}
    </div>
  );
}
