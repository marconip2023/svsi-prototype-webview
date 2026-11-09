(function () {
  'use strict';

  const DATA = window.PROTOTYPE_DATA;
  if (!DATA || !DATA.projects) {
    document.body.innerHTML = '<p style="padding:24px;color:#f87171">Missing data.js</p>';
    return;
  }

  const state = {
    projectId: DATA.projects[0].id,
    roleId: null,
    screenIndex: 0,
    showHotspots: false,
    history: [],
  };

  const el = {
    landing: document.getElementById('view-landing'),
    viewer: document.getElementById('view-viewer'),
    tabs: document.getElementById('project-tabs'),
    panels: document.getElementById('role-panels'),
    crumb: document.getElementById('crumb'),
    thumbs: document.getElementById('thumbs'),
    canvas: document.getElementById('canvas'),
    statusLeft: document.getElementById('status-left'),
    statusRight: document.getElementById('status-right'),
    btnBack: document.getElementById('btn-back'),
    btnPrev: document.getElementById('btn-prev'),
    btnNext: document.getElementById('btn-next'),
    btnHotspots: document.getElementById('btn-hotspots'),
    btnRoles: document.getElementById('btn-roles'),
    btnSidebar: document.getElementById('btn-sidebar'),
    sidebar: document.getElementById('sidebar'),
  };

  function project() {
    return DATA.projects.find((p) => p.id === state.projectId) || DATA.projects[0];
  }
  function role() {
    const p = project();
    return (p.roles || []).find((r) => r.id === state.roleId) || null;
  }
  function screen() {
    const r = role();
    if (!r) return null;
    return r.screens[state.screenIndex] || null;
  }

  function titleCase(s) {
    return String(s || '')
      .split(/\s+/)
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join(' ');
  }

  function parseHash() {
    // #/project/role/screenIndex
    const raw = (location.hash || '').replace(/^#\/?/, '');
    if (!raw) return null;
    const parts = raw.split('/');
    if (parts.length < 1) return null;
    const projectId = parts[0];
    const p = DATA.projects.find((x) => x.id === projectId);
    if (!p) return null;
    if (parts.length === 1) return { projectId, roleId: null, screenIndex: 0 };
    const roleId = parts[1];
    const r = p.roles.find((x) => x.id === roleId);
    if (!r) return { projectId, roleId: null, screenIndex: 0 };
    let idx = parseInt(parts[2] || '0', 10);
    if (Number.isNaN(idx) || idx < 0) idx = 0;
    if (idx >= r.screens.length) idx = r.screens.length - 1;
    return { projectId, roleId, screenIndex: idx };
  }

  function setHash(replace) {
    let h = '#/' + state.projectId;
    if (state.roleId != null) {
      h += '/' + state.roleId + '/' + state.screenIndex;
    }
    if (replace) history.replaceState(null, '', h);
    else if (location.hash !== h) history.pushState(null, '', h);
    else history.replaceState(null, '', h);
  }

  function renderTabs() {
    el.tabs.innerHTML = '';
    DATA.projects.forEach((p) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = p.name;
      b.className = p.id === state.projectId ? 'active' : '';
      b.addEventListener('click', () => {
        state.projectId = p.id;
        state.roleId = null;
        state.history = [];
        setHash(false);
        render();
      });
      el.tabs.appendChild(b);
    });
  }

  function renderLanding() {
    el.landing.classList.add('active');
    el.viewer.classList.remove('active');
    const p = project();
    el.panels.innerHTML = '';
    const panel = document.createElement('div');
    panel.className = 'project-panel active';
    panel.innerHTML =
      '<div class="hero">' +
      '<h1>' +
      escapeHtml(p.name) +
      ' Prototype</h1>' +
      '<p>' +
      escapeHtml(p.description || 'Click a role to explore the interactive prototype.') +
      '</p></div>';
    const grid = document.createElement('div');
    grid.className = 'role-grid';
    p.roles.forEach((r) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'role-card';
      card.innerHTML =
        '<h2 class="role-name">' +
        escapeHtml(titleCase(r.name)) +
        '</h2>' +
        '<p class="role-desc">' +
        escapeHtml(r.description || '') +
        '</p>' +
        '<div class="role-meta"><span class="badge">' +
        r.screens.length +
        ' Screens</span><span>Open Flow →</span></div>';
      card.addEventListener('click', () => openRole(r.id, 0, true));
      grid.appendChild(card);
    });
    panel.appendChild(grid);
    el.panels.appendChild(panel);
  }

  function openRole(roleId, index, pushHist) {
    state.roleId = roleId;
    state.screenIndex = index || 0;
    state.history = [];
    setHash(false);
    render();
  }

  function goTo(roleId, index, fromHotspot) {
    if (fromHotspot) {
      state.history.push({ roleId: state.roleId, screenIndex: state.screenIndex });
    }
    state.roleId = roleId;
    state.screenIndex = index;
    setHash(false);
    renderViewer();
  }

  function goBackHistory() {
    if (state.history.length) {
      const prev = state.history.pop();
      state.roleId = prev.roleId;
      state.screenIndex = prev.screenIndex;
      setHash(false);
      renderViewer();
      return;
    }
    // back to landing
    state.roleId = null;
    setHash(false);
    render();
  }

  function renderViewer() {
    el.landing.classList.remove('active');
    el.viewer.classList.add('active');
    const p = project();
    const r = role();
    const s = screen();
    if (!r || !s) {
      state.roleId = null;
      renderLanding();
      return;
    }

    el.crumb.innerHTML =
      '<a id="crumb-home">' +
      escapeHtml(p.name) +
      '</a><span>/</span><a id="crumb-role">' +
      escapeHtml(titleCase(r.name)) +
      '</a><span>/</span><strong>' +
      escapeHtml(shortTitle(s.title)) +
      '</strong>';
    document.getElementById('crumb-home').onclick = () => {
      state.roleId = null;
      setHash(false);
      render();
    };
    document.getElementById('crumb-role').onclick = () => {
      state.screenIndex = 0;
      state.history = [];
      setHash(false);
      renderViewer();
    };

    // thumbs
    el.thumbs.innerHTML = '';
    const h3 = document.createElement('h3');
    h3.textContent = titleCase(r.name) + ' · ' + r.screens.length;
    el.thumbs.appendChild(h3);
    r.screens.forEach((sc, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'thumb' + (i === state.screenIndex ? ' active' : '');
      b.innerHTML =
        '<img loading="lazy" src="' +
        sc.image +
        '" alt=""><span class="t-title">' +
        escapeHtml(String(i + 1).padStart(2, '0') + '. ' + shortTitle(sc.title)) +
        '</span>';
      b.addEventListener('click', () => {
        state.history.push({ roleId: state.roleId, screenIndex: state.screenIndex });
        state.screenIndex = i;
        setHash(false);
        renderViewer();
      });
      el.thumbs.appendChild(b);
    });

    // canvas
    el.canvas.className = 'canvas' + (state.showHotspots ? ' hotspots-visible' : '');
    el.canvas.innerHTML = '';
    const img = document.createElement('img');
    img.className = 'screen';
    img.alt = s.title;
    img.src = s.image;
    img.draggable = false;

    const placeHotspots = () => {
      // remove old hotspots
      el.canvas.querySelectorAll('.hotspot').forEach((n) => n.remove());
      const dispW = img.clientWidth;
      const dispH = img.clientHeight;
      if (!dispW || !s.width) return;
      const sx = dispW / s.width;
      const sy = dispH / s.height;
      s.hotspots.forEach((h) => {
        const hs = document.createElement('button');
        hs.type = 'button';
        hs.className = 'hotspot ' + (h.resolved ? 'resolved' : 'unresolved');
        hs.style.left = h.x * sx + 'px';
        hs.style.top = h.y * sy + 'px';
        hs.style.width = Math.max(8, h.w * sx) + 'px';
        hs.style.height = Math.max(8, h.h * sy) + 'px';
        hs.title = h.resolved
          ? 'Go to ' + h.targetRole + ' #' + (h.targetIndex + 1)
          : 'Unresolved target: ' + h.target;
        hs.setAttribute('aria-label', hs.title);
        if (h.resolved) {
          hs.addEventListener('click', (ev) => {
            ev.stopPropagation();
            goTo(h.targetRole, h.targetIndex, true);
          });
        } else {
          hs.addEventListener('click', (ev) => {
            ev.stopPropagation();
            ev.preventDefault();
          });
        }
        el.canvas.appendChild(hs);
      });
    };

    img.addEventListener('load', placeHotspots);
    el.canvas.appendChild(img);
    // if cached
    if (img.complete) placeHotspots();
    window.addEventListener('resize', placeHotspots, { passive: true });
    // store for cleanup-ish: replace each render
    el.canvas._place = placeHotspots;

    el.canvas.onclick = (ev) => {
      if (ev.target === img || ev.target === el.canvas) {
        flashHotspots();
      }
    };

    el.btnPrev.disabled = state.screenIndex <= 0;
    el.btnNext.disabled = state.screenIndex >= r.screens.length - 1;
    el.btnBack.disabled = false;
    el.btnHotspots.classList.toggle('toggle-on', state.showHotspots);
    el.btnHotspots.textContent = state.showHotspots ? 'Hide Hotspots' : 'Show Hotspots';

    const res = s.hotspots.filter((h) => h.resolved).length;
    const un = s.hotspots.length - res;
    el.statusLeft.textContent =
      'Screen ' +
      (state.screenIndex + 1) +
      ' / ' +
      r.screens.length +
      ' · ' +
      s.hotspots.length +
      ' hotspots (' +
      res +
      ' linked' +
      (un ? ', ' + un + ' unresolved' : '') +
      ')';
    el.statusRight.textContent = 'Node ' + s.id + ' · ← → navigate · click empty area to flash links';
  }

  function flashHotspots() {
    const nodes = el.canvas.querySelectorAll('.hotspot.resolved');
    nodes.forEach((n) => {
      n.classList.remove('flash');
      // reflow
      void n.offsetWidth;
      n.classList.add('flash');
    });
    setTimeout(() => {
      nodes.forEach((n) => n.classList.remove('flash'));
    }, 1000);
  }

  function shortTitle(t) {
    // strip leading "Role / " noise a bit
    const parts = String(t || '').split('·');
    return (parts[parts.length - 1] || t).trim();
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function render() {
    renderTabs();
    if (state.roleId) renderViewer();
    else renderLanding();
  }

  // controls
  el.btnRoles.addEventListener('click', () => {
    state.roleId = null;
    state.history = [];
    setHash(false);
    render();
  });
  el.btnBack.addEventListener('click', goBackHistory);
  el.btnPrev.addEventListener('click', () => {
    if (state.screenIndex > 0) {
      state.history.push({ roleId: state.roleId, screenIndex: state.screenIndex });
      state.screenIndex--;
      setHash(false);
      renderViewer();
    }
  });
  el.btnNext.addEventListener('click', () => {
    const r = role();
    if (r && state.screenIndex < r.screens.length - 1) {
      state.history.push({ roleId: state.roleId, screenIndex: state.screenIndex });
      state.screenIndex++;
      setHash(false);
      renderViewer();
    }
  });
  el.btnHotspots.addEventListener('click', () => {
    state.showHotspots = !state.showHotspots;
    el.canvas.classList.toggle('hotspots-visible', state.showHotspots);
    el.btnHotspots.classList.toggle('toggle-on', state.showHotspots);
    el.btnHotspots.textContent = state.showHotspots ? 'Hide Hotspots' : 'Show Hotspots';
  });
  el.btnSidebar.addEventListener('click', () => {
    el.sidebar.classList.toggle('open');
  });

  document.addEventListener('keydown', (ev) => {
    if (!state.roleId) return;
    if (ev.key === 'ArrowLeft') {
      ev.preventDefault();
      el.btnPrev.click();
    } else if (ev.key === 'ArrowRight') {
      ev.preventDefault();
      el.btnNext.click();
    } else if (ev.key === 'Escape') {
      goBackHistory();
    } else if (ev.key === 'h' || ev.key === 'H') {
      el.btnHotspots.click();
    }
  });

  window.addEventListener('hashchange', () => {
    const parsed = parseHash();
    if (!parsed) return;
    state.projectId = parsed.projectId;
    state.roleId = parsed.roleId;
    state.screenIndex = parsed.screenIndex;
    render();
  });

  // init
  const parsed = parseHash();
  if (parsed) {
    state.projectId = parsed.projectId;
    state.roleId = parsed.roleId;
    state.screenIndex = parsed.screenIndex;
  }
  render();
  if (!location.hash) setHash(true);
})();
