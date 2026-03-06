import proj4 from "proj4";

proj4.defs(
	"EPSG:5514",
	"+proj=krovak +lat_0=49.5 +lon_0=24.83333333333333 +alpha=30.28813972222222 +k=0.9999 +x_0=0 +y_0=0 +ellps=bessel +towgs84=589,76,480,0,0,0,0 +units=m +no_defs"
);

export function wgs84ToSjtsk(lat, lon) {
	return proj4("EPSG:4326", "EPSG:5514", [lon, lat]);
}

export function sjtskToWgs84(x, y) {
	const [lon, lat] = proj4("EPSG:5514", "EPSG:4326", [x, y]);
	return { lat, lon };
}

export function haversine(lat1, lon1, lat2, lon2) {
	const R = 6371e3;
	const toRad = (d) => (d * Math.PI) / 180;
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
	return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function pointInPolygon(px, py, ring) {
	let inside = false;
	for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
		const [xi, yi] = ring[i];
		const [xj, yj] = ring[j];
		if (
			yi > py !== yj > py &&
			px < ((xj - xi) * (py - yi)) / (yj - yi) + xi
		) {
			inside = !inside;
		}
	}
	return inside;
}

export function pointInAnyPolygon(px, py, feature) {
	const geom = feature.geometry;
	if (geom.type === "Polygon") {
		return pointInPolygon(px, py, geom.coordinates[0]);
	}
	if (geom.type === "MultiPolygon") {
		for (const poly of geom.coordinates) {
			if (pointInPolygon(px, py, poly[0])) return true;
		}
	}
	return false;
}

export function euclideanDist(x1, y1, x2, y2) {
	return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export function minDistToRing(px, py, ring, distFn) {
	let min = Infinity;
	for (const coord of ring) {
		const d = distFn(px, py, coord[0], coord[1]);
		if (d < min) min = d;
	}
	return min;
}

export function minDistToPolygonFeature(px, py, feature, distFn) {
	const geom = feature.geometry;
	let min = Infinity;
	const rings =
		geom.type === "Polygon"
			? [geom.coordinates[0]]
			: geom.type === "MultiPolygon"
				? geom.coordinates.map((p) => p[0])
				: [];
	for (const ring of rings) {
		const d = minDistToRing(px, py, ring, distFn);
		if (d < min) min = d;
	}
	return min;
}

export function minDistToLine(lat, lon, coords) {
	let min = Infinity;
	for (const [plon, plat] of coords) {
		const d = haversine(lat, lon, plat, plon);
		if (d < min) min = d;
	}
	return min;
}

export function minDistToLineFeature(lat, lon, feature) {
	const geom = feature.geometry;
	if (geom.type === "LineString") {
		return minDistToLine(lat, lon, geom.coordinates);
	}
	if (geom.type === "MultiLineString") {
		let min = Infinity;
		for (const line of geom.coordinates) {
			const d = minDistToLine(lat, lon, line);
			if (d < min) min = d;
		}
		return min;
	}
	return Infinity;
}
