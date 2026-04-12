// ============================================================
// script.js — CELIDER 08-06 · v2.0
// Maneja: Splash, Home (modo selector), Dashboard, Lista,
//         Talleres y Admin
// ============================================================

// ── CONFIGURACIÓN ────────────────────────────────────────────

/* ── THEME TOGGLE ────────────────────────────────────────────── */
(function initTheme() {
  const saved = localStorage.getItem('celider_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
})();

function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('celider_theme', next);
}

document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('#themeToggle').forEach(btn => {
    btn.addEventListener('click', toggleTheme);
  });
});

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby-weivfpQWjoF5f19Y1rsq9OyzTci3iFNWV63d-LMTNYa4l0jLdAF8jMIpI_LvxwxB/exec";

const TALLERES_LIST_FALLBACK = [
  "Introducción a los Modelos de Naciones Unidas",
  "Procedimiento Parlamentario",
  "Redacción Diplomática y Documentos de Trabajo",
  "Propuestas y Construcción de Soluciones",
  "Liderazgo",
  "Oratoria y Argumentación"
];

const TALLERES_ICONOS = {
  "Introducción a los Modelos de Naciones Unidas": "fa-globe",
  "Procedimiento Parlamentario":                   "fa-gavel",
  "Redacción Diplomática y Documentos de Trabajo": "fa-file-pen",
  "Propuestas y Construcción de Soluciones":       "fa-lightbulb",
  "Liderazgo":                                     "fa-star",
  "Oratoria y Argumentación":                      "fa-microphone",
  "Elaboración de Discursos":                      "fa-comment-dots",
  "Propuestas y Resoluciones":                     "fa-file-signature",
  "Induccón Pre-MONUDIST '26 08-06":               "fa-flag"
};

// ── CLAVES DE ALMACENAMIENTO ──────────────────────────────────
const STORAGE_USER_NAME  = "celider_user_name";
const SESSION_KEY        = "celider_admin_token";

// ── CACHÉ EN MEMORIA ─────────────────────────────────────────
let _cachedDelegados = null;   // lista completa para evitar re-fetch

// ── UTILIDADES ────────────────────────────────────────────────
function escapeHtml(text) {
  const map = { "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

function getInitials(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function initHamburger() {
  const btn = document.getElementById("hamburgerBtn");
  const nav = document.getElementById("mobileNav");
  if (!btn || !nav) return;
  btn.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    btn.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", open);
    btn.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
  });
  nav.querySelectorAll(".nav-link").forEach(l => l.addEventListener("click", () => {
    nav.classList.remove("open");
    btn.classList.remove("open");
    btn.setAttribute("aria-expanded","false");
    btn.setAttribute("aria-label","Abrir menú");
  }));
  window.addEventListener("resize", () => {
    if (window.innerWidth > 960) {
      nav.classList.remove("open");
      btn.classList.remove("open");
      btn.setAttribute("aria-expanded","false");
    }
  });
}

// ── DETECCIÓN DE PÁGINA Y ARRANQUE ───────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initHamburger();
  const page = document.body.dataset.page;
  if (page === "home")      initHome();
  if (page === "talleres")  initTalleres();
  if (page === "admin")     initAdmin();
});


