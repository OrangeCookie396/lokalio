(function initAddMap() {
    let selectedMarker = null;

    window.addMap.on('click', (e) => {
        if (selectedMarker) {
            window.addMap.removeLayer(selectedMarker);
        }

        selectedMarker = createMarker(window.addMap, e.latlng.lat, e.latlng.lng, '#000000');
        
        inputCoordinates = [e.latlng.lat, e.latlng.lng];
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