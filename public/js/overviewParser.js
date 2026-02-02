// Create markers on the map for all POIs from API response
function createPOIMarkers(apiResponse) {
	console.log('createPOIMarkers received:', apiResponse);

	// Handle both formats: direct categories or nested in openData.data
	const data = apiResponse.openData?.data || apiResponse.data || apiResponse;

	console.log('Extracted data:', data);
	console.log('Transport data:', data.transport);
	console.log('Healthcare data:', data.healthcare);

	// ====== TRANSPORTATION ======
	if (data.transport) {
		const t = data.transport;
		(t.bus_stops || []).forEach(stop =>
			createMarker(window.reportMap, stop.coordinates.lat, stop.coordinates.lon, '#3b82f6')
		);
		(t.train_stations || []).forEach(stop =>
			createMarker(window.reportMap, stop.coordinates.lat, stop.coordinates.lon, '#2563eb')
		);
	}

	// ====== HEALTHCARE ======
	if (data.healthcare) {
		const h = data.healthcare;
		(h.hospitals || []).forEach(hosp =>
			createMarker(window.reportMap, hosp.coordinates.lat, hosp.coordinates.lon, '#ef4444')
		);
	}

	// ====== EDUCATION ======
	if (data.education) {
		const e = data.education;
		(e.schools || []).forEach(s =>
			createMarker(window.reportMap, s.coordinates.lat, s.coordinates.lon, '#10b981')
		);
	}

	// ====== EMPLOYMENT ======
	if (data.employment) {
		const w = data.employment;
		(w.industrial_zones || []).forEach(z =>
			createMarker(window.reportMap, z.coordinates.lat, z.coordinates.lon, '#f59e0b')
		);
	}
}

function getInterestWeights() {
	const interest = window.selectedInterest || '';

	let weights;

	switch (interest) {
		case 'student':
			weights = {
				education: 1.3,
				work: 1.0,
				transportation: 1.1,
				safety: 1.0,
				medicalcare: 1.0,
				qualityOfLife: 1.0
			};
			break;
		case 'rodic':
			weights = {
				education: 1.0,
				work: 0.9,
				transportation: 1.1,
				safety: 1.3,
				medicalcare: 1.2,
				qualityOfLife: 1.0
			};
			break;
		case 'pracujici':
			weights = {
				education: 0.7,
				work: 1.4,
				transportation: 1.2,
				safety: 1.0,
				medicalcare: 1.0,
				qualityOfLife: 1.1
			};
			break;
		default:
			// žádný zájem – všechny váhy 1
			weights = {
				education: 1,
				work: 1,
				transportation: 1,
				safety: 1,
				medicalcare: 1,
				qualityOfLife: 1
			};
	}

	console.log('Selected interest:', interest);
	console.log('Computed weights:', weights);

	return weights;
}




