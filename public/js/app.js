const USE_DUMMY_DATA = false;

async function searchAddress() {
	console.log("searchAddress triggered");

	if (!inputCoordinates) {
		showError("Nejprve vyberte místo kliknutím na mapu.");
		return;
	}

	if (!window.selectedProfile) {
		showError("Zvolte svůj profil.");
		return;
	}

	startAnimation();

	try {
		let result;

		if (USE_DUMMY_DATA) {
			await new Promise(r => setTimeout(r, 800)); // simulace načítání
			result = DUMMY_RESPONSE;
		} else {
			const response = await fetch(`/evaluate?lat=${inputCoordinates[0]}&lon=${inputCoordinates[1]}`);
			if (!response.ok) {
				const body = await response.json().catch(() => null);
				throw new Error(body?.error || `Server vrátil chybu (${response.status})`);
			}
			result = await response.json();
		}

		switchTabs(2);

		// Clear previous markers and state
		(window.allReportMarkers || []).forEach(m => { try { m.remove(); } catch(e) {} });
		window.allReportMarkers = [];
		window.categoryMarkers = {};
		window.categoryVisibility = {};
		window._detailCategory = null;

		// User location marker — bigger and distinct color
		window.reportMap.setView([inputCoordinates[0], inputCoordinates[1]], 13);
		const userMarker = createMarker(window.reportMap, inputCoordinates[0], inputCoordinates[1], '#ec4899', 52);
		if (userMarker) {
			window.allReportMarkers.push(userMarker);
			window.userLocationMarker = userMarker;
		}

		generateReport(result);

		const address = document.getElementById('location-text')?.textContent || '—';
		historySave(result, address, inputCoordinates[0], inputCoordinates[1]);

		console.log("Response:", result);
	} catch (err) {
		console.error("Error:", err);
		showError("Nepodařilo se získat hodnocení. Zkuste to prosím znovu.");
	} finally {
		stopAnimation();
	}
}

// Load history module
const _histScript = document.createElement('script');
_histScript.src = 'js/history.js';
document.head.appendChild(_histScript);
