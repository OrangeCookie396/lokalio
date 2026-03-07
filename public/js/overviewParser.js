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

function applyMarkerVisibility() {
	const catMarkers = window.categoryMarkers || {};
	const detailKey = window._detailCategory || null;

	Object.entries(catMarkers).forEach(([cat, markers]) => {
		markers.forEach(m => {
			const visible = detailKey !== null
				? cat === detailKey
				: (window.categoryVisibility?.[cat] !== false);
			m.setOpacity(visible ? 1 : 0);
		});
	});

	if (window.userLocationMarker) window.userLocationMarker.setOpacity(1);
}

window.applyMarkerVisibility = applyMarkerVisibility;

// Highlight one category's markers (detail view); pass null to reset
window.highlightCategoryMarkers = function(key) {
	window._detailCategory = key || null;
	applyMarkerVisibility();
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
				{ name: 'Lůžková péče', value: fmt(dist(sp.long_term_impatient_care)), entities: sp.long_term_impatient_care?.entities },
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
				{ name: 'Divadlo', value: fmt(dist(ca.theatre_and_orchestra)), entities: ca.theatre_and_orchestra?.entities },
				{ name: 'Kino', value: fmt(dist(el.cinema)), entities: el.cinema?.entities },
				{ name: 'Zábavní centrum', value: fmt(dist(el.amusement_centre)), entities: el.amusement_centre?.entities },
				{ name: 'Volnočasové centrum', value: fmt(dist(el.free_time_centre)), entities: el.free_time_centre?.entities },
				{ name: 'Zoo', value: fmt(dist(el.zoo)), entities: el.zoo?.entities },
				{ name: 'Hrad / zámek', value: fmt(historicalDist), entities: castleAll },
				{ name: 'Přírodní zajímavost', value: fmt(dist(nat.nature_curiosity)), entities: nat.nature_curiosity?.entities },
				{ name: 'Lázně / wellness', value: fmt(dist(wl.spa)), entities: wl.spa?.entities },
				{ name: 'Pivovar', value: fmt(dist(wl.beer_brewery)), entities: wl.beer_brewery?.entities },
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
		const jo = w.job_opportunities;

		const joValue = jo?.company_count != null
			? `${jo.company_count.toLocaleString('cs-CZ')} firem`
			: fmt(dist(jo));

		result.work = {
			score: applyWeight(toScore(w.value), weights.work),
			array: [
				{ name: 'Průmyslová zóna', value: fmt(dist(w.industrial_zone)), entities: w.industrial_zone?.entities },
				{ name: 'Pracovní příležitosti', value: joValue, entities: jo?.entities },
			]
		};

		// Map: nearest 3 industrial + top 3 employers
		filterE(w.industrial_zone?.entities, 3).forEach(e => e.lat && addCategoryMarker('work', e.lat, e.lon, '#f59e0b'));
		filterE(jo?.entities, 3).forEach(e => e.lat && addCategoryMarker('work', e.lat, e.lon, '#f59e0b'));
	}

	// ====== QoL ======
	if (data.qol) {
		const q = data.qol;
		const air = q.air_quality || {};
		const flood = q.flood_risk || {};
		const izs = q.izs || {};
		const noise = q.noise || {};

		const floodMatchedYears = [5, 20, 100].filter(y => flood[`${y}year`]?.entities?.some(e => e.inside));
		const floodLabel = floodMatchedYears.length > 0 ? `ANO – ${Math.min(...floodMatchedYears)}letá` : 'Ne';

		// IZS: nearest distance across all services
		const izsDistances = [dist(izs.ambulance), dist(izs.firefighter), dist(izs.police)].filter(d => d != null);
		const nearestIZS = izsDistances.length > 0 ? Math.min(...izsDistances) : null;

		// Noise: combine additively (each source contributes noise penalty = 5 - value), including IZS noise sources
		const noiseSources = [
			{ name: 'Vlak', node: noise.train_route },
			{ name: 'Letiště', node: noise.airport },
			{ name: 'Průmysl', node: noise.industrial_zone },
			{ name: 'Záchranná služba', node: noise.ambulance },
			{ name: 'Hasiči', node: noise.firefighter },
			{ name: 'Policie', node: noise.police },
		].filter(s => s.node != null);
		const noisePenalties = noiseSources.filter(s => s.node.value != null).map(s => Math.max(0, 5 - s.node.value));
		const totalNoisePenalty = Math.min(5, noisePenalties.reduce((a, b) => a + b, 0));
		const noiseLabels = ['Žádný', 'Nízký', 'Mírný', 'Střední', 'Vysoký', 'Velmi vysoký'];
		const combinedNoiseLabel = noiseLabels[Math.round(totalNoisePenalty)] || 'N/A';

		const roadQualityRaw = q.road_quality?.value ?? q.road_quality?.score ?? null;
		const roadQualityScore = roadQualityRaw != null ? toScore(roadQualityRaw) : null;
		const roadQualityLabel = roadQualityScore != null ? getScoreText(roadQualityScore) : 'N/A';

		result.qol = {
			score: applyWeight(toScore(q.value), weights.qol),
			array: [
				{ name: 'Benzo[a]pyren (ng/m³)', value: air.benzopyren?.measured != null ? air.benzopyren.measured.toFixed(2) : 'N/A', entities: filterE(air.benzopyren?.entities, 3) },
				{ name: 'Prach PM10 (μg/m³)', value: air.dust?.measured != null ? air.dust.measured.toFixed(2) : 'N/A', entities: filterE(air.dust?.entities, 3) },
				{ name: 'Oxid dusičitý (μg/m³)', value: air.oxide?.measured != null ? air.oxide.measured.toFixed(2) : 'N/A', entities: filterE(air.oxide?.entities, 3) },
				{ name: 'Záplavová zóna', value: floodLabel },
				{
					name: 'IZS',
					value: fmt(nearestIZS),
					entities: [
						izs.ambulance?.entities?.[0] != null ? { name: 'Záchranná služba', distance_m: izs.ambulance.entities[0].distance_m, lat: izs.ambulance.entities[0].lat, lon: izs.ambulance.entities[0].lon } : null,
						izs.firefighter?.entities?.[0] != null ? { name: 'Hasiči', distance_m: izs.firefighter.entities[0].distance_m, lat: izs.firefighter.entities[0].lat, lon: izs.firefighter.entities[0].lon } : null,
						izs.police?.entities?.[0] != null ? { name: 'Policie', distance_m: izs.police.entities[0].distance_m, lat: izs.police.entities[0].lat, lon: izs.police.entities[0].lon } : null,
					].filter(Boolean),
				},
				{ name: 'Hluk', value: combinedNoiseLabel },
				{ name: 'Kvalita silnic', value: roadQualityLabel },
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
