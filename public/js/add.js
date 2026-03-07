(function initAddMap() {
	// Královéhradecký kraj bounding box
	const REGION_BOUNDS = L.latLngBounds(
		L.latLng(49.94, 15.35),
		L.latLng(50.78, 16.64)
	);

	window.addMap.fitBounds(REGION_BOUNDS);


	function isInRegion(lat, lon) {
		return REGION_BOUNDS.contains(L.latLng(lat, lon));
	}

	// Hardcoded KHK boundary polygon (simplified, ~125 pts, GeoJSON [lon, lat])
	const KHK_RING = [[15.1042301,50.3761056],[15.1313011,50.3635582],[15.1205562,50.359272],[15.1297951,50.345777],[15.1887052,50.3398841],[15.1809546,50.3282385],[15.2177977,50.3180759],[15.2062026,50.2968885],[15.2320883,50.287048],[15.3068336,50.28121],[15.3510949,50.3009167],[15.3780729,50.2846809],[15.3707906,50.2266849],[15.4025763,50.2075478],[15.3560397,50.1660618],[15.3740049,50.1557769],[15.3486999,50.1447963],[15.4402373,50.1285949],[15.4521364,50.0953061],[15.5222362,50.1166435],[15.5214294,50.1350282],[15.5664633,50.1500037],[15.5863964,50.133348],[15.6484492,50.1404669],[15.6897076,50.1257065],[15.7269513,50.1337961],[15.7403972,50.1610997],[15.7762137,50.1756593],[15.8043219,50.1680426],[15.804664,50.1402388],[15.8372875,50.1318911],[15.9170489,50.1706913],[15.992221,50.1573735],[16.0095322,50.1460406],[16.0096194,50.112631],[16.0634109,50.1127879],[16.0750746,50.0865277],[16.1117449,50.0846077],[16.1959571,50.0386112],[16.2422784,50.0556577],[16.2477049,50.0426415],[16.3306895,50.0401513],[16.3121104,50.0608023],[16.3574269,50.0776122],[16.3406586,50.0923665],[16.4722328,50.1368852],[16.4811264,50.1645686],[16.584671,50.1456513],[16.5578298,50.1705809],[16.5572941,50.2204503],[16.4312977,50.3246996],[16.3832289,50.3288138],[16.3621643,50.3497264],[16.3606602,50.3795482],[16.3046852,50.3825941],[16.2786326,50.367443],[16.2529226,50.4056424],[16.2144687,50.409103],[16.1957111,50.4321315],[16.2129587,50.4517035],[16.2318899,50.4434772],[16.2203757,50.4578859],[16.2587055,50.4801755],[16.2940968,50.4791945],[16.3115277,50.5061321],[16.3455962,50.4959641],[16.3998709,50.5274362],[16.3873932,50.5419835],[16.410932,50.5478983],[16.404645,50.5692719],[16.4449071,50.5795696],[16.4225415,50.6066615],[16.3430806,50.6615084],[16.2357136,50.6716609],[16.2173562,50.633346],[16.1875706,50.6272461],[16.1698087,50.6455096],[16.1012621,50.6627493],[16.0675933,50.6397203],[16.0560795,50.6097033],[16.0248323,50.5986228],[15.9864398,50.613483],[16.0217486,50.6301681],[16.0009512,50.6447851],[15.9909052,50.6834118],[15.9612341,50.6918515],[15.8609633,50.6744493],[15.8161933,50.75532],[15.7057089,50.7372547],[15.601762,50.7768172],[15.5353254,50.7794187],[15.5392749,50.7575065],[15.5736101,50.7359036],[15.5615314,50.6823043],[15.5838121,50.6526363],[15.5650755,50.6373039],[15.6020903,50.6143547],[15.5711408,50.5811769],[15.5942192,50.5739739],[15.5860895,50.5675499],[15.6014457,50.5581641],[15.5931624,50.5591853],[15.5904531,50.5586729],[15.6322326,50.5227373],[15.5831002,50.5136033],[15.562635,50.5268216],[15.5364215,50.5130805],[15.4780097,50.5469582],[15.480025,50.5325628],[15.4364649,50.5217276],[15.453887,50.5012357],[15.4415668,50.487177],[15.3923581,50.4798273],[15.379478,50.508586],[15.3680209,50.4947757],[15.2657792,50.525648],[15.2232056,50.4941989],[15.1455338,50.5225246],[15.1134746,50.5033822],[15.1447428,50.4750487],[15.1295856,50.4505226],[15.1623016,50.4272623],[15.1369588,50.4039617],[15.1440642,50.3875859],[15.1042301,50.3761056]];
	const world = [[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]];
	const maskGeometry = { type: 'Polygon', coordinates: [world, KHK_RING] };
	const regionGeometry = { type: 'Polygon', coordinates: [KHK_RING] };

	[window.addMap, window.reportMap].forEach(m => {
		L.geoJSON({ type: 'Feature', geometry: maskGeometry }, {
			interactive: false, style: { fillColor: '#FFF', fillOpacity: 0.6, color: 'transparent', weight: 0 }
		}).addTo(m);
		L.geoJSON({ type: 'Feature', geometry: regionGeometry }, {
			interactive: false, style: { fill: false, color: '#1F7A8C', weight: 2, opacity: 0.7 }
		}).addTo(m);
	});

	function showRegionError() {
		let toast = document.getElementById('region-toast');
		if (!toast) {
			toast = document.createElement('div');
			toast.id = 'region-toast';
			toast.style.cssText = `
				position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
				background: var(--snow); border: 1px solid var(--error);
				color: var(--error-dark, #b91c1c); padding: 10px 18px; border-radius: 10px;
				font-size: 0.88rem; font-weight: 500; z-index: 2000; white-space: nowrap;
				box-shadow: 0 4px 16px rgba(0,0,0,0.12); pointer-events: none;
				transition: opacity 0.4s ease;
			`;
			toast.textContent = 'Vyberte místo v Královéhradeckém kraji';
			document.body.appendChild(toast);
		}
		toast.style.opacity = '1';
		clearTimeout(toast._timer);
		toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 2500);
	}

	let selectedMarker = null;

	function placePin(lat, lon, label) {
		if (selectedMarker) window.addMap.removeLayer(selectedMarker);
		selectedMarker = createMarker(window.addMap, lat, lon, '#1F7A8C');
		inputCoordinates = [lat, lon];
		window.addMap.setView([lat, lon], window.addMap.getZoom());

		document.getElementById('btn-next')?.classList.remove('disabled');
		const btnAnalyze = document.getElementById('btn-analyze');
		if (btnAnalyze) btnAnalyze.disabled = false;

		const chip = document.getElementById('location-text');
		if (chip) chip.textContent = label || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
	}

	// ── Address autocomplete ───────────────────────
	const input = document.getElementById('address-input');
	const suggestions = document.getElementById('address-suggestions');
	let debounceTimer = null;
	let activeIndex = -1;

	function clearSuggestions() {
		suggestions.innerHTML = '';
		activeIndex = -1;
	}

	async function fetchSuggestions(q) {
		// viewbox: minLon,maxLat,maxLon,minLat — bounded=1 restricts to region
		const viewbox = `${REGION_BOUNDS.getWest()},${REGION_BOUNDS.getNorth()},${REGION_BOUNDS.getEast()},${REGION_BOUNDS.getSouth()}`;
		const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=8&accept-language=cs&countrycodes=cz&addressdetails=1&viewbox=${viewbox}&bounded=1`;
		const res = await fetch(url, { headers: { 'Accept-Language': 'cs' } });
		const results = await res.json();
		return results.filter(item => isInRegion(parseFloat(item.lat), parseFloat(item.lon)));
	}

	function buildLabel(item) {
		const a = item.address || {};
		const main = [a.road, a.house_number].filter(Boolean).join(' ')
			|| a.amenity || a.building || item.name || '';
		const sub = [a.city || a.town || a.village || a.municipality, a.county].filter(Boolean).join(', ');
		return { main: main || item.display_name, sub };
	}

	input.addEventListener('input', () => {
		clearTimeout(debounceTimer);
		const q = input.value.trim();
		if (q.length < 3) { clearSuggestions(); return; }

		debounceTimer = setTimeout(async () => {
			try {
				const results = await fetchSuggestions(q);
				clearSuggestions();
				results.forEach((item, i) => {
					const { main, sub } = buildLabel(item);
					const li = document.createElement('li');
					li.innerHTML = `<div class="sug-main">${main}</div>${sub ? `<div class="sug-sub">${sub}</div>` : ''}`;
					li.addEventListener('mousedown', (e) => {
						e.preventDefault();
						input.value = main;
						clearSuggestions();
						placePin(parseFloat(item.lat), parseFloat(item.lon), [main, sub].filter(Boolean).join(', '));
					});
					suggestions.appendChild(li);
				});
			} catch { clearSuggestions(); }
		}, 300);
	});

	input.addEventListener('keydown', (e) => {
		const items = suggestions.querySelectorAll('li');
		if (!items.length) return;
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			activeIndex = Math.min(activeIndex + 1, items.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			activeIndex = Math.max(activeIndex - 1, 0);
		} else if (e.key === 'Enter' && activeIndex >= 0) {
			e.preventDefault();
			items[activeIndex].dispatchEvent(new Event('mousedown'));
			return;
		} else if (e.key === 'Escape') {
			clearSuggestions();
			return;
		}
		items.forEach((li, i) => li.classList.toggle('active', i === activeIndex));
	});

	input.addEventListener('blur', () => setTimeout(clearSuggestions, 150));

	window.addMap.on('click', async (e) => {
		if (!isInRegion(e.latlng.lat, e.latlng.lng)) {
			showRegionError();
			return;
		}
		const chip = document.getElementById('location-text');
		if (chip) chip.textContent = 'Načítám adresu…';
		placePin(e.latlng.lat, e.latlng.lng, null);
		clearSuggestions();
		input.value = '';

		try {
			const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${e.latlng.lat}&lon=${e.latlng.lng}&format=json&accept-language=cs`);
			const data = await res.json();
			const a = data.address || {};
			const parts = [a.road, a.house_number, a.city || a.town || a.village || a.municipality].filter(Boolean);
			const label = parts.length ? parts.join(' ') : data.display_name;
			if (chip) chip.textContent = label;
			input.value = label;
		} catch {
			if (chip) chip.textContent = `${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`;
		}
	});
})();

document.addEventListener('DOMContentLoaded', () => {
	const picker = document.getElementById('interest-picker');
	if (picker) {
		picker.addEventListener('change', (e) => {
			const selected = e.target.value;
			console.log('Vybraný zájem:', selected);
			
			// Ulož hodnotu globálně, ať ji můžeš použít v parseReportData()
			window.selectedInterest = selected;
		});
	}
});