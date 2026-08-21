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
    if (/^(https?:\/\/)?(t\.me|telegram\.me)\//i.test(href)) track('telegram_click', {page: location.pathname});
  });

  const PERSON_ID = 'https://lklo.ru/komanda/sergey-sokolov/#person';
  const ORGANIZATION_ID = 'https://lklo.ru/#organization';
  const normalizedPath = location.pathname === '/' ? '/' : location.pathname.replace(/\/+$/, '');
  const personEntity = {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: 'Сергей Соколов',
    jobTitle: 'Технический руководитель LEKALO',
    url: 'https://lklo.ru/komanda/sergey-sokolov/',
    image: 'https://lklo.ru/assets/team-sergey-sokolov-v2.webp',
    worksFor: {'@id': ORGANIZATION_ID},
    knowsAbout: [
      'технический заказчик',
      'руководство строительными проектами',
      'строительство премиальных частных домов',
      'частные резиденции до 5000 м²',
      'генеральный подряд',
      'строительный контроль',
      'бассейны и SPA',
      'климатические системы',
      'умный дом',
      'реализация архитектурных проектов'
    ]
  };

  const appendJsonLd = (id, data) => {
    if (document.getElementById(id)) return;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = id;
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  };

  const jsonLdScripts = () => [...document.querySelectorAll('script[type="application/ld+json"]')]
    .filter((script) => !script.id.startsWith('lekalo-geo-'));

  if (normalizedPath === '/') {
    document.title = 'LEKALO — строительство премиальных домов и технический заказчик в Москве';
    const description = document.querySelector('meta[name="description"]');
    if (description) {
      description.content = 'LEKALO — строительство и управление реализацией премиальных частных домов и резиденций в Москве и Московской области: от архитектуры до ввода в эксплуатацию.';
    }

    jsonLdScripts().forEach((script) => {
      try {
        const data = JSON.parse(script.textContent);
        const nodes = Array.isArray(data['@graph']) ? data['@graph'] : [data];
        const organization = nodes.find((node) => node && node['@id'] === ORGANIZATION_ID);
        if (!organization) return;
        organization.description = 'Строительство и управление реализацией премиальных частных домов и резиденций от концепции до ввода в эксплуатацию.';
        organization.knowsAbout = [
          'строительство премиальных частных домов',
          'строительство частных резиденций',
          'технический заказчик',
          'генеральный подряд',
          'управление строительством',
          'индивидуальное проектирование домов',
          'аудит строительства'
        ];
        organization.employee = {'@id': PERSON_ID};
        script.textContent = JSON.stringify(data);
      } catch {}
    });

    appendJsonLd('lekalo-geo-home', {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          '@id': 'https://lklo.ru/#website',
          url: 'https://lklo.ru/',
          name: 'LEKALO',
          inLanguage: 'ru-RU',
          publisher: {'@id': ORGANIZATION_ID}
        },
        personEntity
      ]
    });

    const team = document.querySelector('.team-person > div:last-child');
    if (team) {
      const teamCopy = team.querySelector('p');
      if (teamCopy) {
        teamCopy.textContent = 'Профессиональный опыт Сергея до создания LEKALO включает руководство строительством и проектами частных резиденций до 5 000 м², а также инженерно насыщенных wellness-объектов. В LEKALO он отвечает за технический контур реализации на стороне собственника.';
      }
      const proof = team.querySelector('.team-proof');
      if (proof) {
        proof.innerHTML = '<div><strong>до 5 000 м²</strong><span>частный дом<br>в портфолио</span></div><div><strong>49 469 м²</strong><span>4 wellness-объекта<br>в опыте руководителя</span></div>';
      }
      if (!team.querySelector('[data-sergey-profile]')) {
        const link = document.createElement('a');
        link.href = '/komanda/sergey-sokolov/';
        link.className = 'text-link';
        link.dataset.sergeyProfile = 'true';
        link.innerHTML = 'Профиль и подтверждённый опыт <span>↗</span>';
        if (proof) team.insertBefore(link, proof);
        else team.appendChild(link);
      }
    }
  }

  const expertArticlePaths = new Set([
    '/stati/stoimost-stroitelstva-premialnogo-doma',
    '/stati/tekhnicheskiy-zakazchik-v-chastnom-stroitelstve',
    '/stati/kak-vybrat-uchastok-pod-stroitelstvo-doma'
  ]);

  if (expertArticlePaths.has(normalizedPath)) {
    const articleMeta = document.querySelector('.article-meta');
    if (articleMeta && !articleMeta.querySelector('[data-expert-link]')) {
      const expert = document.createElement('span');
      expert.dataset.expertLink = 'true';
      expert.innerHTML = 'Эксперт: <a href="/komanda/sergey-sokolov/" rel="author">Сергей Соколов</a>';
      articleMeta.appendChild(expert);
    }

    if (!document.querySelector('link[rel="author"][href="/komanda/sergey-sokolov/"]')) {
      const authorLink = document.createElement('link');
      authorLink.rel = 'author';
      authorLink.href = '/komanda/sergey-sokolov/';
      document.head.appendChild(authorLink);
    }

    jsonLdScripts().forEach((script) => {
      try {
        const data = JSON.parse(script.textContent);
        const nodes = Array.isArray(data['@graph']) ? data['@graph'] : [data];
        const article = nodes.find((node) => node && node['@type'] === 'Article');
        if (!article) return;
        article.author = {'@id': ORGANIZATION_ID};
        article.contributor = {'@id': PERSON_ID};
        if (Array.isArray(data['@graph']) && !nodes.some((node) => node && node['@id'] === PERSON_ID)) {
          data['@graph'].push(personEntity);
        }
        script.textContent = JSON.stringify(data);
      } catch {}
    });
  }

  if (normalizedPath === '/proekty' || normalizedPath.startsWith('/proekty/')) {
    if (!document.querySelector('script[data-project-proof-loader]')) {
      const projectProof = document.createElement('script');
      projectProof.src = '/assets/project-proof.js?v=20260821-1';
      projectProof.dataset.projectProofLoader = 'true';
      document.body.appendChild(projectProof);
    }
  }
})();