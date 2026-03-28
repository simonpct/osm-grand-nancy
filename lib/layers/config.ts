import type { LayerCategory } from "@/lib/layers/categories";

export interface PopupFieldConfig {
  /** OSM property key (supports nested like "fire_hydrant:type") */
  key: string;
  /** Display label in the popup */
  label: string;
  /** Map of raw values to display values */
  values?: Record<string, string>;
  /** Show as badge in the header instead of a row */
  badge?: boolean;
  /** Show as italic note block */
  note?: boolean;
  /** Show as small source line */
  source?: boolean;
  /** Render as boolean Oui/Non */
  boolean?: boolean;
}

export interface LayerConfig {
  id: LayerCategory;
  label: string;
  color: string;
  type: "point" | "line" | "polygon" | "mixed";
  icon?: string;
  popupFields?: PopupFieldConfig[];
}

export const layersConfig: LayerConfig[] = [
  {
    id: "bus-lines", label: "Lignes de bus", color: "#e63946", type: "mixed", icon: "🚌",
    popupFields: [
      { key: "name", label: "Nom" },
      { key: "ref", label: "Ligne", badge: true },
      { key: "operator", label: "Opérateur" },
      { key: "network", label: "Réseau" },
    ],
  },
  {
    id: "cycling-paths", label: "Pistes cyclables", color: "#2a9d8f", type: "line", icon: "🚴",
    popupFields: [
      { key: "name", label: "Nom" },
      { key: "surface", label: "Revêtement" },
      { key: "width", label: "Largeur" },
      { key: "lit", label: "Éclairé", boolean: true },
    ],
  },
  {
    id: "sidewalks", label: "Trottoirs", color: "#a8dadc", type: "line", icon: "🚶",
    popupFields: [
      { key: "name", label: "Nom" },
      { key: "surface", label: "Revêtement" },
      { key: "width", label: "Largeur" },
    ],
  },
  {
    id: "electricity", label: "Électricité", color: "#f4a261", type: "mixed", icon: "⚡",
    popupFields: [
      { key: "name", label: "Nom" },
      { key: "power", label: "Type" },
      { key: "operator", label: "Opérateur" },
      { key: "voltage", label: "Tension" },
    ],
  },
  {
    id: "street-lights", label: "Éclairage public", color: "#e9c46a", type: "point", icon: "💡",
    popupFields: [
      { key: "ref", label: "Réf.", badge: true },
      { key: "lamp_type", label: "Type de lampe" },
      { key: "light:method", label: "Méthode" },
      { key: "light:count", label: "Nombre" },
      { key: "height", label: "Hauteur" },
      { key: "operator", label: "Opérateur" },
    ],
  },
  {
    id: "trolleybus-catenary", label: "Caténaires trolley", color: "#264653", type: "mixed", icon: "🚎",
    popupFields: [
      { key: "name", label: "Nom" },
      { key: "operator", label: "Opérateur" },
      { key: "voltage", label: "Tension" },
    ],
  },
  {
    id: "public-buildings", label: "Bâtiments publics", color: "#6a4c93", type: "mixed", icon: "🏛️",
    popupFields: [
      { key: "name", label: "Nom" },
      { key: "amenity", label: "Type" },
      { key: "operator", label: "Opérateur" },
      { key: "opening_hours", label: "Horaires" },
      { key: "wheelchair", label: "Accessible PMR", boolean: true },
    ],
  },
  {
    id: "benches", label: "Bancs", color: "#8ac926", type: "point", icon: "🪑",
    popupFields: [
      { key: "material", label: "Matériau" },
      { key: "backrest", label: "Dossier", boolean: true },
      { key: "seats", label: "Places" },
      { key: "colour", label: "Couleur" },
      { key: "operator", label: "Opérateur" },
    ],
  },
  {
    id: "fire-hydrants", label: "Bornes incendie", color: "#ff595e", type: "point", icon: "🚒",
    popupFields: [
      { key: "ref", label: "Réf.", badge: true },
      { key: "fire_hydrant:type", label: "Type", values: { pillar: "Poteau", underground: "Souterraine", wall: "Murale", pipe: "Tuyau" } },
      { key: "fire_hydrant:position", label: "Position", values: { sidewalk: "Trottoir", lane: "Chaussée", parking_lot: "Parking", green: "Espace vert" } },
      { key: "couplings", label: "Raccords" },
      { key: "protected", label: "Protégée", boolean: true },
      { key: "note", label: "", note: true },
      { key: "source", label: "", source: true },
    ],
  },
  {
    id: "defibrillators", label: "Défibrillateurs", color: "#1982c4", type: "point", icon: "💙",
    popupFields: [
      { key: "operator", label: "Opérateur" },
      { key: "opening_hours", label: "Horaires" },
      { key: "indoor", label: "Intérieur", boolean: true },
      { key: "access", label: "Accès" },
      { key: "description", label: "", note: true },
    ],
  },
  {
    id: "green-spaces", label: "Espaces verts", color: "#2d6a4f", type: "mixed", icon: "🌳",
    popupFields: [
      { key: "name", label: "Nom" },
      { key: "leisure", label: "Type" },
      { key: "natural", label: "Nature", values: { tree: "Arbre", wood: "Bois", grassland: "Prairie", scrub: "Fourré" } },
      { key: "landuse", label: "Usage" },
      { key: "operator", label: "Gestionnaire" },
      { key: "opening_hours", label: "Horaires" },
    ],
  },
  {
    id: "waste", label: "Déchets & recyclage", color: "#6b705c", type: "mixed", icon: "♻️",
    popupFields: [
      { key: "amenity", label: "Type", values: { waste_basket: "Corbeille", recycling: "Recyclage", waste_disposal: "Benne", waste_transfer_station: "Déchetterie" } },
      { key: "recycling_type", label: "Recyclage" },
      { key: "operator", label: "Opérateur" },
      { key: "opening_hours", label: "Horaires" },
      { key: "waste", label: "Déchets acceptés" },
    ],
  },
];

export function getLayerConfig(id: LayerCategory): LayerConfig {
  return layersConfig.find((l) => l.id === id)!;
}
