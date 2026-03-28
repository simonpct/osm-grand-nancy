import type { LayerCategory } from "@/lib/layers/categories";
import { layersConfig, type PopupFieldConfig } from "@/lib/layers/config";

export interface PopupInfo {
  longitude: number;
  latitude: number;
  properties: Record<string, unknown>;
  layerId: LayerCategory;
}

function str(val: unknown): string | null {
  if (val == null || val === "") return null;
  return String(val);
}

function resolveValue(
  raw: string | null,
  field: PopupFieldConfig,
): string | null {
  if (!raw) return null;
  if (field.boolean) return raw === "yes" ? "Oui" : raw === "no" ? "Non" : raw;
  if (field.values) return field.values[raw] ?? raw;
  return raw;
}

function PopupRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 py-0.5">
      <span className="shrink-0 text-gray-400">{label}</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  );
}

export function FeaturePopup({ info }: { info: PopupInfo }) {
  const { properties, layerId } = info;
  const config = layersConfig.find((c) => c.id === layerId);
  const fields = config?.popupFields ?? [];

  const badge = fields.find((f) => f.badge);
  const badgeValue = badge ? str(properties[badge.key]) : null;

  const rows = fields.filter((f) => !f.badge && !f.note && !f.source);
  const notes = fields.filter((f) => f.note);

  const visibleRows = rows.filter((f) => resolveValue(str(properties[f.key]), f) !== null);
  const visibleNotes = notes.filter((f) => str(properties[f.key]) !== null);
  const hasBody = visibleRows.length > 0 || visibleNotes.length > 0;

  return (
    <div className="min-w-50">
      <div
        className={`flex items-center gap-2 px-3 pr-8 py-2 ${hasBody ? "rounded-t" : "rounded"}`}
        style={{ backgroundColor: config?.color, color: "#fff" }}
      >
        {config?.icon && <span className="text-base">{config.icon}</span>}
        <span className="font-semibold">{config?.label ?? layerId}</span>
        {badgeValue && (
          <span className="ml-auto rounded bg-white/20 px-1.5 py-0.5 text-xs font-bold">
            {badgeValue}
          </span>
        )}
      </div>
      {hasBody && (
        <div className="space-y-0.5 px-3 py-2 text-xs">
          {visibleRows.map((field) => (
            <PopupRow
              key={field.key}
              label={field.label}
              value={resolveValue(str(properties[field.key]), field)}
            />
          ))}
          {visibleNotes.map((field) => (
            <div
              key={field.key}
              className="mt-1 rounded bg-gray-50 px-2 py-1 text-gray-500 italic"
            >
              {str(properties[field.key])}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
