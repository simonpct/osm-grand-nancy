import {
  GRAND_NANCY_BBOX,
  SLICE_API,
  POLL_INTERVAL,
  POLL_TIMEOUT,
} from "./config";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function downloadPbf(): Promise<Buffer> {
  const [minLon, minLat, maxLon, maxLat] = GRAND_NANCY_BBOX;

  console.log("Requesting PBF extract from slice.openstreetmap.us...");
  const res = await fetch(SLICE_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      Name: "grand-nancy",
      RegionType: "geojson",
      RegionData: {
        type: "Polygon",
        coordinates: [
          [
            [minLon, minLat],
            [maxLon, minLat],
            [maxLon, maxLat],
            [minLon, maxLat],
            [minLon, minLat],
          ],
        ],
      },
    }),
  });

  const jobId = await res.text();
  console.log(`Job ID: ${jobId}`);

  const start = Date.now();
  while (Date.now() - start < POLL_TIMEOUT) {
    await sleep(POLL_INTERVAL);
    const status = await fetch(`${SLICE_API}${jobId}`);
    const data = await status.json();
    console.log(`  Status: ${JSON.stringify(data)}`);
    if (data.Complete) break;
  }

  console.log("Downloading PBF file...");
  const pbfUrl = `https://slice.openstreetmap.us/files/${jobId}.osm.pbf`;
  const pbfRes = await fetch(pbfUrl);
  if (!pbfRes.ok) throw new Error(`Failed to download PBF: ${pbfRes.status}`);
  return Buffer.from(await pbfRes.arrayBuffer());
}
