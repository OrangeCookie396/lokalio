import { readFile } from "fs/promises";
import {
	haversine,
	wgs84ToSjtsk,
	pointInAnyPolygon,
	minDistToPolygonFeature,
	minDistToLineFeature,
	euclideanDist,
} from "./lib/geo.js";
import {
	T,
	score,
	idwInterpolate,
	ROAD_QUALITY_MAP,
	avgScores,
} from "./lib/scoring.js";
import { generateSummary } from "./lib/summary.js";

// ---------------------------------------------------------------------------
// GeoJSON cache
// ---------------------------------------------------------------------------
const cache = new Map();

async function load(path) {
	if (cache.has(path)) return cache.get(path);
	const raw = await readFile(path, "utf8");
	const data = JSON.parse(raw);
	cache.set(path, data);
	return data;
}

// ---------------------------------------------------------------------------
// Coordinate extraction from features
// ---------------------------------------------------------------------------
function getPointLatLon(feature) {
	const p = feature.properties;
	if (p.x != null && p.y != null) return { lat: p.y, lon: p.x };
	if (p.zem_sirka != null && p.zem_delka != null)
		return { lat: p.zem_sirka, lon: p.zem_delka };
	const c = feature.geometry?.coordinates;
	if (c && c.length >= 2) return { lat: c[1], lon: c[0] };
	return null;
}

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------
const MAX_ENTITIES = 15;

function findNearestPoints(geojson, userLat, userLon, maxDist, nameFn) {
	const entities = [];
	for (const f of geojson.features) {
		const c = getPointLatLon(f);
		if (!c) continue;
		const d = haversine(userLat, userLon, c.lat, c.lon);
		if (d <= maxDist) {
			entities.push({
				lat: c.lat,
				lon: c.lon,
				name: nameFn(f),
				distance_m: Math.round(d),
			});
		}
	}
	entities.sort((a, b) => a.distance_m - b.distance_m);
	return entities;
}

function findNearestLines(geojson, userLat, userLon, maxDist, nameFn) {
	const entities = [];
	for (const f of geojson.features) {
		const d = minDistToLineFeature(userLat, userLon, f);
		if (d <= maxDist) {
			// Find the closest vertex for the entity lat/lon
			let closestLat = userLat,
				closestLon = userLon;
			let min = Infinity;
			const coords =
				f.geometry.type === "MultiLineString"
					? f.geometry.coordinates.flat()
					: f.geometry.coordinates;
			for (const [plon, plat] of coords) {
				const dd = haversine(userLat, userLon, plat, plon);
				if (dd < min) {
					min = dd;
					closestLat = plat;
					closestLon = plon;
				}
			}
			entities.push({
				lat: closestLat,
				lon: closestLon,
				name: nameFn(f),
				distance_m: Math.round(d),
			});
		}
	}
	entities.sort((a, b) => a.distance_m - b.distance_m);
	return entities;
}

function scoreNearest(entities, thresholds, topN = 1, minScoreIfAny = 0) {
	if (entities.length === 0) return 0;
	const top = entities.slice(0, topN);
	const avgDist = top.reduce((s, e) => s + e.distance_m, 0) / top.length;
	const s = score(avgDist, thresholds, 0);
	return Math.max(s, minScoreIfAny);
}

function leaf(value, entities) {
	return { value, entities: entities.slice(0, MAX_ENTITIES) };
}

// ---------------------------------------------------------------------------
// Max distance helpers (last threshold value)
// ---------------------------------------------------------------------------
function maxRange(thresholds) {
	return thresholds[thresholds.length - 1][0];
}