// ============================================================
//  HOME — index.html
// ============================================================
function initHome() {
  // ── SPLASH ──────────────────────────────────────────────
  const splash = document.getElementById("splashScreen");
  const header = document.getElementById("siteHeader");
  const main   = document.getElementById("mainContent");

  function dismissSplash() {
    if (!splash || splash.classList.contains("exit")) return;
    splash.classList.add("exit");
    setTimeout(() => {
      splash.style.display = "none";
      header.classList.add("visible");
    }, 700);
    // Show the right section after a brief delay
    setTimeout(showInitialView, 300);
  }

  // Auto-dismiss after 2.8 s
  const autoTimer = setTimeout(dismissSplash, 2800);

  // Click/tap anywhere on splash to skip
  splash.addEventListener("click", () => {
    clearTimeout(autoTimer);
    dismissSplash();
  });

  // ── INICIAL VIEW LOGIC ────────────────────────────────────
  function showInitialView() {
    const savedName = localStorage.getItem(STORAGE_USER_NAME);
    showSection("modeSelectorSection");

    if (savedName) {
      const banner   = document.getElementById("recallBanner");
      const rName    = document.getElementById("recallName");
      const rAvatar  = document.getElementById("recallAvatar");
      if (banner && rName && rAvatar) {
        rName.textContent  = savedName;
        rAvatar.textContent = getInitials(savedName);
        banner.style.display = "flex";

        document.getElementById("btnRecallContinue").addEventListener("click", () => {
          loadDashboard(savedName);
        });
        document.getElementById("btnRecallChange").addEventListener("click", () => {
          localStorage.removeItem(STORAGE_USER_NAME);
          banner.style.display = "none";
          updateHeaderUser(null);
        });
      }
    }
  }

  // ── NAVIGATION BETWEEN SECTIONS ──────────────────────────
  function showSection(id) {
    ["modeSelectorSection","nameSearchSection","dashboardSection","listaSection"]
      .forEach(s => {
        const el = document.getElementById(s);
        if (el) el.style.display = (s === id) ? "" : "none";
      });
  }

  // ── HEADER USER CHIP ─────────────────────────────────────
  function updateHeaderUser(name) {
    const chip   = document.getElementById("headerUserChip");
    const avatar = document.getElementById("headerUserAvatar");
    const nameEl = document.getElementById("headerUserName");
    if (!chip) return;
    if (name) {
      avatar.textContent = getInitials(name);
      nameEl.textContent = name.split(" ").slice(0,2).join(" ");
      chip.style.display = "flex";
      chip.onclick = () => {
        showSection("modeSelectorSection");
        updateHeaderUser(null);
        document.getElementById("headerSubtitle").textContent = "Panel de consulta";
      };
    } else {
      chip.style.display = "none";
    }
  }

  // ── MODE BUTTONS ─────────────────────────────────────────
  document.getElementById("btnModoLista").addEventListener("click", () => {
    showSection("listaSection");
    document.getElementById("headerSubtitle").textContent = "Delegados";
    initListado(); // lazy init
  });

  document.getElementById("btnModoPerfil").addEventListener("click", () => {
    showSection("nameSearchSection");
    document.getElementById("headerSubtitle").textContent = "Buscar perfil";
    loadDelegadosForDatalist("profileDelegadosList");
    setTimeout(() => document.getElementById("profileNameInput")?.focus(), 100);
  });

  // ── BACK BUTTONS ─────────────────────────────────────────
  document.getElementById("btnBackFromSearch").addEventListener("click", () => {
    showSection("modeSelectorSection");
    document.getElementById("headerSubtitle").textContent = "Panel de consulta";
  });

  document.getElementById("btnBackFromDashboard").addEventListener("click", () => {
    showSection("modeSelectorSection");
    document.getElementById("headerSubtitle").textContent = "Panel de consulta";
    updateHeaderUser(null);
  });

  document.getElementById("btnBackFromList").addEventListener("click", () => {
    showSection("modeSelectorSection");
    document.getElementById("headerSubtitle").textContent = "Panel de consulta";
  });

  // ── PROFILE SEARCH ───────────────────────────────────────
  const profileInput  = document.getElementById("profileNameInput");
  const btnBuscarPerf = document.getElementById("btnBuscarPerfil");
  const profileLoading = document.getElementById("profileSearchLoading");
  const profileNotFound = document.getElementById("profileNotFound");
  const profileNotFoundMsg = document.getElementById("profileNotFoundMsg");

  async function buscarPerfil() {
    const nombre = profileInput.value.trim();
    if (!nombre) { profileInput.focus(); return; }

    profileNotFound.style.display = "none";
    profileLoading.classList.add("visible");
    btnBuscarPerf.disabled = true;

    try {
      // Match against cached delegados first
      let delegados = _cachedDelegados;
      if (!delegados) {
        const resp = await fetch(APPS_SCRIPT_URL + "?action=getDelegados&t=" + Date.now());
        const json = await resp.json();
        if (json.status === "ok") { delegados = json.data; _cachedDelegados = delegados; }
        else throw new Error(json.message);
      }

      const norm = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();
      const found = delegados.find(d =>
        d.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim() === norm
      ) || delegados.find(d =>
        d.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().includes(norm)
      );

      if (!found) {
        profileNotFoundMsg.textContent = `No encontramos a "${nombre}". Verifica la ortografía.`;
        profileNotFound.style.display = "flex";
        return;
      }

      // Save to localStorage and load dashboard
      localStorage.setItem(STORAGE_USER_NAME, found.nombre);
      loadDashboard(found.nombre, found);

    } catch(e) {
      profileNotFoundMsg.textContent = "Error de conexión. Intenta de nuevo.";
      profileNotFound.style.display = "flex";
    } finally {
      profileLoading.classList.remove("visible");
      btnBuscarPerf.disabled = false;
    }
  }

  profileInput.addEventListener("keydown", e => { if (e.key === "Enter") buscarPerfil(); });
  btnBuscarPerf.addEventListener("click", buscarPerfil);

  // ── DASHBOARD LOADER ─────────────────────────────────────
  async function loadDashboard(nombre, delegadoHint = null) {
    showSection("dashboardSection");
    document.getElementById("headerSubtitle").textContent = "Mi perfil";
    updateHeaderUser(nombre);

    // Clear previous state
    document.getElementById("dbStatsGrid").innerHTML = "";
    document.getElementById("dbTalleresGrid").innerHTML = "";
    const dbLoading = document.getElementById("dashboardLoading");

    // Set name
    document.getElementById("dbName").textContent = nombre;

    // If we have delegado hint (centro, correo), render it
    if (delegadoHint) renderDashboardInfo(delegadoHint);

    // Fetch attendance
    dbLoading.classList.add("visible");
    try {
      const url  = APPS_SCRIPT_URL + "?action=getAsistenciaDelegado&nombre=" + encodeURIComponent(nombre) + "&t=" + Date.now();
      const resp = await fetch(url);
      const json = await resp.json();
      if (json.status !== "ok") throw new Error(json.message);
      const data = json.data;

      if (!data.found) {
        document.getElementById("dbStatsGrid").innerHTML =
          `<div style="grid-column:1/-1;color:var(--text-muted);font-size:.85rem;padding:.5rem 0;">
            <i class="fas fa-info-circle"></i> No hay datos de asistencia aún.
           </div>`;
        return;
      }

      // If no hint, try to get centro/correo from cached list
      if (!delegadoHint && _cachedDelegados) {
        const del = _cachedDelegados.find(d => d.nombre === nombre);
        if (del) renderDashboardInfo(del);
      }

      renderDashboardStats(data);
      renderDashboardTalleres(data);

    } catch(e) {
      document.getElementById("dbStatsGrid").innerHTML =
        `<div style="grid-column:1/-1;color:#DC2626;font-size:.85rem;padding:.5rem 0;">
          <i class="fas fa-circle-exclamation"></i> Error al cargar asistencia.
         </div>`;
    } finally {
      dbLoading.classList.remove("visible");
    }
  }

  function renderDashboardInfo(del) {
    const row = document.getElementById("dbInfoRow");
    if (!row) return;
    let html = "";
    if (del.centro) html += `<span class="dashboard-info-chip"><i class="fas fa-school"></i>${escapeHtml(del.centro)}</span>`;
    if (del.correo) html += `<span class="dashboard-info-chip"><i class="fas fa-envelope"></i><a href="mailto:${escapeHtml(del.correo)}">${escapeHtml(del.correo)}</a></span>`;
    row.innerHTML = html;
  }

  function renderDashboardStats(data) {
    const grid = document.getElementById("dbStatsGrid");
    const r    = data.resumen || {};
    const pct  = r.porcentaje ?? 0;
    const colorClass = pct >= 80 ? "green" : pct >= 50 ? "blue" : "red";
    const progressClass = pct >= 80 ? "green" : pct >= 50 ? "" : "red";

    grid.innerHTML = `
      <div class="stat-mini-card">
        <span class="stat-mini-label">Asistencia</span>
        <span class="stat-mini-value ${colorClass}">${pct}%</span>
        <div class="stat-progress-bar">
          <div class="stat-progress-fill ${progressClass}" style="width:${pct}%"></div>
        </div>
      </div>
      <div class="stat-mini-card">
        <span class="stat-mini-label">Talleres presentes</span>
        <span class="stat-mini-value green">${r.presentes ?? 0}</span>
        <span class="stat-mini-sub">de ${(r.presentes ?? 0) + (r.ausentes ?? 0) + (r.excusas ?? 0)} registrados</span>
      </div>
      <div class="stat-mini-card">
        <span class="stat-mini-label">Ausencias</span>
        <span class="stat-mini-value red">${r.ausentes ?? 0}</span>
        <span class="stat-mini-sub">${r.excusas > 0 ? r.excusas + " con excusa" : "Sin excusas registradas"}</span>
      </div>
    `;
  }

  function renderDashboardTalleres(data) {
    const grid    = document.getElementById("dbTalleresGrid");
    const talleres = data.talleres || Object.keys(data.asistencia);
    grid.innerHTML = talleres.map(taller => {
      const status = (data.asistencia[taller] || "").trim();
      const icono  = TALLERES_ICONOS[taller] || "fa-chalkboard-teacher";
      const pillClass = status === "Presente" ? "pill-presente"
                      : status === "Ausente"  ? "pill-ausente"
                      : status === "Excusa"   ? "pill-excusa"
                      : "pill-noregistrado";
      return `
        <div class="dash-taller-card">
          <div class="dash-taller-icon"><i class="fas ${icono}"></i></div>
          <div class="dash-taller-info">
            <span class="dash-taller-name">${escapeHtml(taller)}</span>
            <span class="asistencia-pill ${pillClass}" style="font-size:.68rem;padding:.18rem .6rem;margin-top:.3rem;">
              <span class="pill-dot"></span>${escapeHtml(status || "No registrado")}
            </span>
          </div>
        </div>`;
    }).join("");
  }

  // Pre-load delegados for datalist
  async function loadDelegadosForDatalist(listId) {
    const list = document.getElementById(listId);
    if (!list || list.children.length > 0) return; // already loaded
    try {
      if (!_cachedDelegados) {
        const resp = await fetch(APPS_SCRIPT_URL + "?action=getDelegados&t=" + Date.now());
        const json = await resp.json();
        if (json.status === "ok") _cachedDelegados = json.data;
      }
      (_cachedDelegados || []).forEach(d => {
        const opt = document.createElement("option");
        opt.value = d.nombre;
        list.appendChild(opt);
      });
    } catch(e) { console.warn("No se pudo cargar autocompletado:", e); }
  }

  // ── LISTA SECTION ─────────────────────────────────────────
  let _listaInited = false;
  function initListado() {
    if (_listaInited) return;
    _listaInited = true;
    // Use cached delegados if available
    if (_cachedDelegados) {
      _allStudents = _cachedDelegados;
      populateCentroFilter();
      renderTable();
      showLoading(false);
    } else {
      loadStudents();
    }
  }

  let _allStudents  = [];
  let _currentSort  = "az";
  let _filterCentro = "";
  let _searchQuery  = "";

  async function loadStudents() {
    showLoading(true);
    try {
      const resp = await fetch(APPS_SCRIPT_URL + "?action=getDelegados&t=" + Date.now());
      if (!resp.ok) throw new Error("Error HTTP: " + resp.status);
      const json = await resp.json();
      if (json.status === "error") throw new Error(json.message);
      _allStudents     = json.data || [];
      _cachedDelegados = _allStudents;
      populateCentroFilter();
      renderTable();
    } catch(e) {
      showError(e.message);
    } finally {
      showLoading(false);
    }
  }

  function populateCentroFilter() {
    const sel = document.getElementById("centroFilter");
    if (!sel) return;
    const centros = [...new Set(_allStudents.map(s => s.centro).filter(c => c?.trim()))].sort((a,b) => a.localeCompare(b,"es"));
    sel.innerHTML = '<option value="">Todos los centros</option>';
    centros.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c; opt.textContent = c;
      sel.appendChild(opt);
    });
  }

  function renderTable() {
    let list = [..._allStudents];
    if (_searchQuery)  list = list.filter(s => s.nombre.toLowerCase().includes(_searchQuery));
    if (_filterCentro) list = list.filter(s => s.centro === _filterCentro);
    list.sort((a,b) => {
      const cmp = a.nombre.localeCompare(b.nombre,"es",{sensitivity:"base"});
      return _currentSort === "az" ? cmp : -cmp;
    });

    const count = document.getElementById("resultsCount");
    if (count) {
      count.innerHTML = list.length === _allStudents.length
        ? `Mostrando <strong>${_allStudents.length}</strong> delegados`
        : `Mostrando <strong>${list.length}</strong> de <strong>${_allStudents.length}</strong> delegados`;
    }

    const tableSection = document.getElementById("tableSection");
    const emptyState   = document.getElementById("emptyState");
    const tableBody    = document.getElementById("tableBody");

    if (list.length === 0) {
      tableSection.style.display = "none";
      emptyState.classList.add("visible");
      return;
    }
    tableSection.style.display = "";
    emptyState.classList.remove("visible");
    tableBody.innerHTML = list.map((s, i) => {
      const correo = s.correo?.trim() || "";
      const codigo = s.codigo?.trim() || "";
      const correoCell = correo
        ? `<a href="mailto:${escapeHtml(correo)}" class="correo-link" title="${escapeHtml(correo)}">
             <i class="fas fa-envelope"></i>
             <span class="correo-text">${escapeHtml(correo)}</span>
           </a>`
        : `<span style="color:var(--text-muted);font-size:.8rem;">—</span>`;
      const codigoCell = codigo && codigo !== 'N/A'
        ? `<div class="codigo-cell">
             <span class="codigo-text">${escapeHtml(codigo)}</span>
             <button class="btn-copy-codigo" onclick="copiarCodigo(this,'${escapeHtml(codigo)}')" title="Copiar código">
               <i class="fas fa-copy"></i>
             </button>
           </div>`
        : `<span class="codigo-na">—</span>`;
      return `
        <tr style="animation-delay:${Math.min(i*.03,.4)}s">
          <td><div class="nombre-cell"><span class="row-num">${i+1}</span>${escapeHtml(s.nombre)}</div></td>
          <td><span class="centro-badge"><i class="fas fa-school"></i>${escapeHtml(s.centro||"—")}</span></td>
          <td class="correo-cell">${correoCell}</td>
          <td class="codigo-col">${codigoCell}</td>
        </tr>`;
    }).join("");
  }

  function showLoading(on) {
    const ls = document.getElementById("loadingState");
    const ts = document.getElementById("tableSection");
    if (!ls) return;
    if (on) { ls.classList.add("visible"); if(ts) ts.style.display="none"; }
    else    { ls.classList.remove("visible"); }
  }

  function showError(msg) {
    showLoading(false);
    const es = document.getElementById("emptyState");
    if (!es) return;
    es.classList.add("visible");
    const p = es.querySelector("p"); if(p) p.textContent = "Error al cargar";
    const s = es.querySelector("span"); if(s) s.textContent = msg;
  }

  // ── LIST EVENT LISTENERS ─────────────────────────────────
  document.getElementById("searchInput")?.addEventListener("input", e => {
    _searchQuery = e.target.value.trim().toLowerCase();
    renderTable();
  });
  document.getElementById("centroFilter")?.addEventListener("change", e => {
    _filterCentro = e.target.value;
    renderTable();
  });
  document.getElementById("btnAZ")?.addEventListener("click", () => {
    _currentSort = "az";
    document.getElementById("btnAZ").classList.add("active");
    document.getElementById("btnZA").classList.remove("active");
    renderTable();
  });
  document.getElementById("btnZA")?.addEventListener("click", () => {
    _currentSort = "za";
    document.getElementById("btnZA").classList.add("active");
    document.getElementById("btnAZ").classList.remove("active");
    renderTable();
  });
  document.getElementById("btnClear")?.addEventListener("click", () => {
    _searchQuery = ""; _filterCentro = ""; _currentSort = "az";
    const si = document.getElementById("searchInput"); if(si) si.value = "";
    const cf = document.getElementById("centroFilter"); if(cf) cf.value = "";
    document.getElementById("btnAZ")?.classList.add("active");
    document.getElementById("btnZA")?.classList.remove("active");
    renderTable();
  });

  // ── RESTORE STATE: if user navigated back from talleres ──
  const savedUser = localStorage.getItem(STORAGE_USER_NAME);
  if (savedUser) {
    // Recall banner will handle it after splash
  }
}


