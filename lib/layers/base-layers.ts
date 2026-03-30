export interface BaseLayer {
  id: string;
  label: string;
  tiles: string[];
  attribution: string;
  tileSize?: number;
}

export interface SatelliteYear {
  year: string;
  label: string;
  tiles: string[];
  attribution: string;
  tileSize?: number;
}

export const baseLayers: BaseLayer[] = [
  {
    id: "osm",
    label: "OpenStreetMap",
    tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  {
    id: "cadastre",
    label: "Cadastre",
    tiles: [
      "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=CADASTRALPARCELS.PARCELLAIRE_EXPRESS&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}",
    ],
    attribution: '&copy; <a href="https://www.cadastre.gouv.fr">Cadastre</a>',
    tileSize: 256,
  },
  {
    id: "plan-ign",
    label: "Plan IGN",
    tiles: [
      "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}",
    ],
    attribution: '&copy; <a href="https://geoservices.ign.fr">IGN</a>',
    tileSize: 256,
  },
  {
    id: "satellite",
    label: "Satellite IGN",
    tiles: [
      "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&FORMAT=image/jpeg&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}",
    ],
    attribution: '&copy; <a href="https://geoservices.ign.fr">IGN</a>',
    tileSize: 256,
  }
];

// TMS: {zoom}/{x}/{y} → MapLibre uses {z}/{x}/{y} directly
// WMS: need to convert {proj},{width},{height},{bbox} → MapLibre {bbox-epsg-3857} tile URL
function wmsToTileUrl(wmsUrl: string): string {
  return wmsUrl
    .replace("{proj}", "EPSG:3857")
    .replace("{width}", "256")
    .replace("{height}", "256")
    .replace("{bbox}", "{bbox-epsg-3857}");
}

function tmsToTileUrl(tmsUrl: string): string {
  return tmsUrl.replace("{zoom}", "{z}");
}

export const satelliteYears: SatelliteYear[] = [
  {
    year: "2025",
    label: "Nancy 2025",
    tiles: [wmsToTileUrl("https://www.datagrandest.fr/geoserver/grand-nancy/ows?FORMAT=image/png&TRANSPARENT=TRUE&VERSION=1.3.0&SERVICE=WMS&REQUEST=GetMap&LAYERS=GrandNancy_2024-MAJ_2025-RVB_5cm_L93_cog&STYLES=&CRS={proj}&WIDTH={width}&HEIGHT={height}&BBOX={bbox}")],
    attribution: '&copy; <a href="https://www.datagrandest.fr">Data Grand Est</a>',
    tileSize: 256,
  },
  {
    year: "2024",
    label: "Nancy 2024",
    tiles: [wmsToTileUrl("https://www.datagrandest.fr/geoserver/grand-nancy/ows?FORMAT=image/png&TRANSPARENT=TRUE&VERSION=1.3.0&SERVICE=WMS&REQUEST=GetMap&LAYERS=GrandNancy_2024-RVB_5cm_L93&STYLES=&CRS={proj}&WIDTH={width}&HEIGHT={height}&BBOX={bbox}")],
    attribution: '&copy; <a href="https://www.datagrandest.fr">Data Grand Est</a>',
    tileSize: 256,
  },
  {
    year: "2023",
    label: "Nancy 2023",
    tiles: [wmsToTileUrl("https://wms.openstreetmap.fr/wms?FORMAT=image/png&TRANSPARENT=TRUE&VERSION=1.3.0&SERVICE=WMS&REQUEST=GetMap&LAYERS=nancy_2023&STYLES=&CRS={proj}&WIDTH={width}&HEIGHT={height}&BBOX={bbox}")],
    attribution: '&copy; <a href="https://wms.openstreetmap.fr">OSM France</a>',
    tileSize: 256,
  },
  {
    year: "2022",
    label: "Nancy 2022",
    tiles: [wmsToTileUrl("https://www.datagrandest.fr/geoserver/ows?FORMAT=image/png&TRANSPARENT=TRUE&VERSION=1.3.0&SERVICE=WMS&REQUEST=GetMap&LAYERS=grand-nancy:grandnancy_ortho2022&STYLES=&CRS={proj}&WIDTH={width}&HEIGHT={height}&BBOX={bbox}")],
    attribution: '&copy; <a href="https://www.datagrandest.fr">Data Grand Est</a>',
    tileSize: 256,
  },
  {
    year: "2016",
    label: "Nancy 2016",
    tiles: [tmsToTileUrl("https://wms.openstreetmap.fr/tms/1.0.0/nancy_2016/{zoom}/{x}/{y}")],
    attribution: '&copy; <a href="https://wms.openstreetmap.fr">OSM France</a>',
  },
  {
    year: "2012",
    label: "Nancy 2012",
    tiles: [tmsToTileUrl("https://wms.openstreetmap.fr/tms/1.0.0/nancy_2012/{zoom}/{x}/{y}")],
    attribution: '&copy; <a href="https://wms.openstreetmap.fr">OSM France</a>',
  },
  {
    year: "2008",
    label: "Nancy 2008",
    tiles: [tmsToTileUrl("https://wms.openstreetmap.fr/tms/1.0.0/nancy_2008/{zoom}/{x}/{y}")],
    attribution: '&copy; <a href="https://wms.openstreetmap.fr">OSM France</a>',
  },
  {
    year: "2005",
    label: "Nancy 2005",
    tiles: [tmsToTileUrl("https://wms.openstreetmap.fr/tms/1.0.0/nancy_2005/{zoom}/{x}/{y}")],
    attribution: '&copy; <a href="https://wms.openstreetmap.fr">OSM France</a>',
  },
  {
    year: "2002",
    label: "Nancy 2002",
    tiles: [tmsToTileUrl("https://wms.openstreetmap.fr/tms/1.0.0/nancy_2002/{zoom}/{x}/{y}")],
    attribution: '&copy; <a href="https://wms.openstreetmap.fr">OSM France</a>',
  },
  {
    year: "2001",
    label: "Nancy 2001",
    tiles: [tmsToTileUrl("https://wms.openstreetmap.fr/tms/1.0.0/nancy_2001/{zoom}/{x}/{y}")],
    attribution: '&copy; <a href="https://wms.openstreetmap.fr">OSM France</a>',
  },
  {
    year: "1999",
    label: "Nancy 1999",
    tiles: [tmsToTileUrl("https://wms.openstreetmap.fr/tms/1.0.0/nancy_1999/{zoom}/{x}/{y}")],
    attribution: '&copy; <a href="https://wms.openstreetmap.fr">OSM France</a>',
  },
  {
    year: "1994",
    label: "Nancy 1994",
    tiles: [tmsToTileUrl("https://wms.openstreetmap.fr/tms/1.0.0/nancy_1994/{zoom}/{x}/{y}")],
    attribution: '&copy; <a href="https://wms.openstreetmap.fr">OSM France</a>',
  },
];
