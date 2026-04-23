type OsmType = "node" | "way" | "relation";

export interface OsmElement {
  type: OsmType;
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
  nodes?: number[];
  members?: { type: OsmType; ref: number; role: string }[];
}

export interface OsmJson {
  elements: OsmElement[];
}

type TagCondition =
  | { op: "eq"; key: string; value: string }
  | { op: "has"; key: string }
  | { op: "neq"; key: string; value: string }
  | { op: "notHas"; key: string };

interface FilterRule {
  types: OsmType[];
  conditions: TagCondition[];
}

export const LAYER_FILTERS: Record<string, FilterRule[]> = {
  "bus-lines": [
    { types: ["relation"], conditions: [{ op: "eq", key: "route", value: "bus" }] },
    { types: ["relation"], conditions: [{ op: "eq", key: "route", value: "trolleybus" }] },
    { types: ["node"], conditions: [{ op: "eq", key: "highway", value: "bus_stop" }] },
    { types: ["node", "way"], conditions: [{ op: "eq", key: "public_transport", value: "platform" }] },
    { types: ["node"], conditions: [{ op: "eq", key: "public_transport", value: "stop_position" }, { op: "eq", key: "bus", value: "yes" }] },
  ],
  "cycling-paths": [
    { types: ["way"], conditions: [{ op: "eq", key: "highway", value: "cycleway" }] },
    { types: ["way"], conditions: [{ op: "has", key: "highway" }, { op: "has", key: "cycleway:right" }] },
    { types: ["way"], conditions: [{ op: "has", key: "highway" }, { op: "has", key: "cycleway:left" }] },
    { types: ["way"], conditions: [{ op: "has", key: "highway" }, { op: "has", key: "cycleway:both" }] },
    { types: ["way"], conditions: [{ op: "eq", key: "cycleway", value: "track" }] },
    { types: ["way"], conditions: [{ op: "eq", key: "cycleway", value: "lane" }] },
    { types: ["way"], conditions: [{ op: "eq", key: "highway", value: "path" }, { op: "eq", key: "bicycle", value: "designated" }] },
  ],
  "bike-rental": [
    { types: ["node"], conditions: [{ op: "eq", key: "amenity", value: "bicycle_rental" }] },
  ],
  sidewalks: [
    { types: ["way"], conditions: [{ op: "eq", key: "highway", value: "footway" }] },
    { types: ["way"], conditions: [{ op: "eq", key: "highway", value: "path" }] },
    { types: ["way"], conditions: [{ op: "eq", key: "sidewalk", value: "left" }] },
    { types: ["way"], conditions: [{ op: "eq", key: "sidewalk", value: "right" }] },
    { types: ["way"], conditions: [{ op: "eq", key: "sidewalk", value: "both" }] },
  ],
  electricity: [
    { types: ["way"], conditions: [{ op: "eq", key: "power", value: "line" }] },
    { types: ["way"], conditions: [{ op: "eq", key: "power", value: "cable" }] },
    { types: ["node"], conditions: [{ op: "eq", key: "power", value: "pole" }] },
    { types: ["node"], conditions: [{ op: "eq", key: "power", value: "tower" }] },
    { types: ["node"], conditions: [{ op: "eq", key: "power", value: "sub_station" }] },
    { types: ["way"], conditions: [{ op: "eq", key: "power", value: "substation" }] },
  ],
  "street-lights": [
    { types: ["node"], conditions: [{ op: "eq", key: "highway", value: "street_lamp" }] },
  ],
  "trolleybus-catenary": [
    { types: ["way"], conditions: [{ op: "eq", key: "trolley_wire", value: "yes" }] },
    { types: ["way"], conditions: [{ op: "eq", key: "electrified", value: "contact_line" }, { op: "notHas", key: "railway" }] },
    { types: ["node"], conditions: [{ op: "eq", key: "power", value: "catenary_mast" }, { op: "neq", key: "operator", value: "SNCF Réseau" }] },
    { types: ["node"], conditions: [{ op: "eq", key: "trolley_wire:hardware", value: "reconnection_funnel" }] },
  ],
  "public-buildings": [
    { types: ["node", "way", "relation"], conditions: [{ op: "eq", key: "amenity", value: "townhall" }] },
    { types: ["node", "way", "relation"], conditions: [{ op: "eq", key: "amenity", value: "police" }] },
    { types: ["node", "way", "relation"], conditions: [{ op: "eq", key: "amenity", value: "fire_station" }] },
    { types: ["node", "way", "relation"], conditions: [{ op: "eq", key: "amenity", value: "hospital" }] },
    { types: ["node", "way", "relation"], conditions: [{ op: "eq", key: "amenity", value: "library" }] },
    { types: ["node", "way", "relation"], conditions: [{ op: "eq", key: "amenity", value: "school" }] },
    { types: ["node", "way", "relation"], conditions: [{ op: "eq", key: "amenity", value: "university" }] },
    { types: ["node", "way", "relation"], conditions: [{ op: "eq", key: "amenity", value: "post_office" }] },
    { types: ["way"], conditions: [{ op: "eq", key: "building", value: "public" }] },
  ],
  benches: [
    { types: ["node", "way"], conditions: [{ op: "eq", key: "amenity", value: "bench" }] },
  ],
  "fire-hydrants": [
    { types: ["node"], conditions: [{ op: "eq", key: "emergency", value: "fire_hydrant" }] },
  ],
  defibrillators: [
    { types: ["node"], conditions: [{ op: "eq", key: "emergency", value: "defibrillator" }] },
  ],
  "green-spaces": [
    { types: ["way", "relation"], conditions: [{ op: "eq", key: "leisure", value: "park" }] },
    { types: ["way", "relation"], conditions: [{ op: "eq", key: "leisure", value: "garden" }] },
    { types: ["way"], conditions: [{ op: "eq", key: "landuse", value: "grass" }] },
    { types: ["way", "relation"], conditions: [{ op: "eq", key: "landuse", value: "forest" }] },
    { types: ["way"], conditions: [{ op: "eq", key: "landuse", value: "meadow" }] },
    { types: ["way"], conditions: [{ op: "eq", key: "landuse", value: "village_green" }] },
    { types: ["way", "relation"], conditions: [{ op: "eq", key: "natural", value: "wood" }] },
    { types: ["way"], conditions: [{ op: "eq", key: "natural", value: "scrub" }] },
    { types: ["way", "relation"], conditions: [{ op: "eq", key: "leisure", value: "nature_reserve" }] },
    { types: ["node"], conditions: [{ op: "eq", key: "natural", value: "tree" }] },
  ],
  "highway-areas": [
    { types: ["way", "relation"], conditions: [{ op: "has", key: "area:highway" }] },
  ],
  waste: [
    { types: ["node"], conditions: [{ op: "eq", key: "amenity", value: "waste_basket" }] },
    { types: ["node", "way"], conditions: [{ op: "eq", key: "amenity", value: "recycling" }] },
    { types: ["node", "way"], conditions: [{ op: "eq", key: "amenity", value: "waste_disposal" }] },
    { types: ["node", "way", "relation"], conditions: [{ op: "eq", key: "landuse", value: "landfill" }] },
    { types: ["node", "way", "relation"], conditions: [{ op: "eq", key: "amenity", value: "waste_transfer_station" }] },
  ],
};