// ===========================================================================
// TRANSPORT
// ===========================================================================
async function evalTransport(lat, lon) {
	const busStopData = await load("data/public_transport/bus_stop.geojson");
	const trainStationData = await load(
		"data/public_transport/train_station.geojson"
	);

	const busEntities = findNearestPoints(
		busStopData, lat, lon, maxRange(T.bus_stop),
		(f) => f.properties.nazev
	);
	// top 3 average, minimum score 1 if at least 1 exists
	const busScore = scoreNearest(busEntities, T.bus_stop, 3, 1);

	const trainEntities = findNearestPoints(
		trainStationData, lat, lon, maxRange(T.train_stop),
		(f) => f.properties.nazev
	);
	const trainScore = scoreNearest(trainEntities, T.train_stop, 1);

	return {
		value: avgScores([busScore, trainScore]),
		bus_stop: leaf(busScore, busEntities),
		train_stop: leaf(trainScore, trainEntities),
	};
}

// ===========================================================================
// HEALTHCARE
// ===========================================================================
async function evalHealthcare(lat, lon) {
	const maxT1 = maxRange(T.healthcare_t1);
	const maxT2 = maxRange(T.healthcare_t2);

	const doctorAdultData = await load("data/healthcare/doctor_adult.geojson");
	const doctorChildData = await load("data/healthcare/doctor_child.geojson");
	const hospitalsData = await load("data/healthcare/hospitals.geojson");
	const longTermData = await load(
		"data/healthcare/special_care/long_term_inpatient_care.geojson"
	);
	const rehabData = await load(
		"data/healthcare/special_care/rehabilitation_centre.geojson"
	);
	const gynecoData = await load(
		"data/healthcare/special_care/outpatient_gynecologist.geojson"
	);
	const dentistData = await load(
		"data/healthcare/special_care/dentist.geojson"
	);

	const doctorAdult = findNearestPoints(doctorAdultData, lat, lon, maxT1, (f) => f.properties.provozovatel);
	const doctorChild = findNearestPoints(doctorChildData, lat, lon, maxT1, (f) => f.properties.provozovatel);
	const hospitals = findNearestPoints(hospitalsData, lat, lon, maxT2, (f) => f.properties.nazev);
	const longTerm = findNearestPoints(longTermData, lat, lon, maxT2, (f) => f.properties.nazev);
	const rehab = findNearestPoints(rehabData, lat, lon, maxT2, (f) => f.properties.druh_zarizeni || f.properties.nazev || "Rehabilitace");
	const gyneco = findNearestPoints(gynecoData, lat, lon, maxT1, (f) => f.properties.provozovatel);
	const dentist = findNearestPoints(dentistData, lat, lon, maxT1, (f) => f.properties.provozovatel);

	const daScore = scoreNearest(doctorAdult, T.healthcare_t1);
	const dcScore = scoreNearest(doctorChild, T.healthcare_t1);
	const hospScore = scoreNearest(hospitals, T.healthcare_t2);
	const ltScore = scoreNearest(longTerm, T.healthcare_t2);
	const rehabScore = scoreNearest(rehab, T.healthcare_t2);
	const gynecoScore = scoreNearest(gyneco, T.healthcare_t1);
	const dentistScore = scoreNearest(dentist, T.healthcare_t1);

	const specialCareValue = avgScores([ltScore, rehabScore, gynecoScore, dentistScore]);

	return {
		value: avgScores([daScore, dcScore, hospScore, specialCareValue]),
		doctor_adult: leaf(daScore, doctorAdult),
		doctor_child: leaf(dcScore, doctorChild),
		hospitals: leaf(hospScore, hospitals),
		special_care: {
			value: specialCareValue,
			long_term_inpatient_care: leaf(ltScore, longTerm),
			rehabilitation_centre: leaf(rehabScore, rehab),
			outpatient_gynecologist: leaf(gynecoScore, gyneco),
			dentist: leaf(dentistScore, dentist),
		},
	};
}

