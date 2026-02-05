import { readFile, writeFile } from "fs/promises";
export { getFilteredDataSets };

const apiURLs = {
	busStops:
		"https://services6.arcgis.com/ogJAiK65nXL1mXAW/arcgis/rest/services/Autobusové_zastávky_IREDO/FeatureServer/0/query?outFields=*&where=1%3D1&f=geojson",
	busRoutes:
		"https://services6.arcgis.com/ogJAiK65nXL1mXAW/arcgis/rest/services/Autobusové_linky_VDKHK/FeatureServer/7/query?outFields=*&where=1%3D1&f=geojson",
	trainStations:
		"https://services6.arcgis.com/ogJAiK65nXL1mXAW/arcgis/rest/services/Železniční_stanice_a_zastávky_VDKHK/FeatureServer/0/query?outFields=*&where=1%3D1&f=geojson",
	hospitals:
		"https://services6.arcgis.com/ogJAiK65nXL1mXAW/arcgis/rest/services/Nemocnice/FeatureServer/0/query?outFields=*&where=1%3D1&f=geojson",
};
// Distance thresholds for different categories (in meters)
// Based on walkability standards and urban planning best practices
const DISTANCE_THRESHOLDS = {
	// Public transport - should be within walking distance (5-10 min walk)
	BUS_STOPS: 500, // ~6 min walk
	BUS_ROUTES: 800, // Routes passing nearby
	TRAIN_STATIONS: 1500, // Train stations are less frequent, 15-20 min walk acceptable
	TRAIN_ROUTES: 2000, // Train line proximity

	// Healthcare - depends on urgency and type
	DOCTOR_ADULT: 2000, // General practitioners - within neighborhood
	DOCTOR_CHILD: 2000, // Pediatricians - within neighborhood
	HOSPITALS: 5000, // Hospitals - accessible but not necessarily walking distance

	// Education - depends on age group
	SCHOOLS: 1500, // Primary/secondary schools - safe walking/cycling distance
	ART_SCHOOLS: 3000, // Extracurricular - can be further

	// Employment
	INDUSTRIAL_ZONES: 5000, // Job opportunities - reasonable commute consideration

	// Noise sources - closer = worse for quality of life
	NOISE_SOURCES: 1000, // General noise impact radius

	// Safety - flood zones are polygon-based, no distance needed
};

async function fetchFromFile(filepath) {
	try {
		const fileContent = await readFile(filepath, "utf8");
		return JSON.parse(fileContent);
	} catch (error) {
		console.error(`Error reading file ${filepath}:`, error);
		throw error;
	}
}

function calculateDistance(lat1, lon1, lat2, lon2) {
	const R = 6371e3; // Earth's radius in meters
	const φ1 = (lat1 * Math.PI) / 180;
	const φ2 = (lat2 * Math.PI) / 180;
	const Δφ = ((lat2 - lat1) * Math.PI) / 180;
	const Δλ = ((lon2 - lon1) * Math.PI) / 180;
	const a =
		Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
		Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c; // Distance in meters
}

/**
 * Check if a point is inside a polygon using ray-casting algorithm
 * @param {number} lat - Point latitude
 * @param {number} lon - Point longitude
 * @param {Array} polygon - Array of [lon, lat] coordinates forming the polygon
 * @returns {boolean} - True if point is inside polygon
 */
function isPointInPolygon(lat, lon, polygon) {
	let inside = false;

	for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
		const [xi, yi] = polygon[i];
		const [xj, yj] = polygon[j];

		const intersect =
			yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

		if (intersect) inside = !inside;
	}

	return inside;
}

/**
 * Filter polygon features to check if a point is inside any of them
 * @param {Object} geojsonData - GeoJSON data with Polygon or MultiPolygon features
 * @param {string} category_name - Name for the result category
 * @param {number} centerLat - Point latitude to check
 * @param {number} centerLon - Point longitude to check
 * @param {Array} fieldsToKeep - Fields to include from properties
 * @returns {Object} - Object with category name and array of matching polygons
 */
