let errorTimeout = null;

function showError(message) {
	const toast = document.getElementById('error-toast');
	const msg = document.getElementById('error-message');
	msg.textContent = message;
	toast.classList.remove('hidden');

	clearTimeout(errorTimeout);
	errorTimeout = setTimeout(() => dismissError(), 6000);
}

function dismissError() {
	const toast = document.getElementById('error-toast');
	toast.classList.add('hidden');
	clearTimeout(errorTimeout);
}
