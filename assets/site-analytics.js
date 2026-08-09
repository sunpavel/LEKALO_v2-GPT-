(() => {
  const params = new URLSearchParams(location.search);
  const utm = [...params]
    .filter(([key]) => key.startsWith('utm_'))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  try {
    if (utm || !sessionStorage.getItem('lekalo_attribution')) {
      sessionStorage.setItem('lekalo_attribution', JSON.stringify({
        landing: location.pathname,
        referrer: document.referrer,
        utm
      }));
    }
  } catch {}

  const track = (event, params = {}) => {
    if (typeof window.gtag === 'function') window.gtag('event', event, params);
    if (typeof window.ym === 'function') window.ym(111410117, 'reachGoal', event, params);
  };

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href') || '';
    if (href.startsWith('tel:')) track('phone_click', {page: location.pathname});
    if (/^(https?:\/\/)?(t\.me|telegram\.me)\//i.test(href)) track('telegram_click', {page: location.pathname});
  });
})();