function parseReportData(input) {
	const weights = getInterestWeights();
	console.log(weights)
	// Handle both formats: direct categories or nested in openData.data
	const data = input.openData?.data || input.data || input;
	const result = {};

	// ====== TRANSPORTATION ======
	if (data.transport) {
		const t = data.transport;
		const nearestStop = t.bus_stops?.[0]?.distance_m ?? null;
		const lineCount = (t.bus_routes?.length ?? 0) + (t.train_routes?.length ?? 0);

		result.transportation = {
			score: roundScore(t.score * weights.transportation),
			array: [
				{
					name: 'Vzdálenost k nejbližší zastávce',
					value: nearestStop ? formatDistance(nearestStop) : 'N/A'
				},
				{
					name: 'Počet linek v dosahu',
					value: String(lineCount)
				}
			]
		};

		(t.bus_stops || []).forEach(stop =>
			createMarker(window.reportMap, stop.coordinates.lat, stop.coordinates.lon, '#3b82f6')
		);
		(t.train_stations || []).forEach(stop =>
			createMarker(window.reportMap, stop.coordinates.lat, stop.coordinates.lon, '#2563eb')
		);
	}

	// ====== HEALTHCARE ======
	if (data.healthcare) {
		const h = data.healthcare;
		const nearestHospital = h.hospitals?.[0]?.distance_m ?? null;
		const doctorCount = (h.doctor_adult?.length ?? 0) + (h.doctor_child?.length ?? 0);

		result.medicalcare = {
			score: roundScore(h.score * weights.medicalcare),
			array: [
				{
					name: 'Vzdálenost k nemocnici',
					value: nearestHospital ? formatDistance(nearestHospital) : 'N/A'
				},
				{
					name: 'Počet lékařů v okolí',
					value: String(doctorCount)
				}
			]
		};

		(h.hospitals || []).forEach(hosp =>
			createMarker(window.reportMap, hosp.coordinates.lat, hosp.coordinates.lon, '#ef4444')
		);
	}

	// ====== EDUCATION ======
	if (data.education) {
		const e = data.education;
		const schoolCount = (e.schools?.length ?? 0);

		result.education = {
			score: roundScore(e.score * weights.education),
			array: [
				{
					name: 'Počet škol v okolí',
					value: String(schoolCount)
				},
				{
					name: 'Dostupnost střední školy',
					value: (e.schools || []).some(s => s.type.toLowerCase().includes('gymnázium') || s.type.toLowerCase().includes('secondary'))
						? 'Ano'
						: 'Ne'
				}
			]
		};

		(e.schools || []).forEach(s =>
			createMarker(window.reportMap, s.coordinates.lat, s.coordinates.lon, '#10b981')
		);
	}

	// ====== WORK ======
	if (data.work) {
		const w = data.work;
		const zoneCount = w.industrial_zones?.length ?? 0;
		const nearestZone = w.industrial_zones?.[0]?.distance_m ?? null;

		result.work = {
			score: roundScore(w.score * weights.work),
			array: [
				{ name: 'Počet průmyslových zón', value: String(zoneCount) },
				{ name: 'Vzdálenost k nejbližší zóně', value: formatDistance(nearestZone) }
			]
		};

		(w.industrial_zones || []).forEach(z =>
			createMarker(window.reportMap, z.coordinates.lat, z.coordinates.lon, '#f59e0b')
		);
	}

	// ====== SAFETY ======
	if (data.safety) {
		const s = data.safety;
		const waters = Object.keys(s)
			.filter(k => k.endsWith('_water'))
			.map(k => s[k])
			.flat();
		result.safety = {
			score: roundScore(s.score * weights.safety),
			array: [
				{ name: 'Vodní plochy v okolí', value: String(waters.length) },
				{ name: 'Největší plocha', value: `${Math.max(...waters.map(w => w.size || 0))} m²` }
			]
		};
	}

	// ====== NOISE ======
	if (data.noise) {
		const n = data.noise;
		const avgNoiseDist = average([
			...(n.bus_routes || []).map(r => r.distance_m),
			...(n.train_routes || []).map(r => r.distance_m),
			...(n.airports || []).map(r => r.distance_m)
		]);
		result.qualityOfLife = {
			score: roundScore(n.score * weights.qualityOfLife),
			array: [
				{ name: 'Průměrná vzdálenost zdrojů hluku', value: formatDistance(avgNoiseDist) },
				{ name: 'Počet zdrojů hluku', value: String(
					(n.bus_routes?.length ?? 0) +
					(n.train_routes?.length ?? 0) +
					(n.airports?.length ?? 0)
				)}
			]
		};
	}

	return result;
}

// ====== Helper Functions ======
function roundScore(score) {
	if (score > 100) return 100;
	return score ? Math.round(score) : 0;
}

function formatDistance(m) {
	if (m == null) return 'N/A';
	return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`;
}

function average(arr) {
	if (!arr.length) return 0;
	return arr.reduce((a, b) => a + b, 0) / arr.length;
}