// ============================================================
//  TALLERES — talleres.html
// ============================================================
function initTalleres() {
  const nameInput     = document.getElementById("nameInput");
  const btnBuscar     = document.getElementById("btnBuscar");
  const searchLoading = document.getElementById("searchLoading");
  const notFoundState = document.getElementById("notFoundState");
  const resultSection = document.getElementById("resultSection");
  const delegadosList = document.getElementById("delegadosList");
  const btnReintentar = document.getElementById("btnReintentar");
  const btnVolverInicio = document.getElementById("btnVolverInicio");

  let publicDocs     = {};
  let lastResultData = null;

  // Header user chip
  const savedUser = localStorage.getItem(STORAGE_USER_NAME);
  if (savedUser) {
    const chip   = document.getElementById("headerUserChip");
    const avatar = document.getElementById("headerUserAvatar");
    const nameEl = document.getElementById("headerUserName");
    if (chip && avatar && nameEl) {
      avatar.textContent = getInitials(savedUser);
      nameEl.textContent = savedUser.split(" ").slice(0,2).join(" ");
      chip.style.display = "flex";
      chip.addEventListener("click", () => { window.location.href = "index.html"; });
    }
    // Show "back to profile" button
    if (btnVolverInicio) btnVolverInicio.style.display = "flex";
  }

  cargarNombres();
  loadDocumentosPublic();

  // Auto-search if user is saved
  if (savedUser) {
    nameInput.value = savedUser;
    setTimeout(buscar, 300);
  }

  btnBuscar.addEventListener("click", buscar);
  nameInput.addEventListener("keydown", e => { if (e.key === "Enter") buscar(); });
  btnReintentar.addEventListener("click", () => resetView(true));

  async function cargarNombres() {
    if (delegadosList.children.length > 0) return;
    try {
      const resp = await fetch(APPS_SCRIPT_URL + "?action=getDelegados&t=" + Date.now());
      const json = await resp.json();
      if (json.status === "ok" && json.data) {
        json.data.forEach(d => {
          const opt = document.createElement("option");
          opt.value = d.nombre;
          delegadosList.appendChild(opt);
        });
      }
    } catch(e) { console.warn("No se pudo cargar autocompletado:", e); }
  }

  async function buscar() {
    const nombre = nameInput.value.trim();
    if (!nombre) { nameInput.focus(); return; }
    resetView(false);
    showSearchLoading(true);
    try {
      const url  = APPS_SCRIPT_URL + "?action=getAsistenciaDelegado&nombre=" + encodeURIComponent(nombre) + "&t=" + Date.now();
      const resp = await fetch(url);
      const json = await resp.json();
      if (json.status !== "ok") throw new Error(json.message);
      if (!json.data.found) showNotFound(nombre);
      else renderResultado(json.data);
    } catch(e) {
      showNotFound(nombre, "Error al conectar. Intenta de nuevo.");
    } finally {
      showSearchLoading(false);
    }
  }

  function renderResultado(data) {
    lastResultData = data;
    document.getElementById("delegadoNombre").textContent = data.nombre;
    document.getElementById("pctNum").textContent = (data.resumen?.porcentaje ?? "—") + "%";

    if (data.resumen) {
      document.getElementById("chipPresente").innerHTML =
        `<i class="fas fa-circle-check"></i> ${data.resumen.presentes} presente${data.resumen.presentes !== 1 ? "s" : ""}`;
      document.getElementById("chipAusente").innerHTML =
        `<i class="fas fa-circle-xmark"></i> ${data.resumen.ausentes} ausente${data.resumen.ausentes !== 1 ? "s" : ""}`;
      const chipExcusa = document.getElementById("chipExcusa");
      if (chipExcusa) {
        if (data.resumen.excusas > 0) {
          chipExcusa.innerHTML = `<i class="fas fa-circle-minus"></i> ${data.resumen.excusas} excusa${data.resumen.excusas !== 1 ? "s" : ""}`;
          chipExcusa.style.display = "";
        } else chipExcusa.style.display = "none";
      }
    }

    const grid    = document.getElementById("talleresGrid");
    grid.innerHTML = "";
    const talleres = data.talleres || Object.keys(data.asistencia);
    talleres.forEach((taller, idx) => {
      const status = (data.asistencia[taller] || "").trim();
      const pClass = status === "Presente" ? "pill-presente"
                   : status === "Ausente"  ? "pill-ausente"
                   : status === "Excusa"   ? "pill-excusa"
                   : "pill-noregistrado";
      const icono  = TALLERES_ICONOS[taller] || "fa-chalkboard-teacher";
      const card   = document.createElement("div");
      card.className = "taller-card";
      card.style.animationDelay = (idx * 0.07) + "s";
      card.innerHTML = `
        <span class="taller-num">Taller ${idx + 1}</span>
        <div style="display:flex;align-items:flex-start;gap:.7rem;">
          <i class="fas ${icono}" style="color:var(--primary-light);margin-top:.18rem;flex-shrink:0;font-size:.95rem;"></i>
          <span class="taller-nombre">${escapeHtml(taller)}</span>
        </div>
        <span class="asistencia-pill ${pClass}">
          <span class="pill-dot"></span>${escapeHtml(status || "No registrado")}
        </span>`;
      appendMaterialesBtn(card, taller);
      grid.appendChild(card);
    });
    resultSection.style.display = "";
  }

  function showSearchLoading(on) { searchLoading.classList.toggle("visible", on); }
  function showNotFound(nombre, msg) {
    if (msg) document.getElementById("notFoundMsg").textContent = msg;
    notFoundState.classList.add("visible");
  }
  function resetView(clearInput) {
    if (clearInput) nameInput.value = "";
    resultSection.style.display = "none";
    notFoundState.classList.remove("visible");
    searchLoading.classList.remove("visible");
  }

  function appendMaterialesBtn(card, taller) {
    const old = card.querySelector(".taller-material-btn, .taller-material-multi");
    if (old) old.remove();
    const links = publicDocs[taller] || [];
    if (!links.length) return;
    if (links.length === 1) {
      const a = document.createElement("a");
      a.setAttribute("href", links[0].url);
      a.setAttribute("target","_blank");
      a.setAttribute("rel","noopener noreferrer");
      a.className = "taller-material-btn";
      a.innerHTML = `<i class="fas fa-folder-open"></i><span>Acceder a materiales</span><i class="fas fa-arrow-up-right-from-square taller-material-arrow"></i>`;
      card.appendChild(a);
    } else {
      const wrap   = document.createElement("div");
      wrap.className = "taller-material-multi";
      const toggle = document.createElement("button");
      toggle.type  = "button";
      toggle.className = "taller-material-btn taller-material-toggle";
      toggle.innerHTML = `<i class="fas fa-folder-open"></i><span>Materiales del taller</span><i class="fas fa-chevron-down taller-material-chevron"></i>`;
      toggle.addEventListener("click", () => wrap.classList.toggle("open"));
      wrap.appendChild(toggle);
      const list = document.createElement("div");
      list.className = "taller-material-list";
      links.forEach(l => {
        const a = document.createElement("a");
        a.setAttribute("href",l.url); a.setAttribute("target","_blank"); a.setAttribute("rel","noopener noreferrer");
        a.className = "taller-material-dropdown-item";
        a.innerHTML = `<i class="fas fa-file-lines"></i><span>${escapeHtml(l.titulo)}</span><i class="fas fa-arrow-up-right-from-square" style="margin-left:auto;font-size:.62rem;opacity:.55;"></i>`;
        list.appendChild(a);
      });
      wrap.appendChild(list);
      card.appendChild(wrap);
    }
  }

  async function loadDocumentosPublic() {
    try {
      const resp = await fetch(APPS_SCRIPT_URL + "?action=getDocumentos&t=" + Date.now());
      const json = await resp.json();
      if (json.status !== "ok") throw new Error(json.message);
      publicDocs = json.data || {};
      if (lastResultData && resultSection && resultSection.style.display !== "none") {
        document.querySelectorAll(".taller-card").forEach(card => {
          const nameEl = card.querySelector(".taller-nombre");
          if (nameEl) appendMaterialesBtn(card, nameEl.textContent.trim());
        });
      }
    } catch(e) { console.warn("No se pudieron cargar materiales:", e); }
  }
}


// ============================================================
//  ADMIN — admin.html  (unchanged from v1, kept intact)
// ============================================================
const ESTADOS      = ["", "Presente", "Ausente", "Excusa"];
const ESTADO_CLASS = { "":"estado-vacio","Presente":"estado-presente","Ausente":"estado-ausente","Excusa":"estado-excusa" };
const ESTADO_LABEL = { "":"—","Presente":"✓ Presente","Ausente":"✕ Ausente","Excusa":"≈ Excusa" };