// ===========================================================================
// RECREATION
// ===========================================================================
async function evalRecreation(lat, lon) {
	const maxR1 = maxRange(T.recreation_t1);
	const maxR2 = maxRange(T.recreation_t2);
	const maxR3 = maxRange(T.recreation_t3);

	// Culture & arts
	const cultureCentre = findNearestPoints(await load("data/recreation/culture_and_arts/culture_centre.geojson"), lat, lon, maxR2, (f) => f.properties.nazev);
	const library = findNearestPoints(await load("data/recreation/culture_and_arts/library.geojson"), lat, lon, maxR1, (f) => f.properties.nazev);
	const museum = findNearestPoints(await load("data/recreation/culture_and_arts/museum_and_gallery.geojson"), lat, lon, maxR2, (f) => f.properties.nazev);
	const theatre = findNearestPoints(await load("data/recreation/culture_and_arts/theatre_and_orchestra.geojson"), lat, lon, maxR2, (f) => f.properties.nazev);

	const ccScore = scoreNearest(cultureCentre, T.recreation_t2);
	const libScore = scoreNearest(library, T.recreation_t1);
	const musScore = scoreNearest(museum, T.recreation_t2);
	const theScore = scoreNearest(theatre, T.recreation_t2);
	const cultureValue = avgScores([ccScore, libScore, musScore, theScore]);

	// Entertainment & leisure
	const amusement = findNearestPoints(await load("data/recreation/entertainment_and_leisure/amusement_centre.geojson"), lat, lon, maxR2, (f) => f.properties.nazev);
	const cinema = findNearestPoints(await load("data/recreation/entertainment_and_leisure/cinema.geojson"), lat, lon, maxR2, (f) => f.properties.nazev);
	const freeTime = findNearestPoints(await load("data/recreation/entertainment_and_leisure/dormitory_and_free_time_centre(exclude_dormitory).geojson"), lat, lon, maxR2, (f) => f.properties.nazev || f.properties.kratky_nazev);
	const zoo = findNearestPoints(await load("data/recreation/entertainment_and_leisure/zoo.geojson"), lat, lon, maxR3, (f) => f.properties.nazev);

	const amuScore = scoreNearest(amusement, T.recreation_t2);
	const cinScore = scoreNearest(cinema, T.recreation_t2);
	const ftScore = scoreNearest(freeTime, T.recreation_t2);
	const zooScore = scoreNearest(zoo, T.recreation_t3);
	const entertainmentValue = avgScores([amuScore, cinScore, ftScore, zooScore]);

	// Historical sites
	const castle = findNearestPoints(await load("data/recreation/historical_sites/castle.geojson"), lat, lon, maxR3, (f) => f.properties.nazev);
	const chateau = findNearestPoints(await load("data/recreation/historical_sites/chateau.geojson"), lat, lon, maxR3, (f) => f.properties.nazev);

	const castleScore = scoreNearest(castle, T.recreation_t3);
	const chateauScore = scoreNearest(chateau, T.recreation_t3);
	const historicalValue = avgScores([castleScore, chateauScore]);

	// Nature
	const curiosity = findNearestPoints(await load("data/recreation/nature/nature_curiosity.geojson"), lat, lon, maxR3, (f) => f.properties.nazev);
	const monuments = evalNatureMonuments(await load("data/recreation/nature/nature_monuments_and_buffer_zones.geojson"), lat, lon, maxR3);

	const curiosityScore = scoreNearest(curiosity, T.recreation_t3);
	const monumentsScore = scoreNearest(monuments, T.recreation_t3);
	const natureValue = avgScores([curiosityScore, monumentsScore]);

	// Wellness & lifestyle
	const brewery = findNearestPoints(await load("data/recreation/wellness_and_lifestyle/beer_brewery.geojson"), lat, lon, maxR3, (f) => f.properties.nazev);
	const spa = findNearestPoints(await load("data/recreation/wellness_and_lifestyle/spa.geojson"), lat, lon, maxR3, (f) => f.properties.nazev);

	const breweryScore = scoreNearest(brewery, T.recreation_t3);
	const spaScore = scoreNearest(spa, T.recreation_t3);
	const wellnessValue = avgScores([breweryScore, spaScore]);

	return {
		value: avgScores([cultureValue, entertainmentValue, historicalValue, natureValue, wellnessValue]),
		culture_and_arts: {
			value: cultureValue,
			culture_centre: leaf(ccScore, cultureCentre),
			library: leaf(libScore, library),
			museum_and_gallery: leaf(musScore, museum),
			theatre_and_orchestra: leaf(theScore, theatre),
		},
		entertainment_and_leisure: {
			value: entertainmentValue,
			amusement_centre: leaf(amuScore, amusement),
			cinema: leaf(cinScore, cinema),
			free_time_centre: leaf(ftScore, freeTime),
			zoo: leaf(zooScore, zoo),
		},
		historical_sites: {
			value: historicalValue,
			castle: leaf(castleScore, castle),
			chateau: leaf(chateauScore, chateau),
		},
		nature: {
			value: natureValue,
			nature_curiosity: leaf(curiosityScore, curiosity),
			nature_monuments_and_buffer_zones: leaf(monumentsScore, monuments),
		},
		wellness_and_lifestyle: {
			value: wellnessValue,
			beer_brewery: leaf(breweryScore, brewery),
			spa: leaf(spaScore, spa),
		},
	};
}

