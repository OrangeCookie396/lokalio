window.reportMap = L.map('report-map', { keyboard: false, zoomControl: false }).setView([50.209, 15.832], 14);
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
	attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
	subdomains: 'abcd',
	maxZoom: 19
}).addTo(window.reportMap);

window.addMap = L.map('add-map', { keyboard: false, zoomControl: false }).setView([50.209, 15.832], 14);
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
	attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
	subdomains: 'abcd',
	maxZoom: 19
}).addTo(window.addMap);

// Marker creator
function createMarker(map, lat, lon, color = '#007bff', size = 36) {
	if (!map) {
		console.warn('Mapa ještě není inicializovaná, čekám...');
		setTimeout(() => createMarker(map, lat, lon, color, size), 200);
		return;
	}

	const svg = `
		<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="none">
			<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" fill="${color}"/>
			<circle cx="12" cy="10" r="3" fill="white"/>
		</svg>`;
	const svgBase64 = `data:image/svg+xml;base64,${btoa(svg)}`;

	const customIcon = L.icon({
		iconUrl: svgBase64,
		iconSize: [size, size],
		iconAnchor: [size / 2, size],
		popupAnchor: [0, -size]
	});

	const marker = L.marker([lat, lon], { icon: customIcon }).addTo(map);

	return marker;
}

// Navigace
const tabs = document.querySelectorAll('#content .tab');
const nav = document.querySelector('nav');
document.documentElement.style.setProperty('--nav-height', nav.offsetHeight + 'px');

function switchTabs(index) {
	tabs.forEach(t => t.classList.remove('active'));

	tabs[index].classList.add('active');

	window.scrollTo(0, 0);

	setTimeout(() => {
		window.reportMap.invalidateSize();
		window.addMap.invalidateSize();
	}, 100);
}