function initAdmin() {
  let adminPwd="", delegadosData=null, asistenciaData=null;
  let pendingChanges = new Map(), tabsLoaded={}, groupByCentro=false;

  const loginScreen = document.getElementById("loginScreen");
  const appShell    = document.getElementById("appShell");
  const pwdInput    = document.getElementById("pwdInput");
  const btnLogin    = document.getElementById("btnLogin");
  const loginError  = document.getElementById("loginError");
  const btnLogout   = document.getElementById("btnLogout");

  const savedToken = localStorage.getItem(SESSION_KEY);
  if (savedToken) autoLogin(savedToken);

  pwdInput.addEventListener("keydown", e => { if (e.key==="Enter") doLogin(); });
  btnLogin.addEventListener("click", doLogin);
  btnLogout.addEventListener("click", doLogout);
  document.querySelectorAll(".tab-btn").forEach(btn => btn.addEventListener("click", () => switchTab(btn.dataset.tab)));
  document.getElementById("btnRecargarDelegados").addEventListener("click", () => loadDelegadosFull(true));
  document.getElementById("searchDelegados").addEventListener("input", filterDelegados);
  document.getElementById("btnRecargarAsistencia").addEventListener("click", () => loadAsistencia(true));
  document.getElementById("searchAsistencia").addEventListener("input", filterAsistencia);
  document.getElementById("btnGuardar").addEventListener("click", guardarCambios);
  document.getElementById("btnDescartarCambios").addEventListener("click", descartarCambios);
  document.getElementById("btnGroupCentro").addEventListener("click", () => {
    groupByCentro = !groupByCentro;
    const btn = document.getElementById("btnGroupCentro");
    btn.classList.toggle("active", groupByCentro);
    btn.innerHTML = groupByCentro
      ? '<i class="fas fa-layer-group"></i> Agrupado por centro'
      : '<i class="fas fa-layer-group"></i> Agrupar por centro';
    renderAsistencia(document.getElementById("searchAsistencia").value);
  });
  document.getElementById("btnRecargarStats").addEventListener("click", () => loadStats(true));
  document.getElementById("btnRecargarDocs").addEventListener("click", () => loadDocumentosAdmin(true));

  async function autoLogin(token) {
    try {
      const resp = await fetch(APPS_SCRIPT_URL + "?action=auth&password=" + encodeURIComponent(token) + "&t=" + Date.now());
      const json = await resp.json();
      if (json.status==="ok" && json.data.valid) {
        adminPwd=token;
        loginScreen.style.display="none";
        appShell.classList.add("visible");
        document.querySelector('#appShell .site-header')?.classList.add('visible');
        loadDelegadosFull();
      } else localStorage.removeItem(SESSION_KEY);
    } catch(e) { localStorage.removeItem(SESSION_KEY); }
  }

  async function doLogin() {
    const pwd = pwdInput.value.trim(); if(!pwd) return;
    loginError.classList.remove("visible");
    btnLogin.disabled=true;
    btnLogin.innerHTML='<i class="fas fa-spinner fa-spin"></i> Verificando…';
    try {
      const resp = await fetch(APPS_SCRIPT_URL + "?action=auth&password=" + encodeURIComponent(pwd) + "&t=" + Date.now());
      const json = await resp.json();
      if (json.status==="ok" && json.data.valid) {
        adminPwd=pwd;
        localStorage.setItem(SESSION_KEY, pwd);
        loginScreen.classList.add("hidden");
        setTimeout(() => loginScreen.style.display="none", 400);
        appShell.classList.add("visible");
        document.querySelector('#appShell .site-header')?.classList.add('visible');
        loadDelegadosFull();
      } else { loginError.classList.add("visible"); pwdInput.select(); }
    } catch(e) {
      loginError.querySelector("span").textContent="Error de conexión.";
      loginError.classList.add("visible");
    } finally {
      btnLogin.disabled=false;
      btnLogin.innerHTML='<i class="fas fa-lock-open"></i> Ingresar';
    }
  }

  function doLogout() {
    localStorage.removeItem(SESSION_KEY);
    adminPwd=""; delegadosData=null; asistenciaData=null;
    pendingChanges.clear(); tabsLoaded={};
    appShell.classList.remove("visible");
    loginScreen.style.display="flex";
    setTimeout(() => loginScreen.classList.remove("hidden"), 10);
    pwdInput.value="";
  }

  function switchTab(id) {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab===id));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.toggle("active", c.id===id));
    if (id==="tab-asistencia" && !tabsLoaded.asistencia) loadAsistencia();
    if (id==="tab-stats"      && !tabsLoaded.stats)      loadStats();
    if (id==="tab-documentos" && !tabsLoaded.documentos) loadDocumentosAdmin();
  }

  async function loadDelegadosFull(force=false) {
    if (delegadosData && !force) { renderDelegados(); return; }
    showLoading("loadingDelegados",true);
    document.getElementById("tableDelegadosWrap").style.display="none";
    document.getElementById("controlsDelegados").style.display="none";
    try {
      const resp = await fetch(APPS_SCRIPT_URL+"?action=getDelegadosFull&password="+encodeURIComponent(adminPwd)+"&t="+Date.now());
      const json = await resp.json();
      if(json.status!=="ok") throw new Error(json.message);
      delegadosData=json.data; renderDelegados();
    } catch(e) { showToast("Error: "+e.message,"error"); }
    finally { showLoading("loadingDelegados",false); }
  }

  function renderDelegados(filter="") {
    if(!delegadosData) return;
    const {headers,rows}=delegadosData;
    const norm=filter.toLowerCase();
    const filtered=rows.filter(r=>!norm||r.some(c=>c.toLowerCase().includes(norm)));
    const thead=document.getElementById("delegadosHead");
    if(!thead.children.length) {
      headers.forEach(h=>{const th=document.createElement("th");th.scope="col";th.textContent=h;thead.appendChild(th);});
    }
    document.getElementById("delegadosBody").innerHTML=filtered.map((row,i)=>
      `<tr style="animation-delay:${Math.min(i*.02,.35)}s">
        ${row.map((cell,ci)=>ci===0
          ?`<td><div class="nombre-cell"><span class="row-num">${i+1}</span>${escapeHtml(cell)}</div></td>`
          :`<td>${escapeHtml(cell||"—")}</td>`
        ).join("")}
      </tr>`
    ).join("");
    document.getElementById("countDelegados").textContent=filtered.length+" delegados";
    document.getElementById("controlsDelegados").style.display="";
    document.getElementById("tableDelegadosWrap").style.display="";
  }
  function filterDelegados(){renderDelegados(document.getElementById("searchDelegados").value);}

  async function loadAsistencia(force=false) {
    if(asistenciaData&&!force){renderAsistencia();return;}
    tabsLoaded.asistencia=true;
    showLoading("loadingAsistencia",true);
    document.getElementById("asistenciaWrap").style.display="none";
    document.getElementById("saveToolbar").style.display="none";
    document.getElementById("controlsAsistencia").style.display="none";
    try {
      const resp=await fetch(APPS_SCRIPT_URL+"?action=getAsistencia&password="+encodeURIComponent(adminPwd)+"&t="+Date.now());
      const json=await resp.json();
      if(json.status!=="ok") throw new Error(json.message);
      asistenciaData=json.data; pendingChanges.clear(); renderAsistencia();
    } catch(e){showToast("Error cargando asistencia: "+e.message,"error");}
    finally{showLoading("loadingAsistencia",false);}
  }

  function renderAsistencia(filter="") {
    if(!asistenciaData) return;
    const{talleres,delegados}=asistenciaData;
    const norm=filter.toLowerCase();
    let filtered=delegados.filter(d=>!norm||d.nombre.toLowerCase().includes(norm));
    const thead=document.getElementById("asistenciaHead");
    thead.innerHTML=`<th class="col-delegado" scope="col">Delegado</th>`;
    talleres.forEach(t=>{const th=document.createElement("th");th.className="col-taller";th.scope="col";th.title=t;th.textContent=t.length>25?t.substring(0,24)+"…":t;thead.appendChild(th);});
    const thPct=document.createElement("th");thPct.className="col-pct";thPct.scope="col";thPct.textContent="% Asist.";thead.appendChild(thPct);
    const tbody=document.getElementById("asistenciaBody");tbody.innerHTML="";
    const totalCols=talleres.length+2;
    if(groupByCentro){
      const sorted=[...filtered].sort((a,b)=>{const ca=(a.centro||"Sin centro").localeCompare(b.centro||"Sin centro","es");return ca!==0?ca:a.nombre.localeCompare(b.nombre,"es");});
      let currentCentro=null,rowNum=0;
      sorted.forEach(del=>{
        const centro=del.centro||"Sin centro";
        if(centro!==currentCentro){
          currentCentro=centro;
          const tr=document.createElement("tr");tr.className="centro-group-row";
          const td=document.createElement("td");td.colSpan=totalCols;td.className="centro-group-cell";
          td.innerHTML=`<i class="fas fa-school"></i> ${escapeHtml(centro)}`;
          tr.appendChild(td);tbody.appendChild(tr);
        }
        rowNum++;tbody.appendChild(buildDelegadoRow(del,rowNum,talleres));
      });
    } else { filtered.forEach((del,i)=>tbody.appendChild(buildDelegadoRow(del,i+1,talleres))); }
    document.getElementById("countAsistencia").textContent=filtered.length+" delegados";
    document.getElementById("controlsAsistencia").style.display="";
    document.getElementById("saveToolbar").style.display="";
    document.getElementById("asistenciaWrap").style.display="";
    updatePendingCount();
  }

  function buildDelegadoRow(del,rowNum,talleres){
    const tr=document.createElement("tr");tr.dataset.nombre=del.nombre;
    const tdN=document.createElement("td");tdN.innerHTML=`<div class="nombre-cell"><span class="row-num">${rowNum}</span>${escapeHtml(del.nombre)}</div>`;tr.appendChild(tdN);
    talleres.forEach(taller=>{
      const td=document.createElement("td");
      const key=del.nombre+"||"+taller;
      const current=pendingChanges.has(key)?pendingChanges.get(key):(del.asistencia[taller]||"");
      const modified=pendingChanges.has(key);
      const cell=buildAsistenciaCell(current,modified);
      cell.addEventListener("click",()=>toggleCell(cell,del.nombre,taller));
      td.appendChild(cell);tr.appendChild(td);
    });
    const pcts=talleres.map(t=>{const k=del.nombre+"||"+t;return(pendingChanges.has(k)?pendingChanges.get(k):(del.asistencia[t]||""))==="Presente";});
    const pctVal=Math.round((pcts.filter(Boolean).length/talleres.length)*100);
    const tdPct=document.createElement("td");tdPct.dataset.pct=del.nombre;tdPct.innerHTML=buildPctCell(pctVal);tr.appendChild(tdPct);
    return tr;
  }
  function buildAsistenciaCell(estado,modified){
    const cell=document.createElement("div");
    cell.className="asistencia-cell "+(ESTADO_CLASS[estado]||"estado-vacio");
    if(modified) cell.classList.add("modified");
    cell.textContent=ESTADO_LABEL[estado]||"—";cell.dataset.estado=estado;return cell;
  }
  function buildPctCell(pctVal){
    return `<div class="pct-cell"><span class="pct-num">${pctVal}%</span><div class="pct-bar"><div class="pct-fill" style="width:${pctVal}%"></div></div></div>`;
  }
  function toggleCell(cell,nombre,taller){
    const key=nombre+"||"+taller;
    const current=cell.dataset.estado||"";
    const next=ESTADOS[(ESTADOS.indexOf(current)+1)%ESTADOS.length];
    const orig=asistenciaData.delegados.find(d=>d.nombre===nombre)?.asistencia[taller]||"";
    cell.className="asistencia-cell "+ESTADO_CLASS[next];cell.textContent=ESTADO_LABEL[next];cell.dataset.estado=next;
    if(next!==orig){pendingChanges.set(key,next);cell.classList.add("modified");}
    else{pendingChanges.delete(key);cell.classList.remove("modified");}
    actualizarPctFila(nombre);updatePendingCount();
  }
  function actualizarPctFila(nombre){
    const{talleres}=asistenciaData;
    const pcts=talleres.map(t=>{const k=nombre+"||"+t;return(pendingChanges.has(k)?pendingChanges.get(k):(asistenciaData.delegados.find(d=>d.nombre===nombre)?.asistencia[t]||""))==="Presente";});
    const pctVal=Math.round((pcts.filter(Boolean).length/talleres.length)*100);
    const tdPct=document.querySelector(`[data-pct="${CSS.escape(nombre)}"]`);
    if(tdPct) tdPct.innerHTML=buildPctCell(pctVal);
  }
  function updatePendingCount(){
    const n=pendingChanges.size;
    document.getElementById("pendingCount").textContent=n;
    document.getElementById("btnGuardar").disabled=n===0;
  }
  function filterAsistencia(){renderAsistencia(document.getElementById("searchAsistencia").value);}
  function descartarCambios(){pendingChanges.clear();renderAsistencia(document.getElementById("searchAsistencia").value);showToast("Cambios descartados.","info");}
  async function guardarCambios(){
    if(pendingChanges.size===0) return;
    const btn=document.getElementById("btnGuardar");btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Guardando…';
    const updates=Array.from(pendingChanges.entries()).map(([key,status])=>{const[delegado,taller]=key.split("||");return{delegado,taller,status};});
    try{
      const url=APPS_SCRIPT_URL+"?action=markBatch&password="+encodeURIComponent(adminPwd)+"&updates="+encodeURIComponent(JSON.stringify(updates))+"&t="+Date.now();
      const resp=await fetch(url);const json=await resp.json();
      if(json.status!=="ok") throw new Error(json.message);
      for(const[key,status]of pendingChanges){const[nombre,taller]=key.split("||");const del=asistenciaData.delegados.find(d=>d.nombre===nombre);if(del)del.asistencia[taller]=status;}
      pendingChanges.clear();showToast("✓ "+json.data.updated+" registros guardados.","success");
      renderAsistencia(document.getElementById("searchAsistencia").value);tabsLoaded.stats=false;
    }catch(e){showToast("Error al guardar: "+e.message,"error");}
    finally{btn.disabled=false;btn.innerHTML='<i class="fas fa-floppy-disk"></i> Guardar cambios';}
  }

  async function loadStats(force=false){
    tabsLoaded.stats=true;
    if(asistenciaData&&!force){renderStats();return;}
    showLoading("loadingStats",true);document.getElementById("statsContent").style.display="none";
    try{
      const resp=await fetch(APPS_SCRIPT_URL+"?action=getAsistencia&password="+encodeURIComponent(adminPwd)+"&t="+Date.now());
      const json=await resp.json();if(json.status!=="ok") throw new Error(json.message);
      asistenciaData=json.data;renderStats();
    }catch(e){showToast("Error: "+e.message,"error");}
    finally{showLoading("loadingStats",false);}
  }

  function renderStats(){
    if(!asistenciaData) return;
    const{talleres,delegados,statsTaller}=asistenciaData;
    const totalDel=delegados.length,conTodos=delegados.filter(d=>d.presentes===talleres.length).length,conNinguno=delegados.filter(d=>d.presentes===0).length;
    const pctGlobal=totalDel?Math.round(delegados.reduce((s,d)=>s+d.pct,0)/totalDel):0;
    document.getElementById("statsCards").innerHTML=`
      <div class="stat-card"><span class="stat-label">Total delegados</span><span class="stat-value">${totalDel}</span><span class="stat-sub">${talleres.length} talleres</span></div>
      <div class="stat-card green"><span class="stat-label">% promedio asistencia</span><span class="stat-value">${pctGlobal}%</span><div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${pctGlobal}%"></div></div></div>
      <div class="stat-card accent"><span class="stat-label">Asistencia perfecta</span><span class="stat-value">${conTodos}</span><span class="stat-sub">Todos completados</span></div>
      <div class="stat-card red"><span class="stat-label">Sin asistencia</span><span class="stat-value">${conNinguno}</span><span class="stat-sub">0 talleres</span></div>`;
    const tg=document.getElementById("statsTalleres");tg.innerHTML="";
    talleres.forEach(t=>{const s=statsTaller[t]||{};const card=document.createElement("div");card.className="taller-stat-card";card.innerHTML=`<div class="taller-stat-header"><span class="taller-stat-nombre">${escapeHtml(t)}</span><span class="taller-stat-pct">${s.pct??0}%</span></div><div class="progress-bar-wrap" style="margin-bottom:.75rem;"><div class="progress-bar-fill" style="width:${s.pct??0}%"></div></div><div class="taller-stat-row"><span style="color:#16a34a;font-weight:600;"><i class="fas fa-circle-check"></i> ${s.presentes??0} presentes</span><span style="color:#dc2626;font-weight:600;"><i class="fas fa-circle-xmark"></i> ${s.ausentes??0} ausentes</span></div><div class="taller-stat-row">${(s.excusas??0)>0?`<span style="color:#854d0e;font-weight:600;"><i class="fas fa-circle-minus"></i> ${s.excusas} excusa${s.excusas!==1?"s":""}</span>`:`<span>${(s.total??0)-(s.presentes??0)-(s.ausentes??0)-(s.excusas??0)} sin registrar</span>`}<span>${s.total??0} totales</span></div>`;tg.appendChild(card);});
    const sorted=[...delegados].sort((a,b)=>b.pct-a.pct);
    document.getElementById("statsDelegados").innerHTML=sorted.map((d,i)=>{const color=d.pct>=80?"#16a34a":d.pct>=50?"#d97706":"#dc2626";return`<tr><td><span class="row-num">${i+1}</span></td><td><span style="font-weight:500;">${escapeHtml(d.nombre)}</span></td><td style="color:#16a34a;font-weight:600;">${d.presentes}</td><td style="color:#dc2626;font-weight:600;">${d.ausentes}</td><td style="color:#854d0e;font-weight:600;">${d.excusas??0}</td><td><div style="display:flex;align-items:center;gap:.6rem;"><span style="font-weight:700;color:${color};">${d.pct}%</span><div style="flex:1;background:var(--border);border-radius:99px;height:6px;min-width:60px;"><div style="width:${d.pct}%;height:100%;background:${color};border-radius:99px;"></div></div></div></td></tr>`;}).join("");
    document.getElementById("statsContent").style.display="";
  }

  let documentosData=null,selectedTaller=null,talleresAdminList=[...TALLERES_LIST_FALLBACK];
  async function loadDocumentosAdmin(force=false){
    tabsLoaded.documentos=true;
    if(documentosData&&!force){renderTallerSelector();return;}
    showLoading("loadingDocs",true);
    document.getElementById("docsFormCard").style.display="none";
    document.getElementById("docsListWrap").style.display="none";
    try{
      const[docsResp,talleresResp]=await Promise.all([fetch(APPS_SCRIPT_URL+"?action=getDocumentos&t="+Date.now()),fetch(APPS_SCRIPT_URL+"?action=getTalleres&t="+Date.now())]);
      const[docsJson,talleresJson]=await Promise.all([docsResp.json(),talleresResp.json()]);
      if(docsJson.status!=="ok") throw new Error(docsJson.message);
      if(talleresJson.status==="ok") talleresAdminList=talleresJson.data||talleresAdminList;
      documentosData=docsJson.data;renderTallerSelector();
    }catch(e){showToast("Error: "+e.message,"error");}
    finally{showLoading("loadingDocs",false);}
  }
  function renderTallerSelector(){
    if(!documentosData) return;
    const container=document.getElementById("docsList");container.innerHTML="";
    talleresAdminList.forEach((taller,idx)=>{
      const links=documentosData[taller]||[];const icono=TALLERES_ICONOS[taller]||"fa-chalkboard-teacher";
      const card=document.createElement("div");card.className="docs-taller-select-card"+(selectedTaller===taller?" selected":"");card.style.animationDelay=(idx*0.05)+"s";
      card.innerHTML=`<div class="docs-taller-select-icon"><i class="fas ${icono}"></i></div><div class="docs-taller-select-info"><span class="docs-taller-select-num">Taller ${idx+1}</span><span class="docs-taller-select-name">${escapeHtml(taller)}</span></div><span class="docs-count-badge">${links.length}</span><i class="fas fa-chevron-right docs-taller-select-arrow"></i>`;
      card.addEventListener("click",()=>openTallerDocs(taller));container.appendChild(card);
    });
    document.getElementById("docsFormCard").style.display="none";
    document.getElementById("docsListWrap").style.display="";
    if(selectedTaller) openTallerDocs(selectedTaller,false);
  }
  function openTallerDocs(taller,scrollTo=true){
    selectedTaller=taller;
    document.querySelectorAll(".docs-taller-select-card").forEach(c=>c.classList.toggle("selected",c.querySelector(".docs-taller-select-name")?.textContent===taller));
    const links=documentosData[taller]||[];const icono=TALLERES_ICONOS[taller]||"fa-chalkboard-teacher";
    const existing=document.getElementById("docsDetailPanel");if(existing)existing.remove();
    const panel=document.createElement("div");panel.id="docsDetailPanel";panel.className="docs-detail-panel";
    panel.innerHTML=`<div class="docs-detail-header"><div class="docs-detail-title"><div class="docs-detail-icon"><i class="fas ${icono}"></i></div><div><p class="docs-detail-label">Taller seleccionado</p><h4 class="docs-detail-name">${escapeHtml(taller)}</h4></div></div><button class="docs-detail-close" id="docsDetailClose" aria-label="Cerrar"><i class="fas fa-xmark"></i></button></div><div class="docs-detail-links" id="docsDetailLinks">${renderDetailLinks(taller,links)}</div><div class="docs-add-form"><p class="docs-add-form-title"><i class="fas fa-plus-circle"></i> Agregar nuevo enlace</p><div class="docs-add-fields"><div class="field-group"><label for="docsTitulo">Título <span style="font-weight:400;opacity:.65;">(opcional)</span></label><input type="text" id="docsTitulo" class="search-input" placeholder="Ej. Presentación Taller 1…" maxlength="80" /></div><div class="field-group"><label for="docsUrl">URL <span style="color:#dc2626;">*</span></label><div class="search-wrapper"><i class="fas fa-link search-icon" style="font-size:.72rem;"></i><input type="url" id="docsUrl" class="search-input" placeholder="https://drive.google.com/…" style="padding-left:2.5rem;" /></div></div></div><div class="docs-add-actions"><div class="docs-form-error" id="docsFormError" style="display:none;"><i class="fas fa-triangle-exclamation"></i><span id="docsFormErrorMsg">Error</span></div><button class="btn-guardar" id="btnAddDoc" style="min-width:155px;"><i class="fas fa-plus"></i> Agregar enlace</button></div></div>`;
    document.getElementById("docsListWrap").appendChild(panel);
    document.getElementById("docsDetailClose").addEventListener("click",()=>{panel.remove();selectedTaller=null;document.querySelectorAll(".docs-taller-select-card").forEach(c=>c.classList.remove("selected"));});
    document.getElementById("btnAddDoc").addEventListener("click",addDocumentoAdmin);rebindDetailLinks();
    if(scrollTo) panel.scrollIntoView({behavior:"smooth",block:"nearest"});
  }
  function renderDetailLinks(taller,links){
    if(!links.length) return `<p class="doc-empty-msg"><i class="fas fa-inbox" style="margin-right:.4rem;opacity:.4;"></i>Sin enlaces cargados.</p>`;
    return links.map(link=>`<div class="doc-item"><div class="doc-item-icon"><i class="fas fa-file-lines"></i></div><div class="doc-item-info"><p class="doc-item-titulo">${escapeHtml(link.titulo)}</p><p class="doc-item-url">${escapeHtml(link.url)}</p></div><div class="doc-item-actions"><a class="btn-doc-open" target="_blank" rel="noopener noreferrer" data-href="${escapeHtml(link.url)}"><i class="fas fa-arrow-up-right-from-square"></i> Abrir</a><button class="btn-doc-delete" data-taller="${escapeHtml(taller)}" data-row="${link.row}"><i class="fas fa-trash"></i></button></div></div>`).join("")+`<div class="docs-detail-divider"></div>`;
  }
  function rebindDetailLinks(){document.querySelectorAll("#docsDetailLinks .btn-doc-open[data-href]").forEach(a=>a.setAttribute("href",a.getAttribute("data-href")));rebindDeleteButtons();}
  function rebindDeleteButtons(){document.querySelectorAll("#docsDetailLinks .btn-doc-delete").forEach(btn=>btn.addEventListener("click",()=>deleteDocumentoAdmin(btn.dataset.taller,parseInt(btn.dataset.row),btn)));}
  async function addDocumentoAdmin(){
    if(!selectedTaller) return;
    const titulo=document.getElementById("docsTitulo").value.trim();const url=document.getElementById("docsUrl").value.trim();
    const errEl=document.getElementById("docsFormError");const errMsg=document.getElementById("docsFormErrorMsg");errEl.style.display="none";
    if(!url){errMsg.textContent="La URL es requerida.";errEl.style.display="flex";return;}
    if(!url.startsWith("http")){errMsg.textContent="URL inválida.";errEl.style.display="flex";return;}
    const btn=document.getElementById("btnAddDoc");btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Guardando…';
    try{
      const reqUrl=APPS_SCRIPT_URL+"?action=addDocumento&password="+encodeURIComponent(adminPwd)+"&taller="+encodeURIComponent(selectedTaller)+"&titulo="+encodeURIComponent(titulo)+"&url="+encodeURIComponent(url)+"&t="+Date.now();
      const resp=await fetch(reqUrl);const json=await resp.json();if(json.status!=="ok") throw new Error(json.message);
      if(!documentosData[selectedTaller])documentosData[selectedTaller]=[];
      documentosData[selectedTaller].push({titulo:titulo||"Acceder al material",url,row:json.data.row});
      document.getElementById("docsTitulo").value="";document.getElementById("docsUrl").value="";
      const linksDiv=document.getElementById("docsDetailLinks");if(linksDiv){linksDiv.innerHTML=renderDetailLinks(selectedTaller,documentosData[selectedTaller]);rebindDetailLinks();}
      document.querySelectorAll(".docs-taller-select-card").forEach(c=>{if(c.querySelector(".docs-taller-select-name")?.textContent===selectedTaller){const b=c.querySelector(".docs-count-badge");if(b)b.textContent=documentosData[selectedTaller].length;}});
      showToast("✓ Enlace agregado.","success");
    }catch(e){errMsg.textContent=e.message;errEl.style.display="flex";}
    finally{btn.disabled=false;btn.innerHTML='<i class="fas fa-plus"></i> Agregar enlace';}
  }
  async function deleteDocumentoAdmin(taller,rowIndex,btnEl){
    if(!confirm(`¿Eliminar este enlace del taller "${taller}"?`)) return;
    btnEl.disabled=true;btnEl.innerHTML='<i class="fas fa-spinner fa-spin"></i>';
    try{
      const url=APPS_SCRIPT_URL+"?action=deleteDocumento&password="+encodeURIComponent(adminPwd)+"&rowIndex="+rowIndex+"&t="+Date.now();
      const resp=await fetch(url);const json=await resp.json();if(json.status!=="ok") throw new Error(json.message);
      showToast("Enlace eliminado.","info");documentosData=null;await loadDocumentosAdmin(true);
    }catch(e){showToast("Error: "+e.message,"error");btnEl.disabled=false;btnEl.innerHTML='<i class="fas fa-trash"></i>';}
  }

  function showLoading(id,on){const el=document.getElementById(id);if(el)el.classList.toggle("visible",on);}
  function showToast(msg,type="info"){
    const existing=document.querySelector(".toast");if(existing)existing.remove();
    const toast=document.createElement("div");toast.className="toast "+type;
    const icon=type==="success"?"fa-circle-check":type==="error"?"fa-circle-xmark":"fa-circle-info";
    toast.innerHTML=`<i class="fas ${icon}"></i> ${escapeHtml(msg)}`;
    document.body.appendChild(toast);
    setTimeout(()=>{toast.classList.add("toast-out");setTimeout(()=>toast.remove(),300);},3700);
  }
}


