// DUMMY DATA – pouze pro testování UI, odstraň před nasazením
const DUMMY_RESPONSE = {
	summary: `Tato lokalita nabízí velmi dobrou dopravní dostupnost s autobusovou zastávkou vzdálenou pouhých 120 metrů a vlakovým nádražím do 1 km. Zdravotní péče je dostupná v rozumné vzdálenosti – praktický lékař i zubař jsou v dosahu pěší chůze. Vzdělávací infrastruktura je silnou stránkou: mateřská i základní škola jsou velmi blízko, střední škola dostupná do 2 km.\n\nKvalita ovzduší je průměrná – hodnoty benzo[a]pyrenu a prachu odpovídají oblastem s mírnou průmyslovou aktivitou. Lokalita leží ve 100leté záplavové zóně, což je třeba vzít v úvahu při pojištění nemovitosti. Železniční trať ve vzdálenosti 420 metrů může způsobovat hlukovou zátěž zejména v nočních hodinách.\n\nCelkově jde o dobrou lokalitu vhodnou zejména pro rodiny s dětmi školního věku a pracující osoby s preferencí dobré dopravní dostupnosti.`,
	transport: {
		score: 4,
		bus_stop: [
			{ distance_m: 120, score: 5, coordinates: { lat: 50.2105, lon: 15.8318 } },
			{ distance_m: 280, score: 5, coordinates: { lat: 50.2098, lon: 15.8340 } },
			{ distance_m: 650, score: 3, coordinates: { lat: 50.2120, lon: 15.8290 } },
		],
		train_stop: [
			{ distance_m: 950, score: 5, coordinates: { lat: 50.2140, lon: 15.8380 } },
		]
	},
	healthcare: {
		score: 3,
		doctor_adult: { distance_m: 480, score: 4, coordinates: { lat: 50.2102, lon: 15.8325 } },
		doctor_child: { distance_m: 720, score: 4, coordinates: { lat: 50.2095, lon: 15.8350 } },
		hospitals: { distance_m: 3200, score: 3, coordinates: { lat: 50.2060, lon: 15.8420 } },
		special: {
			long_term_impatient_care: { distance_m: 8500, score: 3 },
			rehabilitation_centre: { distance_m: 4200, score: 3 },
			outpatient_gynecologist: { distance_m: 1100, score: 4 },
			dentist: { distance_m: 350, score: 5 },
		}
	},
	recreation: {
		score: 3,
		culture_and_arts: {
			culture_centre: { distance_m: 900, score: 4 },
			library: { distance_m: 1200, score: 4 },
			museum_and_gallery: { distance_m: 2500, score: 3 },
			theather_and_orchestra: { distance_m: 4800, score: 3 },
		},
		entertainment_and_leisure: {
			amusment_centre: { distance_m: 3200, score: 3 },
			cinema: { distance_m: 2100, score: 3 },
			free_time_centre: { distance_m: 1800, score: 3 },
			zoo: { distance_m: 12000, score: 3 },
		},
		historical_sites: {
			castle: { distance_m: 18000, score: 3 },
			chateau: { distance_m: 9000, score: 4 },
		},
		nature: {
			nature_curiosity: { distance_m: 6500, score: 3 },
			nature_monuments_and_buffer_zones: { distance_m: 11000, score: 3 },
		},
		wellness_and_lifestyle: {
			beer_brewery: { distance_m: 5000, score: 3 },
			spa: { distance_m: 22000, score: 2 },
		}
	},
	education: {
		score: 4,
		art_school: { distance_m: 1400, score: 5 },
		school: {
			kindergarten: { distance_m: 380, score: 5 },
			primary: { distance_m: 620, score: 5 },
			high: { distance_m: 1900, score: 4 },
			university: { distance_m: 8500, score: 3 },
		}
	},
	work: {
		score: 3,
		industrial_zone: { distance_m: 4200, score: 3, coordinates: { lat: 50.2080, lon: 15.8410 } },
	},
	qol: {
		score: 3,
		air_quality: {
			benzopyren: { value: 0.93, score: 3 },
			dust: { value: 13.7, score: 3 },
			oxide: { value: 15.8, score: 4 },
		},
		flood_risk: {
			'5year': { inside: false, score: 5 },
			'20year': { inside: false, score: 5 },
			'100year': { inside: true, score: 1 },
		},
		izs: {
			ambulance: { distance_m: 1800, score: 4 },
			firefighter: { distance_m: 2400, score: 4 },
			police: { distance_m: 950, score: 5 },
		},
		noise: {
			airport: { distance_m: 28000, score: 4 },
			train_route: { distance_m: 420, score: 2 },
			ambulance: { distance_m: 1800, score: 3 },
			firefighter: { distance_m: 2400, score: 3 },
			police: { distance_m: 950, score: 2 },
			industrial_zone: { distance_m: 4200, score: 4 },
		},
		road_quality: { score: 3 },
	}
};