function matchesCondition(tags: Record<string, string>, cond: TagCondition): boolean {
  switch (cond.op) {
    case "eq": return tags[cond.key] === cond.value;
    case "has": return cond.key in tags;
    case "neq": return tags[cond.key] !== cond.value;
    case "notHas": return !(cond.key in tags);
  }
}

function matchesRule(el: OsmElement, rule: FilterRule): boolean {
  if (!rule.types.includes(el.type)) return false;
  const tags = el.tags ?? {};
  return rule.conditions.every((c) => matchesCondition(tags, c));
}

export interface FilterResult {
  matchedIds: Set<number>;
  /** Node IDs that matched a filter rule directly (not just as way/relation members) */
  directNodeIds: Set<number>;
}

export function filterElements(elements: OsmElement[], rules: FilterRule[]): FilterResult {
  const matchedIds = new Set<number>();
  const directNodeIds = new Set<number>();

  // Pass 1: match ways/relations and collect their member IDs
  for (const el of elements) {
    if (el.type === "node") continue;
    if (rules.some((r) => matchesRule(el, r))) {
      matchedIds.add(el.id);
      if (el.type === "way" && el.nodes) {
        for (const nid of el.nodes) matchedIds.add(nid);
      }
      if (el.type === "relation" && el.members) {
        for (const m of el.members) matchedIds.add(m.ref);
      }
    }
  }

  // Pass 2: match nodes — includes nodes already added as way members
  for (const el of elements) {
    if (el.type !== "node") continue;
    if (rules.some((r) => matchesRule(el, r))) {
      matchedIds.add(el.id);
      directNodeIds.add(el.id);
    }
  }

  return { matchedIds, directNodeIds };
}
