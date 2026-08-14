(() => {
  const form = document.querySelector('[data-lead-form]');
  if (!form) return;

  const error = form.querySelector('[data-form-error]');
  const success = document.querySelector('[data-form-success]');
  const submit = form.querySelector('[type="submit"]');
  const defaultSubmitHtml = submit.innerHTML;
  const requestTimeoutMs = 15000;
  const params = new URLSearchParams(location.search);
  let formStarted = false;
  let submissionId = null;

  if (params.get('format') === 'audit' && form.elements.format) {
    form.elements.format.value = 'Аудит / перезапуск строительства';
  }

  const track = (event, eventParams = {}) => {
    if (typeof window.gtag === 'function') window.gtag('event', event, eventParams);
    if (typeof window.ym === 'function') window.ym(111410117, 'reachGoal', event, eventParams);
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
    submissionId ||= typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    let attribution = {};
    try { attribution = JSON.parse(sessionStorage.getItem('lekalo_attribution') || '{}'); } catch {}
    const utm = attribution.utm || [...params]
      .filter(([key]) => key.startsWith('utm_'))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    let completed = false;

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': submissionId
        },
        body: JSON.stringify({
          ...data,
          submissionId,
          page: location.pathname,
          landing: attribution.landing || location.pathname,
          referrer: attribution.referrer || document.referrer,
          utm
        }),
        signal: controller.signal
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) {
        throw new Error(result.message || 'Не удалось отправить заявку. Попробуйте ещё раз немного позже.');
      }

      completed = true;
      submissionId = null;
      track('generate_lead', {
        lead_source: attribution.landing || location.pathname,
        project_format: data.format || 'not_set'
      });
      form.style.display = 'none';
      success.classList.add('show');
    } catch (requestError) {
      error.textContent = requestError.name === 'AbortError'
        ? 'Сервис отвечает дольше обычного. Попробуйте отправить заявку ещё раз.'
        : requestError.message || 'Не удалось отправить заявку. Попробуйте ещё раз немного позже.';
    } finally {
      clearTimeout(timeout);
      if (!completed) {
        submit.disabled = false;
        submit.innerHTML = defaultSubmitHtml;
      }
    }
  });
})();
