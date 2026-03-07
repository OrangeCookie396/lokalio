import { haversine } from "./geo.js";

// Thresholds: [[maxValue, score], ...] ordered ascending by maxValue
// Distance thresholds in meters. Air quality thresholds in measurement units.
export const T = {
	// --- Transport ---
	bus_stop: [[150, 5], [350, 4], [700, 3], [1200, 2], [2500, 1]],
	train_stop: [[800, 5], [2000, 4], [4000, 3], [7000, 2], [15000, 1]],

	// --- Healthcare ---
	healthcare_t1: [[1000, 5], [2500, 4], [5000, 3], [10000, 2], [20000, 1]],
	healthcare_t2: [[2500, 5], [5000, 4], [10000, 3], [20000, 2], [40000, 1]],

	// --- Recreation ---
	recreation_t1: [[1500, 5], [3500, 4], [6000, 3], [10000, 2], [18000, 1]],
	recreation_t2: [[2000, 5], [5000, 4], [10000, 3], [18000, 2], [30000, 1]],
	recreation_t3: [[5000, 5], [10000, 4], [20000, 3], [35000, 2], [60000, 1]],

	// --- Education ---
	art_school: [[1500, 5], [4000, 4], [8000, 3], [15000, 2], [25000, 1]],
	kindergarten: [[500, 5], [1000, 4], [2000, 3], [4000, 2], [8000, 1]],
	primary: [[500, 5], [1500, 4], [3000, 3], [6000, 2], [12000, 1]],
	high: [[1500, 5], [4000, 4], [8000, 3], [15000, 2], [30000, 1]],
	university: [[2000, 5], [4000, 4], [8000, 3], [15000, 2], [30000, 1]],

	// --- Work ---
	industrial_zone: [[500, 5], [3000, 4], [10000, 3], [15000, 2], [30000, 1]],

	// --- QoL: IZS ---
	izs: [[2000, 5], [4000, 4], [7000, 3], [10000, 2], [15000, 1]],

	// --- QoL: Noise (inverted: closer = worse) ---
	noise_airport: [[2000, 0], [5000, 1], [8000, 2], [15000, 3], [30000, 4]],
	noise_industrial: [[500, 0], [1000, 1], [2000, 2], [3000, 3], [5000, 4]],
	noise_default: [[300, 0], [600, 1], [1000, 2], [1500, 3], [2000, 4]],

	// --- QoL: Air quality (by measured value) ---
	benzopyren: [[0.2, 5], [0.4, 4], [0.6, 3], [0.9, 2], [1.5, 1]],
	dust: [[4, 5], [7, 4], [11, 3], [16, 2], [25, 1]],
	oxide: [[5, 5], [10, 4], [18, 3], [28, 2], [40, 1]],

	// --- QoL: Flood (distance from boundary in meters, 0=inside) ---
	flood_5year: [[3, 1], [6, 2], [10, 3], [15, 4]],
	flood_20year: [[5, 1], [12, 2], [20, 3], [30, 4]],
	flood_100year: [[8, 1], [15, 2], [30, 3], [50, 4]],
};

export function score(value, thresholds, defaultScore = 0) {
	for (const [maxVal, s] of thresholds) {
		if (value <= maxVal) return s;
	}
	return defaultScore;
}

export function idwInterpolate(userLat, userLon, stations, maxStations = 3) {
	if (stations.length === 0) return null;

	const sorted = stations
		.map((st) => ({ ...st, dist: haversine(userLat, userLon, st.lat, st.lon) }))
		.sort((a, b) => a.dist - b.dist)
		.slice(0, maxStations);

	let weightedSum = 0;
	let weightSum = 0;

	for (const st of sorted) {
		if (st.dist < 10) return st.value;
		const w = 1 / st.dist ** 2;
		weightedSum += st.value * w;
		weightSum += w;
	}

	if (weightSum === 0) return null;

	const rawValue = weightedSum / weightSum;

	// Distance-based reduction: stations are placed in populated/polluted areas,
	// so being far from all stations means cleaner air.
	// At 0km factor=1.0, at 10km ~0.5, at 20km ~0.33, at 50km ~0.17
	const REF_DIST = 10000;
	const nearestDist = sorted[0].dist;
	const reductionFactor = REF_DIST / (REF_DIST + nearestDist);

	return rawValue * reductionFactor;
}

export const ROAD_QUALITY_MAP = {
	"výborný": 5,
	"dobrý": 4,
	"vyhovující": 3,
	"nevyhovující": 2,
	"havarijní": 1,
	"SUPERhavarijní": 0,
};

export function avgScores(scores) {
	const valid = scores.filter((s) => s !== null && s !== undefined);
	if (valid.length === 0) return 0;
	return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
}
