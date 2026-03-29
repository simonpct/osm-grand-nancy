import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { downloadPbf } from "@/lib/pbf/download";
import { processPbf } from "@/lib/pbf/process";

export const maxDuration = 120;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const isAuthorized =
    authHeader === `Bearer ${process.env.CRON_SECRET}` ||
    (process.env.API_SECRET && authHeader === `Bearer ${process.env.API_SECRET}`);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();

  // Download and process PBF
  const pbfBuffer = await downloadPbf();
  const { layers, facts } = processPbf(pbfBuffer);

  // Upload each layer to Vercel Blob
  const uploads: string[] = [];
  for (const [category, geojson] of Object.entries(layers)) {
    const blob = await put(`layers/${category}.geojson`, JSON.stringify(geojson), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
    });
    uploads.push(blob.url);
    console.log(`  Uploaded ${category} → ${blob.url}`);
  }

  // Upload facts
  const factsBlob = await put("layers/facts.json", JSON.stringify(facts), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
  });
  uploads.push(factsBlob.url);
  console.log(`  Uploaded facts → ${factsBlob.url}`);

  return NextResponse.json({
    ok: true,
    layers: Object.keys(layers).length,
    uploads: uploads.length,
    elapsed: `${((Date.now() - start) / 1000).toFixed(1)}s`,
  });
}
