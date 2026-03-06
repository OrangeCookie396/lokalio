function getInterestWeights() {
	// Sliders order in DOM: doprava, školství, zdravotnictví, sport, příroda, obchody
	const sliders = [...document.querySelectorAll('.category-slider')].map(s => parseInt(s.value) || 3);
	// Convert 1–5 preference to multiplier: 1→0.6, 3→1.0, 5→1.4
	const w = v => 0.6 + (v - 1) * 0.2;
	return {
		transportation: w(sliders[0]),
		education:      w(sliders[1]),
		medicalcare:    w(sliders[2]),
		recreation:     w(sliders[3]),
		qol:            w(sliders[4]),
		work:           w(sliders[5]),
	};
}

// Convert 0-5 score to 0-100
function toScore(s) {
	return s != null ? Math.min(100, Math.round(s * 20)) : 0;
}

function applyWeight(score, weight) {
	return Math.min(100, Math.round(score * weight));
}

function fmt(m) {
	if (m == null) return 'N/A';
	return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`;
}

// Get distance from a leaf node (entities[0].distance_m)
function dist(leaf) {
	return leaf?.entities?.[0]?.distance_m ?? null;
}

// Filter entities by count and optional max distance (metres)
function filterE(entities, maxCount, maxDistM = Infinity) {
	return (entities || [])
		.filter(e => e.distance_m == null || e.distance_m <= maxDistM)
		.slice(0, maxCount);
}

// Create marker and store it under a category key for highlight support
function addCategoryMarker(category, lat, lon, color) {
	const m = createMarker(window.reportMap, lat, lon, color);
	if (!m) return;
	if (!window.categoryMarkers) window.categoryMarkers = {};
	if (!window.allReportMarkers) window.allReportMarkers = [];
	if (!window.categoryMarkers[category]) window.categoryMarkers[category] = [];
	window.categoryMarkers[category].push(m);
	window.allReportMarkers.push(m);
}

// Highlight one category's markers; pass null to reset all
window.highlightCategoryMarkers = function(key) {
	const catMarkers = window.categoryMarkers || {};
	const highlighted = key ? (catMarkers[key] || []) : null;
	Object.values(catMarkers).flat().forEach(m => {
		m.setOpacity(!highlighted || highlighted.includes(m) ? 1 : 0.15);
	});
	// User location always stays at full opacity
	if (window.userLocationMarker) window.userLocationMarker.setOpacity(1);
};

function parseReportData(input) {
	const weights = getInterestWeights();
	const data = input.openData?.data || input.data || input;
	const result = {};

	// ====== DOPRAVA ======
	if (data.transport) {
		const t = data.transport;
		const busEntities = t.bus_stop?.entities || [];
		const trainEntities = t.train_stop?.entities || [];
		const nearestBus = busEntities[0]?.distance_m ?? null;
		const nearestTrain = trainEntities[0]?.distance_m ?? null;

		result.transportation = {
			score: applyWeight(toScore(t.value), weights.transportation),
			array: [
				{ name: 'Autobusové zastávky', value: fmt(nearestBus), entities: busEntities },
				{ name: 'Vlakové nádraží', value: fmt(nearestTrain), entities: trainEntities },
			]
		};

		// Map: bus stops within 1 km (max 10), train nearest 2
		filterE(busEntities, 10, 1000).forEach(e => e.lat && addCategoryMarker('transportation', e.lat, e.lon, '#3b82f6'));
		filterE(trainEntities, 2).forEach(e => e.lat && addCategoryMarker('transportation', e.lat, e.lon, '#2563eb'));
	}

	// ====== ZDRAVOTNICTVÍ ======
	if (data.healthcare) {
		const h = data.healthcare;
		const sp = h.special_care || {};

		result.medicalcare = {
			score: applyWeight(toScore(h.value), weights.medicalcare),
			array: [
				{ name: 'Praktický lékař', value: fmt(dist(h.doctor_adult)), entities: h.doctor_adult?.entities },
				{ name: 'Dětský lékař', value: fmt(dist(h.doctor_child)), entities: h.doctor_child?.entities },
				{ name: 'Nemocnice', value: fmt(dist(h.hospitals)), entities: h.hospitals?.entities },
				{ name: 'Zubař', value: fmt(dist(sp.dentist)), entities: sp.dentist?.entities },
				{ name: 'Gynekolog', value: fmt(dist(sp.outpatient_gynecologist)), entities: sp.outpatient_gynecologist?.entities },
				{ name: 'Rehabilitace', value: fmt(dist(sp.rehabilitation_centre)), entities: sp.rehabilitation_centre?.entities },
			]
		};

		// Map: nearest 2 per type
		filterE(h.hospitals?.entities, 2).forEach(e => e.lat && addCategoryMarker('medicalcare', e.lat, e.lon, '#ef4444'));
		filterE(h.doctor_adult?.entities, 2).forEach(e => e.lat && addCategoryMarker('medicalcare', e.lat, e.lon, '#f87171'));
		filterE(h.doctor_child?.entities, 2).forEach(e => e.lat && addCategoryMarker('medicalcare', e.lat, e.lon, '#fca5a5'));
	}

	// ====== REKREACE ======
	if (data.recreation) {
		const r = data.recreation;
		const ca = r.culture_and_arts || {};
		const el = r.entertainment_and_leisure || {};
		const hs = r.historical_sites || {};
		const nat = r.nature || {};
		const wl = r.wellness_and_lifestyle || {};

		const castleDist = dist(hs.castle);
		const chateauDist = dist(hs.chateau);
		const historicalDist = castleDist != null && chateauDist != null
			? Math.min(castleDist, chateauDist)
			: (castleDist ?? chateauDist);

		const castleAll = [...(hs.castle?.entities || []), ...(hs.chateau?.entities || [])]
			.sort((a, b) => (a.distance_m ?? 0) - (b.distance_m ?? 0));

		result.recreation = {
			score: applyWeight(toScore(r.value), weights.recreation),
			array: [
				{ name: 'Kulturní centrum', value: fmt(dist(ca.culture_centre)), entities: ca.culture_centre?.entities },
				{ name: 'Knihovna', value: fmt(dist(ca.library)), entities: ca.library?.entities },
				{ name: 'Muzeum / galerie', value: fmt(dist(ca.museum_and_gallery)), entities: ca.museum_and_gallery?.entities },
				{ name: 'Kino', value: fmt(dist(el.cinema)), entities: el.cinema?.entities },
				{ name: 'Zábavní centrum', value: fmt(dist(el.amusement_centre)), entities: el.amusement_centre?.entities },
				{ name: 'Hrad / zámek', value: fmt(historicalDist), entities: castleAll },
				{ name: 'Přírodní zajímavost', value: fmt(dist(nat.nature_curiosity)), entities: nat.nature_curiosity?.entities },
				{ name: 'Lázně / wellness', value: fmt(dist(wl.spa)), entities: wl.spa?.entities },
			]
		};

		// Map: only nearest 1 per sub-category (minimal clutter)
		[ca.culture_centre, ca.library, ca.museum_and_gallery, el.cinema,
		 el.amusement_centre, nat.nature_curiosity, wl.spa]
			.forEach(leaf => {
				const e0 = filterE(leaf?.entities, 1)[0];
				if (e0?.lat) addCategoryMarker('recreation', e0.lat, e0.lon, '#f97316');
			});
		// Nearest castle or chateau (not both)
		const hist0 = castleAll[0];
		if (hist0?.lat) addCategoryMarker('recreation', hist0.lat, hist0.lon, '#f97316');
	}

	// ====== VZDĚLÁNÍ ======
	if (data.education) {
		const e = data.education;
		const s = e.school || {};

		result.education = {
			score: applyWeight(toScore(e.value), weights.education),
			array: [
				{ name: 'Mateřská škola', value: fmt(dist(s.kindergarten)), entities: s.kindergarten?.entities },
				{ name: 'Základní škola', value: fmt(dist(s.primary)), entities: s.primary?.entities },
				{ name: 'Střední škola', value: fmt(dist(s.high)), entities: s.high?.entities },
				{ name: 'Vysoká škola', value: fmt(dist(s.university)), entities: s.university?.entities },
				{ name: 'ZUŠ', value: fmt(dist(e.art_school)), entities: e.art_school?.entities },
			]
		};

		// Map: nearest 1 per type only
		[s.kindergarten, s.primary, s.high, s.university, e.art_school].forEach(leaf => {
			const e0 = filterE(leaf?.entities, 1)[0];
			if (e0?.lat) addCategoryMarker('education', e0.lat, e0.lon, '#10b981');
		});
	}

	// ====== PRÁCE ======
	if (data.work) {
		const w = data.work;

		result.work = {
			score: applyWeight(toScore(w.value), weights.work),
			array: [
				{ name: 'Průmyslová zóna', value: fmt(dist(w.industrial_zone)), entities: w.industrial_zone?.entities },
			]
		};

		// Map: nearest 3
		filterE(w.industrial_zone?.entities, 3).forEach(e => e.lat && addCategoryMarker('work', e.lat, e.lon, '#f59e0b'));
	}

	// ====== QoL ======
	if (data.qol) {
		const q = data.qol;
		const air = q.air_quality || {};
		const flood = q.flood_risk || {};
		const izs = q.izs || {};
		const noise = q.noise || {};

		const floodLabel = flood['5year']?.entities?.some(e => e.inside) ? 'ANO – 5letá' :
			flood['20year']?.entities?.some(e => e.inside) ? 'ANO – 20letá' :
			flood['100year']?.entities?.some(e => e.inside) ? 'ANO – 100letá' : 'Ne';

		result.qol = {
			score: applyWeight(toScore(q.value), weights.qol),
			array: [
				{ name: 'Benzo[a]pyren (ng/m³)', value: 'N/A' },
				{ name: 'Prach PM10 (μg/m³)', value: 'N/A' },
				{ name: 'Oxid dusičitý (μg/m³)', value: 'N/A' },
				{ name: 'Záplavová zóna', value: floodLabel },
				{ name: 'Záchranná služba', value: fmt(dist(izs.ambulance)), entities: filterE(izs.ambulance?.entities, 3) },
				{ name: 'Hasiči', value: fmt(dist(izs.firefighter)), entities: filterE(izs.firefighter?.entities, 3) },
				{ name: 'Policie', value: fmt(dist(izs.police)), entities: filterE(izs.police?.entities, 3) },
				{ name: 'Hluk – vlak', value: fmt(dist(noise.train_route)), entities: filterE(noise.train_route?.entities, 3) },
				{ name: 'Hluk – letiště', value: fmt(dist(noise.airport)), entities: filterE(noise.airport?.entities, 3) },
				{ name: 'Hluk – průmysl', value: fmt(dist(noise.industrial_zone)), entities: filterE(noise.industrial_zone?.entities, 3) },
			]
		};
	}

	return result;
}

function roundScore(score) {
	if (score > 100) return 100;
	return score ? Math.round(score) : 0;
}

function formatDistance(m) {
	return fmt(m);
}

function average(arr) {
	if (!arr.length) return 0;
	return arr.reduce((a, b) => a + b, 0) / arr.length;
}
