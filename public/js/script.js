const nav = document.querySelector('.landing-nav');
const hero = document.querySelector('.hero');
window.addEventListener('scroll', () => {
	nav.classList.toggle('scrolled', window.scrollY > 60);
	nav.classList.toggle('past-hero', window.scrollY > hero.offsetHeight - 80);
});

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