// ============================================================
//  INSTAGRAM POPUP — shown once per session on all public pages
// ============================================================
(function initIgPopup() {
  if (document.body.dataset.page === 'admin') return;
  if (sessionStorage.getItem('ig_dismissed')) return;

  const popup = document.createElement('div');
  popup.className = 'ig-popup';
  popup.setAttribute('role', 'complementary');
  popup.setAttribute('aria-label', 'Seguir en Instagram');
  popup.innerHTML = `
    <button class="ig-popup-close" id="igClose" aria-label="Cerrar"><i class="fas fa-xmark"></i></button>
    <div class="ig-popup-icon"><i class="fab fa-instagram"></i></div>
    <div class="ig-popup-body">
      <strong>¡Entérate de todo!</strong>
      <span>Síguenos en Instagram para no perderte nada del CELIDER 08-06.</span>
      <a class="ig-popup-cta" href="https://www.instagram.com/celider0806/" target="_blank" rel="noopener noreferrer">
        <i class="fab fa-instagram"></i> @celider0806
      </a>
    </div>`;
  document.body.appendChild(popup);

  setTimeout(() => popup.classList.add('visible'), 1800);

  popup.querySelector('#igClose').addEventListener('click', () => {
    popup.classList.remove('visible');
    setTimeout(() => popup.remove(), 400);
    sessionStorage.setItem('ig_dismissed', '1');
  });
})();


