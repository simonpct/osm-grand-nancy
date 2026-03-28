import type { FeatureCollection, Feature, LineString, Polygon, MultiPolygon, Position } from "geojson";
import type { LayerCategory } from "@/lib/layers/categories";
import { layersConfig } from "@/lib/layers/config";

/** A single headline fact shown in the rotating pill */
export interface FunFact {
  icon: string;
  text: string;
}

/** A ranked item in a "top N" list */
export interface RankedItem {
  name: string;
  value: string;
}

/** A section in the stats drawer */
export interface StatSection {
  icon: string;
  title: string;
  stats: { label: string; value: string }[];
  top?: { title: string; items: RankedItem[] };
}

export interface FactsPayload {
  facts: FunFact[];
  sections: StatSection[];
}

type DataMap = Partial<Record<LayerCategory, FeatureCollection>>;

function haversine(a: Position, b: Position): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function lineLength(coords: Position[]): number {
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    total += haversine(coords[i - 1], coords[i]);
  }
  return total;
}

function ringArea(coords: Position[]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  let area = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const [lon1, lat1] = coords[i];
    const [lon2, lat2] = coords[i + 1];
    area += toRad(lon2 - lon1) * (2 + Math.sin(toRad(lat1)) + Math.sin(toRad(lat2)));
  }
  return Math.abs((area * R * R) / 2);
}

function featureArea(f: Feature): number {
  if (f.geometry.type === "Polygon") {
    return ringArea((f.geometry as Polygon).coordinates[0]);
  }
  if (f.geometry.type === "MultiPolygon") {
    return (f.geometry as MultiPolygon).coordinates.reduce(
      (sum, poly) => sum + ringArea(poly[0]),
      0
    );
  }
  return 0;
}

function count(fc: FeatureCollection | undefined): number {
  return fc?.features.length ?? 0;
}

function pts(fc: FeatureCollection | undefined): Feature[] {
  return fc?.features.filter((f) => f.geometry.type === "Point") ?? [];
}

function lns(fc: FeatureCollection | undefined): Feature[] {
  return (
    fc?.features.filter(
      (f) => f.geometry.type === "LineString" || f.geometry.type === "MultiLineString"
    ) ?? []
  );
}

function polys(fc: FeatureCollection | undefined): Feature[] {
  return (
    fc?.features.filter(
      (f) => f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon"
    ) ?? []
  );
}

