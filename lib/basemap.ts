/**
 * Shared basemap tile layer for the HERE maps used across the app.
 *
 * We previously pulled CARTO Positron tiles from basemaps.cartocdn.com without
 * a key. CARTO began requiring an API key on that endpoint, so those tiles
 * started rendering as an "API KEY REQUIRED" placeholder image. We now use
 * HERE's own raster tiles, which our existing HERE key already covers.
 *
 * `lite.day` is HERE's minimal light style — the closest analogue to Positron,
 * so markers stay the most prominent thing on the map.
 */

const HERE_API_KEY = process.env.NEXT_PUBLIC_HERE_API_KEY;

const TILE_SIZE = 512;
const STYLE = "lite.day";

/**
 * Builds the raster tile layer. `H` is passed in rather than read off `window`
 * so callers keep control of script-load ordering.
 */
export function createBasemapLayer(H: any) {
  if (!HERE_API_KEY) {
    console.error(
      "NEXT_PUBLIC_HERE_API_KEY is not set — basemap tiles will not load."
    );
  }

  return new H.map.layer.TileLayer(
    new H.map.provider.ImageTileProvider({
      getURL: (col: number, row: number, zoom: number) =>
        `https://maps.hereapi.com/v3/base/mc/${zoom}/${col}/${row}/png8` +
        `?apiKey=${HERE_API_KEY}` +
        `&size=${TILE_SIZE}` +
        `&style=${STYLE}` +
        // ppi=400 is HERE's high-DPI variant, matching the @2x tiles we used
        // to request from CARTO.
        (window.devicePixelRatio > 1 ? "&ppi=400" : ""),
      min: 0,
      max: 19,
      opacity: 1.0,
      tileSize: TILE_SIZE,
    })
  );
}