// ============================================================
//  COMISIONES — comisiones.html
// ============================================================
const FLAG_MAP = {
  'Nueva Zelanda':'🇳🇿','Emiratos Árabes Unidos':'🇦🇪','Arabia Saudita':'🇸🇦',
  'Arabia':'🇸🇦','Estados Unidos':'🇺🇸','Guinea Ecuatorial':'🇬🇶',
  'Argentina':'🇦🇷','Canadá':'🇨🇦','México':'🇲🇽','Chile':'🇨🇱',
  'Malasia':'🇲🇾','España':'🇪🇸','Francia':'🇫🇷','Alemania':'🇩🇪',
  'Portugal':'🇵🇹','Albania':'🇦🇱','Bélgica':'🇧🇪','Paises Bajos':'🇳🇱',
  'Países Bajos':'🇳🇱','Finlandia':'🇫🇮','Grecia':'🇬🇷','Italia':'🇮🇹',
  'Noruega':'🇳🇴','Polonia':'🇵🇱','Reino Unido':'🇬🇧','Corea del Sur':'🇰🇷',
  'Cuba':'🇨🇺','Egipto':'🇪🇬','Israel':'🇮🇱','Kenia':'🇰🇪',
  'Marruecos':'🇲🇦','Perú':'🇵🇪','Rusia':'🇷🇺','Suiza':'🇨🇭',
  'Chile ':'🇨🇱','Estados Unidos ':'🇺🇸','Guinea Ecuatorial ':'🇬🇶',
  'Argentina ':'🇦🇷','Malasia ':'🇲🇾','España ':'🇪🇸',
};

