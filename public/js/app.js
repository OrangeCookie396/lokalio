async function searchAddress() {
	console.log("searchAddress triggered");

	if (!inputCoordinates) {
		showError("Nejprve vyberte místo kliknutím na mapu.");
		return;
	}

	if (!window.selectedInterest) {
		showError("Zvolte svůj profil (Student / Rodič / Pracující).");
		return;
	}

	startAnimation();

	try {
		const response = await fetch(`http://localhost:3000/evaluate?lat=${inputCoordinates[0]}&lon=${inputCoordinates[1]}`);

		if (!response.ok) {
			const body = await response.json().catch(() => null);
			throw new Error(body?.error || `Server vrátil chybu (${response.status})`);
		}

		const result = await response.json();

		switchTabs(1);

		createMarker(window.reportMap, inputCoordinates[0], inputCoordinates[1], '#3b82f6');

		if (result.openData) {
			createPOIMarkers(result);
		}

		generateReport(result);

		console.log("LLM response:", result);
	} catch (err) {
		console.error("Error fetching LLM response:", err);
		showError("Nepodařilo se získat hodnocení. Zkuste to prosím znovu.");
	} finally {
		stopAnimation();
	}
}
