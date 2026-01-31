// createMarker(window.reportMap, 50.209, 15.832, '#3b82f6');
// createMarker(window.reportMap, 50.212, 15.8, '#000000');

const jsonData = {
	"transportation": { "score": 45, "array": [
		{ "name": "Vzdálenost k nejbližší zastávce", "value": "123 m" },
		{ "name": "Počet linek v dosahu", "value": "5" }
	]},
	"medicalcare": { "score": 78, "array": [
		{ "name": "Vzdálenost k nemocnici", "value": "2.3 km" },
		{ "name": "Dojízdový čas záchranné služby", "value": "5 min" }
	]},
	"education": { "score": 90, "array": [
		{ "name": "Počet škol v okolí", "value": "8" },
		{ "name": "Dostupnost střední školy", "value": "Ano" }
	]},
	"activities": { "score": 15, "array": [
		{ "name": "Vzdálenost do přírody", "value": "950 m" }
	]},
	"medicalcarse": { "score": 78, "array": [
		{ "name": "Vzdálenost k nemocnici", "value": "2.3 km" },
		{ "name": "Dojízdový čas záchranné služby", "value": "5 min" }
	]},
	"educations": { "score": 90, "array": [
		{ "name": "Počet škol v okolí", "value": "8" },
		{ "name": "Dostupnost střední školy", "value": "Ano" }
	]},
	"activitiess": { "score": 15, "array": [
		{ "name": "Vzdálenost do přírody", "value": "950 m" }
	]},
	"activitasdies": { "score": 15, "array": [
		{ "name": "Vzdálenost do přírody", "value": "950 m" }
	]},
	"activitiasess": { "score": 15, "array": [
		{ "name": "Vzdálenost do přírody", "value": "950 m" }
	]},
	"activasitasdies": { "score": 15, "array": [
		{ "name": "Vzdálenost do přírody", "value": "950 m" }
	]}
};

// ====== Generování kategorií ======
function generateReport(data) {
	const categoriesContainer = document.getElementById('categories');
	categoriesContainer.innerHTML = '';

	const overlay = document.createElement('div');
	overlay.classList.add('overlay');
	overlay.classList.add('hidden');

	for (const [key, categoryData] of Object.entries(data)) {
		// Skip total_score - it's not a category
		if (key === 'total_score') continue;
		const category = document.createElement('div');
		category.className = 'category';

		// Nadpis
		const h3 = document.createElement('h3');
		h3.textContent = getCategoryName(key);
		category.appendChild(h3);

		// Score sekce
		const scoreDiv = document.createElement('div');
		scoreDiv.className = 'score';

		const text = document.createElement('p');
		text.className = 'text';
		text.textContent = getScoreText(categoryData.score);
		scoreDiv.appendChild(text);

		const progress = document.createElement('div');
		progress.className = 'progress';

		const bar = document.createElement('div');
		bar.className = 'bar';

		const fill = document.createElement('div');
		fill.className = 'fill';
		bar.appendChild(fill);

		const percentage = document.createElement('p');
		percentage.className = 'percentage';
		percentage.textContent = categoryData.score + '/100';

		progress.appendChild(bar);
		progress.appendChild(percentage);
		scoreDiv.appendChild(progress);
		category.appendChild(scoreDiv);

		// pokus
		category.addEventListener('click', (e) => {
			e.stopPropagation(); // ⛔ zastaví bubbling, aby to nespustilo window klik
			overlay.classList.remove('hidden');

			// Clear previous content
			overlay.innerHTML = '';

			// Title
			const title = document.createElement('h2');
			title.textContent = getCategoryName(key);
			overlay.appendChild(title);

			// List of details
			const list = document.createElement('div');
                list.classList.add('list');
			categoryData.array.forEach(itemData => {
				const listItem = document.createElement('div');
                listItem.classList.add('item');
                const itemName = document.createElement('span');
                itemName.classList.add('name');
                itemName.textContent = itemData.name;
                const itemValue = document.createElement('span');
                itemValue.classList.add('value');
				itemValue.textContent = itemData.value;
                listItem.appendChild(itemName);
                listItem.appendChild(itemValue);
				list.appendChild(listItem);
			});
			overlay.appendChild(list);

			// Close button
			const closeBtn = document.createElement('button');
			closeBtn.textContent = 'Zavřít';
			closeBtn.addEventListener('click', () => {
				overlay.classList.add('hidden');
			});
			overlay.appendChild(closeBtn);
		});

		// Array dat
		// const arrayDiv = document.createElement('div');
		// arrayDiv.className = 'array';
		// categoryData.array.forEach(itemData => {
		// 	const item = document.createElement('div');
		// 	item.className = 'item';

		// 	const name = document.createElement('p');
		// 	name.className = 'name';
		// 	name.textContent = itemData.name;

		// 	const value = document.createElement('p');
		// 	value.className = 'value';
		// 	value.textContent = itemData.value;

		// 	item.appendChild(name);
		// 	item.appendChild(value);
		// 	arrayDiv.appendChild(item);
		// });

		// category.appendChild(arrayDiv);
		categoriesContainer.appendChild(category);

		// animace progress fill po renderu
		requestAnimationFrame(() => {
			fill.style.width = categoryData.score + '%';
		});
	}
	// overlay
	categoriesContainer.appendChild(overlay);
}

function getCategoryName(key) {
	const names = {
		transport: 'Doprava',
		healthcare: 'Zdravotní péče',
		education: 'Vzdělání',
		employment: 'Zaměstnanost',
		noise: 'Hluk',
		safety: 'Bezpečnost',
		// Old mappings for backwards compatibility
		transportation: 'Doprava',
		medicalcare: 'Zdravotní péče',
		socialAndCulture: 'Kultura a společnost',
		activities: 'Volnočasové aktivity',
		work: 'Práce',
		qualityOfLife: 'Kvalita života'
	};
	return names[key] || key;
}

// ====== převod skóre na text ======
function getScoreText(score) {
	if (score <= 20) return 'Špatný';
	if (score <= 40) return 'Dostatečný';
	if (score <= 60) return 'Průměrný';
	if (score <= 80) return 'Dobrý';
	return 'Výborný';
}

// Po vygenerování overlaye ho vyber
const overlay = document.querySelector('.overlay');

// Zavření po klávese Escape
document.addEventListener('keydown', (e) => {
	console.log("esc click")
	if (e.key === 'Escape') {
		overlay.classList.add('hidden');
	}
});


// Zavření při kliknutí mimo overlay
// window.addEventListener('click', (e) => {
// 	console.log("okno klik")

// 	// Pokud overlay není vidět, nic se neděje
// 	if (overlay.classList.contains('hidden')) return;

// 	// Pokud kliknutí NEBYLO na overlay ani na jeho potomka, schovej ho
// 	if (!overlay.contains(e.target)) {
// 		overlay.classList.add('hidden');
// 	}
// });