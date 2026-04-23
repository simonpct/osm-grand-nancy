import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { put } from "@vercel/blob";
import { downloadPbf } from "@/lib/pbf/download";
import { processPbf } from "@/lib/pbf/process";

const OUT_DIR = join(__dirname, "..", "public", "data");
const TILES_OUT = join(OUT_DIR, "overlays.pmtiles");
const FACTS_OUT = join(OUT_DIR, "facts.json");

const UPLOAD_TO_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;

function assertTippecanoe() {
  const probe = spawnSync("tippecanoe", ["--version"], { stdio: "pipe" });
  if (probe.error || probe.status !== 0) {
    console.error("tippecanoe not found. Install it with: brew install tippecanoe");
    process.exit(1);
  }
}

async function main() {
  assertTippecanoe();
  mkdirSync(OUT_DIR, { recursive: true });

  const pbfPath = join(tmpdir(), "grand-nancy.osm.pbf");
  let pbfBuffer: Buffer;

  if (existsSync(pbfPath) && process.env.REUSE_PBF === "1") {
    console.log(`Reusing cached PBF: ${pbfPath}`);
    pbfBuffer = readFileSync(pbfPath);
  } else {
    pbfBuffer = await downloadPbf();
    writeFileSync(pbfPath, pbfBuffer);
    console.log(`PBF saved to ${pbfPath} (${(pbfBuffer.length / 1024 / 1024).toFixed(1)} MB)`);
  }

  const { layers, facts } = processPbf(pbfBuffer);

  const tmpGeojsonPaths: string[] = [];
  const tippecanoeLayerArgs: string[] = [];
  for (const [category, geojson] of Object.entries(layers)) {
    const tmpPath = join(tmpdir(), `nancy-${category}.geojson`);
    writeFileSync(tmpPath, JSON.stringify(geojson));
    tmpGeojsonPaths.push(tmpPath);
    tippecanoeLayerArgs.push("-L", `${category}:${tmpPath}`);
    console.log(`  staged ${category} → ${tmpPath}`);
  }

  writeFileSync(FACTS_OUT, JSON.stringify(facts));
  console.log(`  → ${FACTS_OUT}`);

  console.log("Running tippecanoe…");
  const args = [
    "-o", TILES_OUT,
    "-f",
    "-Z11", "-z17",
    "--no-feature-limit",
    "--no-tile-size-limit",
    "--no-simplification-of-shared-nodes",
    "--no-tiny-polygon-reduction",
    "--no-line-simplification",
    "-r1",
    "-pS",
    ...tippecanoeLayerArgs,
  ];
  const result = spawnSync("tippecanoe", args, { stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`tippecanoe exited with status ${result.status}`);
    process.exit(1);
  }

  console.log(`  → ${TILES_OUT}`);

  if (UPLOAD_TO_BLOB) {
    console.log("Uploading to Vercel Blob…");
    const tilesBuffer = readFileSync(TILES_OUT);
    const tilesBlob = await put("tiles/overlays.pmtiles", tilesBuffer, {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/octet-stream",
    });
    console.log(`  → ${tilesBlob.url}`);

    const factsBlob = await put("layers/facts.json", JSON.stringify(facts), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
    });
    console.log(`  → ${factsBlob.url}`);
  }

  console.log("Done!");
}

main().catch((err) => {
  console.error("Build overlays failed:", err);
  process.exit(1);
});
