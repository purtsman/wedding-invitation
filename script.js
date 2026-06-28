const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw7lIqFuMvnCr0gqU256XfxsySfeXj21D0MgP1Q766Fdw0Ax4z05s3T-P-U4Qgur8gz/exec';

const form = document.getElementById('rsvpForm');
const message = document.getElementById('formMessage');

const countdownTarget = new Date(Date.UTC(2026, 8, 12, 15, 20, 0)); 
// 12 сентября 2026, 18:20 МСК = 15:20 UTC

function updateCountdown() {
  const now = new Date();
  const diff = countdownTarget - now;

  const daysEl = document.getElementById('days');
  const hoursEl = document.getElementById('hours');
  const minutesEl = document.getElementById('minutes');
  const secondsEl = document.getElementById('seconds');

  if (!daysEl || !hoursEl || !minutesEl || !secondsEl) return;

  if (diff <= 0) {
    daysEl.textContent = '0';
    hoursEl.textContent = '0';
    minutesEl.textContent = '0';
    secondsEl.textContent = '0';
    return;
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  daysEl.textContent = days;
  hoursEl.textContent = hours;
  minutesEl.textContent = minutes;
  secondsEl.textContent = seconds;
}

updateCountdown();
setInterval(updateCountdown, 1000);

form.addEventListener('submit', async function (event) {
  event.preventDefault();

  message.textContent = '';
  message.className = 'form-message';

  const formData = new FormData(form);

  if (formData.get('website')) {
    message.textContent = 'Спасибо! Мы получили ваш ответ.';
    message.classList.add('success');
    form.reset();
    return;
  }

  const drinks = formData.getAll('drinks').join(', ') || 'Не выбрано';
  const allergyStatus = formData.get('allergyStatus') || '';
  const allergyDetails = formData.get('allergyDetails') || '';

  if (allergyStatus === 'Да' && allergyDetails.trim() === '') {
    message.textContent = 'Пожалуйста, напишите, на что у вас аллергия.';
    message.classList.add('error');
    return;
  }

  const allergies = allergyStatus === 'Да'
    ? `Да: ${allergyDetails.trim()}`
    : 'Нет';

  const data = {
    name: formData.get('name'),
    weddingDay: formData.get('weddingDay'),
    secondDay: formData.get('secondDay'),
    drinks,
    allergies,
    comment: formData.get('comment'),
    questions: formData.get('questions'),
    phone: formData.get('phone')
  };

  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = 'Отправляем...';

  try {
    await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(data)
    });

    message.textContent = 'Спасибо! Мы получили ваш ответ.';
    message.classList.add('success');
    form.reset();

  } catch (error) {
    message.textContent = 'Не удалось отправить форму. Пожалуйста, попробуйте ещё раз.';
    message.classList.add('error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Подтвердить';
  }
});
