const CATEGORY_META = {
	transportation: {
		name: 'Doprava',
		color: '#3b82f6',
		bg: 'rgba(59,130,246,0.12)',
		icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="16" x="4" y="3" rx="2"/><path d="M4 11h16M12 3v8M8 19l-2 3M16 19l2 3M8 15h.01M16 15h.01"/></svg>`
	},
	medicalcare: {
		name: 'Zdravotnictví',
		color: '#ef4444',
		bg: 'rgba(239,68,68,0.12)',
		icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h5v5c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2z"/></svg>`
	},
	recreation: {
		name: 'Rekreace',
		color: '#f97316',
		bg: 'rgba(249,115,22,0.12)',
		icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`
	},
	education: {
		name: 'Vzdělání',
		color: '#10b981',
		bg: 'rgba(16,185,129,0.12)',
		icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/></svg>`
	},
	work: {
		name: 'Práce',
		color: '#f59e0b',
		bg: 'rgba(245,158,11,0.12)',
		icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12h.01M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2m14 7a18.15 18.15 0 0 1-20 0"/><rect width="20" height="14" x="2" y="6" rx="2"/></svg>`
	},
	qol: {
		name: 'Kvalita života',
		color: '#8b5cf6',
		bg: 'rgba(139,92,246,0.12)',
		icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>`
	}
};

function getScoreText(score) {
	if (score <= 20) return 'Špatný';
	if (score <= 40) return 'Dostatečný';
	if (score <= 60) return 'Průměrný';
	if (score <= 80) return 'Dobrý';
	return 'Výborný';
}

function makeSVGRing(size, color, strokeWidth, bgOpacity) {
	const r = size / 2 - strokeWidth / 2 - 2;
	const circ = 2 * Math.PI * r;
	const cx = size / 2, cy = size / 2;
	const ns = 'http://www.w3.org/2000/svg';

	const svg = document.createElementNS(ns, 'svg');
	svg.setAttribute('width', size);
	svg.setAttribute('height', size);
	svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
	svg.style.transform = 'rotate(-90deg)';

	const bg = document.createElementNS(ns, 'circle');
	bg.setAttribute('cx', cx); bg.setAttribute('cy', cy); bg.setAttribute('r', r);
	bg.setAttribute('fill', 'none');
	bg.setAttribute('stroke', color);
	bg.setAttribute('stroke-width', strokeWidth);
	bg.setAttribute('stroke-opacity', bgOpacity);
	svg.appendChild(bg);

	const fill = document.createElementNS(ns, 'circle');
	fill.setAttribute('cx', cx); fill.setAttribute('cy', cy); fill.setAttribute('r', r);
	fill.setAttribute('fill', 'none');
	fill.setAttribute('stroke', color);
	fill.setAttribute('stroke-width', strokeWidth);
	fill.setAttribute('stroke-linecap', 'round');
	fill.setAttribute('stroke-dasharray', circ);
	fill.setAttribute('stroke-dashoffset', circ);
	fill.style.transition = 'stroke-dashoffset 1.1s cubic-bezier(0.4, 0, 0.2, 1)';
	svg.appendChild(fill);

	return { svg, fill, circ };
}

function generateReport(data) {
	const parsed = parseReportData(data);
	const container = document.getElementById('categories');
	container.innerHTML = '';

	const scores = Object.values(parsed).map(c => c.score).filter(Boolean);
	const total = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

	const rings = [];

	// ── Hero ──────────────────────────────────────────
	const hero = document.createElement('div');
	hero.className = 'report-hero';

	const { svg: heroSvg, fill: heroFill, circ: heroCirc } = makeSVGRing(72, '#ffffff', 7, 0.2);
	rings.push({ fill: heroFill, circ: heroCirc, score: total });

	const heroTop = document.createElement('div');
	heroTop.className = 'hero-top';

	const heroRing = document.createElement('div');
	heroRing.className = 'hero-ring';
	heroRing.appendChild(heroSvg);

	const heroLabel = document.createElement('div');
	heroLabel.className = 'ring-label';
	const heroScore = document.createElement('span');
	heroScore.className = 'ring-score';
	heroScore.textContent = total;
	const heroMax = document.createElement('span');
	heroMax.className = 'ring-max';
	heroMax.textContent = '/100';
	heroLabel.appendChild(heroScore);
	heroLabel.appendChild(heroMax);
	heroRing.appendChild(heroLabel);
	heroTop.appendChild(heroRing);

	const heroInfo = document.createElement('div');
	heroInfo.className = 'hero-info';

	const verdict = document.createElement('div');
	verdict.className = 'hero-verdict';
	verdict.textContent = getScoreText(total);
	heroInfo.appendChild(verdict);

	const sublabel = document.createElement('div');
	sublabel.className = 'hero-sublabel';
	sublabel.textContent = 'Celkové hodnocení lokace';
	heroInfo.appendChild(sublabel);

	const locChip = document.createElement('div');
	locChip.className = 'hero-location';
	const pinIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/></svg>`;
	const chipText = document.getElementById('location-text')?.textContent;
	const locText = (chipText && chipText !== '—' && chipText !== 'Načítám adresu…') ? chipText : '—';
	locChip.innerHTML = pinIcon + locText;
	heroInfo.appendChild(locChip);

	heroTop.appendChild(heroInfo);
	hero.appendChild(heroTop);

	// ── Summary accordion inside hero ──────────────────
	const summary = data.summary || (data.openData?.data || data.data || data).summary || null;
	if (summary) {
		const accordion = document.createElement('div');
		accordion.className = 'summary-accordion hero-summary';

		const btn = document.createElement('button');
		btn.className = 'summary-banner';
		btn.innerHTML = `
			<span class="summary-banner-left">
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/></svg>
				Shrnutí AI
			</span>
			<svg class="summary-chevron" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
		`;

		const body = document.createElement('div');
		body.className = 'summary-dropdown-body';
		body.textContent = summary;

		btn.addEventListener('click', () => {
			const open = accordion.classList.toggle('open');
			body.style.maxHeight = open ? body.scrollHeight + 'px' : '0';
		});

		accordion.appendChild(btn);
		accordion.appendChild(body);
		hero.appendChild(accordion);
	}

	container.appendChild(hero);

	// ── Category grid ──────────────────────────────────
	const grid = document.createElement('div');
	grid.className = 'cat-grid';

	for (const [key, cat] of Object.entries(parsed)) {
		const meta = CATEGORY_META[key] || { name: key, color: '#8A9DB0', bg: 'rgba(138,157,176,0.12)', icon: '' };

		const card = document.createElement('div');
		card.className = 'cat-card';

		// Top row: icon + mini ring
		const top = document.createElement('div');
		top.className = 'cat-card-top';

		const iconWrap = document.createElement('div');
		iconWrap.className = 'cat-icon';
		iconWrap.style.cssText = `background:${meta.bg};color:${meta.color}`;
		iconWrap.innerHTML = meta.icon;
		top.appendChild(iconWrap);

		const miniWrap = document.createElement('div');
		miniWrap.className = 'cat-mini-ring';
		const { svg: miniSvg, fill: miniFill, circ: miniCirc } = makeSVGRing(44, meta.color, 4, 0.15);
		miniWrap.appendChild(miniSvg);
		const miniLabel = document.createElement('div');
		miniLabel.className = 'ring-score-label';
		miniLabel.style.color = meta.color;
		miniLabel.textContent = cat.score;
		miniWrap.appendChild(miniLabel);
		top.appendChild(miniWrap);

		rings.push({ fill: miniFill, circ: miniCirc, score: cat.score });
		card.appendChild(top);

		// Name + verdict
		const nameWrap = document.createElement('div');
		const nameDiv = document.createElement('div');
		nameDiv.className = 'cat-name';
		nameDiv.textContent = meta.name;
		const verdictDiv = document.createElement('div');
		verdictDiv.className = 'cat-verdict';
		verdictDiv.style.color = meta.color;
		verdictDiv.textContent = getScoreText(cat.score);
		nameWrap.appendChild(nameDiv);
		nameWrap.appendChild(verdictDiv);
		card.appendChild(nameWrap);

		// Stats
		const statsDiv = document.createElement('div');
		statsDiv.className = 'cat-stats';
		(cat.array || []).slice(0, 2).forEach(item => {
			const s = document.createElement('div');
			s.className = 'cat-stat';
			const nameSpan = document.createElement('span');
			nameSpan.className = 'stat-name';
			nameSpan.textContent = item.name;
			const valSpan = document.createElement('span');
			valSpan.className = 'stat-value';
			valSpan.textContent = item.value;
			s.appendChild(nameSpan);
			s.appendChild(valSpan);
			statsDiv.appendChild(s);
		});
		card.appendChild(statsDiv);

		card.addEventListener('click', () => showDetail(cat, meta, key));
		grid.appendChild(card);
	}

	container.appendChild(grid);

	// ── Detail panel (slides from right) ──────────────
	const detailPanel = document.createElement('div');
	detailPanel.className = 'cat-detail';
	detailPanel.id = 'cat-detail-panel';
	container.appendChild(detailPanel);


	// ── Category toggle pills over the map ────────────
	renderCategoryPills(Object.keys(parsed));

	// ── Animate all rings ──────────────────────────────
	requestAnimationFrame(() => requestAnimationFrame(() => {
		rings.forEach(({ fill, circ, score }) => {
			fill.style.strokeDashoffset = circ * (1 - score / 100);
		});
	}));
}

function renderCategoryPills(keys) {
	if (!window.categoryVisibility) window.categoryVisibility = {};
	keys.forEach(k => {
		if (!(k in window.categoryVisibility)) window.categoryVisibility[k] = true;
	});

	const mapEl = document.getElementById('report-map');
	let overlay = document.getElementById('cat-pills-overlay');
	if (!overlay) {
		overlay = document.createElement('div');
		overlay.id = 'cat-pills-overlay';
		mapEl.appendChild(overlay);
	}
	overlay.innerHTML = '';

	const parser = new DOMParser();

	keys.forEach(key => {
		const meta = CATEGORY_META[key];
		if (!meta) return;

		const pill = document.createElement('button');
		pill.className = 'cat-pill' + (!window.categoryVisibility[key] ? ' pill-off' : '');
		pill.style.background = meta.color;

		const iconDoc = parser.parseFromString(meta.icon, 'image/svg+xml');
		const svgEl = iconDoc.documentElement;
		pill.appendChild(svgEl);

		const label = document.createElement('span');
		label.textContent = meta.name;
		pill.appendChild(label);

		pill.addEventListener('click', e => {
			e.stopPropagation();
			window.categoryVisibility[key] = !window.categoryVisibility[key];
			pill.classList.toggle('pill-off', !window.categoryVisibility[key]);
			window.applyMarkerVisibility?.();
		});

		overlay.appendChild(pill);
	});
}

function showDetail(cat, meta, key = null) {
	window.highlightCategoryMarkers?.(key);
	const panel = document.getElementById('cat-detail-panel');
	panel.innerHTML = '';

	// Header
	const header = document.createElement('div');
	header.className = 'cat-detail-header';

	const backBtn = document.createElement('button');
	backBtn.className = 'cat-detail-back';
	backBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7m7 7H5"/></svg>`;
	backBtn.addEventListener('click', () => {
		panel.classList.remove('visible');
		window.highlightCategoryMarkers?.(null);
		if (window._entityPinMarker) { window._entityPinMarker.remove(); window._entityPinMarker = null; }
	});
	header.appendChild(backBtn);

	const titleDiv = document.createElement('div');
	titleDiv.className = 'cat-detail-title';
	titleDiv.textContent = meta.name;
	header.appendChild(titleDiv);
	panel.appendChild(header);

	// Score card
	const scoreCard = document.createElement('div');
	scoreCard.className = 'cat-detail-score-card';
	scoreCard.style.background = `linear-gradient(135deg, ${meta.color}ee, ${meta.color}88)`;

	const { svg: dSvg, fill: dFill, circ: dCirc } = makeSVGRing(80, '#ffffff', 7, 0.25);
	const dRing = document.createElement('div');
	dRing.className = 'cat-detail-ring';
	dRing.appendChild(dSvg);
	const dLabel = document.createElement('div');
	dLabel.className = 'ring-label';
	dLabel.textContent = cat.score;
	dRing.appendChild(dLabel);
	scoreCard.appendChild(dRing);

	const infoDiv = document.createElement('div');
	infoDiv.className = 'cat-detail-info';
	const detailVerdict = document.createElement('div');
	detailVerdict.className = 'detail-verdict';
	detailVerdict.textContent = getScoreText(cat.score);
	const detailSub = document.createElement('div');
	detailSub.className = 'detail-sublabel';
	detailSub.textContent = `${cat.score} / 100 bodů`;
	infoDiv.appendChild(detailVerdict);
	infoDiv.appendChild(detailSub);
	scoreCard.appendChild(infoDiv);
	panel.appendChild(scoreCard);

	// Stats list
	const statsList = document.createElement('div');
	statsList.className = 'cat-detail-stats';
	(cat.array || []).forEach(item => {
		const entities = (item.entities || []).filter(e => e.name || e.distance_m != null);
		const hasEntities = entities.length > 0;

		const wrap = document.createElement('div');
		wrap.className = 'cat-detail-stat-wrap';

		const row = document.createElement('div');
		row.className = 'cat-detail-stat' + (hasEntities ? ' expandable' : '');

		const nameSpan = document.createElement('span');
		nameSpan.className = 'ds-name';
		nameSpan.textContent = item.name;

		const valSpan = document.createElement('span');
		valSpan.className = 'ds-value';
		valSpan.textContent = item.value;

		row.appendChild(nameSpan);
		row.appendChild(valSpan);

		if (hasEntities) {
			const chevron = document.createElement('span');
			chevron.className = 'ds-chevron';
			chevron.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`;
			row.appendChild(chevron);

			const entityList = document.createElement('ul');
			entityList.className = 'ds-entity-list';

			entities.forEach(e => {
				const li = document.createElement('li');
				const nameText = e.name || '—';
				const distText = e.distance_m != null ? fmt(e.distance_m) : '';
				li.innerHTML = `<span class="ent-name">${nameText}</span>${distText ? `<span class="ent-dist">${distText}</span>` : ''}`;

				if (e.lat) {
					li.classList.add('ent-mappable');
					li.title = 'Zobrazit na mapě';
					li.addEventListener('click', ev => {
						ev.stopPropagation();
						if (window._entityPinMarker) window._entityPinMarker.remove();
						window._entityPinMarker = createMarker(window.reportMap, e.lat, e.lon, meta.color, 40);
						window.reportMap?.setView([e.lat, e.lon], Math.max(window.reportMap.getZoom(), 15));
						entityList.querySelectorAll('li').forEach(l => l.classList.remove('ent-active'));
						li.classList.add('ent-active');
					});
				}

				entityList.appendChild(li);
			});

			row.addEventListener('click', () => {
				const open = wrap.classList.toggle('open');
				entityList.style.maxHeight = open ? Math.min(entityList.scrollHeight, 220) + 'px' : '0';
			});

			wrap.appendChild(row);
			wrap.appendChild(entityList);
		} else {
			wrap.appendChild(row);
		}

		statsList.appendChild(wrap);
	});
	panel.appendChild(statsList);

	panel.classList.add('visible');

	requestAnimationFrame(() => requestAnimationFrame(() => {
		dFill.style.strokeDashoffset = dCirc * (1 - cat.score / 100);
	}));
}

document.addEventListener('keydown', e => {
	if (e.key === 'Escape') {
		document.getElementById('cat-detail-panel')?.classList.remove('visible');
		window.highlightCategoryMarkers?.(null);
		if (window._entityPinMarker) { window._entityPinMarker.remove(); window._entityPinMarker = null; }
	}
});
