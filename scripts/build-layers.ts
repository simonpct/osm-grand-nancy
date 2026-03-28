import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { downloadPbf } from "@/lib/pbf/download";
import { processPbf } from "@/lib/pbf/process";

const OUT_DIR = join(__dirname, "..", "public", "data");

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  // Check for cached PBF in temp
  const pbfPath = join(tmpdir(), "grand-nancy.osm.pbf");
  let pbfBuffer: Buffer;

  if (existsSync(pbfPath) && process.env.REUSE_PBF === "1") {
    console.log(`Reusing cached PBF: ${pbfPath}`);
    pbfBuffer = readFileSync(pbfPath);
  } else {
    pbfBuffer = await downloadPbf();
    writeFileSync(pbfPath, pbfBuffer);
    console.log(
      `PBF saved to ${pbfPath} (${(pbfBuffer.length / 1024 / 1024).toFixed(1)} MB)`,
    );
  }

  const { layers, facts } = processPbf(pbfBuffer);

  for (const [category, geojson] of Object.entries(layers)) {
    const outPath = join(OUT_DIR, `${category}.geojson`);
    writeFileSync(outPath, JSON.stringify(geojson));
    console.log(`  → ${outPath} (${(JSON.stringify(geojson).length / 1024).toFixed(0)} KB)`);
  }

  const factsPath = join(OUT_DIR, "facts.json");
  writeFileSync(factsPath, JSON.stringify(facts));
  console.log(`  → ${factsPath}`);

  console.log("Done!");
}

main().catch((err) => {
  console.error("Build layers failed:", err);
  process.exit(1);
});