function polygonSetFilter(
	geojsonData,
	category_name,
	centerLat,
	centerLon,
	fieldsToKeep
) {
	const records = [];

	geojsonData.features.forEach((feature) => {
		let isInside = false;

		if (feature.geometry.type === "Polygon") {
			// Polygon structure: [ [outer ring], [hole1], [hole2], ... ]
			// coordinates[0] = outer ring (array of [lon, lat, elevation?])
			const outerRing = feature.geometry.coordinates[0];
			isInside = isPointInPolygon(centerLat, centerLon, outerRing);
		} else if (feature.geometry.type === "MultiPolygon") {
			// MultiPolygon structure: [ [[outer ring], [hole]], [[outer ring], [hole]], ... ]
			// coordinates = array of polygons
			// coordinates[i] = one polygon (array of rings)
			// coordinates[i][0] = outer ring of that polygon
			for (const polygon of feature.geometry.coordinates) {
				const outerRing = polygon[0]; // First ring is always the outer boundary
				if (isPointInPolygon(centerLat, centerLon, outerRing)) {
					isInside = true;
					break;
				}
			}
		}

		// Only include if point is inside the polygon
		if (isInside) {
			const record = {
				inside: true,
			};

			// Add specified fields
			fieldsToKeep.forEach((fieldConfig) => {
				// Support both string format and object format
				if (typeof fieldConfig === "string") {
					// Simple format: just field name
					if (feature.properties.hasOwnProperty(fieldConfig)) {
						record[fieldConfig] = feature.properties[fieldConfig];
					}
				} else if (typeof fieldConfig === "object") {
					// Object format: { original: 'oldName', renamed: 'newName' }
					const originalField = fieldConfig.original;
					const renamedField = fieldConfig.renamed || originalField;

					if (feature.properties.hasOwnProperty(originalField)) {
						record[renamedField] = feature.properties[originalField];
					}
				}
			});

			records.push(record);
		}
	});

	return { [category_name]: records };
}

function singlePointSetFilter(
	geojsonData,
	category_name,
	centerLat,
	centerLon,
	maxDistanceMeters,
	fieldsToKeep
) {
	const records = [];

	geojsonData.features.forEach((feature) => {
		// CHANGED: Get coordinates from properties.x (longitude) and properties.y (latitude)
		const lon = feature.properties.x;
		const lat = feature.properties.y;

		const distance = calculateDistance(centerLat, centerLon, lat, lon);

		// Keep only features within max distance
		if (distance <= maxDistanceMeters) {
			const record = {
				coordinates: {
					lat: lat,
					lon: lon,
				},
				distance_m: Math.round(distance),
			};

			// Add specified fields to record object
			fieldsToKeep.forEach((fieldConfig) => {
				// Support both string format and object format
				if (typeof fieldConfig === "string") {
					// Simple format: just field name
					if (feature.properties.hasOwnProperty(fieldConfig)) {
						record[fieldConfig] = feature.properties[fieldConfig];
					}
				} else if (typeof fieldConfig === "object") {
					// Object format: { original: 'oldName', renamed: 'newName' }
					const originalField = fieldConfig.original;
					const renamedField = fieldConfig.renamed || originalField;
					if (feature.properties.hasOwnProperty(originalField)) {
						record[renamedField] = feature.properties[originalField];
					}
				}
			});

			records.push(record);
		}
	});

	// Sort by distance (closest first)
	records.sort((a, b) => a.distance_m - b.distance_m);
	return { [category_name]: records };
}

function multiLineSetFilter(
	geojsonData,
	category_name,
	centerLat,
	centerLon,
	maxDistanceMeters,
	fieldsToKeep
) {
	const records = [];

	geojsonData.features.forEach((feature) => {
		let closestPoint = null;
		let minDistance = Infinity;

		// Iterate through all LineStrings in MultiLineString
		if (feature.geometry.type === "MultiLineString") {
			feature.geometry.coordinates.forEach((lineString) => {
				// Check each coordinate in the LineString
				lineString.forEach(([lon, lat]) => {
					const distance = calculateDistance(centerLat, centerLon, lat, lon);

					// Track the closest point
					if (distance < minDistance) {
						minDistance = distance;
						closestPoint = { lat, lon };
					}
				});
			});
		}

		// Only include if closest point is within max distance
		if (closestPoint && minDistance <= maxDistanceMeters) {
			const record = {
				coordinates: closestPoint,
				distance_m: Math.round(minDistance),
			};

			// Add specified fields
			fieldsToKeep.forEach((fieldConfig) => {
				// Support both string format and object format
				if (typeof fieldConfig === "string") {
					// Simple format: just field name
					if (feature.properties.hasOwnProperty(fieldConfig)) {
						record[fieldConfig] = feature.properties[fieldConfig];
					}
				} else if (typeof fieldConfig === "object") {
					// Object format: { original: 'oldName', renamed: 'newName' }
					const originalField = fieldConfig.original;
					const renamedField = fieldConfig.renamed || originalField;

					if (feature.properties.hasOwnProperty(originalField)) {
						record[renamedField] = feature.properties[originalField];
					}
				}
			});

			records.push(record);
		}
	});

	// Sort by distance (closest first)
	records.sort((a, b) => a.distance_m - b.distance_m);

	return { [category_name]: records };
}

