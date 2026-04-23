declare module "@maplibre/maplibre-gl-compare" {
  import type { Map as MaplibreMap } from "maplibre-gl";

  interface CompareOptions {
    orientation?: "vertical" | "horizontal";
    mousemove?: boolean;
  }

  export default class Compare {
    constructor(a: MaplibreMap, b: MaplibreMap, container: string | HTMLElement, options?: CompareOptions);
    setSlider(x: number): void;
    on(type: "slideend", listener: (e: { currentPosition: number }) => void): this;
    off(type: "slideend", listener: (e: { currentPosition: number }) => void): this;
    remove(): void;
  }
}
