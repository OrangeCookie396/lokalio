function getInterestWeights() {
	const interest = window.selectedInterest || '';
	switch (interest) {
		case 'student':
			return { transportation: 1.1, medicalcare: 1.0, recreation: 1.1, education: 1.3, work: 1.0, qol: 1.0 };
		case 'rodina':
			return { transportation: 1.1, medicalcare: 1.2, recreation: 1.0, education: 1.0, work: 0.9, qol: 1.3 };
		case 'pracujici':
			return { transportation: 1.2, medicalcare: 1.0, recreation: 0.9, education: 0.7, work: 1.4, qol: 1.1 };
		default:
			return { transportation: 1, medicalcare: 1, recreation: 1, education: 1, work: 1, qol: 1 };
	}
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

		busEntities.forEach(e => e.lat && createMarker(window.reportMap, e.lat, e.lon, '#3b82f6'));
		trainEntities.forEach(e => e.lat && createMarker(window.reportMap, e.lat, e.lon, '#2563eb'));
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
		if (hosp0?.lat) createMarker(window.reportMap, hosp0.lat, hosp0.lon, '#ef4444');
		const da0 = h.doctor_adult?.entities?.[0];
		if (da0?.lat) createMarker(window.reportMap, da0.lat, da0.lon, '#f87171');
		const dc0 = h.doctor_child?.entities?.[0];
		if (dc0?.lat) createMarker(window.reportMap, dc0.lat, dc0.lon, '#fca5a5');
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
		if (iz0?.lat) createMarker(window.reportMap, iz0.lat, iz0.lon, '#f59e0b');
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
