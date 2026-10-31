const EARTH_RADIUS = 6378137;

// Local origin near central Tokyo.
// Coordinates returned are metres relative to this origin.
export function createGeoConverter(
  originLongitude = 139.756,
  originLatitude = 35.687,
  originHeight = 0,
) {
  const longitudeScale =
    EARTH_RADIUS * Math.cos((originLatitude * Math.PI) / 180);
  const latitudeScale = EARTH_RADIUS;

  return function toLocal(longitude, latitude, height = 0) {
    return {
      x: ((longitude - originLongitude) * Math.PI / 180) * longitudeScale,
      y: height - originHeight,
      z: -((latitude - originLatitude) * Math.PI / 180) * latitudeScale,
    };
  };
}
