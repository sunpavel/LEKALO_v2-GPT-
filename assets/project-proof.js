(() => {
  const path = location.pathname === '/' ? '/' : location.pathname.replace(/\/+$/, '');
  if (path !== '/proekty' && !path.startsWith('/proekty/')) return;

  const style = document.createElement('style');
  style.id = 'lekalo-project-proof-styles';
  style.textContent = `
    .case-proof,.project-evidence{background:#fffdfa;border-top:1px solid #d8d2c8;border-bottom:1px solid #d8d2c8}
    .case-proof-grid,.project-evidence-head{display:grid;grid-template-columns:minmax(240px,.8fr) 1.2fr;gap:clamp(42px,9vw,130px);align-items:start}
    .case-proof-copy,.project-evidence-intro{max-width:720px;color:#59625c;font-size:15px;line-height:1.75}
    .case-proof-copy p{margin:0 0 18px}.case-proof-copy p:last-child{margin-bottom:0}
    .case-proof-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));margin-top:42px;border-top:1px solid #d8d2c8}
    .case-proof-item{padding:26px 28px 26px 0;border-bottom:1px solid #d8d2c8;min-height:170px}
    .case-proof-item:nth-child(even){padding-left:28px;border-left:1px solid #d8d2c8}
    .case-proof-item b{display:block;font:italic 18px Georgia,'Times New Roman',serif;color:#b76747;margin-bottom:24px}
    .case-proof-item h3{font-size:20px;font-weight:400;margin:0 0 10px;color:#182321}.case-proof-item p{font-size:13px;line-height:1.6;color:#717873;margin:0}
    .case-proof-links{display:flex;gap:22px;flex-wrap:wrap;margin-top:32px}.case-proof-links a{font-size:10px;letter-spacing:.13em;text-transform:uppercase;border-bottom:1px solid currentColor;padding-bottom:7px}
    .project-evidence-grid{display:grid;grid-template-columns:repeat(3,1fr);margin-top:56px;border-top:1px solid #d8d2c8}
    .project-evidence-card{display:block;padding:28px 32px 30px 0;border-right:1px solid #d8d2c8;min-height:280px}.project-evidence-card:not(:first-child){padding-left:32px}.project-evidence-card:last-child{border-right:0}
    .project-evidence-card small{font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:#717873}.project-evidence-card strong{display:block;font:400 34px Georgia,'Times New Roman',serif;color:#b76747;margin:34px 0 12px}
    .project-evidence-card h3{font-size:22px;font-weight:400;margin:0 0 12px}.project-evidence-card p{font-size:13px;line-height:1.65;color:#717873;margin:0 0 22px}.project-evidence-card span{font-size:10px;letter-spacing:.13em;text-transform:uppercase;border-bottom:1px solid currentColor;padding-bottom:7px}
    @media(max-width:800px){.case-proof-grid,.project-evidence-head,.case-proof-list,.project-evidence-grid{display:block}.case-proof-copy,.project-evidence-intro{margin-top:34px}.case-proof-item,.case-proof-item:nth-child(even),.project-evidence-card,.project-evidence-card:not(:first-child){padding:24px 0;border-left:0;border-right:0;border-bottom:1px solid #d8d2c8;min-height:0}.project-evidence-card:last-child{border-bottom:0}}
  `;
  if (!document.getElementById(style.id)) document.head.appendChild(style);

  const cases = {
    '/proekty/dom-v-lesu': {
      title: 'Резиденция 769,9 м² —<br><span class="serif">реальная роль в проекте.</span>',
      intro: [
        'Этот объект относится к профессиональному опыту Сергея Соколова до создания LEKALO. В исходном портфолио Сергей указан как руководитель проекта, а стадия участия — от начала до завершения строительства.',
        'Поэтому здесь мы можем говорить не только о визуальной стороне дома. Подтверждены состав объекта и инженерные системы: бассейн, сауна, блок персонала, канальное кондиционирование DAIKIN, Multirum, камин и панорамное остекление.'
      ],
      facts: [
        ['01','769,9 м²','Дом в Московской области на участке 1 700 м². Два уровня, пять спален с гардеробными и семь санузлов.'],
        ['02','От начала до завершения','Сергей указан в портфолио как руководитель проекта с участием на всём цикле строительства этого объекта.'],
        ['03','Бассейн + сауна','Wellness-зона является частью частного дома вместе с жилыми, техническими и сервисными помещениями.'],
        ['04','Инженерная насыщенность','DAIKIN, Multirum, камин, панорамное остекление, гараж/навес и блок персонала требовали координации разных систем и подрядчиков.']
      ],
      about:['частная резиденция 769,9 м²','руководитель проекта частного дома','строительство от начала до завершения','бассейн и сауна','DAIKIN','Multirum','панорамное остекление'],
      links:[['/komanda/sergey-sokolov/','Опыт Сергея Соколова'],['/tekhnicheskiy-zakazchik/','Технический заказчик'],['/stati/kontrol-byudzheta-stroitelstva-premialnogo-doma/','Контроль бюджета']]
    },
    '/proekty/rezidentsiya-s-basseynom': {
      title: 'Wellness внутри дома —<br><span class="serif">не отдельная комната.</span>',
      intro: [
        'В открытой части кейса показан реализованный приватный бассейн, встроенный в архитектуру жилой резиденции. Площадь, бюджет, сроки и точная локация не раскрываются — это ограничение NDA.',
        'С точки зрения реализации ценность такого объекта — в количестве междисциплинарных стыков. Бассейн рядом с жилыми пространствами требует согласовать влажностный режим, вентиляцию, отделочные материалы, остекление, свет и технические зоны так, чтобы инженерия не разрушала архитектурный замысел.'
      ],
      facts: [
        ['01','Wellness как часть архитектуры','Бассейн включён в общую композицию дома и визуально связан с садом и жилыми пространствами.'],
        ['02','Инженерия без визуального шума','Технические элементы подчинены геометрии потолков и стен, а не становятся отдельным визуальным слоем.'],
        ['03','Материалы в сложной среде','Камень, дерево, металл и светопрозрачные конструкции должны работать и эстетически, и в условиях повышенной влажности.'],
        ['04','NDA без потери доказательности','Конфиденциальность закрывает персональные и финансовые данные, но реализованный объект и его техническая сложность остаются видимыми.']
      ],
      about:['частная резиденция с бассейном','wellness-пространство','инженерная координация','скрытая инженерия','премиальные отделочные материалы'],
      links:[['/tekhnicheskiy-zakazchik/','Технический заказчик'],['/proektirovanie-domov/','Проектирование дома'],['/komanda/sergey-sokolov/','Инженерный опыт']]
    },
    '/proekty/taktilnyy-interer': {
      title: 'Премиальный интерьер —<br><span class="serif">это точность исполнения.</span>',
      intro: [
        'Этот реализованный интерьер опубликован с учётом NDA и показывает другой тип сложности: не масштаб коробки, а качество финальной реализации. В кадре видны индивидуальная столярка, натуральный камень, сложный свет, встроенные элементы и предметная комплектация.',
        'Такие интерьеры особенно чувствительны к накоплению мелких ошибок. Несовпавшая отметка, неверный вывод инженерии или изменение толщины отделочного слоя проявляются уже на дорогом финише.'
      ],
      facts: [
        ['01','Индивидуальная столярка','Панели, встроенные системы хранения и мебель требуют точной привязки к геометрии помещений и инженерным выводам.'],
        ['02','Сценарный свет','Декоративные и архитектурные источники должны быть согласованы с потолками, мебелью и отделкой заранее.'],
        ['03','Камень и сложные примыкания','Натуральный материал требует точных размеров, раскладки, подготовки основания и контроля соседних узлов.'],
        ['04','Комплектация как часть проекта','Мебель, искусство и предметы влияют на финальный результат и должны быть связаны с архитектурной основой.']
      ],
      about:['премиальный интерьер частного дома','индивидуальная столярка','натуральный камень','сценарное освещение','комплектация интерьера'],
      links:[['/proektirovanie-domov/','Архитектура и дизайн'],['/tekhnicheskiy-zakazchik/','Управление реализацией'],['/stroitelstvo-domov-pod-klyuch/','Строительство под ключ']]
    }
  };

  const updateSchema = (about) => {
    [...document.querySelectorAll('script[type="application/ld+json"]')].forEach((node) => {
      try {
        const data = JSON.parse(node.textContent);
        const graph = Array.isArray(data['@graph']) ? data['@graph'] : [data];
        const article = graph.find((item) => item && item['@type'] === 'Article');
        if (!article) return;
        article.about = about;
        article.dateModified = '2026-08-21';
        article.isPartOf = {'@id':'https://lklo.ru/proekty/#page'};
        node.textContent = JSON.stringify(data);
      } catch {}
    });
  };

  if (cases[path]) {
    const data = cases[path];
    const gallery = document.querySelector('main > section.section.cream');
    if (gallery && !document.querySelector('[data-case-proof]')) {
      const section = document.createElement('section');
      section.className = 'section case-proof';
      section.dataset.caseProof = 'true';
      section.innerHTML = `<div class="wrap"><div class="case-proof-grid"><div><div class="eyebrow">Доказательная часть кейса</div><h2 class="section-title">${data.title}</h2></div><div class="case-proof-copy">${data.intro.map(p=>`<p>${p}</p>`).join('')}</div></div><div class="case-proof-list">${data.facts.map(f=>`<article class="case-proof-item"><b>${f[0]}</b><h3>${f[1]}</h3><p>${f[2]}</p></article>`).join('')}</div><div class="case-proof-links">${data.links.map(l=>`<a href="${l[0]}">${l[1]} ↗</a>`).join('')}</div></div>`;
      gallery.parentNode.insertBefore(section, gallery);
    }
    updateSchema(data.about);
  }

  if (path === '/proekty') {
    const cta = document.querySelector('main > section.section.cta');
    if (cta && !document.querySelector('[data-project-evidence]')) {
      const section = document.createElement('section');
      section.className = 'section project-evidence';
      section.dataset.projectEvidence = 'true';
      section.innerHTML = `<div class="wrap"><div class="project-evidence-head"><div><div class="eyebrow">Опыт технического руководителя LEKALO</div><h2 class="section-title">За визуальной частью —<br><span class="serif">реальная стройка.</span></h2></div><p class="project-evidence-intro">Публичные фотографии показывают только часть портфолио. Профессиональный опыт Сергея Соколова включает руководство частными резиденциями, крупными wellness-объектами и строительный контроль сложных общественных зданий. Ниже — только характеристики, которые подтверждены его портфолио; закрытые данные собственников не публикуются.</p></div><div class="project-evidence-grid"><a class="project-evidence-card" href="/komanda/sergey-sokolov/"><small>Частные резиденции</small><strong>до 5 000 м²</strong><h3>Крупный индивидуальный масштаб</h3><p>В закрытом загородном проекте главный дом имел площадь 5 000 м²; Сергей работал руководителем строительства и участвовал в сдаче объекта заказчику.</p><span>Смотреть опыт ↗</span></a><a class="project-evidence-card" href="/proekty/dom-v-lesu/"><small>Полный цикл</small><strong>769,9 м²</strong><h3>От начала до завершения</h3><p>Руководитель проекта частной резиденции с бассейном, сауной, климатом DAIKIN, Multirum и панорамным остеклением.</p><span>Смотреть кейс ↗</span></a><a class="project-evidence-card" href="/komanda/sergey-sokolov/"><small>Инженерный опыт</small><strong>49 469 м²</strong><h3>Четыре wellness-комплекса</h3><p>Бассейны, купели, парные, хаммамы, SPA и круглогодичные наружные бассейны — в опыте Сергея как руководителя проекта.</p><span>Смотреть профиль ↗</span></a></div></div>`;
      cta.parentNode.insertBefore(section, cta);
    }
  }
})();