const COM_CONFIG = {
  'UIT':    { img:'uit.png',    cls:'tab-uit',    color:'#0A4B9E', grad:'linear-gradient(135deg,#0A4B9E 0%,#1565C0 60%,#0D47A1 100%)', desc:'Regula las telecomunicaciones y redes de información a nivel mundial, estableciendo normas técnicas de comunicación global entre naciones.' },
  'OTAN':   { img:'otan.png',   cls:'tab-otan',   color:'#003189', grad:'linear-gradient(135deg,#003189 0%,#1a3a7a 60%,#0d2056 100%)', desc:'Alianza de seguridad colectiva que coordina la defensa y la cooperación político-militar entre sus Estados miembro para garantizar la paz.' },
  'UNESCO': { img:'unesco.png', cls:'tab-unesco', color:'#007DB8', grad:'linear-gradient(135deg,#007DB8 0%,#0097C7 60%,#006A9E 100%)', desc:'Organización que promueve la paz y el desarrollo sostenible a través de la educación, las ciencias, la cultura y la comunicación.' },
};

function initComisiones() {
  const tabsEl  = document.getElementById('comTabs');
  const panels  = document.getElementById('comPanels');
  const loading = document.getElementById('comLoading');

  async function load() {
    try {
      const resp = await fetch(APPS_SCRIPT_URL + '?action=getComisiones&t=' + Date.now());
      const json = await resp.json();
      if (json.status !== 'ok') throw new Error(json.message);
      render(json.data);
    } catch(e) {
      loading.innerHTML = `<i class="fas fa-circle-exclamation" style="font-size:2rem;opacity:.3;"></i><p>Error al cargar: ${escapeHtml(e.message)}</p>`;
    }
  }

  function render(comisiones) {
    loading.classList.remove('visible');
    if (!comisiones.length) { panels.innerHTML = '<p style="color:var(--text-muted)">No hay datos.</p>'; return; }

    tabsEl.innerHTML = '';
    panels.innerHTML = '';

    comisiones.forEach((com, idx) => {
      const abr = com.abreviatura;
      const cfg = COM_CONFIG[abr] || { icon:'fa-flag', cls:'tab-uit', color:'#0052CC', grad:'linear-gradient(135deg,#0052CC,#338FFF)', desc:'' };

      // Tab button
      const btn = document.createElement('button');
      btn.className = `com-tab-btn ${cfg.cls}${idx===0?' active':''}`;
      btn.setAttribute('role','tab');
      btn.setAttribute('aria-selected', idx===0 ? 'true':'false');
      btn.dataset.idx = idx;
      btn.innerHTML = `<span class="com-tab-icon"><img src="${cfg.img}" alt="${abr}"></span>${abr}`;
      tabsEl.appendChild(btn);

      // Panel
      const panel = document.createElement('div');
      panel.className = `com-panel${idx===0?' active':''}`;
      panel.dataset.idx = idx;

      // Group by country pairs
      const countryGroups = {};
      const countryOrder  = [];
      com.delegados.forEach(d => {
        const c = d.pais.trim() || 'Sin país asignado';
        if (!countryGroups[c]) { countryGroups[c] = []; countryOrder.push(c); }
        countryGroups[c].push(d);
      });

      panel.innerHTML = `
        <div class="com-hero" style="background:${cfg.grad}">
          <div class="com-hero-top">
            <div class="com-hero-logo-wrap"><img class="com-hero-logo" src="${cfg.img}" alt="${abr} logo"></div>
            <div>
              <div class="com-hero-abr">${escapeHtml(abr)}</div>
              <div class="com-hero-name">${escapeHtml(com.nombre.replace(abr + ' ','').replace(/[()]/g,''))}</div>
            </div>
          </div>
          <p class="com-hero-desc">${cfg.desc}</p>
          <div class="com-hero-meta">
            <span class="com-meta-chip"><i class="fas fa-users"></i> ${com.delegados.length} delegados</span>
            <span class="com-meta-chip"><i class="fas fa-globe"></i> ${countryOrder.length} países</span>
          </div>
        </div>
        <div class="com-search-bar">
          <div class="search-wrapper">
            <i class="fas fa-search search-icon"></i>
            <input type="search" class="search-input com-search" placeholder="Buscar delegado o país…" autocomplete="off">
          </div>
        </div>
        <div class="com-countries-grid">
          ${countryOrder.map(country => {
            const flag = FLAG_MAP[country.trim()] || '🌍';
            const delegates = countryGroups[country];
            return `
              <div class="country-card" data-country="${escapeHtml(country)}" data-delegates="${escapeHtml(delegates.map(d=>d.nombre).join('|'))}">
                <div class="country-header">
                  <span class="country-flag">${flag}</span>
                  <span class="country-name">${escapeHtml(country.trim())}</span>
                </div>
                <div class="country-delegates">
                  ${delegates.map(d => `
                    <div class="delegate-row">
                      <i class="fas fa-user"></i>
                      ${escapeHtml(d.nombre)}
                    </div>`).join('')}
                </div>
              </div>`;
          }).join('')}
        </div>`;

      // Search within panel
      panel.querySelector('.com-search').addEventListener('input', function() {
        const q = this.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
        panel.querySelectorAll('.country-card').forEach(card => {
          const country = card.dataset.country.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
          const dels    = card.dataset.delegates.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
          card.style.display = (!q || country.includes(q) || dels.includes(q)) ? '' : 'none';
        });
      });

      panels.appendChild(panel);
    });

    // Tab switching
    tabsEl.querySelectorAll('.com-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        tabsEl.querySelectorAll('.com-tab-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected','false'); });
        panels.querySelectorAll('.com-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        btn.setAttribute('aria-selected','true');
        panels.querySelector(`[data-idx="${btn.dataset.idx}"]`).classList.add('active');
      });
    });
  }

  load();
}

// ── Route comisiones page ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (document.body.dataset.page === 'comisiones') initComisiones();
});


// ============================================================
//  ADMIN — COMISIONES TAB + INLINE EDIT MODAL
// ============================================================

// Attach to existing initAdmin function via extension
(function patchAdminComisiones() {
  document.addEventListener('DOMContentLoaded', () => {
    if (document.body.dataset.page !== 'admin') return;

    // Wait for appShell to become visible (after login), then wire up comisiones
    const observer = new MutationObserver(() => {
      const shell = document.getElementById('appShell');
      if (shell && shell.classList.contains('visible')) {
        observer.disconnect();
        wireAdminComisiones();
        wireEditModal();
        wireAdminDelegadosEdit();
      }
    });
    const shell = document.getElementById('appShell');
    if (shell) observer.observe(shell, { attributes: true, attributeFilter: ['class'] });
  });
})();

// ── Edit Modal ────────────────────────────────────────────────
let _editModalCallback = null;

function wireEditModal() {
  const modal  = document.getElementById('editModal');
  const closeB = document.getElementById('editModalClose');
  const cancelB= document.getElementById('editModalCancel');
  const saveB  = document.getElementById('editModalSave');
  if (!modal) return;

  [closeB, cancelB].forEach(b => b && b.addEventListener('click', hideEditModal));
  modal.addEventListener('click', e => { if (e.target === modal) hideEditModal(); });

  saveB && saveB.addEventListener('click', async () => {
    if (!_editModalCallback) return;
    saveB.disabled = true;
    saveB.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando…';
    document.getElementById('editModalError').style.display = 'none';
    try {
      await _editModalCallback();
      hideEditModal();
    } catch(e) {
      const errEl = document.getElementById('editModalError');
      errEl.textContent = e.message;
      errEl.style.display = 'block';
    } finally {
      saveB.disabled = false;
      saveB.innerHTML = '<i class="fas fa-floppy-disk"></i> Guardar';
    }
  });
}

