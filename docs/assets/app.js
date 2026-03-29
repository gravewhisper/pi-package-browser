(function () {
  var SEARCH_API = 'https://registry.npmjs.org/-/v1/search';
  var MANIFEST_API = 'https://registry.npmjs.org/';
  var FLAG_API = 'https://api.github.com/repos/badlogic/pi-mono/issues?labels=package-flag&state=all&per_page=100';
  var SEARCH_SIZE = 250;
  var BATCH_SIZE = 24;
  var MANIFEST_CONCURRENCY = 4;

  var grid = document.getElementById('pkg-grid');
  var errorEl = document.getElementById('pkg-error');
  var retryBtn = document.getElementById('pkg-retry');
  var filtersSection = document.querySelector('.pkg-filters');
  var filterPanel = document.getElementById('pkg-filter-panel');
  var filterPanelBackdrop = document.getElementById('pkg-filter-panel-backdrop');
  var filterPanelClose = document.getElementById('pkg-filter-panel-close');
  var mobileFiltersToggle = document.getElementById('pkg-mobile-filters-toggle');
  var mobileFiltersBadge = document.getElementById('pkg-mobile-filters-badge');
  var searchInput = document.querySelector('.pkg-search');
  var searchClearBtn = document.getElementById('pkg-search-clear');
  var clearFiltersBtn = document.getElementById('pkg-clear-filters');
  var sortMenu = document.getElementById('pkg-sort-menu');
  var sortTrigger = document.getElementById('pkg-sort-trigger');
  var sortTriggerValue = document.getElementById('pkg-sort-trigger-value');
  var sortPopover = document.getElementById('pkg-sort-popover');
  var sortSelect = document.querySelector('.pkg-sort');
  var sortOptions = document.querySelectorAll('.pkg-sort-option[data-value]');
  var pills = document.querySelectorAll('.pkg-pill[data-type]');
  var countEl = document.querySelector('.pkg-count');
  var recentSection = document.getElementById('pkg-recent');
  var recentScroll = document.getElementById('pkg-recent-scroll');
  var recentTrack = document.querySelector('.pkg-recent-track');
  var recentPrev = document.querySelector('.pkg-recent-prev');
  var recentNext = document.querySelector('.pkg-recent-next');
  var authorsSection = document.getElementById('pkg-authors');
  var authorGrid = document.getElementById('pkg-author-grid');
  var statusMeta = document.getElementById('status-meta');
  var statusNote = document.querySelector('.status-note');
  var statusProgressFill = document.getElementById('status-progress-fill');
  var statusProgressText = document.getElementById('status-progress-text');
  var heroStats = document.getElementById('hero-stats');
  var sectionDescription = document.getElementById('pkg-section-description');
  var resultsFooter = document.getElementById('pkg-results-footer');
  var resultsSummary = document.getElementById('pkg-results-summary');
  var loadMoreBtn = document.getElementById('pkg-load-more');
  var scrollSentinel = document.getElementById('pkg-scroll-sentinel');

  var modalEl = document.getElementById('pkg-modal');
  var modalVideo = modalEl.querySelector('video');
  var modalImg = modalEl.querySelector('.pkg-modal-player img');
  var modalClose = modalEl.querySelector('.pkg-modal-close');
  var modalName = modalEl.querySelector('.pkg-modal-name');
  var modalDesc = modalEl.querySelector('.pkg-modal-desc');
  var modalCode = modalEl.querySelector('.pkg-modal-install code');
  var modalCopyBtn = modalEl.querySelector('.pkg-modal-install .copy-btn');

  var readmeEl = document.getElementById('pkg-readme');
  var readmeBody = document.getElementById('pkg-readme-body');
  var readmeClose = readmeEl.querySelector('.pkg-readme-close');
  var readmeName = readmeEl.querySelector('.pkg-readme-pkg-name');
  var readmeVersion = readmeEl.querySelector('.pkg-readme-version');

  var shortcutsEl = document.getElementById('pkg-shortcuts');
  var shortcutsClose = shortcutsEl.querySelector('.pkg-shortcuts-close');

  var packages = [];
  var filteredPackages = [];
  var packageMap = new Map();
  var cardMap = {};
  var activeTypes = new Set();
  var renderedCount = 0;
  var manifestsLoaded = 0;
  var fetchGeneration = 0;
  var hasDesktop = window.matchMedia('(hover: hover)').matches;
  var mobileFiltersMq = window.matchMedia('(max-width: 860px)');
  var libsReady = null;
  var mediaObserver = null;
  var loadMoreObserver = null;
  var manifestQueue = [];
  var manifestQueued = new Set();
  var manifestLoading = new Set();
  var manifestLoaded = new Set();
  var manifestPumpScheduled = false;
  var backgroundPrefetchIndex = 0;
  var backgroundPrefetchTimer = null;
  var modalOrigin = null;
  var modalPkgName = '';
  var modalCopyTimer;
  var mobileFiltersTimer;
  var readmeLoadingFor = '';
  var readmeOrigin = null;
  var shortcutsOrigin = null;
  var activeCardName = '';
  var refreshFiltersTimer = null;
  var refreshHeroTimer = null;

  var SVG_NPM = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M0 0v24h24v-24h-24zm19.2 19.2h-2.4v-9.6h-4.8v9.6h-7.2v-14.4h14.4v14.4z"/></svg>';
  var SVG_GH = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>';
  var SVG_README = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>';
  var SVG_FLAG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>';
  var SVG_SHIELD = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
  var SVG_COPY = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  var SVG_CHECK = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  var AUTHOR_COLORS = ['#4ade80', '#60a5fa', '#c084fc', '#fbbf24', '#22d3ee', '#fb7185', '#f97316', '#71717a'];

  function md5(str) {
    function rl(n, c) { return (n << c) | (n >>> (32 - c)); }
    function cm(q, a, b, x, s, t) { return (rl((a + q + x + t) | 0, s) + b) | 0; }
    function ff(a, b, c, d, x, s, t) { return cm((b & c) | (~b & d), a, b, x, s, t); }
    function gg(a, b, c, d, x, s, t) { return cm((b & d) | (c & ~d), a, b, x, s, t); }
    function hh(a, b, c, d, x, s, t) { return cm(b ^ c ^ d, a, b, x, s, t); }
    function ii(a, b, c, d, x, s, t) { return cm(c ^ (b | ~d), a, b, x, s, t); }
    function hex(n) {
      var s = '';
      for (var i = 0; i < 4; i++) s += ((n >> (i * 8 + 4)) & 0xF).toString(16) + ((n >> (i * 8)) & 0xF).toString(16);
      return s;
    }
    var w = [], i;
    for (i = 0; i < str.length; i++) w[i >> 2] |= str.charCodeAt(i) << ((i & 3) << 3);
    w[i >> 2] |= 0x80 << ((i & 3) << 3);
    var bl = (((i + 8) >> 6) + 1) << 4;
    while (w.length < bl) w.push(0);
    w[bl - 2] = str.length * 8;
    var A = 0x67452301, B = 0xEFCDAB89, C = 0x98BADCFE, D = 0x10325476;
    for (i = 0; i < w.length; i += 16) {
      var a = A, b = B, c = C, d = D;
      a = ff(a, b, c, d, w[i], 7, -680876936); d = ff(d, a, b, c, w[i + 1], 12, -389564586); c = ff(c, d, a, b, w[i + 2], 17, 606105819); b = ff(b, c, d, a, w[i + 3], 22, -1044525330);
      a = ff(a, b, c, d, w[i + 4], 7, -176418897); d = ff(d, a, b, c, w[i + 5], 12, 1200080426); c = ff(c, d, a, b, w[i + 6], 17, -1473231341); b = ff(b, c, d, a, w[i + 7], 22, -45705983);
      a = ff(a, b, c, d, w[i + 8], 7, 1770035416); d = ff(d, a, b, c, w[i + 9], 12, -1958414417); c = ff(c, d, a, b, w[i + 10], 17, -42063); b = ff(b, c, d, a, w[i + 11], 22, -1990404162);
      a = ff(a, b, c, d, w[i + 12], 7, 1804603682); d = ff(d, a, b, c, w[i + 13], 12, -40341101); c = ff(c, d, a, b, w[i + 14], 17, -1502002290); b = ff(b, c, d, a, w[i + 15], 22, 1236535329);
      a = gg(a, b, c, d, w[i + 1], 5, -165796510); d = gg(d, a, b, c, w[i + 6], 9, -1069501632); c = gg(c, d, a, b, w[i + 11], 14, 643717713); b = gg(b, c, d, a, w[i], 20, -373897302);
      a = gg(a, b, c, d, w[i + 5], 5, -701558691); d = gg(d, a, b, c, w[i + 10], 9, 38016083); c = gg(c, d, a, b, w[i + 15], 14, -660478335); b = gg(b, c, d, a, w[i + 4], 20, -405537848);
      a = gg(a, b, c, d, w[i + 9], 5, 568446438); d = gg(d, a, b, c, w[i + 14], 9, -1019803690); c = gg(c, d, a, b, w[i + 3], 14, -187363961); b = gg(b, c, d, a, w[i + 8], 20, 1163531501);
      a = gg(a, b, c, d, w[i + 13], 5, -1444681467); d = gg(d, a, b, c, w[i + 2], 9, -51403784); c = gg(c, d, a, b, w[i + 7], 14, 1735328473); b = gg(b, c, d, a, w[i + 12], 20, -1926607734);
      a = hh(a, b, c, d, w[i + 5], 4, -378558); d = hh(d, a, b, c, w[i + 8], 11, -2022574463); c = hh(c, d, a, b, w[i + 11], 16, 1839030562); b = hh(b, c, d, a, w[i + 14], 23, -35309556);
      a = hh(a, b, c, d, w[i + 1], 4, -1530992060); d = hh(d, a, b, c, w[i + 4], 11, 1272893353); c = hh(c, d, a, b, w[i + 7], 16, -155497632); b = hh(b, c, d, a, w[i + 10], 23, -1094730640);
      a = hh(a, b, c, d, w[i + 13], 4, 681279174); d = hh(d, a, b, c, w[i], 11, -358537222); c = hh(c, d, a, b, w[i + 3], 16, -722521979); b = hh(b, c, d, a, w[i + 6], 23, 76029189);
      a = hh(a, b, c, d, w[i + 9], 4, -640364487); d = hh(d, a, b, c, w[i + 12], 11, -421815835); c = hh(c, d, a, b, w[i + 15], 16, 530742520); b = hh(b, c, d, a, w[i + 2], 23, -995338651);
      a = ii(a, b, c, d, w[i], 6, -198630844); d = ii(d, a, b, c, w[i + 7], 10, 1126891415); c = ii(c, d, a, b, w[i + 14], 15, -1416354905); b = ii(b, c, d, a, w[i + 5], 21, -57434055);
      a = ii(a, b, c, d, w[i + 12], 6, 1700485571); d = ii(d, a, b, c, w[i + 3], 10, -1894986606); c = ii(c, d, a, b, w[i + 10], 15, -1051523); b = ii(b, c, d, a, w[i + 1], 21, -2054922799);
      a = ii(a, b, c, d, w[i + 8], 6, 1873313359); d = ii(d, a, b, c, w[i + 15], 10, -30611744); c = ii(c, d, a, b, w[i + 6], 15, -1560198380); b = ii(b, c, d, a, w[i + 13], 21, 1309151649);
      a = ii(a, b, c, d, w[i + 4], 6, -145523070); d = ii(d, a, b, c, w[i + 11], 10, -1120210379); c = ii(c, d, a, b, w[i + 2], 15, 718787259); b = ii(b, c, d, a, w[i + 9], 21, -343485551);
      A = (A + a) | 0; B = (B + b) | 0; C = (C + c) | 0; D = (D + d) | 0;
    }
    return hex(A) + hex(B) + hex(C) + hex(D);
  }

  function unique(values) {
    return Array.from(new Set((values || []).filter(Boolean)));
  }

  function typesFromKeywords(keywords) {
    if (!Array.isArray(keywords)) return [];
    var normalized = keywords.map(function (keyword) { return String(keyword).toLowerCase(); });
    var types = [];
    if (normalized.some(function (keyword) { return keyword === 'extension' || keyword === 'extensions' || keyword === 'pi-extension'; })) types.push('extension');
    if (normalized.some(function (keyword) { return keyword === 'skill' || keyword === 'skills' || keyword === 'pi-skill'; })) types.push('skill');
    if (normalized.some(function (keyword) { return keyword === 'theme' || keyword === 'themes' || keyword === 'pi-theme'; })) types.push('theme');
    if (normalized.some(function (keyword) { return keyword === 'prompt' || keyword === 'prompts' || keyword === 'pi-prompt'; })) types.push('prompt');
    return unique(types);
  }

  function typesFromManifest(pi) {
    if (!pi || typeof pi !== 'object') return [];
    var types = [];
    if (Array.isArray(pi.extensions) && pi.extensions.length) types.push('extension');
    if (Array.isArray(pi.skills) && pi.skills.length) types.push('skill');
    if (Array.isArray(pi.themes) && pi.themes.length) types.push('theme');
    if (Array.isArray(pi.prompts) && pi.prompts.length) types.push('prompt');
    return unique(types);
  }

  function validDemoUrl(url, extensions) {
    if (!url) return null;
    try {
      var pathname = new URL(url).pathname.toLowerCase();
      if (extensions.some(function (extension) { return pathname.endsWith(extension); })) return url;
    } catch (error) {
      return null;
    }
    return null;
  }

  function videoFromManifest(pi) {
    return validDemoUrl(pi && pi.video, ['.mp4']);
  }

  function imageFromManifest(pi) {
    return validDemoUrl(pi && pi.image, ['.png', '.jpg', '.jpeg', '.gif', '.webp']);
  }

  function normalizeRepo(url) {
    if (!url) return null;
    return String(url).replace(/^git\+/, '').replace(/\.git$/, '');
  }

  function npmUrl(pkg) {
    return (pkg.links && pkg.links.npm) || ('https://www.npmjs.com/package/' + encodeURIComponent(pkg.name));
  }

  function authorName(pkg) {
    if (pkg.author && pkg.author.name) return pkg.author.name;
    return 'unknown';
  }

  function authorEmail(pkg) {
    if (pkg.author && pkg.author.email) return pkg.author.email;
    return '';
  }

  function relativeDate(iso) {
    var ms = Date.now() - new Date(iso).getTime();
    if (!Number.isFinite(ms)) return 'unknown';
    if (ms < 0) ms = 0;
    var sec = Math.floor(ms / 1000);
    if (sec < 60) return 'just now';
    var min = Math.floor(sec / 60);
    if (min < 60) return min + 'm ago';
    var hr = Math.floor(min / 60);
    if (hr < 24) return hr + 'h ago';
    var days = Math.floor(hr / 24);
    if (days < 30) return days + 'd ago';
    var months = Math.floor(days / 30);
    if (months < 12) return months + 'mo ago';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatNumber(value) {
    return Number(value || 0).toLocaleString('en-US');
  }

  function hashColor(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return AUTHOR_COLORS[Math.abs(hash) % AUTHOR_COLORS.length];
  }

  function fetchJson(url) {
    return fetch(url, {
      headers: {
        accept: 'application/json'
      }
    }).then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status + ' for ' + url);
      return response.json();
    });
  }

  function fetchSearchResults() {
    var allObjects = [];

    function fetchPage(from) {
      var url = SEARCH_API + '?text=' + encodeURIComponent('keywords:pi-package') + '&size=' + SEARCH_SIZE + '&from=' + from;
      return fetchJson(url).then(function (data) {
        var batch = Array.isArray(data.objects) ? data.objects : [];
        allObjects = allObjects.concat(batch);

        if (allObjects.length < Number(data.total || 0) && batch.length > 0) {
          statusMeta.textContent = 'Loaded ' + allObjects.length + ' of ' + Number(data.total || 0) + ' packages from npm…';
          return fetchPage(allObjects.length);
        }

        return allObjects;
      });
    }

    return fetchPage(0);
  }

  function fetchFlags() {
    return fetchJson(FLAG_API).then(function (issues) {
      var flags = {};
      (issues || []).forEach(function (issue) {
        var match = issue && issue.title ? issue.title.match(/^Package Report:\s*(.+)$/i) : null;
        if (!match) return;
        var name = match[1].trim();
        var hide = Array.isArray(issue.labels) && issue.labels.some(function (label) { return label && label.name === 'package-hide'; });
        if (issue.state === 'closed' && !hide) return;
        if (!flags[name] || (hide && !flags[name].hide)) {
          flags[name] = {
            hide: hide,
            url: issue.html_url || null
          };
        }
      });
      return flags;
    }).catch(function () {
      return {};
    });
  }

  function processSearchResults(objects, flags) {
    return (objects || []).map(function (obj) {
      var pkg = obj.package || {};
      var flag = flags[pkg.name] || null;

      return {
        name: pkg.name,
        description: pkg.description || '',
        version: pkg.version || '0.0.0',
        date: pkg.date,
        downloads: obj.downloads && obj.downloads.monthly || 0,
        types: typesFromKeywords(pkg.keywords || []),
        video: null,
        image: null,
        links: {
          npm: pkg.links && pkg.links.npm,
          repository: normalizeRepo(pkg.links && pkg.links.repository),
          homepage: pkg.links && pkg.links.homepage || null
        },
        author: {
          name: pkg.maintainers && pkg.maintainers[0] && (pkg.maintainers[0].username || pkg.maintainers[0].email)
            || pkg.publisher && (pkg.publisher.username || pkg.publisher.email)
            || 'unknown',
          email: pkg.maintainers && pkg.maintainers[0] && pkg.maintainers[0].email
            || pkg.publisher && pkg.publisher.email
            || ''
        },
        flag: flag && !flag.hide
          ? { status: 'warn', url: flag.url }
          : null,
        manifestState: 'idle',
        mediaFailed: false
      };
    }).filter(function (pkg) {
      var flag = flags[pkg.name];
      return !(flag && flag.hide);
    });
  }

  function activeFilterCount() {
    var count = activeTypes.size;
    if (searchInput.value.trim()) count += 1;
    if (sortSelect.value !== 'downloads') count += 1;
    return count;
  }

  function isMobileFiltersMode() {
    return mobileFiltersMq.matches;
  }

  function sortLabel(value) {
    if (value === 'recent') return 'Recently published';
    if (value === 'name') return 'A–Z';
    return 'Most downloads';
  }

  function closeSortMenu() {
    sortMenu.classList.remove('open');
    sortTrigger.setAttribute('aria-expanded', 'false');
    sortPopover.hidden = true;
  }

  function openSortMenu() {
    sortPopover.hidden = false;
    sortMenu.classList.add('open');
    sortTrigger.setAttribute('aria-expanded', 'true');
  }

  function syncSortUi() {
    var value = sortSelect.value;
    sortTriggerValue.textContent = sortLabel(value);
    sortOptions.forEach(function (option) {
      var active = option.dataset.value === value;
      option.classList.toggle('is-active', active);
      option.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }

  function isTypingTarget(target) {
    return !!(target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable));
  }

  function openShortcuts() {
    if (modalEl.classList.contains('open') || readmeEl.classList.contains('open')) return;
    closeSortMenu();
    closeMobileFilters(true);
    shortcutsOrigin = document.activeElement;
    shortcutsEl.classList.add('open');
    document.documentElement.style.overflow = 'hidden';
    shortcutsClose.focus();
  }

  function closeShortcuts() {
    shortcutsEl.classList.remove('open');
    document.documentElement.style.overflow = '';
    if (shortcutsOrigin) {
      shortcutsOrigin.focus();
      shortcutsOrigin = null;
    }
  }

  function clearActiveCard() {
    if (activeCardName && cardMap[activeCardName]) cardMap[activeCardName].classList.remove('pkg-card-active');
    activeCardName = '';
  }

  function setActiveCard(name, options) {
    if (!name) return;
    var index = filteredPackages.findIndex(function (pkg) { return pkg.name === name; });
    if (index === -1) return;

    ensureRenderedThroughIndex(index);
    var card = cardMap[name];
    if (!card) return;

    if (activeCardName && cardMap[activeCardName] && activeCardName !== name) {
      cardMap[activeCardName].classList.remove('pkg-card-active');
    }

    activeCardName = name;
    card.classList.add('pkg-card-active');

    if (!options || options.scroll !== false) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    if (!options || options.focus !== false) {
      card.focus({ preventScroll: true });
    }
  }

  function syncActiveCard() {
    if (!filteredPackages.length) {
      clearActiveCard();
      return;
    }

    var exists = activeCardName && filteredPackages.some(function (pkg) { return pkg.name === activeCardName; });
    if (!exists || !cardMap[activeCardName] || !grid.contains(cardMap[activeCardName])) {
      setActiveCard(filteredPackages[0].name, { focus: false, scroll: false });
      return;
    }

    cardMap[activeCardName].classList.add('pkg-card-active');
  }

  function stepActiveCard(delta) {
    if (!filteredPackages.length) return;
    var index = filteredPackages.findIndex(function (pkg) { return pkg.name === activeCardName; });
    if (index === -1) index = delta > 0 ? -1 : 1;
    var next = Math.max(0, Math.min(filteredPackages.length - 1, index + delta));
    setActiveCard(filteredPackages[next].name);
  }

  function getActivePackage() {
    if (!filteredPackages.length) return null;
    if (!activeCardName || !cardMap[activeCardName] || !grid.contains(cardMap[activeCardName])) {
      syncActiveCard();
    }
    var activeCard = activeCardName && cardMap[activeCardName];
    return activeCard && activeCard._pkg ? activeCard._pkg : filteredPackages[0];
  }

  function openActivePackage() {
    var pkg = getActivePackage();
    if (!pkg) return;
    window.open(npmUrl(pkg), '_blank', 'noopener');
  }

  function openActiveReadme() {
    var pkg = getActivePackage();
    if (!pkg) return;
    openReadmeModal(pkg);
  }

  function copyActiveInstall() {
    var pkg = getActivePackage();
    if (!pkg) return;
    navigator.clipboard.writeText('pi install npm:' + pkg.name);
    var card = cardMap[pkg.name];
    var button = card && card._refs ? card._refs.copyBtn : null;
    var timerName = '_copyFlashTimer';
    if (!button) return;
    setCopyButtonState(button, true);
    clearTimeout(button[timerName]);
    button[timerName] = setTimeout(function () { setCopyButtonState(button, false); }, 1500);
  }

  function openActivePreview() {
    var pkg = getActivePackage();
    if (!pkg) return;
    if (pkg.video || pkg.image) {
      openModal(pkg, cardMap[pkg.name]);
      return;
    }
    if (pkg.manifestState === 'idle' || pkg.manifestState === 'error') queueManifest(pkg, true);
  }

  function toggleTypeShortcut(type) {
    var pill = document.querySelector('.pkg-pill[data-type="' + type + '"]');
    if (!pill) return;
    pill.click();
  }

  function openMobileFilters() {
    if (!isMobileFiltersMode()) return;
    closeSortMenu();
    clearTimeout(mobileFiltersTimer);
    filterPanelBackdrop.hidden = false;
    filterPanel.classList.add('is-open');
    requestAnimationFrame(function () {
      filterPanelBackdrop.classList.add('is-open');
    });
    filterPanel.setAttribute('aria-hidden', 'false');
    mobileFiltersToggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('mobile-filters-open');
    requestAnimationFrame(function () {
      if (filterPanelClose) filterPanelClose.focus({ preventScroll: true });
    });
  }

  function closeMobileFilters(immediate, keepFocus) {
    closeSortMenu();
    clearTimeout(mobileFiltersTimer);
    filterPanel.classList.remove('is-open');
    filterPanelBackdrop.classList.remove('is-open');
    mobileFiltersToggle.setAttribute('aria-expanded', 'false');
    filterPanel.setAttribute('aria-hidden', isMobileFiltersMode() ? 'true' : 'false');
    document.body.classList.remove('mobile-filters-open');

    if (immediate) {
      filterPanelBackdrop.hidden = true;
      if (!keepFocus && mobileFiltersToggle && isMobileFiltersMode()) mobileFiltersToggle.focus({ preventScroll: true });
      return;
    }

    mobileFiltersTimer = setTimeout(function () {
      if (!filterPanelBackdrop.classList.contains('is-open')) filterPanelBackdrop.hidden = true;
      if (!keepFocus && mobileFiltersToggle && isMobileFiltersMode()) mobileFiltersToggle.focus({ preventScroll: true });
    }, 180);
  }

  function syncMobileFilterUi() {
    var activeCount = activeFilterCount();
    mobileFiltersBadge.hidden = activeCount === 0;
    mobileFiltersBadge.textContent = String(activeCount);
    mobileFiltersToggle.classList.toggle('has-active', activeCount > 0);
    mobileFiltersToggle.setAttribute('aria-label', activeCount ? 'Filters, ' + activeCount + ' active' : 'Filters');

    if (!isMobileFiltersMode()) {
      closeMobileFilters(true);
      filterPanel.setAttribute('aria-hidden', 'false');
    } else if (!filterPanel.classList.contains('is-open')) {
      filterPanel.setAttribute('aria-hidden', 'true');
    }
  }

  function updateFilterControls() {
    var hasSearch = searchInput.value.trim().length > 0;
    var hasTypes = activeTypes.size > 0;
    var hasSort = sortSelect.value !== 'downloads';
    searchClearBtn.hidden = !hasSearch;
    clearFiltersBtn.disabled = !hasSearch && !hasTypes && !hasSort;
    syncSortUi();
    syncMobileFilterUi();
  }

  function resetFilters() {
    searchInput.value = '';
    sortSelect.value = 'downloads';
    activeTypes.clear();
    pills.forEach(function (pill) { pill.classList.remove('active'); });
    updateFilterControls();
    applyFilters();
  }

  function scheduleBackgroundPrefetch() {
    return;
  }

  function updateHero() {
    var typeCounts = {
      extension: 0,
      skill: 0,
      theme: 0,
      prompt: 0
    };

    packages.forEach(function (pkg) {
      unique(pkg.types).forEach(function (type) {
        if (typeCounts[type] !== undefined) typeCounts[type] += 1;
      });
    });

    heroStats.innerHTML = [
      statCard('Packages', formatNumber(packages.length), 'Live npm matches'),
      statCard('Checked', formatNumber(manifestsLoaded), 'Visible manifests checked for previews'),
      statCard('Visible now', formatNumber(Math.min(renderedCount, filteredPackages.length || packages.length)), 'Cards currently on screen'),
      statCard('Extensions', formatNumber(typeCounts.extension), 'Keyword-detected'),
      statCard('Skills', formatNumber(typeCounts.skill), 'Keyword-detected'),
      statCard('Themes', formatNumber(typeCounts.theme), 'Keyword-detected')
    ].join('');

    var ratio = renderedCount ? Math.min(1, manifestsLoaded / renderedCount) : 0;
    statusProgressFill.style.width = (ratio * 100).toFixed(1) + '%';
    statusProgressText.textContent = manifestsLoaded + ' visible package manifests checked';
    statusMeta.textContent = 'Live npm registry data · ' + formatNumber(packages.length) + ' packages loaded';
    statusNote.textContent = 'Preview metadata is fetched only for cards near the viewport. Type filters use npm keywords.';
    sectionDescription.textContent = 'Search results come from the npm registry in real time. Cards stream into the grid, and preview metadata is fetched only when a package nears view.';
  }

  function scheduleHeroRefresh() {
    clearTimeout(refreshHeroTimer);
    refreshHeroTimer = setTimeout(updateHero, 220);
  }

  function statCard(label, value, note) {
    return '<div class="hero-stat">'
      + '<span class="hero-stat-label">' + label + '</span>'
      + '<strong class="hero-stat-value">' + value + '</strong>'
      + '<span class="hero-stat-note">' + note + '</span>'
      + '</div>';
  }

  function renderBadges(container, pkg) {
    container.innerHTML = '';
    var types = pkg.types || [];

    if (!types.length) {
      var generic = document.createElement('span');
      generic.className = 'pkg-badge';
      generic.textContent = 'package';
      container.appendChild(generic);
    } else {
      types.forEach(function (type) {
        var badge = document.createElement('span');
        badge.className = 'pkg-badge';
        badge.dataset.type = type;
        badge.textContent = type;
        container.appendChild(badge);
      });
    }

    if (pkg.flag && pkg.flag.status === 'warn') {
      var flagBadge = document.createElement('span');
      flagBadge.className = 'pkg-badge';
      flagBadge.dataset.type = 'flagged';
      flagBadge.innerHTML = SVG_SHIELD + ' flagged';
      flagBadge.title = 'This package has been flagged upstream. Review the issue before installing.';
      container.appendChild(flagBadge);
    }
  }

  function metaSpan(text) {
    var span = document.createElement('span');
    span.textContent = text;
    return span;
  }

  function mediaMonogram(name) {
    var base = String(name || '').split('/').pop() || 'pi';
    var clean = base.replace(/^pi[-_]?/i, '').replace(/[^a-z0-9]+/ig, ' ').trim();
    var parts = clean ? clean.split(/\s+/).filter(Boolean) : [];
    if (!parts.length) return 'PI';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }

  function mediaPlaceholderType(pkg) {
    return pkg && pkg.types && pkg.types.length ? pkg.types[0] : 'package';
  }

  function mediaPlaceholderNote(pkg, override) {
    if (override) return override;
    if (!pkg) return '';
    if (pkg.manifestState === 'error') return 'Preview unavailable';
    return '';
  }

  function renderMediaPlaceholder(inner, pkg, overrideNote) {
    if (!inner) return;
    inner.innerHTML = '';
    inner.classList.add('is-placeholder');
    inner.classList.remove('is-preview');

    var placeholder = document.createElement('div');
    placeholder.className = 'pkg-media-placeholder';

    var noteText = mediaPlaceholderNote(pkg, overrideNote);
    if (!noteText) placeholder.classList.add('is-quiet');

    var glow = document.createElement('div');
    glow.className = 'pkg-media-placeholder-glow';
    placeholder.appendChild(glow);

    var badge = document.createElement('span');
    badge.className = 'pkg-media-placeholder-pill';
    badge.dataset.type = mediaPlaceholderType(pkg);
    badge.textContent = mediaPlaceholderType(pkg);
    placeholder.appendChild(badge);

    if (noteText) {
      var meta = document.createElement('div');
      meta.className = 'pkg-media-placeholder-meta';
      var note = document.createElement('div');
      note.className = 'pkg-media-placeholder-note';
      note.textContent = noteText;
      meta.appendChild(note);
      placeholder.appendChild(meta);
    }

    var mark = document.createElement('div');
    mark.className = 'pkg-media-placeholder-mark';
    mark.textContent = mediaMonogram(pkg && pkg.name);
    placeholder.appendChild(mark);

    inner.appendChild(placeholder);
  }

  function ensureMediaObserver() {
    if (mediaObserver || !('IntersectionObserver' in window)) return;
    mediaObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        mediaObserver.unobserve(entry.target);
        injectMedia(entry.target, entry.target._pkg);
      });
    }, { rootMargin: '600px 0px' });
  }

  function cardNearViewport(card, margin) {
    if (!card) return false;
    var rect = card.getBoundingClientRect();
    var viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    return rect.bottom >= -margin && rect.top <= viewportHeight + margin;
  }

  function scheduleManifest(card, pkg) {
    if (!card || !pkg || manifestLoaded.has(pkg.name) || manifestLoading.has(pkg.name) || manifestQueued.has(pkg.name)) return;
    if (!cardNearViewport(card, 280)) return;
    queueManifest(pkg, true);
  }

  function scheduleVisibleManifestChecks() {
    clearTimeout(scheduleVisibleManifestChecks._timer);
    scheduleVisibleManifestChecks._timer = setTimeout(function () {
      Object.keys(cardMap).forEach(function (name) {
        var card = cardMap[name];
        if (!card || !card._pkg) return;
        scheduleManifest(card, card._pkg);
      });
    }, 40);
  }

  function scheduleMedia(card, pkg) {
    if (!pkg || (!pkg.video && !pkg.image) || pkg.mediaFailed) return;
    card._pkg = pkg;
    ensureMediaObserver();
    if (mediaObserver) mediaObserver.observe(card);
    else injectMedia(card, pkg);
  }

  function injectMedia(card, pkg) {
    if (!card || !pkg) return;
    var wrap = card.querySelector('.pkg-media-wrap');
    var inner = card.querySelector('.pkg-media-inner');
    if (!wrap || !inner || wrap.classList.contains('loaded') || pkg.mediaFailed) return;

    if (pkg.video) injectVideo(inner, wrap, pkg.video, card);
    else if (pkg.image) injectImage(inner, wrap, pkg.image, card);
  }

  function injectVideo(inner, wrap, url, card) {
    var video = document.createElement('video');
    video.className = 'pkg-media';
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.src = url;
    video.addEventListener('error', function () {
      if (card && card._pkg) card._pkg.mediaFailed = true;
      wrap.classList.remove('loaded');
      renderMediaPlaceholder(inner, card && card._pkg, 'Preview unavailable');
    }, { once: true });
    video.addEventListener('loadedmetadata', function () {
      video.currentTime = 0.1;
    }, { once: true });

    inner.innerHTML = '';
    inner.classList.remove('is-placeholder');
    inner.classList.add('is-preview');
    inner.appendChild(video);
    wrap.classList.add('loaded');

    var expand = document.createElement('div');
    expand.className = 'pkg-media-expand';
    expand.innerHTML = '<svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 8V3h5M17 8V3h-5M3 12v5h5M17 12v5h-5"/></svg>';
    if (!hasDesktop) expand.classList.add('always');
    inner.appendChild(expand);

    if (hasDesktop) {
      card.addEventListener('mouseenter', function () {
        video.play().catch(function () {});
      });
      card.addEventListener('mouseleave', function () {
        video.pause();
        video.currentTime = 0;
      });
    }

    card.addEventListener('click', function (event) {
      if (event.target.closest('.pkg-card-body')) return;
      openModal(card._pkg, card);
    });
  }

  function injectImage(inner, wrap, url, card) {
    var image = document.createElement('img');
    image.className = 'pkg-media';
    image.alt = 'preview';
    image.loading = 'lazy';
    image.src = url;
    image.addEventListener('error', function () {
      if (card && card._pkg) card._pkg.mediaFailed = true;
      wrap.classList.remove('loaded');
      renderMediaPlaceholder(inner, card && card._pkg, 'Preview unavailable');
    }, { once: true });
    image.addEventListener('load', function () {
      wrap.classList.add('loaded');
    }, { once: true });

    inner.innerHTML = '';
    inner.classList.remove('is-placeholder');
    inner.classList.add('is-preview');
    inner.appendChild(image);

    var expand = document.createElement('div');
    expand.className = 'pkg-media-expand';
    expand.innerHTML = '<svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 8V3h5M17 8V3h-5M3 12v5h5M17 12v5h-5"/></svg>';
    if (!hasDesktop) expand.classList.add('always');
    inner.appendChild(expand);

    card.addEventListener('click', function (event) {
      if (event.target.closest('.pkg-card-body')) return;
      openModal(card._pkg, card);
    });
  }

  function createFact() {
    var fact = document.createElement('span');
    fact.className = 'pkg-fact';
    return fact;
  }

  function setCopyButtonState(button, copied) {
    if (!button) return;
    button.classList.toggle('copied', !!copied);
    button.innerHTML = copied ? SVG_CHECK : SVG_COPY;
    button.setAttribute('aria-label', copied ? 'Copied install command' : 'Copy install command');
    button.title = copied ? 'Copied' : 'Copy install command';
  }

  function manifestStateLabel(pkg) {
    if (pkg.video || pkg.image) return 'demo';
    return 'live';
  }

  function createCard(pkg) {
    var card = document.createElement('article');
    card.className = 'pkg-card';
    card.dataset.name = pkg.name;
    card.tabIndex = -1;
    card._pkg = pkg;
    card.addEventListener('focus', function () {
      setActiveCard(card._pkg.name, { focus: false, scroll: false });
    });
    card.addEventListener('pointerdown', function () {
      setActiveCard(card._pkg.name, { focus: false, scroll: false });
    });

    var mediaWrap = document.createElement('div');
    mediaWrap.className = 'pkg-media-wrap';
    var mediaInner = document.createElement('div');
    mediaInner.className = 'pkg-media-inner';
    mediaWrap.appendChild(mediaInner);
    card.appendChild(mediaWrap);

    var body = document.createElement('div');
    body.className = 'pkg-card-body';
    card.appendChild(body);

    var top = document.createElement('div');
    top.className = 'pkg-card-top';
    body.appendChild(top);

    var titleBlock = document.createElement('div');
    titleBlock.className = 'pkg-title-block';
    top.appendChild(titleBlock);

    var nameEl = document.createElement('div');
    nameEl.className = 'pkg-name';
    var nameLink = document.createElement('a');
    nameLink.target = '_blank';
    nameLink.rel = 'noopener';
    nameEl.appendChild(nameLink);
    titleBlock.appendChild(nameEl);

    var subline = document.createElement('div');
    subline.className = 'pkg-subline';
    titleBlock.appendChild(subline);

    var state = document.createElement('span');
    state.className = 'pkg-state';
    top.appendChild(state);

    var desc = document.createElement('div');
    desc.className = 'pkg-desc';
    body.appendChild(desc);

    var facts = document.createElement('div');
    facts.className = 'pkg-facts';
    var authorFact = createFact();
    var downloadsFact = createFact();
    var dateFact = createFact();
    var versionFact = createFact();
    facts.appendChild(authorFact);
    facts.appendChild(downloadsFact);
    facts.appendChild(dateFact);
    facts.appendChild(versionFact);
    body.appendChild(facts);

    var badges = document.createElement('div');
    badges.className = 'pkg-badges';
    body.appendChild(badges);

    var notice = document.createElement('div');
    notice.className = 'pkg-flag-notice';
    notice.style.display = 'none';
    body.appendChild(notice);

    var actions = document.createElement('div');
    actions.className = 'pkg-card-actions';
    body.appendChild(actions);

    var links = document.createElement('div');
    links.className = 'pkg-links';
    actions.appendChild(links);

    var npmLink = document.createElement('a');
    npmLink.className = 'pkg-action-pill pkg-action-pill-npm';
    npmLink.target = '_blank';
    npmLink.rel = 'noopener';
    links.appendChild(npmLink);

    var repoLink = document.createElement('a');
    repoLink.className = 'pkg-action-pill pkg-action-pill-repo';
    repoLink.target = '_blank';
    repoLink.rel = 'noopener';
    links.appendChild(repoLink);

    var readmeBtn = document.createElement('button');
    readmeBtn.type = 'button';
    readmeBtn.className = 'pkg-readme-link pkg-action-pill pkg-action-pill-readme';
    readmeBtn.innerHTML = SVG_README + ' readme';
    readmeBtn.addEventListener('click', function () {
      openReadmeModal(card._pkg || pkg);
    });
    links.appendChild(readmeBtn);

    var reportLink = document.createElement('a');
    reportLink.className = 'pkg-action-pill pkg-action-pill-report';
    reportLink.target = '_blank';
    reportLink.rel = 'noopener';
    links.appendChild(reportLink);

    var flagLink = document.createElement('a');
    flagLink.className = 'pkg-action-pill pkg-action-pill-flag';
    flagLink.target = '_blank';
    flagLink.rel = 'noopener';
    links.appendChild(flagLink);

    var install = document.createElement('div');
    install.className = 'pkg-install';
    var installCode = document.createElement('code');
    var prefix = document.createElement('span');
    prefix.className = 'prefix';
    prefix.textContent = '$';
    installCode.appendChild(prefix);
    installCode.appendChild(document.createTextNode(' pi install npm:' + pkg.name));
    install.appendChild(installCode);
    var copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'copy-btn';
    setCopyButtonState(copyBtn, false);
    var copyTimer;
    copyBtn.addEventListener('click', function () {
      navigator.clipboard.writeText('pi install npm:' + (card._pkg || pkg).name);
      setCopyButtonState(copyBtn, true);
      clearTimeout(copyTimer);
      copyTimer = setTimeout(function () { setCopyButtonState(copyBtn, false); }, 1500);
    });
    install.appendChild(copyBtn);
    actions.appendChild(install);

    card._refs = {
      nameLink: nameLink,
      subline: subline,
      state: state,
      desc: desc,
      authorFact: authorFact,
      downloadsFact: downloadsFact,
      dateFact: dateFact,
      versionFact: versionFact,
      badges: badges,
      notice: notice,
      npmLink: npmLink,
      repoLink: repoLink,
      reportLink: reportLink,
      flagLink: flagLink,
      readmeBtn: readmeBtn,
      copyBtn: copyBtn,
      installCode: installCode,
      mediaWrap: mediaWrap,
      mediaInner: mediaInner
    };

    updateCard(card, pkg);
    return card;
  }

  function updateCard(card, pkg) {
    if (!card || !pkg || !card._refs) return;
    card._pkg = pkg;

    var refs = card._refs;
    refs.nameLink.textContent = pkg.name;
    refs.nameLink.href = npmUrl(pkg);
    refs.subline.textContent = pkg.links && pkg.links.repository ? 'repo linked' : 'npm search result';
    refs.state.textContent = manifestStateLabel(pkg);
    refs.state.dataset.state = pkg.video || pkg.image ? 'demo' : 'idle';

    refs.desc.textContent = pkg.description || 'No description';

    refs.authorFact.textContent = authorName(pkg);
    refs.downloadsFact.textContent = formatNumber(pkg.downloads) + '/mo';
    refs.dateFact.textContent = relativeDate(pkg.date);
    refs.versionFact.textContent = 'v' + (pkg.version || '0.0.0');

    renderBadges(refs.badges, pkg);

    if (pkg.flag && pkg.flag.status === 'warn') {
      refs.notice.style.display = '';
      refs.notice.textContent = 'Flagged upstream — inspect the linked report before installing.';
    } else {
      refs.notice.style.display = 'none';
    }

    refs.npmLink.href = npmUrl(pkg);
    refs.npmLink.innerHTML = SVG_NPM + ' npm';

    if (pkg.links && pkg.links.repository) {
      refs.repoLink.style.display = '';
      refs.repoLink.href = pkg.links.repository;
      refs.repoLink.innerHTML = SVG_GH + ' repo';
    } else {
      refs.repoLink.style.display = 'none';
    }

    refs.reportLink.href = 'https://github.com/badlogic/pi-mono/issues/new?labels=package-report&title='
      + encodeURIComponent('Package Report: ' + pkg.name)
      + '&body='
      + encodeURIComponent('Package: ' + pkg.name + '\nVersion: ' + pkg.version + '\n\nDescribe your concern:\n');
    refs.reportLink.innerHTML = SVG_FLAG + ' report';

    if (pkg.flag && pkg.flag.url) {
      refs.flagLink.style.display = '';
      refs.flagLink.href = pkg.flag.url;
      refs.flagLink.innerHTML = SVG_SHIELD + ' flag';
    } else {
      refs.flagLink.style.display = 'none';
    }

    refs.installCode.innerHTML = '<span class="prefix">$</span> pi install npm:' + pkg.name;

    if ((pkg.video || pkg.image) && !pkg.mediaFailed && !refs.mediaWrap.classList.contains('loaded')) {
      scheduleMedia(card, pkg);
    } else if (!refs.mediaWrap.classList.contains('loaded')) {
      renderMediaPlaceholder(refs.mediaInner, pkg);
    }
  }

  function queueManifest(pkg, priority) {
    if (!pkg || manifestLoaded.has(pkg.name) || manifestLoading.has(pkg.name) || manifestQueued.has(pkg.name)) return;
    manifestQueued.add(pkg.name);
    pkg.manifestState = 'queued';
    if (priority) manifestQueue.unshift(pkg);
    else manifestQueue.push(pkg);
    processManifestQueue();
  }

  function startManifestFetch(pkg) {
    manifestLoading.add(pkg.name);
    pkg.manifestState = 'loading';

    fetchJson(MANIFEST_API + encodeURIComponent(pkg.name) + '/latest')
      .then(function (manifest) {
        applyManifest(manifest.name || pkg.name, manifest);
      })
      .catch(function () {
        var failedPkg = packageMap.get(pkg.name);
        if (failedPkg) {
          failedPkg.manifestState = 'error';
          if (cardMap[failedPkg.name]) updateCard(cardMap[failedPkg.name], failedPkg);
        }
      })
      .finally(function () {
        manifestLoading.delete(pkg.name);
        manifestLoaded.add(pkg.name);
        manifestsLoaded += 1;
        scheduleHeroRefresh();
        processManifestQueue();
      });
  }

  function processManifestQueue() {
    if (manifestPumpScheduled) return;
    manifestPumpScheduled = true;

    setTimeout(function () {
      manifestPumpScheduled = false;

      while (manifestLoading.size < MANIFEST_CONCURRENCY && manifestQueue.length) {
        var pkg = manifestQueue.shift();
        if (!pkg) continue;
        manifestQueued.delete(pkg.name);
        if (manifestLoaded.has(pkg.name) || manifestLoading.has(pkg.name)) continue;
        startManifestFetch(pkg);
      }
    }, 0);
  }

  function applyManifest(name, manifest) {
    var pkg = packageMap.get(name);
    if (!pkg || !manifest) return;

    var pi = manifest.pi || null;
    pkg.video = videoFromManifest(pi) || pkg.video;
    pkg.image = imageFromManifest(pi) || pkg.image;
    pkg.manifestState = 'ready';

    var card = cardMap[pkg.name];
    if (card) updateCard(card, pkg);
  }

  function scheduleFilterRefresh() {
    clearTimeout(refreshFiltersTimer);
    refreshFiltersTimer = setTimeout(function () {
      applyFilters();
    }, 150);
  }

  function clearAllFilters() {
    searchInput.value = '';
    activeTypes.forEach(function (type) {
      var pill = document.querySelector('.pkg-pill[data-type="' + type + '"]');
      if (pill) pill.classList.remove('active');
    });
    activeTypes.clear();
    updateFilterControls();
  }

  function ensureLoadMoreObserver() {
    if (loadMoreObserver || !('IntersectionObserver' in window)) return;
    loadMoreObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        renderNextBatch();
      });
    }, { rootMargin: '900px 0px' });
  }

  function syncLoadMoreObserver() {
    if (!scrollSentinel) return;
    ensureLoadMoreObserver();
    if (!loadMoreObserver) return;
    loadMoreObserver.unobserve(scrollSentinel);
    if (renderedCount < filteredPackages.length) loadMoreObserver.observe(scrollSentinel);
  }

  function getFilteredPackages() {
    var query = searchInput.value.toLowerCase().trim();
    var typeFilters = new Set(activeTypes);

    var sorted = packages.slice();
    var sortVal = sortSelect.value;
    if (sortVal === 'downloads') {
      sorted.sort(function (a, b) { return (b.downloads || 0) - (a.downloads || 0); });
    } else if (sortVal === 'recent') {
      sorted.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
    } else {
      sorted.sort(function (a, b) { return a.name.localeCompare(b.name); });
    }

    return sorted.filter(function (pkg) {
      if (query) {
        var inName = pkg.name.toLowerCase().indexOf(query) !== -1;
        var inDesc = (pkg.description || '').toLowerCase().indexOf(query) !== -1;
        var inAuthor = authorName(pkg).toLowerCase().indexOf(query) !== -1;
        if (!inName && !inDesc && !inAuthor) return false;
      }

      if (typeFilters.size > 0) {
        var matches = (pkg.types || []).some(function (type) { return typeFilters.has(type); });
        if (!matches) return false;
      }

      return true;
    });
  }

  function toggleEmptyState(show) {
    var emptyEl = grid.querySelector('.pkg-empty');
    if (!show) {
      if (emptyEl) emptyEl.remove();
      return;
    }
    if (!emptyEl) {
      emptyEl = document.createElement('div');
      emptyEl.className = 'pkg-empty';
      emptyEl.textContent = 'No packages match your filters.';
      grid.appendChild(emptyEl);
    }
  }

  function getOrCreateCard(pkg) {
    if (!cardMap[pkg.name]) cardMap[pkg.name] = createCard(pkg);
    return cardMap[pkg.name];
  }

  function updateResultsSummary() {
    var matching = filteredPackages.length;
    if (!matching) {
      countEl.textContent = '0 shown · 0 matches';
      resultsFooter.style.display = 'none';
      if (loadMoreObserver) loadMoreObserver.unobserve(scrollSentinel);
      scheduleHeroRefresh();
      return;
    }

    countEl.textContent = formatNumber(renderedCount) + ' shown · ' + formatNumber(matching) + ' matches';
    resultsFooter.style.display = '';
    resultsSummary.textContent = renderedCount < matching
      ? 'Showing ' + renderedCount + ' cards now. Scroll or tap load more to continue browsing ' + matching + ' matches.'
      : 'Showing all ' + matching + ' matching packages.';
    loadMoreBtn.style.display = renderedCount < matching ? '' : 'none';
    syncLoadMoreObserver();
  }

  function renderNextBatch(reset) {
    if (reset) {
      grid.innerHTML = '';
      renderedCount = 0;
    }

    toggleEmptyState(false);

    if (!filteredPackages.length) {
      grid.innerHTML = '';
      renderedCount = 0;
      clearActiveCard();
      toggleEmptyState(true);
      updateResultsSummary();
      return;
    }

    var nextCount = Math.min(filteredPackages.length, renderedCount + BATCH_SIZE);
    var fragment = document.createDocumentFragment();

    for (var i = renderedCount; i < nextCount; i++) {
      var pkg = filteredPackages[i];
      fragment.appendChild(getOrCreateCard(pkg));
    }

    grid.appendChild(fragment);
    renderedCount = nextCount;
    syncActiveCard();
    updateResultsSummary();
    scheduleHeroRefresh();
    scheduleVisibleManifestChecks();
  }

  function applyFilters() {
    updateFilterControls();
    filteredPackages = getFilteredPackages();
    renderNextBatch(true);
  }

  function ensureRenderedThroughIndex(index) {
    while (renderedCount <= index && renderedCount < filteredPackages.length) {
      renderNextBatch();
    }
  }

  function scrollToCard(name) {
    var index = filteredPackages.findIndex(function (pkg) { return pkg.name === name; });
    if (index === -1) {
      clearAllFilters();
      applyFilters();
      index = filteredPackages.findIndex(function (pkg) { return pkg.name === name; });
    }
    if (index === -1) return;

    ensureRenderedThroughIndex(index);
    var card = cardMap[name];
    if (!card) return;

    setActiveCard(name, { focus: false, scroll: false });
    requestAnimationFrame(function () {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('pkg-highlight');
      setTimeout(function () { card.classList.remove('pkg-highlight'); }, 1500);
    });
  }

  function showSkeletons() {
    grid.innerHTML = '';
    resultsFooter.style.display = 'none';
    for (var i = 0; i < 8; i++) {
      var skeleton = document.createElement('div');
      skeleton.className = 'pkg-skeleton';
      grid.appendChild(skeleton);
    }
  }

  function renderCards() {
    grid.innerHTML = '';
    cardMap = {};
    filteredPackages = [];
    renderedCount = 0;
    backgroundPrefetchIndex = 0;
    applyFilters();
    renderRecent();
    renderAuthors();
  }

  function renderRecent() {
    recentScroll.innerHTML = '';
    if (!packages.length) {
      recentSection.style.display = 'none';
      return;
    }

    packages
      .filter(function (pkg) { return !pkg.flag || pkg.flag.status !== 'warn'; })
      .slice()
      .sort(function (a, b) { return new Date(b.date) - new Date(a.date); })
      .slice(0, 8)
      .forEach(function (pkg) {
        var card = document.createElement('button');
        card.type = 'button';
        card.className = 'pkg-recent-card';

        var name = document.createElement('div');
        name.className = 'pkg-recent-name';
        name.textContent = pkg.name;
        card.appendChild(name);

        var desc = document.createElement('div');
        desc.className = 'pkg-recent-desc';
        desc.textContent = pkg.description || 'No description';
        card.appendChild(desc);

        var footer = document.createElement('div');
        footer.className = 'pkg-recent-footer';
        var date = document.createElement('span');
        date.className = 'pkg-recent-date';
        date.textContent = relativeDate(pkg.date);
        footer.appendChild(date);
        if (pkg.types && pkg.types.length) {
          var badge = document.createElement('span');
          badge.className = 'pkg-badge';
          badge.dataset.type = pkg.types[0];
          badge.textContent = pkg.types[0];
          footer.appendChild(badge);
        }
        card.appendChild(footer);
        card.addEventListener('click', function () { scrollToCard(pkg.name); });
        recentScroll.appendChild(card);
      });

    recentSection.style.display = '';
    recentScroll.scrollLeft = 0;
    updateRecentArrows();
  }

  function updateRecentArrows() {
    var sl = recentScroll.scrollLeft;
    var max = recentScroll.scrollWidth - recentScroll.clientWidth;
    recentPrev.classList.toggle('visible', sl > 1);
    recentNext.classList.toggle('visible', sl < max - 1);
    recentTrack.classList.toggle('fade-left', sl > 1);
    recentTrack.classList.toggle('fade-right', sl < max - 1);
  }

  function loadAvatar(avatar, urls) {
    if (!urls.length) return;
    var image = document.createElement('img');
    image.alt = '';
    image.addEventListener('load', function () {
      avatar.textContent = '';
      avatar.style.backgroundColor = 'transparent';
      avatar.appendChild(image);
    });
    image.addEventListener('error', function () {
      loadAvatar(avatar, urls.slice(1));
    });
    image.src = urls[0];
  }

  function renderAuthors() {
    authorGrid.innerHTML = '';
    if (!packages.length) {
      authorsSection.style.display = 'none';
      return;
    }

    var groups = {};
    var emails = {};
    packages.forEach(function (pkg) {
      var name = authorName(pkg);
      groups[name] = (groups[name] || 0) + 1;
      if (!emails[name] && authorEmail(pkg)) emails[name] = authorEmail(pkg).toLowerCase().trim();
    });

    Object.keys(groups)
      .map(function (name) { return { name: name, count: groups[name] }; })
      .sort(function (a, b) { return b.count - a.count; })
      .slice(0, 24)
      .forEach(function (author) {
        var card = document.createElement('button');
        card.type = 'button';
        card.className = 'pkg-author-card';

        var avatar = document.createElement('div');
        avatar.className = 'pkg-author-avatar';
        avatar.style.backgroundColor = hashColor(author.name);
        avatar.textContent = author.name.charAt(0).toUpperCase();
        var urls = [];
        if (emails[author.name]) urls.push('https://www.gravatar.com/avatar/' + md5(emails[author.name]) + '?s=72&d=404');
        urls.push('https://github.com/' + encodeURIComponent(author.name) + '.png?size=72');
        loadAvatar(avatar, urls);
        card.appendChild(avatar);

        var info = document.createElement('div');
        info.className = 'pkg-author-info';
        var nameEl = document.createElement('div');
        nameEl.className = 'pkg-author-name';
        nameEl.textContent = author.name;
        info.appendChild(nameEl);
        var count = document.createElement('div');
        count.className = 'pkg-author-count';
        count.textContent = author.count + (author.count === 1 ? ' package' : ' packages');
        info.appendChild(count);
        card.appendChild(info);

        card.addEventListener('click', function () {
          searchInput.value = author.name;
          applyFilters();
          document.querySelector('.pkg-filters').scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        authorGrid.appendChild(card);
      });

    authorsSection.style.display = '';
  }

  function openModal(pkg, card) {
    if (!pkg) return;
    modalPkgName = pkg.name;
    modalOrigin = card ? card.querySelector('.pkg-name a') : document.activeElement;
    clearTimeout(modalCopyTimer);
    setCopyButtonState(modalCopyBtn, false);
    modalVideo.pause();

    if (pkg.video) {
      modalVideo.style.display = '';
      modalImg.style.display = 'none';
      modalVideo.src = pkg.video;
      modalVideo.muted = false;
      modalVideo.loop = false;
      modalVideo.play().catch(function () {});
      modalEl.setAttribute('aria-label', 'Video demo for ' + pkg.name);
    } else if (pkg.image) {
      modalVideo.style.display = 'none';
      modalImg.style.display = 'block';
      modalImg.src = pkg.image;
      modalEl.setAttribute('aria-label', 'Image preview for ' + pkg.name);
    }

    modalName.textContent = pkg.name;
    modalName.href = npmUrl(pkg);
    modalDesc.textContent = pkg.description || '';
    modalCode.textContent = 'pi install npm:' + pkg.name;
    modalEl.classList.add('open');
    document.documentElement.style.overflow = 'hidden';
    modalClose.focus();
  }

  function closeModal() {
    modalEl.classList.remove('open');
    modalVideo.pause();
    modalVideo.removeAttribute('src');
    modalVideo.load();
    modalImg.style.display = 'none';
    modalImg.src = '';
    document.documentElement.style.overflow = '';
    if (modalOrigin) {
      modalOrigin.focus();
      modalOrigin = null;
    }
  }

  function loadLibs() {
    if (libsReady) return libsReady;
    libsReady = new Promise(function (resolve, reject) {
      var markedScript = document.createElement('script');
      markedScript.src = 'https://cdn.jsdelivr.net/npm/marked@14.1.2/marked.min.js';
      var purifyScript = document.createElement('script');
      purifyScript.src = 'https://cdn.jsdelivr.net/npm/dompurify@3.2.6/dist/purify.min.js';
      var loaded = 0;

      function done() {
        loaded += 1;
        if (loaded !== 2) return;
        DOMPurify.addHook('afterSanitizeAttributes', function (node) {
          if (node.tagName === 'A') {
            node.setAttribute('target', '_blank');
            node.setAttribute('rel', 'noopener');
          }
        });
        resolve();
      }

      markedScript.onload = done;
      purifyScript.onload = done;
      markedScript.onerror = function () { libsReady = null; reject(new Error('Failed to load marked')); };
      purifyScript.onerror = function () { libsReady = null; reject(new Error('Failed to load DOMPurify')); };
      document.head.appendChild(markedScript);
      document.head.appendChild(purifyScript);
    });
    return libsReady;
  }

  function fetchReadme(pkg) {
    var filenames = ['README.md', 'readme.md', 'README.MD', 'Readme.md'];
    var index = 0;

    function next() {
      if (index >= filenames.length) return Promise.resolve(null);
      var filename = filenames[index++];
      var base = 'https://cdn.jsdelivr.net/npm/' + encodeURIComponent(pkg.name) + '@' + pkg.version + '/';
      var url = base + filename;
      return fetch(url).then(function (response) {
        if (response.ok) {
          return response.text().then(function (text) {
            return { text: text, base: base };
          });
        }
        if (response.status === 404) return next();
        return null;
      }).catch(function () {
        return next();
      });
    }

    return next();
  }

  function showReadmeError(message, pkg) {
    var div = document.createElement('div');
    div.className = 'pkg-readme-error';
    div.appendChild(document.createTextNode(message + ' '));
    var link = document.createElement('a');
    link.href = npmUrl(pkg);
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'View on npm';
    div.appendChild(link);
    readmeBody.innerHTML = '';
    readmeBody.appendChild(div);
  }

  function openReadmeModal(pkg) {
    readmeLoadingFor = pkg.name;
    readmeOrigin = document.activeElement;
    readmeName.textContent = pkg.name;
    readmeName.href = npmUrl(pkg);
    readmeVersion.textContent = 'v' + pkg.version;
    readmeBody.innerHTML = '<div class="pkg-readme-loading"><div></div><div></div><div></div></div>';
    readmeEl.classList.add('open');
    document.documentElement.style.overflow = 'hidden';
    readmeClose.focus();

    Promise.all([loadLibs(), fetchReadme(pkg)])
      .then(function (results) {
        if (readmeLoadingFor !== pkg.name) return;
        var readme = results[1];
        if (!readme || !readme.text) {
          showReadmeError('README not available.', pkg);
          return;
        }

        var html = DOMPurify.sanitize(marked.parse(readme.text));
        readmeBody.innerHTML = html;

        readmeBody.querySelectorAll('img[src]').forEach(function (image) {
          var src = image.getAttribute('src');
          if (src && !/^https?:\/\/|^\/\/|^data:/.test(src)) image.src = readme.base + src.replace(/^\.\//, '');
        });

        readmeBody.querySelectorAll('a[href]').forEach(function (link) {
          var href = link.getAttribute('href');
          if (href && !/^https?:\/\/|^\/\/|^#|^mailto:/.test(href)) link.href = readme.base + href.replace(/^\.\//, '');
        });
      })
      .catch(function () {
        if (readmeLoadingFor !== pkg.name) return;
        showReadmeError('Failed to load README.', pkg);
      });
  }

  function closeReadmeModal() {
    readmeLoadingFor = '';
    readmeEl.classList.remove('open');
    document.documentElement.style.overflow = '';
    if (readmeOrigin) {
      readmeOrigin.focus();
      readmeOrigin = null;
    }
  }

  function hydrateLiveData(flags, generation) {
    return fetchSearchResults().then(function (objects) {
      if (generation !== fetchGeneration) return;
      packages = processSearchResults(objects, flags);
      packageMap = new Map(packages.map(function (pkg) { return [pkg.name, pkg]; }));
      updateHero();
      renderCards();
    });
  }

  function init() {
    fetchGeneration += 1;
    var generation = fetchGeneration;

    packages = [];
    filteredPackages = [];
    packageMap = new Map();
    cardMap = {};
    renderedCount = 0;
    activeCardName = '';
    manifestsLoaded = 0;
    manifestQueue = [];
    manifestQueued.clear();
    manifestLoading.clear();
    manifestLoaded.clear();
    backgroundPrefetchIndex = 0;
    clearTimeout(backgroundPrefetchTimer);
    errorEl.style.display = 'none';
    recentSection.style.display = 'none';
    authorsSection.style.display = 'none';
    statusMeta.textContent = 'Fetching live npm data…';
    statusNote.textContent = 'Loading npm search results first. Preview metadata is fetched only for visible cards.';
    statusProgressFill.style.width = '0%';
    statusProgressText.textContent = 'Waiting for visible packages…';
    sectionDescription.textContent = 'Loading package metadata directly from the npm registry…';
    updateFilterControls();
    showSkeletons();

    fetchFlags()
      .then(function (flags) {
        return hydrateLiveData(flags, generation);
      })
      .catch(function () {
        if (generation !== fetchGeneration) return;
        grid.innerHTML = '';
        resultsFooter.style.display = 'none';
        errorEl.style.display = '';
        statusMeta.textContent = 'Failed to fetch live npm data';
      });
  }

  var searchTimer;
  searchInput.addEventListener('input', function () {
    updateFilterControls();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(applyFilters, 150);
  });

  searchClearBtn.addEventListener('click', function () {
    searchInput.value = '';
    searchInput.focus();
    updateFilterControls();
    applyFilters();
  });

  clearFiltersBtn.addEventListener('click', function () {
    resetFilters();
  });

  sortTrigger.addEventListener('click', function (event) {
    event.stopPropagation();
    if (sortMenu.classList.contains('open')) closeSortMenu();
    else openSortMenu();
  });

  sortOptions.forEach(function (option) {
    option.addEventListener('click', function () {
      if (sortSelect.value === option.dataset.value) {
        closeSortMenu();
        return;
      }
      sortSelect.value = option.dataset.value;
      updateFilterControls();
      closeSortMenu();
      applyFilters();
    });
  });

  mobileFiltersToggle.addEventListener('click', function () {
    if (filterPanel.classList.contains('is-open')) closeMobileFilters();
    else openMobileFilters();
  });

  filterPanelClose.addEventListener('click', function () {
    closeMobileFilters();
  });

  filterPanelBackdrop.addEventListener('click', function () {
    closeMobileFilters();
  });

  if (mobileFiltersMq.addEventListener) {
    mobileFiltersMq.addEventListener('change', syncMobileFilterUi);
  } else if (mobileFiltersMq.addListener) {
    mobileFiltersMq.addListener(syncMobileFilterUi);
  }

  sortSelect.addEventListener('change', function () {
    updateFilterControls();
    closeSortMenu();
    applyFilters();
  });

  pills.forEach(function (pill) {
    pill.addEventListener('click', function () {
      var type = pill.dataset.type;
      if (activeTypes.has(type)) {
        activeTypes.delete(type);
        pill.classList.remove('active');
      } else {
        activeTypes.add(type);
        pill.classList.add('active');
      }
      applyFilters();
    });
  });

  retryBtn.addEventListener('click', init);
  loadMoreBtn.addEventListener('click', function () {
    renderNextBatch();
  });

  recentScroll.addEventListener('scroll', function () {
    clearTimeout(recentScroll._arrowTimer);
    recentScroll._arrowTimer = setTimeout(updateRecentArrows, 40);
  });

  recentPrev.addEventListener('click', function () {
    recentScroll.scrollBy({ left: -recentScroll.clientWidth, behavior: 'smooth' });
  });

  recentNext.addEventListener('click', function () {
    recentScroll.scrollBy({ left: recentScroll.clientWidth, behavior: 'smooth' });
  });

  modalEl.addEventListener('click', function (event) {
    if (event.target === modalEl) closeModal();
  });
  modalClose.addEventListener('click', closeModal);
  modalCopyBtn.addEventListener('click', function () {
    navigator.clipboard.writeText('pi install npm:' + modalPkgName);
    setCopyButtonState(modalCopyBtn, true);
    clearTimeout(modalCopyTimer);
    modalCopyTimer = setTimeout(function () { setCopyButtonState(modalCopyBtn, false); }, 1500);
  });

  readmeEl.addEventListener('click', function (event) {
    if (event.target === readmeEl) closeReadmeModal();
  });
  readmeClose.addEventListener('click', closeReadmeModal);

  shortcutsEl.addEventListener('click', function (event) {
    if (event.target === shortcutsEl) closeShortcuts();
  });
  shortcutsClose.addEventListener('click', closeShortcuts);

  window.addEventListener('scroll', scheduleVisibleManifestChecks, { passive: true });
  window.addEventListener('resize', scheduleVisibleManifestChecks);

  document.addEventListener('click', function (event) {
    if (shortcutsEl.classList.contains('open')) return;
    if (sortMenu.classList.contains('open') && !sortMenu.contains(event.target)) closeSortMenu();
    if (isMobileFiltersMode() && filterPanel.classList.contains('is-open') && !filtersSection.contains(event.target)) closeMobileFilters();
  });

  document.addEventListener('keydown', function (event) {
    var typing = isTypingTarget(event.target);
    var key = event.key;
    var lower = key && key.length === 1 ? key.toLowerCase() : key;

    if ((key === '?' || (key === '/' && event.shiftKey)) && !event.metaKey && !event.ctrlKey && !event.altKey) {
      if (!typing) {
        event.preventDefault();
        if (shortcutsEl.classList.contains('open')) closeShortcuts();
        else openShortcuts();
      }
      return;
    }

    if (key === '/' && !event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey) {
      if (!typing) {
        event.preventDefault();
        searchInput.focus();
        searchInput.select();
        closeShortcuts();
        closeSortMenu();
        closeMobileFilters();
      }
      return;
    }

    if (key === 'Escape') {
      if (shortcutsEl.classList.contains('open')) closeShortcuts();
      else if (modalEl.classList.contains('open')) closeModal();
      else if (readmeEl.classList.contains('open')) closeReadmeModal();
      else if (sortMenu.classList.contains('open')) closeSortMenu();
      else if (filterPanel.classList.contains('is-open')) closeMobileFilters();
      else if (document.activeElement === searchInput && searchInput.value) {
        searchInput.value = '';
        updateFilterControls();
        applyFilters();
      }
      return;
    }

    if (shortcutsEl.classList.contains('open') || modalEl.classList.contains('open') || readmeEl.classList.contains('open')) return;
    if (typing || event.metaKey || event.ctrlKey || event.altKey) return;

    if (key === 'Enter') {
      event.preventDefault();
      openActivePackage();
      return;
    }

    if (key === '1') {
      event.preventDefault();
      toggleTypeShortcut('extension');
      return;
    }

    if (key === '2') {
      event.preventDefault();
      toggleTypeShortcut('skill');
      return;
    }

    if (key === '3') {
      event.preventDefault();
      toggleTypeShortcut('theme');
      return;
    }

    if (key === '4') {
      event.preventDefault();
      toggleTypeShortcut('prompt');
      return;
    }

    if (key === '0') {
      event.preventDefault();
      resetFilters();
      return;
    }

    if (lower === 'f') {
      event.preventDefault();
      if (isMobileFiltersMode()) {
        if (filterPanel.classList.contains('is-open')) closeMobileFilters();
        else openMobileFilters();
      } else {
        filtersSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        searchInput.focus();
      }
      return;
    }

    if (lower === 's') {
      event.preventDefault();
      if (isMobileFiltersMode() && !filterPanel.classList.contains('is-open')) openMobileFilters();
      if (sortMenu.classList.contains('open')) closeSortMenu();
      else openSortMenu();
      return;
    }

    if (lower === 'j') {
      event.preventDefault();
      stepActiveCard(1);
      return;
    }

    if (lower === 'k') {
      event.preventDefault();
      stepActiveCard(-1);
      return;
    }

    if (lower === 'r') {
      event.preventDefault();
      openActiveReadme();
      return;
    }

    if (lower === 'c') {
      event.preventDefault();
      copyActiveInstall();
      return;
    }

    if (lower === 'v') {
      event.preventDefault();
      openActivePreview();
    }
  });

  setCopyButtonState(modalCopyBtn, false);
  init();
})();
