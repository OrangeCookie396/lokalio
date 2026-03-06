function getInterestWeights() {
	const interest = window.selectedInterest || '';
	switch (interest) {
		case 'student':
			return { transportation: 1.1, medicalcare: 1.0, recreation: 1.1, education: 1.3, work: 1.0, qol: 1.0 };
		case 'rodic':
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

function parseReportData(input) {
	const weights = getInterestWeights();
	const data = input.openData?.data || input.data || input;
	const result = {};

	// ====== DOPRAVA ======
	if (data.transport) {
		const t = data.transport;
		const busStops = t.bus_stop || [];
		const trainStops = t.train_stop || [];
		const nearestBus = busStops[0]?.distance_m ?? null;
		const nearestTrain = trainStops[0]?.distance_m ?? null;

		result.transportation = {
			score: applyWeight(toScore(t.score), weights.transportation),
			array: [
				{ name: 'Nejbližší autobusová zastávka', value: fmt(nearestBus) },
				{ name: 'Počet zastávek v dosahu', value: String(busStops.length) },
				{ name: 'Nejbližší vlakové nádraží', value: fmt(nearestTrain) },
			]
		};

		busStops.forEach(s => s.coordinates && createMarker(window.reportMap, s.coordinates.lat, s.coordinates.lon, '#3b82f6'));
		trainStops.forEach(s => s.coordinates && createMarker(window.reportMap, s.coordinates.lat, s.coordinates.lon, '#2563eb'));
	}

	// ====== ZDRAVOTNICTVÍ ======
	if (data.healthcare) {
		const h = data.healthcare;
		const sp = h.special || {};

		result.medicalcare = {
			score: applyWeight(toScore(h.score), weights.medicalcare),
			array: [
				{ name: 'Praktický lékař', value: fmt(h.doctor_adult?.distance_m) },
				{ name: 'Dětský lékař', value: fmt(h.doctor_child?.distance_m) },
				{ name: 'Nemocnice', value: fmt(h.hospitals?.distance_m) },
				{ name: 'Zubař', value: fmt(sp.dentist?.distance_m) },
				{ name: 'Gynekolog', value: fmt(sp.outpatient_gynecologist?.distance_m) },
				{ name: 'Rehabilitace', value: fmt(sp.rehabilitation_centre?.distance_m) },
			]
		};

		if (h.hospitals?.coordinates) createMarker(window.reportMap, h.hospitals.coordinates.lat, h.hospitals.coordinates.lon, '#ef4444');
		if (h.doctor_adult?.coordinates) createMarker(window.reportMap, h.doctor_adult.coordinates.lat, h.doctor_adult.coordinates.lon, '#f87171');
		if (h.doctor_child?.coordinates) createMarker(window.reportMap, h.doctor_child.coordinates.lat, h.doctor_child.coordinates.lon, '#fca5a5');
	}

	// ====== REKREACE ======
	if (data.recreation) {
		const r = data.recreation;
		const ca = r.culture_and_arts || {};
		const el = r.entertainment_and_leisure || {};
		const hs = r.historical_sites || {};
		const nat = r.nature || {};
		const wl = r.wellness_and_lifestyle || {};

		result.recreation = {
			score: applyWeight(toScore(r.score), weights.recreation),
			array: [
				{ name: 'Kulturní centrum', value: fmt(ca.culture_centre?.distance_m) },
				{ name: 'Knihovna', value: fmt(ca.library?.distance_m) },
				{ name: 'Muzeum / galerie', value: fmt(ca.museum_and_gallery?.distance_m) },
				{ name: 'Kino', value: fmt(el.cinema?.distance_m) },
				{ name: 'Zábavní centrum', value: fmt(el.amusment_centre?.distance_m) },
				{ name: 'Hrad / zámek', value: fmt((hs.castle ?? hs.chateau)?.distance_m) },
				{ name: 'Přírodní zajímavost', value: fmt(nat.nature_curiosity?.distance_m) },
				{ name: 'Lázně / wellness', value: fmt(wl.spa?.distance_m) },
			]
		};
	}

	// ====== VZDĚLÁNÍ ======
	if (data.education) {
		const e = data.education;
		const s = e.school || {};

		result.education = {
			score: applyWeight(toScore(e.score), weights.education),
			array: [
				{ name: 'Mateřská škola', value: fmt(s.kindergarten?.distance_m) },
				{ name: 'Základní škola', value: fmt(s.primary?.distance_m) },
				{ name: 'Střední škola', value: fmt(s.high?.distance_m) },
				{ name: 'Vysoká škola', value: fmt(s.university?.distance_m) },
				{ name: 'ZUŠ', value: fmt(e.art_school?.distance_m) },
			]
		};
	}

	// ====== PRÁCE ======
	if (data.work) {
		const w = data.work;

		result.work = {
			score: applyWeight(toScore(w.score), weights.work),
			array: [
				{ name: 'Průmyslová zóna', value: fmt(w.industrial_zone?.distance_m) },
			]
		};

		if (w.industrial_zone?.coordinates) {
			createMarker(window.reportMap, w.industrial_zone.coordinates.lat, w.industrial_zone.coordinates.lon, '#f59e0b');
		}
	}

	// ====== QoL ======
	if (data.qol) {
		const q = data.qol;
		const air = q.air_quality || {};
		const flood = q.flood_risk || {};
		const izs = q.izs || {};
		const noise = q.noise || {};

		const floodLabel = flood['5year']?.inside ? 'ANO – 5letá' :
			flood['20year']?.inside ? 'ANO – 20letá' :
			flood['100year']?.inside ? 'ANO – 100letá' : 'Ne';

		result.qol = {
			score: applyWeight(toScore(q.score), weights.qol),
			array: [
				{ name: 'Benzo[a]pyren (ng/m³)', value: air.benzopyren?.value != null ? String(air.benzopyren.value) : 'N/A' },
				{ name: 'Prach PM10 (μg/m³)', value: air.dust?.value != null ? String(air.dust.value) : 'N/A' },
				{ name: 'Oxid dusičitý (μg/m³)', value: air.oxide?.value != null ? String(air.oxide.value) : 'N/A' },
				{ name: 'Záplavová zóna', value: floodLabel },
				{ name: 'Záchranná služba', value: fmt(izs.ambulance?.distance_m) },
				{ name: 'Hasiči', value: fmt(izs.firefighter?.distance_m) },
				{ name: 'Policie', value: fmt(izs.police?.distance_m) },
				{ name: 'Hluk – vlak', value: fmt(noise.train_route?.distance_m) },
				{ name: 'Hluk – letiště', value: fmt(noise.airport?.distance_m) },
				{ name: 'Hluk – průmysl', value: fmt(noise.industrial_zone?.distance_m) },
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
