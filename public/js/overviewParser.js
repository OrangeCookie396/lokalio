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

// Create marker and store it under a category key for highlight support
function addCategoryMarker(category, lat, lon, color) {
	const m = createMarker(window.reportMap, lat, lon, color);
	if (!m) return;
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
				{ name: 'Nejbližší autobusová zastávka', value: fmt(nearestBus) },
				{ name: 'Počet zastávek v dosahu', value: String(busEntities.length) },
				{ name: 'Nejbližší vlakové nádraží', value: fmt(nearestTrain) },
			]
		};

		busEntities.forEach(e => e.lat && addCategoryMarker('transportation', e.lat, e.lon, '#3b82f6'));
		trainEntities.forEach(e => e.lat && addCategoryMarker('transportation', e.lat, e.lon, '#2563eb'));
	}

	// ====== ZDRAVOTNICTVÍ ======
	if (data.healthcare) {
		const h = data.healthcare;
		const sp = h.special_care || {};

		result.medicalcare = {
			score: applyWeight(toScore(h.value), weights.medicalcare),
			array: [
				{ name: 'Praktický lékař', value: fmt(dist(h.doctor_adult)) },
				{ name: 'Dětský lékař', value: fmt(dist(h.doctor_child)) },
				{ name: 'Nemocnice', value: fmt(dist(h.hospitals)) },
				{ name: 'Zubař', value: fmt(dist(sp.dentist)) },
				{ name: 'Gynekolog', value: fmt(dist(sp.outpatient_gynecologist)) },
				{ name: 'Rehabilitace', value: fmt(dist(sp.rehabilitation_centre)) },
			]
		};

		const hosp0 = h.hospitals?.entities?.[0];
		if (hosp0?.lat) addCategoryMarker('medicalcare', hosp0.lat, hosp0.lon, '#ef4444');
		const da0 = h.doctor_adult?.entities?.[0];
		if (da0?.lat) addCategoryMarker('medicalcare', da0.lat, da0.lon, '#f87171');
		const dc0 = h.doctor_child?.entities?.[0];
		if (dc0?.lat) addCategoryMarker('medicalcare', dc0.lat, dc0.lon, '#fca5a5');
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

		result.recreation = {
			score: applyWeight(toScore(r.value), weights.recreation),
			array: [
				{ name: 'Kulturní centrum', value: fmt(dist(ca.culture_centre)) },
				{ name: 'Knihovna', value: fmt(dist(ca.library)) },
				{ name: 'Muzeum / galerie', value: fmt(dist(ca.museum_and_gallery)) },
				{ name: 'Kino', value: fmt(dist(el.cinema)) },
				{ name: 'Zábavní centrum', value: fmt(dist(el.amusement_centre)) },
				{ name: 'Hrad / zámek', value: fmt(historicalDist) },
				{ name: 'Přírodní zajímavost', value: fmt(dist(nat.nature_curiosity)) },
				{ name: 'Lázně / wellness', value: fmt(dist(wl.spa)) },
			]
		};

		[
			ca.culture_centre, ca.library, ca.museum_and_gallery, ca.theatre_and_orchestra,
			el.cinema, el.amusement_centre, el.free_time_centre,
			hs.castle, hs.chateau,
			nat.nature_curiosity, wl.spa,
		].forEach(leaf => {
			const e0 = leaf?.entities?.[0];
			if (e0?.lat) addCategoryMarker('recreation', e0.lat, e0.lon, '#f97316');
		});
	}

	// ====== VZDĚLÁNÍ ======
	if (data.education) {
		const e = data.education;
		const s = e.school || {};

		result.education = {
			score: applyWeight(toScore(e.value), weights.education),
			array: [
				{ name: 'Mateřská škola', value: fmt(dist(s.kindergarten)) },
				{ name: 'Základní škola', value: fmt(dist(s.primary)) },
				{ name: 'Střední škola', value: fmt(dist(s.high)) },
				{ name: 'Vysoká škola', value: fmt(dist(s.university)) },
				{ name: 'ZUŠ', value: fmt(dist(e.art_school)) },
			]
		};

		[s.kindergarten, s.primary, s.high, s.university, e.art_school].forEach(leaf => {
			const e0 = leaf?.entities?.[0];
			if (e0?.lat) addCategoryMarker('education', e0.lat, e0.lon, '#10b981');
		});
	}

	// ====== PRÁCE ======
	if (data.work) {
		const w = data.work;

		result.work = {
			score: applyWeight(toScore(w.value), weights.work),
			array: [
				{ name: 'Průmyslová zóna', value: fmt(dist(w.industrial_zone)) },
			]
		};

		const iz0 = w.industrial_zone?.entities?.[0];
		if (iz0?.lat) addCategoryMarker('work', iz0.lat, iz0.lon, '#f59e0b');
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
				{ name: 'Záchranná služba', value: fmt(dist(izs.ambulance)) },
				{ name: 'Hasiči', value: fmt(dist(izs.firefighter)) },
				{ name: 'Policie', value: fmt(dist(izs.police)) },
				{ name: 'Hluk – vlak', value: fmt(dist(noise.train_route)) },
				{ name: 'Hluk – letiště', value: fmt(dist(noise.airport)) },
				{ name: 'Hluk – průmysl', value: fmt(dist(noise.industrial_zone)) },
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
