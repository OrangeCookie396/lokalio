(function initAddMap() {
	let selectedMarker = null;

	window.addMap.on('click', async (e) => {
		if (selectedMarker) {
			window.addMap.removeLayer(selectedMarker);
		}

		selectedMarker = createMarker(window.addMap, e.latlng.lat, e.latlng.lng, '#000000');
		inputCoordinates = [e.latlng.lat, e.latlng.lng];

		document.getElementById('btn-next')?.classList.remove('disabled');
		const btnAnalyze = document.getElementById('btn-analyze');
		if (btnAnalyze) btnAnalyze.disabled = false;

		const chip = document.getElementById('location-text');
		if (chip) chip.textContent = 'Načítám adresu…';

		try {
			const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${e.latlng.lat}&lon=${e.latlng.lng}&format=json&accept-language=cs`);
			const data = await res.json();
			const a = data.address || {};
			const parts = [
				a.road,
				a.house_number,
				a.city || a.town || a.village || a.municipality
			].filter(Boolean);
			if (chip) chip.textContent = parts.length ? parts.join(' ') : data.display_name;
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