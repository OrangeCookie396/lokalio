window.reportMap = L.map('report-map', { keyboard: false }).setView([50.209, 15.832], 14);
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
	attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
	subdomains: 'abcd',
	maxZoom: 19
}).addTo(window.reportMap);

window.addMap = L.map('add-map', { keyboard: false }).setView([50.209, 15.832], 14);
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
	attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
	subdomains: 'abcd',
	maxZoom: 19
}).addTo(window.addMap);

// Marker creator
function createMarker(map, lat, lon, color = '#007bff') {
	if (!map) {
		console.warn('Mapa ještě není inicializovaná, čekám...');
		setTimeout(() => createMarker(map, lat, lon, color), 200);
		return;
	}

	const svg = `
		<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 256 256" fill="${color}">
			<path d="M128 16a88.1 88.1 0 0 0-88 88c0 75.3 80 132.17 83.41 134.55a8 8 0 0 0 9.18 0C136 236.17 216 179.3 216 104a88.1 88.1 0 0 0-88-88m0 56a32 32 0 1 1-32 32a32 32 0 0 1 32-32"/>
		</svg>`;
	const svgBase64 = `data:image/svg+xml;base64,${btoa(svg)}`;

	const customIcon = L.icon({
		iconUrl: svgBase64,
		iconSize: [36, 36],
		iconAnchor: [18, 36],
		popupAnchor: [0, -36]
	});

	const marker = L.marker([lat, lon], { icon: customIcon }).addTo(map);
	map.setView([lat, lon], 13);

	return marker;
}

// Navigace
const tabs = document.querySelectorAll('#content .tab');
function switchTabs(index) {
	tabs.forEach(t => t.classList.remove('active'));

	tabs[index].classList.add('active');

	window.scrollTo(0, 0);

	setTimeout(() => {
		window.reportMap.invalidateSize();
		window.addMap.invalidateSize();
	}, 100);
}