// Minimal ambient types for the HERE Maps JS API (v3.1), which is loaded at
// runtime via <script> tags and exposes a global `H`. The full SDK ships no
// types, so this declares only the surface HereMap.tsx actually uses. Widen it
// as new SDK calls are added rather than reaching back for `any`.

interface HGeoPoint {
  lat: number;
  lng: number;
}

interface HIconOptions {
  size?: { w: number; h: number };
  anchor?: { x: number; y: number };
}

interface HLookAtData {
  position: HGeoPoint;
  zoom?: number;
}

interface HAnimationOptions {
  duration?: number;
  ease?: unknown;
}

interface HMapObject {
  getData<T = unknown>(): T;
  setData(data: unknown): void;
  setGeometry(point: HGeoPoint): void;
  addEventListener(
    type: string,
    handler: (evt: { target: HMapObject }) => void
  ): void;
}

interface HViewModel {
  setLookAtData(
    data: HLookAtData,
    animate?: boolean,
    animation?: HAnimationOptions
  ): void;
}

interface HViewPort {
  resize(): void;
}

interface HMap {
  getZoom(): number;
  getViewModel(): HViewModel;
  getViewPort(): HViewPort;
  getObjects(): HMapObject[];
  addObject(object: HMapObject): void;
  addObjects(objects: HMapObject[]): void;
  removeObject(object: HMapObject): void;
  removeObjects(objects: HMapObject[]): void;
  addEventListener(type: string, handler: () => void): void;
  dispose(): void;
}

interface HTileProviderOptions {
  getURL: (col: number, row: number, zoom: number) => string;
  min?: number;
  max?: number;
  opacity?: number;
  tileSize?: number;
}

interface HMapOptions {
  zoom?: number;
  center?: HGeoPoint;
  pixelRatio?: number;
}

/** The `H` global the HERE script attaches to `window`. */
interface HNamespace {
  Map: new (
    element: HTMLElement,
    baseLayer: unknown,
    options?: HMapOptions
  ) => HMap;
  map: {
    Marker: new (
      position: HGeoPoint,
      options?: { icon?: unknown; zIndex?: number }
    ) => HMapObject;
    Icon: new (url: string, options?: HIconOptions) => unknown;
    layer: {
      TileLayer: new (provider: unknown) => unknown;
    };
    provider: {
      ImageTileProvider: new (options: HTileProviderOptions) => unknown;
    };
  };
  mapevents: {
    MapEvents: new (map: HMap) => unknown;
    Behavior: new (mapEvents: unknown) => unknown;
  };
  util: {
    animation: {
      ease: { EASE_OUT: unknown };
    };
  };
}

interface Window {
  H: HNamespace;
}
