const BLOB_BASE = process.env.NEXT_PUBLIC_BLOB_URL;

export function layerUrl(category: string): string {
  if (BLOB_BASE) return `${BLOB_BASE}/layers/${category}.geojson`;
  return `/data/${category}.geojson`;
}

export function factsUrl(): string {
  if (BLOB_BASE) return `${BLOB_BASE}/layers/facts.json`;
  return `/data/facts.json`;
}
