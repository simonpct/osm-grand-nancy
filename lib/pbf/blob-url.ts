const BLOB_BASE = process.env.NEXT_PUBLIC_BLOB_URL;

export function overlaysTilesUrl(): string {
  if (BLOB_BASE) return `${BLOB_BASE}/tiles/overlays.pmtiles`;
  return `/data/overlays.pmtiles`;
}

export function factsUrl(): string {
  if (BLOB_BASE) return `${BLOB_BASE}/layers/facts.json`;
  return `/data/facts.json`;
}
