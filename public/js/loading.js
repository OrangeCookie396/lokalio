const { animate, utils, stagger } = anime;

const loading = document.querySelector('#loading');

const balls = document.querySelectorAll('.ball');
balls.forEach((ball) => {
	animateShape(ball)
});

let loop = false;

function animateShape(el) {
	animate(el, {
		translateX: utils.random(-600, 600),
		translateY: utils.random(-600, 600),
		scale: 1 + utils.random(0, 1, true),
		opacity: utils.random(0.2, 1, true),
		duration: utils.random(1000, 3000),
		easing: 'easeOutBack',
		onComplete: () => {
			if (loop) {
				requestAnimationFrame(() => animateShape(el));
			}
		}
	});
}

const rotation = document.querySelector('#rotator .rotating');
const normalSentences = [
	'Hledám',
	'Kontroluji',
	'Procházím data',
];

let rotationIndex = 0;

function getRandomSentence() {
	const sentence = normalSentences[rotationIndex];
	rotationIndex = (rotationIndex + 1) % normalSentences.length;
	return sentence;
}

function updateText() {
	rotation.style.animation = 'slide-out 500ms ease forwards';

	setTimeout(() => {
		rotation.textContent = getRandomSentence();
		rotation.style.animation = 'slide-in 500ms ease forwards';
	}, 500);
}

setInterval(updateText, 2000);

function startAnimation() {
    loading.classList.add('active');
	loop = true;
    balls.forEach((ball) => {
		animateShape(ball);
	});
}

function stopAnimation() {
    loading.classList.remove('active');
    loop = false;
}