// Nature monuments are polygons - compute distance to nearest polygon vertex
function evalNatureMonuments(geojson, lat, lon, maxDist) {
	const entities = [];
	for (const f of geojson.features) {
		// Approximate distance: nearest vertex of the outer ring
		const rings =
			f.geometry.type === "Polygon"
				? [f.geometry.coordinates[0]]
				: f.geometry.type === "MultiPolygon"
					? f.geometry.coordinates.map((p) => p[0])
					: [];

		let minD = Infinity;
		let closestLat = lat, closestLon = lon;
		for (const ring of rings) {
			for (const [plon, plat] of ring) {
				const d = haversine(lat, lon, plat, plon);
				if (d < minD) {
					minD = d;
					closestLat = plat;
					closestLon = plon;
				}
			}
		}

		if (minD <= maxDist) {
			entities.push({
				lat: closestLat,
				lon: closestLon,
				name: f.properties.NAZEV || f.properties.nazev || "",
				distance_m: Math.round(minD),
			});
		}
	}
	entities.sort((a, b) => a.distance_m - b.distance_m);
	return entities;
}

// ===========================================================================
// EDUCATION
// ===========================================================================
const SCHOOL_FILTER = {
	kindergarten: (d) =>
		d === "Mateřská škola" ||
		d === "Mateřská škola (lesní mateřská škola)",
	primary: (d) => d === "Základní škola",
	high: (d) => d === "Střední škola" || d === "Vyšší odborná škola",
	university: (d) =>
		/fakulta|rektorát|univerzit|kated/i.test(d),
};

async function evalEducation(lat, lon) {
	const artSchoolData = await load("data/education/art_school.geojson");
	const schoolData = await load(
		"data/education/school(kindergarten-primary-high-university).geojson"
	);

	const artSchool = findNearestPoints(
		artSchoolData, lat, lon, maxRange(T.art_school),
		(f) => f.properties.nazev
	);
	const artScore = scoreNearest(artSchool, T.art_school);

	// Split school data by type
	const schoolTypes = {};
	for (const [type, filterFn] of Object.entries(SCHOOL_FILTER)) {
		const filtered = {
			type: "FeatureCollection",
			features: schoolData.features.filter((f) =>
				filterFn(f.properties.zarizeni_druh || "")
			),
		};
		schoolTypes[type] = findNearestPoints(
			filtered, lat, lon, maxRange(T[type]),
			(f) => f.properties.nazev
		);
	}

	const kinderScore = scoreNearest(schoolTypes.kindergarten, T.kindergarten);
	const primaryScore = scoreNearest(schoolTypes.primary, T.primary);
	const highScore = scoreNearest(schoolTypes.high, T.high);
	const uniScore = scoreNearest(schoolTypes.university, T.university);
	const schoolValue = avgScores([kinderScore, primaryScore, highScore, uniScore]);

	return {
		value: avgScores([artScore, schoolValue]),
		art_school: leaf(artScore, artSchool),
		school: {
			value: schoolValue,
			kindergarten: leaf(kinderScore, schoolTypes.kindergarten),
			primary: leaf(primaryScore, schoolTypes.primary),
			high: leaf(highScore, schoolTypes.high),
			university: leaf(uniScore, schoolTypes.university),
		},
	};
}

