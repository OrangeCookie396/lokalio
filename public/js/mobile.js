// ── Hamburger menu ────────────────────────────────

const hamburger = document.getElementById('nav-hamburger');
const navLinks  = document.querySelector('nav .links');
const backdrop  = document.getElementById('nav-backdrop');
const hamIcon   = document.getElementById('hamburger-icon');
const closeIcon = document.getElementById('close-icon');

function openNav() {
	navLinks.classList.add('open');
	backdrop.classList.add('active');
	hamIcon.style.display    = 'none';
	closeIcon.style.display  = 'block';
	hamburger.setAttribute('aria-expanded', 'true');
	document.body.style.overflow = 'hidden';
}

function closeNav() {
	navLinks.classList.remove('open');
	backdrop.classList.remove('active');
	hamIcon.style.display    = 'block';
	closeIcon.style.display  = 'none';
	hamburger.setAttribute('aria-expanded', 'false');
	document.body.style.overflow = '';
}

hamburger.addEventListener('click', () => {
	navLinks.classList.contains('open') ? closeNav() : openNav();
});

backdrop.addEventListener('click', closeNav);

navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', closeNav));

// ── Overview map/results toggle ───────────────────

const overviewEl = document.getElementById('overview');
const ovTabs = document.querySelectorAll('.ov-tab');

ovTabs.forEach(btn => {
	btn.addEventListener('click', () => {
		ovTabs.forEach(b => b.classList.remove('active'));
		btn.classList.add('active');
		overviewEl.classList.toggle('show-results', btn.dataset.view === 'results');
	});
});


// ── Reset overview toggle on tab change ───────────

const _origSwitchTabs = window.switchTabs;
if (typeof _origSwitchTabs === 'function') {
	window.switchTabs = function(index) {
		if (overviewEl) {
			overviewEl.classList.remove('show-results');
			ovTabs.forEach(b => b.classList.toggle('active', b.dataset.view === 'map'));
		}
		_origSwitchTabs(index);
	};
}
