async function searchAddress() {
  console.log("searchAddress triggered");
  if (!inputCoordinates) {
    alert("Please select a location on the map first.");
    return;
  }

  startAnimation();

  try {
    const response = await fetch(`http://localhost:3000/evaluate?lat=${inputCoordinates[0]}&lon=${inputCoordinates[1]}`);
    const result = await response.json();

    switchTabs(1);

    // Add marker to the report map
    createMarker(window.reportMap, inputCoordinates[0], inputCoordinates[1], '#3b82f6');

    generateReport(result);

    console.log("LLM response:", result);
  } catch (err) {
    console.error("Error fetching LLM response:", err);
  } finally {
    stopAnimation(); // ✅ always stops the animation
  }
}