function showEditModal(title, fields, onSave) {
  const modal  = document.getElementById('editModal');
  const titleEl= document.getElementById('editModalTitle');
  const fieldsEl=document.getElementById('editModalFields');
  const errEl  = document.getElementById('editModalError');
  if (!modal) return;
  titleEl.textContent = title;
  errEl.style.display = 'none';
  fieldsEl.innerHTML = fields.map(f => `
    <div class="field-group">
      <label for="ef_${escapeHtml(f.key)}">${escapeHtml(f.label)}</label>
      <input type="text" id="ef_${escapeHtml(f.key)}" class="search-input"
        value="${escapeHtml(f.value || '')}" ${f.readonly ? 'disabled style="opacity:.5"' : ''} />
    </div>`).join('');
  _editModalCallback = async () => {
    const result = {};
    fields.forEach(f => {
      const inp = document.getElementById('ef_' + f.key);
      if (inp && !f.readonly) result[f.label] = inp.value.trim();
    });
    await onSave(result);
  };
  modal.style.display = 'flex';
  // Focus first input
  setTimeout(() => fieldsEl.querySelector('input:not([disabled])')?.focus(), 50);
}

function hideEditModal() {
  const modal = document.getElementById('editModal');
  if (modal) modal.style.display = 'none';
  _editModalCallback = null;
}

// ── Wire Delegados Edit Buttons ───────────────────────────────
function wireAdminDelegadosEdit() {
  // Observe delegadosBody for new rows and add edit buttons
  const body = document.getElementById('delegadosBody');
  if (!body) return;

  function addEditButtons() {
    body.querySelectorAll('tr:not([data-edit-wired])').forEach((tr, idx) => {
      tr.dataset.editWired = '1';
      const lastTd = tr.lastElementChild;
      if (!lastTd) return;
      const btn = document.createElement('button');
      btn.className = 'edit-btn';
      btn.innerHTML = '<i class="fas fa-pen"></i> Editar';
      btn.style.marginLeft = '.5rem';
      btn.addEventListener('click', () => openDelegadoEdit(tr, idx));
      lastTd.style.display = 'flex';
      lastTd.style.alignItems = 'center';
      lastTd.appendChild(btn);
    });
  }

  const observer = new MutationObserver(addEditButtons);
  observer.observe(body, { childList: true });
}

function openDelegadoEdit(tr, idx) {
  const adminPwd = localStorage.getItem('celider_admin_token') || '';
  const cells = Array.from(tr.querySelectorAll('td'));
  const head  = Array.from(document.getElementById('delegadosHead').querySelectorAll('th'));

  // Build fields from row cells (skip # column with row-num)
  const fields = head.map((th, i) => ({
    key:   'col_' + i,
    label: th.textContent.trim(),
    value: cells[i] ? cells[i].innerText.replace(/^\d+\s*/, '').trim() : ''
  }));

  // We need the spreadsheet rowIndex — approximate as idx+2 (header=1)
  // The delegadosFull endpoint returns rows in order; idx is 0-based data row
  showEditModal('Editar delegado', fields, async (result) => {
    const rowIndex = idx + 2; // row 1=header, row 2=first data
    const data = encodeURIComponent(JSON.stringify(result));
    const url  = APPS_SCRIPT_URL
      + '?action=updateRow&password=' + encodeURIComponent(adminPwd)
      + '&sheet=delegados&rowIndex=' + rowIndex
      + '&data=' + data + '&t=' + Date.now();
    const resp = await fetch(url);
    const json = await resp.json();
    if (json.status !== 'ok') throw new Error(json.message || 'Error al guardar');

    // Update cells in DOM
    head.forEach((th, i) => {
      const key = th.textContent.trim();
      if (key in result && cells[i]) {
        const nameCell = cells[i].querySelector('.nombre-cell');
        if (nameCell) {
          const span = nameCell.querySelector('.row-num');
          nameCell.innerHTML = '';
          if (span) nameCell.appendChild(span);
          nameCell.append(result[key]);
        } else {
          const editBtn = cells[i].querySelector('.edit-btn');
          cells[i].innerText = result[key];
          if (editBtn) cells[i].appendChild(editBtn);
        }
      }
    });

    adminShowToast('✓ Delegado actualizado.', 'success');
  });
}

// ── Wire Admin Comisiones Tab ────────────────────────────────
let _comisionesAdminData = null;

function wireAdminComisiones() {
  const recargarBtn = document.getElementById('btnRecargarComisiones');
  const searchEl    = document.getElementById('searchComisiones');
  if (recargarBtn) recargarBtn.addEventListener('click', () => loadComisionesAdmin(true));
  if (searchEl)    searchEl.addEventListener('input', () => filterComisionesAdmin(searchEl.value));

  // Hook into tab switching
  document.querySelectorAll('.tab-btn[data-tab="tab-comisiones"]').forEach(b => {
    b.addEventListener('click', () => {
      if (!_comisionesAdminData) loadComisionesAdmin();
    });
  });
}

async function loadComisionesAdmin(force = false) {
  if (_comisionesAdminData && !force) { renderComisionesAdmin(); return; }
  const adminPwd = localStorage.getItem('celider_admin_token') || '';
  showAdminLoading('loadingComisiones', true);
  document.getElementById('tableComisionesWrap').style.display = 'none';
  document.getElementById('controlsComisiones').style.display  = 'none';
  try {
    const url  = APPS_SCRIPT_URL + '?action=getComisionesAdmin&password=' + encodeURIComponent(adminPwd) + '&t=' + Date.now();
    const resp = await fetch(url);
    const json = await resp.json();
    if (json.status !== 'ok') throw new Error(json.message);
    _comisionesAdminData = json.data;
    renderComisionesAdmin();
  } catch(e) {
    adminShowToast('Error: ' + e.message, 'error');
  } finally {
    showAdminLoading('loadingComisiones', false);
  }
}

function renderComisionesAdmin(filter = '') {
  if (!_comisionesAdminData) return;
  const { headers, rows } = _comisionesAdminData;
  const norm = filter.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');

  const filtered = rows.filter(r => !norm || r.data.some(v =>
    v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes(norm)
  ));

  // Build header
  const thead = document.getElementById('comisionesHead');
  thead.innerHTML = headers.map(h => `<th scope="col">${escapeHtml(h)}</th>`).join('') + '<th scope="col">Acción</th>';

  // Build body
  const comBadgeClass = v => {
    if (v.startsWith('UIT'))    return 'com-badge com-uit';
    if (v.startsWith('OTAN'))   return 'com-badge com-otan';
    if (v.startsWith('UNESCO')) return 'com-badge com-unesco';
    return '';
  };

  document.getElementById('comisionesBody').innerHTML = filtered.map((row, i) => `
    <tr data-row-index="${row.rowIndex}" style="animation-delay:${Math.min(i*0.02,.35)}s">
      ${row.data.map((val, ci) => {
        if (ci === 0) {
          const abr = val.split(' ')[0];
          const bc  = comBadgeClass(val);
          return `<td>${bc ? `<span class="${bc}">${escapeHtml(abr)}</span>` : escapeHtml(val)}</td>`;
        }
        if (ci === 1) return `<td><div class="nombre-cell"><span class="row-num">${i+1}</span>${escapeHtml(val)}</div></td>`;
        return `<td>${escapeHtml(val||'—')}</td>`;
      }).join('')}
      <td>
        <button class="edit-btn com-edit-btn" data-row="${row.rowIndex}" data-idx="${i}">
          <i class="fas fa-pen"></i> Editar
        </button>
      </td>
    </tr>`).join('');

  // Wire edit buttons
  document.querySelectorAll('.com-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const rowIndex = parseInt(btn.dataset.row);
      const rowItem  = rows.find(r => r.rowIndex === rowIndex);
      if (!rowItem) return;
      openComisionEdit(rowItem, headers);
    });
  });

  document.getElementById('countComisiones').textContent = filtered.length + ' filas';
  document.getElementById('controlsComisiones').style.display  = '';
  document.getElementById('tableComisionesWrap').style.display = '';
}

function filterComisionesAdmin(q) { renderComisionesAdmin(q); }

function openComisionEdit(rowItem, headers) {
  const adminPwd = localStorage.getItem('celider_admin_token') || '';
  const fields   = headers.map((h, i) => ({ key:'col_'+i, label:h, value:rowItem.data[i]||'' }));

  showEditModal('Editar fila de comisión', fields, async (result) => {
    const data = encodeURIComponent(JSON.stringify(result));
    const url  = APPS_SCRIPT_URL
      + '?action=updateRow&password=' + encodeURIComponent(adminPwd)
      + '&sheet=Comisiones&rowIndex=' + rowItem.rowIndex
      + '&data=' + data + '&t=' + Date.now();
    const resp = await fetch(url);
    const json = await resp.json();
    if (json.status !== 'ok') throw new Error(json.message || 'Error al guardar');

    // Update cached data
    headers.forEach((h, i) => { if (h in result) rowItem.data[i] = result[h]; });
    renderComisionesAdmin(document.getElementById('searchComisiones')?.value || '');
    adminShowToast('✓ Fila actualizada.', 'success');
  });
}

// ── Admin helpers ─────────────────────────────────────────────
function showAdminLoading(id, on) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('visible', on);
}

function adminShowToast(msg, type = 'info') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  const icon = type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-xmark' : 'fa-circle-info';
  toast.innerHTML = `<i class="fas ${icon}"></i> ${escapeHtml(msg)}`;
  document.body.appendChild(toast);
  setTimeout(() => { toast.classList.add('toast-out'); setTimeout(() => toast.remove(), 300); }, 3700);
}