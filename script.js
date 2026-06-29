const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw7lIqFuMvnCr0gqU256XfxsySfeXj21D0MgP1Q766Fdw0Ax4z05s3T-P-U4Qgur8gz/exec';

const form       = document.getElementById('rsvpForm');
const message    = document.getElementById('formMessage');
const phoneInput = document.getElementById('phone');

/* ── Phone formatting (display only) ─────── */
function formatRussianPhone(value) {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('8')) digits = '7' + digits.slice(1);
  if (!digits.startsWith('7')) digits = '7' + digits;
  digits = digits.slice(0, 11);

  const p1 = digits.slice(1, 4);
  const p2 = digits.slice(4, 7);
  const p3 = digits.slice(7, 9);
  const p4 = digits.slice(9, 11);

  let out = '+7';
  if (p1) out += ' ' + p1;
  if (p2) out += ' ' + p2;
  if (p3) out += '-' + p3;
  if (p4) out += '-' + p4;
  return out;
}

/* ── Phone normalisation for Google Sheet ── */
// «+7 917 093-24-35»  →  «+79170932435»
function normalizePhone(raw) {
  const digits = raw.replace(/\D/g, ''); // strip everything except digits
  if (digits.length === 11) {
    // covers both 7xxxxxxxxxx and 8xxxxxxxxxx
    return '+7' + digits.slice(1);
  }
  if (digits.length === 10) {
    return '+7' + digits;
  }
  return raw; // unexpected format — pass as-is
}

function resetPhoneField() {
  if (phoneInput) phoneInput.value = '+7 ';
}

if (phoneInput) {
  phoneInput.addEventListener('focus', () => {
    if (!phoneInput.value.trim()) phoneInput.value = '+7 ';
  });
  phoneInput.addEventListener('input', () => {
    phoneInput.value = formatRussianPhone(phoneInput.value);
  });
  phoneInput.addEventListener('keydown', e => {
    if (phoneInput.selectionStart <= 3 && (e.key === 'Backspace' || e.key === 'Delete')) {
      e.preventDefault();
    }
  });
}

/* ── Countdown ──────────────────────────── */
const countdownTarget = new Date(Date.UTC(2026, 8, 12, 15, 20, 0));
// 12 сентября 2026, 18:20 МСК = 15:20 UTC

function updateCountdown() {
  const diff      = countdownTarget - new Date();
  const daysEl    = document.getElementById('days');
  const hoursEl   = document.getElementById('hours');
  const minutesEl = document.getElementById('minutes');
  const secondsEl = document.getElementById('seconds');
  if (!daysEl) return;
  if (diff <= 0) {
    [daysEl, hoursEl, minutesEl, secondsEl].forEach(el => { if (el) el.textContent = '0'; });
    return;
  }
  daysEl.textContent    = Math.floor(diff / 864e5);
  hoursEl.textContent   = Math.floor((diff / 36e5) % 24);
  minutesEl.textContent = Math.floor((diff / 6e4) % 60);
  secondsEl.textContent = Math.floor((diff / 1e3) % 60);
}

updateCountdown();
setInterval(updateCountdown, 1000);

/* ── Hero Ken-Burns ─────────────────────── */
const heroImg = document.querySelector('.hero__image');
if (heroImg) requestAnimationFrame(() => heroImg.classList.add('loaded'));

/* ── Fade-in on scroll ──────────────────── */
const observer = new IntersectionObserver(
  entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
  }),
  { threshold: 0.10 }
);
document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

/* ── Form validation ─────────────────────
   Returns array of invalid elements (in DOM order).
   Also applies .error-field / .error-group classes for visual highlight.
──────────────────────────────────────────── */
function clearErrors() {
  form.querySelectorAll('.error-field').forEach(el => el.classList.remove('error-field'));
  form.querySelectorAll('.error-group').forEach(el => el.classList.remove('error-group'));
}

function markGroup(inputSelector) {
  const group = form.querySelector(inputSelector).closest('.choice-row, .checkbox-grid');
  group.classList.add('error-group');
  return group;
}

function validateForm() {
  clearErrors();
  const invalid = [];

  /* 1. Имя */
  const nameInput = document.getElementById('name');
  if (!nameInput.value.trim()) {
    nameInput.classList.add('error-field');
    invalid.push(nameInput);
  }

  /* 2. Присутствие 12 сентября */
  if (!form.querySelector('input[name="weddingDay"]:checked')) {
    invalid.push(markGroup('input[name="weddingDay"]'));
  }

  /* 3. Присутствие 13 сентября */
  if (!form.querySelector('input[name="secondDay"]:checked')) {
    invalid.push(markGroup('input[name="secondDay"]'));
  }

  /* 4. Напитки (хотя бы один) */
  if (form.querySelectorAll('input[name="drinks"]:checked').length === 0) {
    invalid.push(markGroup('input[name="drinks"]'));
  }

  /* 5. Аллергия */
  const allergyPicked = form.querySelector('input[name="allergyStatus"]:checked');
  if (!allergyPicked) {
    invalid.push(markGroup('input[name="allergyStatus"]'));
  }

  /* 6. Если аллергия «Да» — нужен текст */
  if (allergyPicked?.value === 'Да') {
    const details = form.querySelector('textarea[name="allergyDetails"]');
    if (!details.value.trim()) {
      details.classList.add('error-field');
      invalid.push(details);
    }
  }

  return invalid; // empty → all good
}

/* ── RSVP Form submit ───────────────────── */
form.addEventListener('submit', async function (e) {
  e.preventDefault();

  message.textContent = '';
  message.className   = 'form-message';

  const formData = new FormData(form);

  // Honeypot
  if (formData.get('website')) {
    message.textContent = 'Спасибо! Мы получили ваш ответ.';
    message.classList.add('success');
    form.reset();
    resetPhoneField();
    return;
  }

  // Validation
  const errors = validateForm();
  if (errors.length > 0) {
    message.textContent = 'Не заполнена необходимая информация.';
    message.classList.add('error');
    // Scroll to the first invalid element
    errors[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  // Build payload
  const allergyStatus  = formData.get('allergyStatus') || '';
  const allergyDetails = formData.get('allergyDetails') || '';

  const data = {
    name:       formData.get('name'),
    weddingDay: formData.get('weddingDay'),
    secondDay:  formData.get('secondDay'),
    drinks:     formData.getAll('drinks').join(', ') || 'Не выбрано',
    allergies:  allergyStatus === 'Да' ? `Да: ${allergyDetails.trim()}` : 'Нет',
    comment:    formData.get('comment'),
    questions:  formData.get('questions'),
    // Read directly from DOM element — guarantees the formatted value is used
    phone:      normalizePhone(phoneInput ? phoneInput.value : formData.get('phone') || '')
  };

  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled    = true;
  submitButton.textContent = 'Отправляем…';

  try {
    await fetch(SCRIPT_URL, {
      method:  'POST',
      mode:    'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body:    JSON.stringify(data)
    });

    message.textContent = 'Спасибо! Мы получили ваш ответ.';
    message.classList.add('success');
    form.reset();
    resetPhoneField();

  } catch {
    message.textContent = 'Не удалось отправить форму. Попробуйте ещё раз.';
    message.classList.add('error');
  } finally {
    submitButton.disabled    = false;
    submitButton.textContent = 'Подтвердить';
  }
});
