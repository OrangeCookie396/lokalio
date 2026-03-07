(function initAddMap() {
	// Královéhradecký kraj bounding box
	const REGION_BOUNDS = L.latLngBounds(
		L.latLng(49.94, 15.35),
		L.latLng(50.78, 16.64)
	);

	window.addMap.fitBounds(REGION_BOUNDS);

	// Ray-casting point-in-polygon (GeoJSON ring je [lon, lat])
	function pointInRing(lat, lon, ring) {
		let inside = false;
		for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
			const [xi, yi] = ring[i], [xj, yj] = ring[j];
			if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)
				inside = !inside;
		}
		return inside;
	}

	let KHK_RING = null;

	function isInRegion(lat, lon) {
		if (KHK_RING) return pointInRing(lat, lon, KHK_RING);
		return REGION_BOUNDS.contains(L.latLng(lat, lon)); // fallback dokud se polygon načítá
	}

	const world = [[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]];

	fetch('/resources/khk_boundary.geojson')
		.then(r => r.json())
		.then(geojson => {
			KHK_RING = geojson.geometry.coordinates[0];
			const maskGeometry = { type: 'Polygon', coordinates: [world, KHK_RING] };
			const regionGeometry = { type: 'Polygon', coordinates: [KHK_RING] };

			[window.addMap, window.reportMap].forEach(m => {
				L.geoJSON({ type: 'Feature', geometry: maskGeometry }, {
					interactive: false, style: { fillColor: '#000', fillOpacity: 0.08, color: 'transparent', weight: 0 }
				}).addTo(m);
				L.geoJSON({ type: 'Feature', geometry: regionGeometry }, {
					interactive: false, style: { fill: false, color: '#1F7A8C', weight: 2, opacity: 0.7 }
				}).addTo(m);
			});
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