// ===========================================================================
// WORK
// ===========================================================================
async function evalWork(lat, lon) {
	const izData = await load("data/job_opportunities/industrial_zone.geojson");
	const entities = findNearestPoints(
		izData, lat, lon, maxRange(T.industrial_zone),
		(f) => f.properties.nazev
	);
	const izScore = scoreNearest(entities, T.industrial_zone);

	return {
		value: izScore,
		industrial_zone: leaf(izScore, entities),
	};
}

// ===========================================================================
// QOL (Quality of Life)
// ===========================================================================
async function evalQol(lat, lon) {
	const airQuality = await evalAirQuality(lat, lon);
	const floodRisk = await evalFloodRisk(lat, lon);
	const izs = await evalIZS(lat, lon);
	const noise = await evalNoise(lat, lon);
	const roadQuality = await evalRoadQuality(lat, lon);

	return {
		value: avgScores([
			airQuality.value,
			floodRisk.value,
			izs.value,
			noise.value,
			roadQuality.value,
		]),
		air_quality: airQuality,
		flood_risk: floodRisk,
		izs,
		noise,
		road_quality: roadQuality,
	};
}

// --- Air Quality ---
async function evalAirQuality(lat, lon) {
	const benzData = await load("data/qol/air_quality/air_quality_benzopyren(filter).geojson");
	const dustData = await load("data/qol/air_quality/air_quality_fine_dust(filter).geojson");
	const oxideData = await load("data/qol/air_quality/air_quality_nitrogen_oxide(filter).geojson");

	function extractStations(geojson, valueField) {
		return geojson.features
			.filter((f) => f.properties[valueField] != null)
			.map((f) => {
				const c = getPointLatLon(f);
				return {
					lat: c.lat,
					lon: c.lon,
					name: f.properties.nazev_loka,
					value: f.properties[valueField],
				};
			});
	}

	const benzStations = extractStations(benzData, "rp");
	const dustStations = extractStations(dustData, "rp_limit");
	const oxideStations = extractStations(oxideData, "rp");

	const benzValue = idwInterpolate(lat, lon, benzStations);
	const dustValue = idwInterpolate(lat, lon, dustStations);
	const oxideValue = idwInterpolate(lat, lon, oxideStations);

	const benzScore = benzValue != null ? score(benzValue, T.benzopyren, 0) : 3;
	const dustScore = dustValue != null ? score(dustValue, T.dust, 0) : 3;
	const oxideScore = oxideValue != null ? score(oxideValue, T.oxide, 0) : 3;

	// Build entities: nearest stations
	const benzEntities = findNearestPoints(benzData, lat, lon, 100000, (f) => f.properties.nazev_loka).slice(0, 3);
	const dustEntities = findNearestPoints(dustData, lat, lon, 100000, (f) => f.properties.nazev_loka).slice(0, 3);
	const oxideEntities = findNearestPoints(oxideData, lat, lon, 100000, (f) => f.properties.nazev_loka).slice(0, 3);

	return {
		value: avgScores([benzScore, dustScore, oxideScore]),
		benzopyren: leaf(benzScore, benzEntities),
		dust: leaf(dustScore, dustEntities),
		oxide: leaf(oxideScore, oxideEntities),
	};
}

// --- Flood Risk ---
async function evalFloodRisk(lat, lon) {
	const f5 = await evalFloodZone(
		"data/qol/flood_risk/flood_5year.geojson", lat, lon, T.flood_5year, true
	);
	const f20 = await evalFloodZone(
		"data/qol/flood_risk/flood_20year.geojson", lat, lon, T.flood_20year, true
	);
	const f100 = await evalFloodZone(
		"data/qol/flood_risk/flood_100year.geojson", lat, lon, T.flood_100year, false
	);

	return {
		value: avgScores([f5.value, f20.value, f100.value]),
		"5year": f5,
		"20year": f20,
		"100year": f100,
	};
}

