const profileData = {
	default: {
		values: [3, 3, 3, 3, 3, 3],
		editable: false
	},
	pracujici: {
		values: [5, 2, 3, 4, 2, 4],
		editable: false
	},
	rodina: {
		values: [3, 5, 4, 3, 5, 3],
		editable: false
	},
	student: {
		values: [4, 5, 2, 4, 3, 3],
		editable: false
	},
	custom: {
		values: [3, 3, 3, 3, 3, 3],
		editable: true
	}
};

window.selectedProfile = 'default';

function selectProfile(key) {
	window.selectedProfile = key;
	const profile = profileData[key];

	// Update card active states
	document.querySelectorAll('.profile-card').forEach(card => {
		card.classList.toggle('active', card.dataset.profile === key);
	});

	// Update sliders
	document.querySelectorAll('.category-slider').forEach((slider, i) => {
		slider.value = profile.values[i];
		slider.disabled = !profile.editable;
		refreshSlider(slider);
	});
}

function refreshSlider(slider) {
	// Update displayed value
	const valueEl = slider.closest('.category').querySelector('.cat-value');
	if (valueEl) valueEl.textContent = slider.value;

	// Update track fill via CSS custom property
	const pct = ((slider.value - 1) / 4) * 100;
	slider.style.setProperty('--fill', pct + '%');
}

document.addEventListener('DOMContentLoaded', () => {
	// Wire up live updates for custom sliders
	document.querySelectorAll('.category-slider').forEach(slider => {
		slider.addEventListener('input', () => {
			if (window.selectedProfile === 'custom') {
				profileData.custom.values[
					[...document.querySelectorAll('.category-slider')].indexOf(slider)
				] = parseInt(slider.value);
				refreshSlider(slider);
			}
		});
	});

	// Apply default profile on load
	selectProfile('default');
});
