import osmtogeojson from "osmtogeojson";
// @ts-expect-error no types for tiny-osmpbf
import tinyosmpbf from "tiny-osmpbf";
import type { FeatureCollection } from "geojson";
import { computeFacts, type FactsPayload } from "@/lib/facts/compute";
import { LAYER_FILTERS, filterElements, type OsmJson } from "./filters";

export interface ProcessResult {
  layers: Record<string, FeatureCollection>;
  facts: FactsPayload;
}

export function processPbf(pbfBuffer: Buffer): ProcessResult {
  console.log("Parsing PBF...");
  const osmData: OsmJson = tinyosmpbf(pbfBuffer);
  console.log(`Parsed ${osmData.elements.length} elements`);

  // Build way→nodes lookup for relation member resolution
  const wayNodeMap = new Map<number, number[]>();
  for (const el of osmData.elements) {
    if (el.type === "way" && el.nodes) {
      wayNodeMap.set(el.id, el.nodes);
    }
  }

  const layers: Record<string, FeatureCollection> = {};

  for (const category of Object.keys(LAYER_FILTERS)) {
    const rules = LAYER_FILTERS[category];
    const matchedIds = filterElements(osmData.elements, rules);

    // Resolve relation members' ways and their nodes
    for (const el of osmData.elements) {
      if (el.type === "relation" && matchedIds.has(el.id) && el.members) {
        for (const m of el.members) {
          matchedIds.add(m.ref);
          if (m.type === "way") {
            const nodeRefs = wayNodeMap.get(m.ref);
            if (nodeRefs) {
              for (const nid of nodeRefs) matchedIds.add(nid);
            }
          }
        }
      }
    }

    const subset: OsmJson = {
      elements: osmData.elements.filter((el) => matchedIds.has(el.id)),
    };

    console.log(`  ${category}: ${subset.elements.length} elements`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    layers[category] = osmtogeojson(subset as any) as FeatureCollection;
  }

  console.log("Computing facts...");
  const facts = computeFacts(layers);

  return { layers, facts };
}
