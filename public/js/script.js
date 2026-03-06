const nav = document.querySelector('nav');
const hero = document.querySelector('.hero');

function updateNav() {
	nav.classList.toggle('scrolled', window.scrollY > 60);
	const isPastHero = window.scrollY > hero.offsetHeight - 80;
	nav.classList.toggle('past-hero', isPastHero);
	nav.classList.toggle('over-hero', !isPastHero);
}

window.addEventListener('scroll', updateNav);
updateNav();

const observer = new IntersectionObserver((entries) => {
	entries.forEach(entry => {
		if (entry.isIntersecting) {
			const delay = parseInt(entry.target.dataset.delay || 0);
			setTimeout(() => {
				entry.target.classList.add('visible');
			}, delay);
			observer.unobserve(entry.target);
		}
	});
}, { threshold: 0.15 });

document.querySelectorAll('.feature-card, .step, .profile-card, .city').forEach(el => {
	observer.observe(el);
});