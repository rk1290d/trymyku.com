import placesData from './places.data.json';

/**
 * geo.ts — the truth behind the service-area drawing.
 *
 * WHAT THIS REPLACED. The radar used to place town names in four HARDCODED
 * corners inside rings of a FIXED pixel radius, so it drew the same picture for
 * a mechanic who travels 3 miles and one who travels 60, anywhere in the
 * country. Rohaan, correctly: "doesn't matter what location you choose the
 * surrounding areas stay the same on it... the current website is fake."
 *
 * PRIVACY, and this is the load-bearing decision. The circle is centred on the
 * OFFICIAL CENTROID OF HIS CITY, resolved from the `service_city` STRING that is
 * already public on his page. His stored `mechanic_profiles.lat/lng` is never
 * published, never added to web_mechanic_pages, and never reaches this process.
 *
 * That is deliberate even though the stored point is already rounded to 2dp by a
 * database trigger: `service_city` is a free-text field, and the app geocodes
 * whatever string is in it, so a mechanic who typed his street address would
 * have his house geocoded to within about a kilometre. Deriving the centre from
 * the city NAME instead means the published centre can never be more precise
 * than the city he already chose to name.
 *
 * The data is the US Census Gazetteer (public domain), committed as
 * places.data.json and imported server-side only, so there is no API key, no
 * per-render billing and no external host in the request path.
 */

type PlaceRow = [name: string, state: string, lat: number, lng: number, tier: number];
const BUCKETS = placesData as unknown as Record<string, PlaceRow[]>;

export type Place = { name: string; state: string; lat: number; lng: number };
export type NearbyTown = Place & {
  /** Real great-circle distance from the centre, in miles. */
  miles: number;
  /** Real compass bearing from the centre, degrees clockwise from north. */
  bearing: number;
};

const R_EARTH_MI = 3958.8;
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/** Great-circle distance in miles. Mirrors haversineMi in the app's mapShared.ts;
 *  the two repos share no code, so the formula is duplicated on purpose. */
export function haversineMi(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_EARTH_MI * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Initial bearing from a to b, degrees clockwise from north. */
export function bearingDeg(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLng = rad(bLng - aLng);
  const y = Math.sin(dLng) * Math.cos(rad(bLat));
  const x =
    Math.cos(rad(aLat)) * Math.sin(rad(bLat)) -
    Math.sin(rad(aLat)) * Math.cos(rad(bLat)) * Math.cos(dLng);
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

/** "Naperville, IL, USA" -> { city: 'Naperville', state: 'IL' }. The field comes
 *  from Google's (cities) autocomplete, so this shape is the common case, but it
 *  is free text and may be anything. Returns null rather than guessing. */
function splitCityState(serviceCity: string): { city: string; state: string | null } | null {
  const parts = serviceCity.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  const city = parts[0];
  if (!city) return null;
  // Second part is usually the two-letter state; ignore a trailing "USA".
  const maybeState = parts[1] && /^[A-Za-z]{2}$/.test(parts[1]) ? parts[1].toUpperCase() : null;
  return { city, state: maybeState };
}

/** Resolve the public service_city string to a real centroid. Null when it does
 *  not match, and the caller then draws NO ring rather than inventing one. */
export function resolveCity(serviceCity: string | null | undefined): Place | null {
  if (!serviceCity) return null;
  const split = splitCityState(serviceCity);
  if (!split) return null;
  const wanted = split.city.toLowerCase();

  let fallback: Place | null = null;
  for (const rows of Object.values(BUCKETS)) {
    for (const [name, state, lat, lng] of rows) {
      if (name.toLowerCase() !== wanted) continue;
      const place = { name, state, lat, lng };
      // A state match is definitive. Without one, remember the first hit but keep
      // looking, because city names repeat across states (Springfield, Portland).
      if (split.state && state === split.state) return place;
      if (!split.state && !fallback) fallback = place;
    }
  }
  // If a state was given but nothing matched it, we do NOT fall back to a
  // same-named city in another state: drawing Portland, Maine around a mechanic
  // in Portland, Oregon is exactly the kind of confident wrongness this file
  // exists to remove.
  return split.state ? null : fallback;
}

/**
 * The real towns inside his circle, nearest first.
 *
 * Only scans the nine whole-degree buckets around the centre, which is why the
 * 26k-row file costs nothing per render. The centre's own city is excluded: it
 * is already printed in the middle of the drawing.
 */
export function townsWithin(centre: Place, radiusMi: number, limit = 6): NearbyTown[] {
  const out: NearbyTown[] = [];
  const latCell = Math.floor(centre.lat);
  const lngCell = Math.floor(centre.lng);
  // One degree of latitude is ~69 miles, so a 100-mile radius can reach two
  // cells out. Widen the scan with the radius instead of assuming one ring.
  const span = Math.max(1, Math.ceil(radiusMi / 60));

  for (let dLat = -span; dLat <= span; dLat++) {
    for (let dLng = -span; dLng <= span; dLng++) {
      const rows = BUCKETS[`${latCell + dLat},${lngCell + dLng}`];
      if (!rows) continue;
      for (const [name, state, lat, lng, tier] of rows) {
        if (name === centre.name && state === centre.state) continue;
        const miles = haversineMi(centre.lat, centre.lng, lat, lng);
        if (miles > radiusMi) continue;
        out.push({ name, state, lat, lng, miles, bearing: bearingDeg(centre.lat, centre.lng, lat, lng) });
        void tier;
      }
    }
  }

  // Nearest first, and prefer an incorporated municipality when two are within
  // half a mile of each other, so the drawing names towns rather than CDPs.
  const tierOf = (t: NearbyTown) => {
    const rows = BUCKETS[`${Math.floor(t.lat)},${Math.floor(t.lng)}`] ?? [];
    const row = rows.find((r) => r[0] === t.name && r[1] === t.state);
    return row ? row[4] : 1;
  };
  out.sort((a, b) => (Math.abs(a.miles - b.miles) < 0.5 ? tierOf(a) - tierOf(b) : a.miles - b.miles));

  // Spread the picks around the compass so the drawing does not stack five pins
  // in one direction just because that is where the nearest towns happen to be.
  const picked: NearbyTown[] = [];
  const usedSectors = new Set<number>();
  for (const town of out) {
    const sector = Math.floor(town.bearing / 45);
    if (usedSectors.has(sector)) continue;
    usedSectors.add(sector);
    picked.push(town);
    if (picked.length >= limit) break;
  }
  // If the towns genuinely cluster in fewer than `limit` sectors, top up with the
  // nearest remaining rather than drawing a thinner map than the truth supports.
  for (const town of out) {
    if (picked.length >= limit) break;
    if (!picked.includes(town)) picked.push(town);
  }
  return picked.slice(0, limit);
}