function fmtKm(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m)} m`;
}

function fmtHa(m2: number): string {
  const ha = m2 / 10000;
  if (ha >= 1) return `${ha.toFixed(1)} ha`;
  return `${Math.round(m2)} m²`;
}

function fmtN(n: number): string {
  return n.toLocaleString("fr-FR");
}

function mostCommon(values: string[]): { value: string; count: number } | null {
  const freq = new Map<string, number>();
  for (const v of values) freq.set(v, (freq.get(v) ?? 0) + 1);
  let best: string | null = null;
  let max = 0;
  for (const [k, c] of freq) {
    if (c > max) { best = k; max = c; }
  }
  return best ? { value: best, count: max } : null;
}

function topN<T>(items: T[], key: (item: T) => number, n: number): T[] {
  return [...items].sort((a, b) => key(b) - key(a)).slice(0, n);
}

function featureName(f: Feature): string {
  return (f.properties?.name as string) || "Sans nom";
}

function icon(id: LayerCategory): string {
  return layersConfig.find((l) => l.id === id)?.icon ?? "📍";
}

function featureLineLength(f: Feature): number {
  if (f.geometry.type === "LineString") return lineLength((f.geometry as LineString).coordinates);
  return 0;
}

function totalLineLength(features: Feature[]): number {
  return features.reduce((sum, f) => sum + featureLineLength(f), 0);
}

export function computeFacts(data: DataMap): FactsPayload {
  const facts: FunFact[] = [];
  const sections: StatSection[] = [];

  // ── Cycling paths ──
  const cyclingLines = lns(data["cycling-paths"]);
  if (cyclingLines.length > 0) {
    const total = totalLineLength(cyclingLines);
    const litCount = cyclingLines.filter((f) => f.properties?.lit === "yes").length;
    const litPct = Math.round((litCount / cyclingLines.length) * 100);
    const top3 = topN(cyclingLines, featureLineLength, 3);

    facts.push({ icon: icon("cycling-paths"), text: `Le réseau cyclable s'étend sur ${fmtKm(total)}` });
    if (litCount > 0) {
      facts.push({ icon: icon("cycling-paths"), text: `${litPct}% des pistes cyclables sont éclairées` });
    }

    sections.push({
      icon: icon("cycling-paths"),
      title: "Pistes cyclables",
      stats: [
        { label: "Total", value: fmtKm(total) },
        { label: "Segments", value: fmtN(cyclingLines.length) },
        ...(litCount > 0 ? [{ label: "Éclairées", value: `${litPct}%` }] : []),
      ],
      top: {
        title: "Top 3 des plus longues",
        items: top3.map((f) => ({
          name: featureName(f),
          value: fmtKm(featureLineLength(f)),
        })),
      },
    });
  }

  // ── Sidewalks ──
  const sidewalkLines = lns(data.sidewalks);
  if (sidewalkLines.length > 0) {
    const total = totalLineLength(sidewalkLines);
    const top3 = topN(sidewalkLines, featureLineLength, 3);

    facts.push({ icon: icon("sidewalks"), text: `${fmtKm(total)} de trottoirs et chemins piétons` });

    sections.push({
      icon: icon("sidewalks"),
      title: "Trottoirs & chemins",
      stats: [
        { label: "Total", value: fmtKm(total) },
        { label: "Segments", value: fmtN(sidewalkLines.length) },
      ],
      top: {
        title: "Top 3 des plus longs",
        items: top3.map((f) => ({
          name: featureName(f),
          value: fmtKm(featureLineLength(f)),
        })),
      },
    });
  }

  // ── Bus lines ──
  const busStops = pts(data["bus-lines"]);
  const busRoutes = data["bus-lines"]?.features.filter(
    (f) => f.geometry.type !== "Point" && f.properties?.type === "route"
  ) ?? [];
  if (busStops.length > 0 || busRoutes.length > 0) {
    if (busStops.length > 0) {
      facts.push({ icon: icon("bus-lines"), text: `${fmtN(busStops.length)} arrêts de bus dans la métropole` });
    }
    if (busRoutes.length > 0) {
      facts.push({ icon: icon("bus-lines"), text: `${busRoutes.length} lignes de bus sillonnent le Grand Nancy` });
    }

    const section: StatSection = {
      icon: icon("bus-lines"),
      title: "Bus",
      stats: [
        ...(busRoutes.length > 0 ? [{ label: "Lignes", value: fmtN(busRoutes.length) }] : []),
        ...(busStops.length > 0 ? [{ label: "Arrêts", value: fmtN(busStops.length) }] : []),
      ],
    };

    // top 3 longest bus routes
    const routeLines = busRoutes.filter((f) => f.geometry.type === "LineString");
    if (routeLines.length > 0) {
      const top3 = topN(routeLines, featureLineLength, 3);
      section.top = {
        title: "Top 3 des plus longues lignes",
        items: top3.map((f) => ({
          name: f.properties?.ref ? `Ligne ${f.properties.ref}` : featureName(f),
          value: fmtKm(featureLineLength(f)),
        })),
      };
    }

    sections.push(section);
  }

  // ── Street lights ──
  const streetLightCount = count(data["street-lights"]);
  if (streetLightCount > 0) {
    facts.push({ icon: icon("street-lights"), text: `Nancy compte ${fmtN(streetLightCount)} lampadaires référencés` });

    const lampTypes = pts(data["street-lights"])
      .map((f) => f.properties?.lamp_type as string)
      .filter(Boolean);
    const topType = mostCommon(lampTypes);

    sections.push({
      icon: icon("street-lights"),
      title: "Éclairage public",
      stats: [
        { label: "Lampadaires", value: fmtN(streetLightCount) },
        ...(topType ? [{ label: "Type le plus courant", value: topType.value }] : []),
      ],
    });
  }

  // ── Electricity ──
  const elecLines = lns(data.electricity);
  if (elecLines.length > 0) {
    const total = totalLineLength(elecLines);
    facts.push({ icon: icon("electricity"), text: `${fmtKm(total)} de lignes électriques traversent la métropole` });

    const top3 = topN(elecLines, featureLineLength, 3);
    sections.push({
      icon: icon("electricity"),
      title: "Électricité",
      stats: [
        { label: "Longueur totale", value: fmtKm(total) },
        { label: "Segments", value: fmtN(elecLines.length) },
      ],
      top: {
        title: "Top 3 des plus longues lignes",
        items: top3.map((f) => ({
          name: featureName(f),
          value: fmtKm(featureLineLength(f)),
        })),
      },
    });
  }

  // ── Benches ──
  const benchCount = count(data.benches);
  if (benchCount > 0) {
    facts.push({ icon: icon("benches"), text: `Il y a ${fmtN(benchCount)} bancs publics dans la métropole` });

    const benchPts = pts(data.benches);
    const materials = benchPts.map((f) => f.properties?.material as string).filter(Boolean);
    const topMat = mostCommon(materials);
    const withBackrest = benchPts.filter((f) => f.properties?.backrest === "yes").length;
    const backrestPct = Math.round((withBackrest / benchCount) * 100);

    sections.push({
      icon: icon("benches"),
      title: "Bancs",
      stats: [
        { label: "Total", value: fmtN(benchCount) },
        ...(withBackrest > 0 ? [{ label: "Avec dossier", value: `${backrestPct}%` }] : []),
        ...(topMat ? [{ label: "Matériau principal", value: topMat.value }] : []),
      ],
    });
  }

  // ── Fire hydrants ──
  const hydrantCount = count(data["fire-hydrants"]);
  if (hydrantCount > 0) {
    facts.push({ icon: icon("fire-hydrants"), text: `${fmtN(hydrantCount)} bornes incendie protègent la métropole` });

    const hydrantPts = pts(data["fire-hydrants"]);
    const types = hydrantPts.map((f) => f.properties?.["fire_hydrant:type"] as string).filter(Boolean);
    const typeLabels: Record<string, string> = { pillar: "Poteau", underground: "Souterraine", wall: "Murale", pipe: "Tuyau" };
    const topType = mostCommon(types);

    const positions = hydrantPts.map((f) => f.properties?.["fire_hydrant:position"] as string).filter(Boolean);
    const posLabels: Record<string, string> = { sidewalk: "Trottoir", lane: "Chaussée", parking_lot: "Parking", green: "Espace vert" };
    const topPos = mostCommon(positions);

    sections.push({
      icon: icon("fire-hydrants"),
      title: "Bornes incendie",
      stats: [
        { label: "Total", value: fmtN(hydrantCount) },
        ...(topType ? [{ label: "Type principal", value: typeLabels[topType.value] ?? topType.value }] : []),
        ...(topPos ? [{ label: "Position courante", value: posLabels[topPos.value] ?? topPos.value }] : []),
      ],
    });
  }

  // ── Defibrillators ──
  const defibCount = count(data.defibrillators);
  if (defibCount > 0) {
    facts.push({ icon: icon("defibrillators"), text: `${fmtN(defibCount)} défibrillateurs sont accessibles au public` });

    const defibPts = pts(data.defibrillators);
    const indoor = defibPts.filter((f) => f.properties?.indoor === "yes").length;

    sections.push({
      icon: icon("defibrillators"),
      title: "Défibrillateurs",
      stats: [
        { label: "Total", value: fmtN(defibCount) },
        ...(indoor > 0 ? [{ label: "En intérieur", value: `${Math.round((indoor / defibCount) * 100)}%` }] : []),
      ],
    });
  }

  // ── Green spaces ──
  const greenPolygons = polys(data["green-spaces"]);
  const treeCount = pts(data["green-spaces"]).length;
  if (greenPolygons.length > 0 || treeCount > 0) {
    const totalArea = greenPolygons.reduce((sum, f) => sum + featureArea(f), 0);

    if (totalArea > 0) {
      facts.push({ icon: icon("green-spaces"), text: `Les espaces verts couvrent environ ${fmtHa(totalArea)}` });
    }
    if (treeCount > 0) {
      facts.push({ icon: "🌳", text: `${fmtN(treeCount)} arbres sont répertoriés dans la métropole` });
    }

    const top3 = topN(greenPolygons.filter((f) => f.properties?.name), featureArea, 3);

    sections.push({
      icon: icon("green-spaces"),
      title: "Espaces verts",
      stats: [
        ...(totalArea > 0 ? [{ label: "Surface totale", value: fmtHa(totalArea) }] : []),
        { label: "Zones", value: fmtN(greenPolygons.length) },
        ...(treeCount > 0 ? [{ label: "Arbres", value: fmtN(treeCount) }] : []),
      ],
      ...(top3.length > 0
        ? {
            top: {
              title: "Top 3 des plus grands",
              items: top3.map((f) => ({
                name: featureName(f),
                value: fmtHa(featureArea(f)),
              })),
            },
          }
        : {}),
    });
  }

  // ── Public buildings ──
  const buildingCount = count(data["public-buildings"]);
  if (buildingCount > 0) {
    facts.push({ icon: icon("public-buildings"), text: `${fmtN(buildingCount)} bâtiments publics (écoles, mairies, bibliothèques…)` });

    const amenities = (data["public-buildings"]?.features ?? [])
      .map((f) => f.properties?.amenity as string)
      .filter(Boolean);
    const amenityLabels: Record<string, string> = {
      school: "Écoles", university: "Universités", library: "Bibliothèques",
      hospital: "Hôpitaux", townhall: "Mairies", police: "Police",
      fire_station: "Casernes", post_office: "Postes",
    };
    const freq = new Map<string, number>();
    for (const a of amenities) freq.set(a, (freq.get(a) ?? 0) + 1);
    const breakdown = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k, v]) => ({ label: amenityLabels[k] ?? k, value: fmtN(v) }));

    sections.push({
      icon: icon("public-buildings"),
      title: "Bâtiments publics",
      stats: [{ label: "Total", value: fmtN(buildingCount) }, ...breakdown],
    });
  }

  // ── Waste ──
  const wasteCount = count(data.waste);
  if (wasteCount > 0) {
    facts.push({ icon: icon("waste"), text: `${fmtN(wasteCount)} points de collecte de déchets et recyclage` });

    const wasteTypes = (data.waste?.features ?? [])
      .map((f) => f.properties?.amenity as string)
      .filter(Boolean);
    const wasteLabels: Record<string, string> = {
      waste_basket: "Corbeilles", recycling: "Recyclage",
      waste_disposal: "Bennes", waste_transfer_station: "Déchetteries",
    };
    const freq = new Map<string, number>();
    for (const t of wasteTypes) freq.set(t, (freq.get(t) ?? 0) + 1);
    const breakdown = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => ({ label: wasteLabels[k] ?? k, value: fmtN(v) }));

    sections.push({
      icon: icon("waste"),
      title: "Déchets & recyclage",
      stats: [{ label: "Total", value: fmtN(wasteCount) }, ...breakdown],
    });
  }

  // ── Trolleybus ──
  const trolleyLines = lns(data["trolleybus-catenary"]);
  if (trolleyLines.length > 0) {
    const total = totalLineLength(trolleyLines);
    facts.push({ icon: icon("trolleybus-catenary"), text: `${fmtKm(total)} de caténaires de trolleybus` });

    sections.push({
      icon: icon("trolleybus-catenary"),
      title: "Caténaires trolley",
      stats: [
        { label: "Longueur totale", value: fmtKm(total) },
        { label: "Segments", value: fmtN(trolleyLines.length) },
      ],
    });
  }

  return { facts, sections };
}