async function evalFloodZone(path, lat, lon, thresholds, isSjtsk) {
	const geojson = await load(path);
	const entities = [];

	let isInside = false;
	let minDist = Infinity;

	if (isSjtsk) {
		// Convert user point to S-JTSK and work in projected space
		const [ux, uy] = wgs84ToSjtsk(lat, lon);

		for (const f of geojson.features) {
			if (pointInAnyPolygon(ux, uy, f)) {
				isInside = true;
				entities.push({
					name: f.properties.nazev_tok || "",
					inside: true,
				});
			} else {
				const d = minDistToPolygonFeature(
					ux, uy, f,
					(x1, y1, x2, y2) => euclideanDist(x1, y1, x2, y2)
				);
				if (d < minDist) minDist = d;
			}
		}
	} else {
		// WGS84 - use haversine
		// For point-in-polygon: use [lon, lat] since GeoJSON is [lon, lat]
		for (const f of geojson.features) {
			if (pointInAnyPolygon(lon, lat, f)) {
				isInside = true;
				entities.push({
					name: f.properties.nazev_tok || "",
					inside: true,
				});
			} else {
				const d = minDistToPolygonFeature(
					lon, lat, f,
					(x1, y1, x2, y2) => haversine(y1, x1, y2, x2)
				);
				if (d < minDist) minDist = d;
			}
		}
	}

	let value;
	if (isInside) {
		value = 0;
	} else {
		// Distance in meters (S-JTSK euclidean is already meters, haversine also meters)
		value = score(minDist, thresholds, 5);
	}

	if (!isInside && minDist < Infinity) {
		entities.push({ name: "Nearest flood zone", distance_m: Math.round(minDist) });
	}

	return { value, entities: entities.slice(0, MAX_ENTITIES) };
}

// --- IZS (Emergency Services) ---
async function evalIZS(lat, lon) {
	const maxD = maxRange(T.izs);
	const ambulanceData = await load("data/qol/izs/ambulance.geojson");
	const firefighterData = await load("data/qol/izs/firefighter.geojson");
	const policeData = await load("data/qol/izs/police.geojson");

	const ambulance = findNearestPoints(ambulanceData, lat, lon, maxD, (f) => f.properties.vyjezdova_zakladna || f.properties.oblast || "Ambulance");
	const firefighter = findNearestPoints(firefighterData, lat, lon, maxD, (f) => f.properties.druh_pracoviste || "Hasiči");
	const police = findNearestPoints(policeData, lat, lon, maxD, (f) => f.properties.nazev_obvodu || "Policie");

	const ambScore = scoreNearest(ambulance, T.izs);
	const fireScore = scoreNearest(firefighter, T.izs);
	const polScore = scoreNearest(police, T.izs);

	return {
		value: avgScores([ambScore, fireScore, polScore]),
		ambulance: leaf(ambScore, ambulance),
		firefighter: leaf(fireScore, firefighter),
		police: leaf(polScore, police),
	};
}

