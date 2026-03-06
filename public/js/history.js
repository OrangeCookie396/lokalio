(function initHistory() {
	// Inject CSS
	const link = document.createElement('link');
	link.rel = 'stylesheet';
	link.href = 'css/history.css';
	document.head.appendChild(link);

	const HISTORY_KEY = 'lokalio_history';
	const MAX_ENTRIES = 30;

	const PROFILE_LABELS = {
		default: 'Výchozí',
		pracujici: 'Pracující',
		rodina: 'Rodina',
		student: 'Student',
		custom: 'Vlastní',
	};

	function historyGet() {
		try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
		catch { return []; }
	}

	function historySet(entries) {
		localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
	}

	function computeScore(data) {
		try {
			const parsed = parseReportData(data);
			const scores = Object.values(parsed).map(c => c.score).filter(Boolean);
			return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
		} catch { return 0; }
	}

	window.historySave = function(data, address, lat, lon) {
		const entries = historyGet();
		// Deduplicate: remove previous entry for same coordinates (±0.0001°)
		const filtered = entries.filter(e =>
			Math.abs(e.lat - lat) > 0.0001 || Math.abs(e.lon - lon) > 0.0001
		);
		filtered.unshift({
			id: Date.now(),
			date: new Date().toISOString(),
			address,
			lat,
			lon,
			profile: window.selectedProfile || 'default',
			score: computeScore(data),
			data,
		});
		historySet(filtered);
		historyRender();
	};

	// ── Build drawer DOM ──────────────────────────────

	const drawer = document.createElement('div');
	drawer.id = 'history-drawer';
	drawer.innerHTML = `
		<div id="history-backdrop"></div>
		<div id="history-panel">
			<div id="history-header">
				<span id="history-title">Historie hledání</span>
				<button id="history-close" aria-label="Zavřít">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
				</button>
			</div>
			<div id="history-list"></div>
			<div id="history-footer">
				<button id="history-clear">Vymazat historii</button>
			</div>
		</div>
	`;
	document.body.appendChild(drawer);

	// ── Open / close ──────────────────────────────────

	function historyOpen() {
		historyRender();
		drawer.classList.add('open');
	}

	function historyClose() {
		drawer.classList.remove('open');
	}

	drawer.querySelector('#history-backdrop').addEventListener('click', historyClose);
	drawer.querySelector('#history-close').addEventListener('click', historyClose);
	document.addEventListener('keydown', e => { if (e.key === 'Escape') historyClose(); });

	// Hook nav "Historie" link
	document.querySelector('nav .nav-links a[href="#"]')?.addEventListener('click', e => {
		e.preventDefault();
		historyOpen();
	});

	// ── Clear ─────────────────────────────────────────

	drawer.querySelector('#history-clear').addEventListener('click', () => {
		if (confirm('Opravdu vymazat celou historii?')) {
			localStorage.removeItem(HISTORY_KEY);
			historyRender();
		}
	});

	// ── Render ────────────────────────────────────────

	const SCORE_COLOR = score =>
		score >= 80 ? '#10b981' :
		score >= 60 ? '#3b82f6' :
		score >= 40 ? '#f59e0b' : '#ef4444';

	function scoreRingSVG(score) {
		const r = 18, sw = 4, circ = 2 * Math.PI * r;
		const color = SCORE_COLOR(score);
		const offset = circ * (1 - score / 100);
		return `
			<svg width="48" height="48" viewBox="0 0 48 48" style="transform:rotate(-90deg)">
				<circle cx="24" cy="24" r="${r}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-opacity="0.15"/>
				<circle cx="24" cy="24" r="${r}" fill="none" stroke="${color}" stroke-width="${sw}"
					stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${offset}"/>
			</svg>`;
	}

	function formatDate(iso) {
		const d = new Date(iso);
		return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short', year: 'numeric' });
	}

	function historyRender() {
		const list = document.getElementById('history-list');
		const entries = historyGet();

		if (!entries.length) {
			list.innerHTML = `
				<div id="history-empty">
					<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9a9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5m4-1v5l4 2"/></svg>
					<p>Zatím žádná hledání.<br>Analyzujte lokaci a výsledek se sem uloží.</p>
				</div>`;
			document.getElementById('history-footer').style.display = 'none';
			return;
		}

		document.getElementById('history-footer').style.display = '';
		list.innerHTML = entries.map(e => `
			<div class="hist-card" data-id="${e.id}">
				<div class="hist-score-ring">
					${scoreRingSVG(e.score)}
					<div class="hist-score-num" style="color:${SCORE_COLOR(e.score)}">${e.score}</div>
				</div>
				<div class="hist-info">
					<div class="hist-address">${e.address}</div>
					<div class="hist-meta">
						<span class="hist-date">${formatDate(e.date)}</span>
						<span class="hist-profile-badge">${PROFILE_LABELS[e.profile] || e.profile}</span>
					</div>
				</div>
				<svg class="hist-arrow" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
			</div>
		`).join('');

		list.querySelectorAll('.hist-card').forEach(card => {
			card.addEventListener('click', () => {
				const id = Number(card.dataset.id);
				const entry = historyGet().find(e => e.id === id);
				if (!entry) return;

				historyClose();
				window.selectedProfile = entry.profile;
				document.getElementById('location-text').textContent = entry.address;

				switchTabs(2);
				createMarker(window.reportMap, entry.lat, entry.lon, '#3b82f6');
				generateReport(entry.data);
			});
		});
	}
})();
