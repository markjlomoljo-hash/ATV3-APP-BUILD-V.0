// Minimal standard geohash implementation used to store only a coarse
// location (never precise GPS coordinates) alongside weather snapshots.
const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

export function encodeGeohash(latitude: number, longitude: number, precision = 6): string {
  let latMin = -90;
  let latMax = 90;
  let lonMin = -180;
  let lonMax = 180;
  let isEven = true;
  let bit = 0;
  let ch = 0;
  let geohash = "";

  while (geohash.length < precision) {
    if (isEven) {
      const mid = (lonMin + lonMax) / 2;
      if (longitude > mid) {
        ch |= 1 << (4 - bit);
        lonMin = mid;
      } else {
        lonMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (latitude > mid) {
        ch |= 1 << (4 - bit);
        latMin = mid;
      } else {
        latMax = mid;
      }
    }
    isEven = !isEven;
    if (bit < 4) {
      bit++;
    } else {
      geohash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return geohash;
}

/** Decodes a geohash to its bounding-box centroid (coarse, not precise GPS). */
export function decodeGeohashCentroid(geohash: string): { latitude: number; longitude: number } {
  let latMin = -90;
  let latMax = 90;
  let lonMin = -180;
  let lonMax = 180;
  let isEven = true;

  for (const char of geohash) {
    const idx = BASE32.indexOf(char);
    if (idx === -1) continue;
    for (let bit = 4; bit >= 0; bit--) {
      const bitValue = (idx >> bit) & 1;
      if (isEven) {
        const mid = (lonMin + lonMax) / 2;
        if (bitValue === 1) lonMin = mid;
        else lonMax = mid;
      } else {
        const mid = (latMin + latMax) / 2;
        if (bitValue === 1) latMin = mid;
        else latMax = mid;
      }
      isEven = !isEven;
    }
  }

  return { latitude: (latMin + latMax) / 2, longitude: (lonMin + lonMax) / 2 };
}