async function getFilteredDataSets(centerLat, centerLon) {
	console.log("getFiltered");
	console.log(centerLat, centerLon);
	/**
	 * DOPRAVA (Transport)
	 */
	const transport = {};

	const bus_stops = singlePointSetFilter(
		await fetchFromFile("data/bus_stops.geojson"),
		"bus_stops",
		centerLat,
		centerLon,
		DISTANCE_THRESHOLDS.BUS_STOPS,
		[{ original: "nazev", renamed: "name" }]
	);

	const bus_routes = multiLineSetFilter(
		await fetchFromFile("data/bus_routes.geojson"),
		"bus_routes",
		centerLat,
		centerLon,
		DISTANCE_THRESHOLDS.BUS_ROUTES,
		[
			{ original: "trasa", renamed: "name" },
			{ original: "linka", renamed: "number" },
		]
	);

	const train_stations = singlePointSetFilter(
		await fetchFromFile("data/train_stations.geojson"),
		"train_stations",
		centerLat,
		centerLon,
		DISTANCE_THRESHOLDS.TRAIN_STATIONS,
		[{ original: "nazev", renamed: "name" }]
	);

	const train_routes = multiLineSetFilter(
		await fetchFromFile("data/train_routes.geojson"),
		"train_routes",
		centerLat,
		centerLon,
		DISTANCE_THRESHOLDS.TRAIN_ROUTES,
		[
			{ original: "trasa", renamed: "name" },
			{ original: "ozn_linka", renamed: "number" },
		]
	);

	transport.bus_stops = bus_stops.bus_stops;
	transport.bus_routes = bus_routes.bus_routes;
	transport.train_stations = train_stations.train_stations;
	transport.train_routes = train_routes.train_routes;

	/**
	 * ZDRAVOTNICTVÍ (Healthcare)
	 */
	const healthcare = {};

	const doctor_adult = singlePointSetFilter(
		await fetchFromFile("data/doctor_adult.geojson"),
		"doctor_adult",
		centerLat,
		centerLon,
		DISTANCE_THRESHOLDS.DOCTOR_ADULT,
		[
			{ original: "nazev_obce", renamed: "city" },
			{ original: "nazev_ulice", renamed: "address" },
			{ original: "cislo_domovni", renamed: "house_number" },
		]
	);

	const doctor_child = singlePointSetFilter(
		await fetchFromFile("data/doctor_child.geojson"),
		"doctor_child",
		centerLat,
		centerLon,
		DISTANCE_THRESHOLDS.DOCTOR_CHILD,
		[
			{ original: "nazev_obce", renamed: "city" },
			{ original: "nazev_ulice", renamed: "address" },
			{ original: "cislo_domovni", renamed: "house_number" },
		]
	);

	const hospitals = singlePointSetFilter(
		await fetchFromFile("data/hospitals.geojson"),
		"hospitals",
		centerLat,
		centerLon,
		DISTANCE_THRESHOLDS.HOSPITALS,
		[{ original: "nazev", renamed: "name" }]
	);

	healthcare.doctor_adult = doctor_adult.doctor_adult;
	healthcare.doctor_child = doctor_child.doctor_child;
	healthcare.hospitals = hospitals.hospitals;

	/**
	 * ŠKOLSTVÍ (Education)
	 */
	const education = {};

	const schools = singlePointSetFilter(
		await fetchFromFile("data/schools.geojson"),
		"schools",
		centerLat,
		centerLon,
		DISTANCE_THRESHOLDS.SCHOOLS,
		[
			{ original: "nazev", renamed: "name" },
			{ original: "nazev_ulice", renamed: "address" },
			{ original: "cislo_domovni", renamed: "house_number" },
			{ original: "nazev_obce", renamed: "city" },
			{ original: "zarizeni_druh", renamed: "type" },
		]
	);

	const art_schools = singlePointSetFilter(
		await fetchFromFile("data/art_schools.geojson"),
		"art_schools",
		centerLat,
		centerLon,
		DISTANCE_THRESHOLDS.ART_SCHOOLS,
		[
			{ original: "nazev", renamed: "name" },
			{ original: "nazev_ulice", renamed: "address" },
			{ original: "cislo_domovni", renamed: "house_number" },
			{ original: "nazev_obce", renamed: "city" },
			{ original: "vyucovane_predmety", renamed: "type" },
		]
	);

	education.schools = schools.schools;
	education.art_schools = art_schools.art_schools;

	/**
	 * PRACOVNÍ PŘÍLEŽITOSTI (Employment)
	 */
	const employment = {};

	const industrial_zones = singlePointSetFilter(
		await fetchFromFile("data/industrial_zones.geojson"),
		"industrial_zones",
		centerLat,
		centerLon,
		DISTANCE_THRESHOLDS.INDUSTRIAL_ZONES,
		[
			{ original: "nazev", renamed: "name" },
			{ original: "rozloha", renamed: "area_m2" },
		]
	);

	employment.industrial_zones = industrial_zones.industrial_zones;

	/**
	 * HLUK (Noise)
	 */
	const noise = {};

	const train_routes_noise = multiLineSetFilter(
		await fetchFromFile("data/train_routes.geojson"),
		"train_routes",
		centerLat,
		centerLon,
		DISTANCE_THRESHOLDS.NOISE_SOURCES,
		[{ original: "trasa", renamed: "name" }]
	);

	const bus_routes_noise = multiLineSetFilter(
		await fetchFromFile("data/bus_routes.geojson"),
		"bus_routes",
		centerLat,
		centerLon,
		DISTANCE_THRESHOLDS.NOISE_SOURCES,
		[{ original: "trasa", renamed: "name" }]
	);

	const airport_noise = singlePointSetFilter(
		await fetchFromFile("data/airport.geojson"),
		"airport",
		centerLat,
		centerLon,
		DISTANCE_THRESHOLDS.NOISE_SOURCES,
		[{ original: "nazev", renamed: "name" }]
	);

	const industrial_zones_noise = singlePointSetFilter(
		await fetchFromFile("data/industrial_zones.geojson"),
		"industrial_zones",
		centerLat,
		centerLon,
		DISTANCE_THRESHOLDS.NOISE_SOURCES,
		[{ original: "nazev", renamed: "name" }]
	);

	noise.train_routes = train_routes_noise.train_routes;
	noise.bus_routes = bus_routes_noise.bus_routes;
	noise.airport = airport_noise.airport;
	noise.industrial_zones = industrial_zones_noise.industrial_zones;

	/**
	 * BEZPEČNOST (Safety)
	 */
	const safety = {};

	const flood_5year = polygonSetFilter(
		await fetchFromFile("data/flood_5year.geojson"),
		"flood_5year",
		centerLat,
		centerLon,
		[{ original: "nazev_tok", renamed: "name" }]
	);

	const flood_20year = polygonSetFilter(
		await fetchFromFile("data/flood_20year.geojson"),
		"flood_20year",
		centerLat,
		centerLon,
		[{ original: "nazev_tok", renamed: "name" }]
	);

	const flood_100year = polygonSetFilter(
		await fetchFromFile("data/flood_100year.geojson"),
		"flood_100year",
		centerLat,
		centerLon,
		[{ original: "nazev_tok", renamed: "name" }]
	);

	safety.flood_5year = flood_5year.flood_5year;
	safety.flood_20year = flood_20year.flood_20year;
	safety.flood_100year = flood_100year.flood_100year;

	const data = {
		transport,
		healthcare,
		education,
		employment,
		noise,
		safety,
	};

	const result = {
		coordinates: {
			lat: centerLat,
			lon: centerLon,
		},
		data: data,
	};

	return result;
}

/*try {
	const result = await getFilteredDataSets(
		50.209494112933115,
		15.830824058963113
	);

	// Write to JSON file
	await writeFile("output.json", JSON.stringify(result, null, 2), "utf8");

	console.log("✓ Data successfully written to output.json");
} catch (error) {
	console.error("Error:", error);
	process.exit(1);
}*/
