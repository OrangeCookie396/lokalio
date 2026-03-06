(function initAddMap() {
	let selectedMarker = null;

	function placePin(lat, lon, label) {
		if (selectedMarker) window.addMap.removeLayer(selectedMarker);
		selectedMarker = createMarker(window.addMap, lat, lon, '#1F7A8C');
		inputCoordinates = [lat, lon];
		window.addMap.setView([lat, lon], 14);

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
		const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&accept-language=cs&countrycodes=cz&addressdetails=1`;
		const res = await fetch(url, { headers: { 'Accept-Language': 'cs' } });
		return res.json();
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