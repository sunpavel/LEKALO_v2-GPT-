(() => {
  const form = document.querySelector('[data-lead-form]');
  if (!form) return;
  const error = form.querySelector('[data-form-error]');
  const success = document.querySelector('[data-form-success]');
  const submit = form.querySelector('[type="submit"]');
  let formStarted = false;

  const track = (event, params = {}) => {
    if (typeof window.gtag === 'function') window.gtag('event', event, params);
    if (typeof window.ym === 'function') window.ym(111410117, 'reachGoal', event, params);
  };

  form.addEventListener('input', () => {
    if (formStarted) return;
    formStarted = true;
    track('form_start', {form_name: 'project_request', page: location.pathname});
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    if (!String(data.name || '').trim() || !String(data.contact || '').trim()) {
      error.textContent = 'Заполните имя и контакт — мы должны понимать, как вам ответить.';
      return;
    }
    if (!data.consent) {
      error.textContent = 'Подтвердите согласие на обработку персональных данных.';
      return;
    }

    error.textContent = '';
    submit.disabled = true;
    submit.textContent = 'Отправляем…';
    let attribution = {};
    try { attribution = JSON.parse(sessionStorage.getItem('lekalo_attribution') || '{}'); } catch {}
    const params = new URLSearchParams(location.search);
    const utm = attribution.utm || [...params]
      .filter(([key]) => key.startsWith('utm_'))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          ...data,
          page: location.pathname,
          landing: attribution.landing || location.pathname,
          referrer: attribution.referrer || document.referrer,
          utm
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.message || 'Не удалось отправить заявку. Попробуйте ещё раз немного позже.');
      track('generate_lead', {lead_source: attribution.landing || location.pathname, project_format: data.format || 'not_set'});
      if (typeof window.ym === 'function') window.ym(111410117, 'reachGoal', 'lead_submit', {page: location.pathname, landing: attribution.landing || location.pathname, format: data.format || 'not_set'});
      form.style.display = 'none';
      success.classList.add('show');
    } catch (requestError) {
      error.textContent = requestError.message || 'Не удалось отправить заявку. Попробуйте ещё раз немного позже.';
      submit.disabled = false;
      submit.textContent = 'Оставить заявку ↗';
    }
  });
})();