// --- Noise ---
async function evalNoise(lat, lon) {
	const maxAirport = maxRange(T.noise_airport);
	const maxDefault = maxRange(T.noise_default);

	const airportData = await load("data/qol/noise/airport.geojson");
	const trainRouteData = await load("data/qol/noise/train_route.geojson");
	const ambulanceData = await load("data/qol/noise/ambulance.geojson");
	const firefighterData = await load("data/qol/noise/firefighter.geojson");
	const policeData = await load("data/qol/noise/police.geojson");
	const industrialData = await load("data/qol/noise/industrial_zone.geojson");

	// Airport: point dataset
	const airport = findNearestPoints(airportData, lat, lon, maxAirport, (f) => f.properties.nazev);
	const airportScore = airport.length > 0
		? score(airport[0].distance_m, T.noise_airport, 5)
		: 5;

	// Train route: line dataset
	const trainEntities = findNearestLines(trainRouteData, lat, lon, maxDefault, (f) => f.properties.trasa || f.properties.ozn_linka || "Trať");
	const trainScore = trainEntities.length > 0
		? score(trainEntities[0].distance_m, T.noise_default, 5)
		: 5;

	// Emergency services noise
	const ambNoise = findNearestPoints(ambulanceData, lat, lon, maxDefault, (f) => f.properties.vyjezdova_zakladna || "Ambulance");
	const fireNoise = findNearestPoints(firefighterData, lat, lon, maxDefault, (f) => f.properties.druh_pracoviste || "Hasiči");
	const polNoise = findNearestPoints(policeData, lat, lon, maxDefault, (f) => f.properties.nazev_obvodu || "Policie");
	const indNoise = findNearestPoints(industrialData, lat, lon, maxDefault, (f) => f.properties.nazev);

	const ambNoiseScore = ambNoise.length > 0 ? score(ambNoise[0].distance_m, T.noise_default, 5) : 5;
	const fireNoiseScore = fireNoise.length > 0 ? score(fireNoise[0].distance_m, T.noise_default, 5) : 5;
	const polNoiseScore = polNoise.length > 0 ? score(polNoise[0].distance_m, T.noise_default, 5) : 5;
	const indNoiseScore = indNoise.length > 0 ? score(indNoise[0].distance_m, T.noise_default, 5) : 5;

	return {
		value: avgScores([airportScore, trainScore, ambNoiseScore, fireNoiseScore, polNoiseScore, indNoiseScore]),
		airport: leaf(airportScore, airport),
		train_route: leaf(trainScore, trainEntities),
		ambulance: leaf(ambNoiseScore, ambNoise),
		firefighter: leaf(fireNoiseScore, fireNoise),
		police: leaf(polNoiseScore, polNoise),
		industrial_zone: leaf(indNoiseScore, indNoise),
	};
}

// --- Road Quality ---
async function evalRoadQuality(lat, lon) {
	const geojson = await load("data/qol/road_quality.geojson");
	const RADIUS = 1000; // 1km
	const entities = [];

	for (const f of geojson.features) {
		const d = minDistToLineFeature(lat, lon, f);
		if (d <= RADIUS) {
			const stav = f.properties.stav_sil || "";
			const numericScore = ROAD_QUALITY_MAP[stav];
			if (numericScore !== undefined) {
				// Find closest vertex for entity coords
				let closestLat = lat, closestLon = lon, min = Infinity;
				for (const [plon, plat] of f.geometry.coordinates) {
					const dd = haversine(lat, lon, plat, plon);
					if (dd < min) { min = dd; closestLat = plat; closestLon = plon; }
				}
				entities.push({
					lat: closestLat,
					lon: closestLon,
					name: `${f.properties.ozn_sil || ""} (${stav})`,
					distance_m: Math.round(d),
					quality: numericScore,
				});
			}
		}
	}

	entities.sort((a, b) => a.distance_m - b.distance_m);

	let value;
	if (entities.length === 0) {
		value = 0;
	} else {
		const avg =
			entities.reduce((s, e) => s + e.quality, 0) / entities.length;
		value = Math.round(avg);
		if (value < 1) value = 1;
		if (value > 5) value = 5;
	}

	return { value, entities: entities.slice(0, MAX_ENTITIES) };
}

// ===========================================================================
// MAIN EVALUATE
// ===========================================================================
export async function evaluate(lat, lon) {
	const [transport, healthcare, recreation, education, work, qol] =
		await Promise.all([
			evalTransport(lat, lon),
			evalHealthcare(lat, lon),
			evalRecreation(lat, lon),
			evalEducation(lat, lon),
			evalWork(lat, lon),
			evalQol(lat, lon),
		]);

	const result = {
		coordinates: { lat, lon },
		transport,
		healthcare,
		recreation,
		education,
		work,
		qol,
	};

	// AI summary runs after scoring is done (non-blocking for the scores)
	//result.summary = await generateSummary(result);

	return result;
}
