import osmtogeojson from "osmtogeojson";
// @ts-expect-error no types for tiny-osmpbf
import tinyosmpbf from "tiny-osmpbf";
import type { Feature, FeatureCollection, LineString, Polygon, Position } from "geojson";
import { computeFacts, type FactsPayload } from "@/lib/facts/compute";
import { LAYER_FILTERS, filterElements, type OsmElement, type OsmJson } from "./filters";

function geometryCenter(f: Feature): [number, number] | null {
  if (f.geometry.type === "LineString") {
    const coords = (f.geometry as LineString).coordinates;
    if (coords.length === 0) return null;
    const mid = coords[Math.floor(coords.length / 2)];
    return [mid[0], mid[1]];
  }
  if (f.geometry.type === "Polygon") {
    const ring = (f.geometry as Polygon).coordinates[0];
    if (!ring || ring.length === 0) return null;
    let sx = 0, sy = 0;
    for (const p of ring as Position[]) { sx += p[0]; sy += p[1]; }
    return [sx / ring.length, sy / ring.length];
  }
  return null;
}

function collapseToPoints(fc: FeatureCollection): FeatureCollection {
  const features: Feature[] = [];
  for (const f of fc.features) {
    if (f.geometry.type === "Point") {
      features.push(f);
      continue;
    }
    const c = geometryCenter(f);
    if (!c) continue;
    features.push({ ...f, geometry: { type: "Point", coordinates: c } });
  }
  return { type: "FeatureCollection", features };
}

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
    const { matchedIds, directNodeIds } = filterElements(osmData.elements, rules);

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

    // Strip tags from nodes that were only included for way/relation geometry,
    // so osmtogeojson doesn't render them as separate Point features
    const subset: OsmJson = {
      elements: osmData.elements
        .filter((el) => matchedIds.has(el.id))
        .map((el): OsmElement => {
          if (el.type === "node" && !directNodeIds.has(el.id) && el.tags) {
            const { tags, ...rest } = el;
            return rest;
          }
          return el;
        }),
    };

    console.log(`  ${category}: ${subset.elements.length} elements`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let fc = osmtogeojson(subset as any) as FeatureCollection;
    if (category === "benches") fc = collapseToPoints(fc);
    layers[category] = fc;
  }

  console.log("Computing facts...");
  const facts = computeFacts(layers);

  return { layers, facts };
}
