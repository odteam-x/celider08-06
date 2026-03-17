// ============================================================
// script.js — CELIDER 08-06
// Lógica unificada para index.html, talleres.html y admin.html
// ============================================================

// ── URL DEL WEB APP ──────────────────────────────────────────
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz0y4naaKxam2L74d8oPZE6DFvOJLeKlnrHZPgDCnxhShvcaL4Bs3oePRXRvcjdFQ1T/exec";

// ── UTILIDADES COMPARTIDAS ───────────────────────────────────
function escapeHtml(text) {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

function initHamburger() {
  const btn = document.getElementById("hamburgerBtn");
  const nav = document.getElementById("mobileNav");
  if (!btn || !nav) return;

  btn.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    btn.classList.toggle("open", isOpen);
    btn.setAttribute("aria-expanded", isOpen);
    btn.setAttribute("aria-label", isOpen ? "Cerrar menú" : "Abrir menú");
  });

  nav.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      btn.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
      btn.setAttribute("aria-label", "Abrir menú");
    });
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 960) {
      nav.classList.remove("open");
      btn.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
    }
  });
}

// ── DETECCIÓN DE PÁGINA Y ARRANQUE ───────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initHamburger();

  const page = document.body.dataset.page;
  if (page === "delegados") initDelegados();
  if (page === "talleres")  initTalleres();
  if (page === "admin")     initAdmin();
});


// ============================================================
// INDEX.HTML — LISTADO DE DELEGADOS
// ============================================================
function initDelegados() {
  // Estado global
  let allStudents  = [];
  let currentSort  = "az";
  let filterCentro = "";
  let searchQuery  = "";

  // Referencias DOM
  const tableBody    = document.getElementById("tableBody");
  const searchInput  = document.getElementById("searchInput");
  const centroSelect = document.getElementById("centroFilter");
  const btnAZ        = document.getElementById("btnAZ");
  const btnZA        = document.getElementById("btnZA");
  const btnClear     = document.getElementById("btnClear");
  const resultsCount = document.getElementById("resultsCount");
  const loadingState = document.getElementById("loadingState");
  const emptyState   = document.getElementById("emptyState");
  const tableSection = document.getElementById("tableSection");

  // Eventos
  searchInput.addEventListener("input", () => {
    searchQuery = searchInput.value.trim().toLowerCase();
    renderTable();
  });
  centroSelect.addEventListener("change", () => {
    filterCentro = centroSelect.value;
    renderTable();
  });
  btnAZ.addEventListener("click", () => { currentSort = "az"; updateSortButtons(); renderTable(); });
  btnZA.addEventListener("click", () => { currentSort = "za"; updateSortButtons(); renderTable(); });
  btnClear.addEventListener("click", clearFilters);

  // Carga de datos
  loadStudents();

  async function loadStudents() {
    showLoading(true);
    try {
      const url      = APPS_SCRIPT_URL + "?action=getDelegados&t=" + Date.now();
      const response = await fetch(url);
      if (!response.ok) throw new Error("Error HTTP: " + response.status);
      const json = await response.json();
      if (json.status === "error") throw new Error(json.message || "Error en el servidor");
      allStudents = json.data || [];
      populateCentroFilter();
      renderTable();
    } catch (error) {
      console.error("Error al cargar datos:", error);
      showError(error.message);
    } finally {
      showLoading(false);
    }
  }

  function populateCentroFilter() {
    const centros = [...new Set(
      allStudents.map(s => s.centro).filter(c => c && c.trim() !== "")
    )].sort((a, b) => a.localeCompare(b, "es"));
    centroSelect.innerHTML = '<option value="">Todos los centros</option>';
    centros.forEach(centro => {
      const opt = document.createElement("option");
      opt.value = centro;
      opt.textContent = centro;
      centroSelect.appendChild(opt);
    });
  }

  function renderTable() {
    let filtered = [...allStudents];
    if (searchQuery)  filtered = filtered.filter(s => s.nombre.toLowerCase().includes(searchQuery));
    if (filterCentro) filtered = filtered.filter(s => s.centro === filterCentro);
    filtered.sort((a, b) => {
      const cmp = a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" });
      return currentSort === "az" ? cmp : -cmp;
    });
    updateResultsCount(filtered.length);
    if (filtered.length === 0) {
      tableSection.style.display = "none";
      emptyState.classList.add("visible");
      return;
    }
    tableSection.style.display = "";
    emptyState.classList.remove("visible");
    tableBody.innerHTML = filtered.map((student, index) => {
      const correo = student.correo ? student.correo.trim() : "";
      const correoCell = correo
        ? `<a href="mailto:${escapeHtml(correo)}" class="correo-link" title="${escapeHtml(correo)}">
             <i class="fas fa-envelope"></i>
             <span class="correo-text">${escapeHtml(correo)}</span>
           </a>`
        : `<span style="color:var(--text-muted);font-size:.8rem;">—</span>`;
      return `
      <tr style="animation-delay:${Math.min(index * 0.03, 0.4)}s">
        <td>
          <div class="nombre-cell">
            <span class="row-num">${index + 1}</span>
            ${escapeHtml(student.nombre)}
          </div>
        </td>
        <td>
          <span class="centro-badge">
            <i class="fas fa-school"></i>
            ${escapeHtml(student.centro || "—")}
          </span>
        </td>
        <td class="correo-cell">${correoCell}</td>
      </tr>`;
    }).join("");
  }

  function clearFilters() {
    searchInput.value = "";
    centroSelect.value = "";
    currentSort = "az";
    searchQuery = "";
    filterCentro = "";
    updateSortButtons();
    renderTable();
  }

  function updateSortButtons() {
    btnAZ.classList.toggle("active", currentSort === "az");
    btnZA.classList.toggle("active", currentSort === "za");
  }

  function updateResultsCount(count) {
    const total = allStudents.length;
    resultsCount.innerHTML = count === total
      ? `Mostrando <strong>${total}</strong> delegados`
      : `Mostrando <strong>${count}</strong> de <strong>${total}</strong> delegados`;
  }

  function showLoading(state) {
    if (state) {
      loadingState.classList.add("visible");
      tableSection.style.display = "none";
      emptyState.classList.remove("visible");
    } else {
      loadingState.classList.remove("visible");
    }
  }

  function showError(msg) {
    loadingState.classList.remove("visible");
    tableSection.style.display = "none";
    emptyState.classList.add("visible");
    emptyState.querySelector("p").textContent = "Error al cargar los datos";
    emptyState.querySelector("span").textContent = msg || "Verifica la configuración del Web App";
  }
}


// ============================================================
// TALLERES.HTML — CONSULTA PÚBLICA DE ASISTENCIA
// ============================================================
const TALLERES_ICONOS = {
  "Introducción a los Modelos de Naciones Unidas": "fa-globe",
  "Procedimiento Parlamentario":                   "fa-gavel",
  "Redacción Diplomática y Documentos de Trabajo": "fa-file-pen",
  "Propuestas y Construcción de Soluciones":       "fa-lightbulb",
  "Liderazgo":                                     "fa-star",
  "Oratoria y Argumentación":                      "fa-microphone"
};

function initTalleres() {
  const nameInput     = document.getElementById("nameInput");
  const btnBuscar     = document.getElementById("btnBuscar");
  const searchLoading = document.getElementById("searchLoading");
  const notFoundState = document.getElementById("notFoundState");
  const resultSection = document.getElementById("resultSection");
  const delegadosList = document.getElementById("delegadosList");
  const btnReintentar = document.getElementById("btnReintentar");

  // Documentos públicos cargados al iniciar, disponibles para las tarjetas
  let publicDocs    = {};
  let lastResultData = null;   // guarda el último resultado para re-renderizar si los docs llegan tarde

  cargarNombres();
  loadDocumentosPublic();

  btnBuscar.addEventListener("click", buscar);
  nameInput.addEventListener("keydown", e => { if (e.key === "Enter") buscar(); });
  btnReintentar.addEventListener("click", () => resetView(true));

  async function cargarNombres() {
    try {
      const url  = APPS_SCRIPT_URL + "?action=getDelegados&t=" + Date.now();
      const resp = await fetch(url);
      const json = await resp.json();
      if (json.status === "ok" && json.data) {
        json.data.forEach(d => {
          const opt = document.createElement("option");
          opt.value = d.nombre;
          delegadosList.appendChild(opt);
        });
      }
    } catch (e) {
      console.warn("No se pudo cargar autocompletado:", e);
    }
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
      const data = json.data;
      if (!data.found) {
        showNotFound(nombre);
      } else {
        renderResultado(data);
      }
    } catch (e) {
      console.error("Error buscando asistencia:", e);
      showNotFound(nombre, "Error al conectar con el servidor. Intenta de nuevo.");
    } finally {
      showSearchLoading(false);
    }
  }

  function renderResultado(data) {
    lastResultData = data;   // guardar para re-render cuando lleguen los docs
    document.getElementById("delegadoNombre").textContent = data.nombre;
    document.getElementById("pctNum").textContent = (data.resumen?.porcentaje ?? "—") + "%";

    if (data.resumen) {
      document.getElementById("chipPresente").innerHTML =
        `<i class="fas fa-circle-check"></i> ${data.resumen.presentes} presente${data.resumen.presentes !== 1 ? "s" : ""}`;
      document.getElementById("chipAusente").innerHTML =
        `<i class="fas fa-circle-xmark"></i> ${data.resumen.ausentes} ausente${data.resumen.ausentes !== 1 ? "s" : ""}`;
    }

    const grid    = document.getElementById("talleresGrid");
    grid.innerHTML = "";
    const talleres = data.talleres || Object.keys(data.asistencia);
    talleres.forEach((taller, idx) => {
      const status   = (data.asistencia[taller] || "").trim();
      const pilClass = status === "Presente" ? "pill-presente" : status === "Ausente" ? "pill-ausente" : "pill-noregistrado";
      const pilLabel = status || "No registrado";
      const icono    = TALLERES_ICONOS[taller] || "fa-chalkboard-teacher";

      const card = document.createElement("div");
      card.className = "taller-card";
      card.style.animationDelay = (idx * 0.07) + "s";
      card.innerHTML = `
        <span class="taller-num">Taller ${idx + 1}</span>
        <div style="display:flex;align-items:flex-start;gap:.75rem;">
          <i class="fas ${icono}" style="color:var(--primary-light);margin-top:.18rem;flex-shrink:0;"></i>
          <span class="taller-nombre">${escapeHtml(taller)}</span>
        </div>
        <span class="asistencia-pill ${pilClass}">
          <span class="pill-dot"></span>
          ${escapeHtml(pilLabel)}
        </span>
      `;
      // Agregar botón de materiales via DOM para no corromper URLs con escapeHtml
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

  // ── MATERIALES PÚBLICOS ───────────────────────────────────

  /**
   * Construye y adjunta el botón de materiales a una tarjeta de taller.
   * USA setAttribute para el href → nunca se escapa la URL.
   */
  function appendMaterialesBtn(card, taller) {
    // Limpiar botón anterior si existe
    const old = card.querySelector(".taller-material-btn, .taller-material-multi");
    if (old) old.remove();

    const links = publicDocs[taller] || [];
    if (!links.length) return;

    if (links.length === 1) {
      // Un solo enlace → botón directo
      const a = document.createElement("a");
      a.setAttribute("href", links[0].url);   // ← setAttribute, no escapeHtml
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
      a.className = "taller-material-btn";
      a.innerHTML = `<i class="fas fa-folder-open"></i>
                     <span>Acceder a materiales</span>
                     <i class="fas fa-arrow-up-right-from-square taller-material-arrow"></i>`;
      card.appendChild(a);
    } else {
      // Múltiples enlaces → desplegable
      const wrap = document.createElement("div");
      wrap.className = "taller-material-multi";

      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "taller-material-btn taller-material-toggle";
      toggle.innerHTML = `<i class="fas fa-folder-open"></i>
                          <span>Materiales del taller</span>
                          <i class="fas fa-chevron-down taller-material-chevron"></i>`;
      toggle.addEventListener("click", () => wrap.classList.toggle("open"));
      wrap.appendChild(toggle);

      const list = document.createElement("div");
      list.className = "taller-material-list";
      links.forEach(l => {
        const a = document.createElement("a");
        a.setAttribute("href", l.url);         // ← setAttribute
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener noreferrer");
        a.className = "taller-material-dropdown-item";
        a.innerHTML = `<i class="fas fa-file-lines"></i>
                       <span>${escapeHtml(l.titulo)}</span>
                       <i class="fas fa-arrow-up-right-from-square" style="margin-left:auto;font-size:.65rem;opacity:.6;"></i>`;
        list.appendChild(a);
      });
      wrap.appendChild(list);
      card.appendChild(wrap);
    }
  }

  async function loadDocumentosPublic() {
    try {
      const apiUrl = APPS_SCRIPT_URL + "?action=getDocumentos&t=" + Date.now();
      const resp   = await fetch(apiUrl);
      const json   = await resp.json();
      if (json.status !== "ok") throw new Error(json.message);
      publicDocs = json.data || {};

      // Si ya hay un resultado visible, actualizar sus tarjetas con los materiales
      if (lastResultData && resultSection && resultSection.style.display !== "none") {
        document.querySelectorAll(".taller-card").forEach(card => {
          const nombreEl = card.querySelector(".taller-nombre");
          if (nombreEl) appendMaterialesBtn(card, nombreEl.textContent.trim());
        });
      }
    } catch (e) {
      console.warn("No se pudieron cargar materiales:", e);
    }
  }
}


// ============================================================
// ADMIN.HTML — PANEL ADMINISTRATIVO
// ============================================================
const ESTADOS     = ["", "Presente", "Ausente"];
const ESTADO_CLASS = { "": "estado-vacio", "Presente": "estado-presente", "Ausente": "estado-ausente" };
const ESTADO_LABEL = { "": "—", "Presente": "✓ Presente", "Ausente": "✕ Ausente" };

function initAdmin() {
  // Estado global admin
  let adminPwd       = "";
  let delegadosData  = null;
  let asistenciaData = null;
  let pendingChanges = new Map();
  let tabsLoaded     = {};

  // DOM login
  const loginScreen = document.getElementById("loginScreen");
  const appShell    = document.getElementById("appShell");
  const pwdInput    = document.getElementById("pwdInput");
  const btnLogin    = document.getElementById("btnLogin");
  const loginError  = document.getElementById("loginError");
  const btnLogout   = document.getElementById("btnLogout");

  // Login
  pwdInput.addEventListener("keydown", e => { if (e.key === "Enter") doLogin(); });
  btnLogin.addEventListener("click", doLogin);
  btnLogout.addEventListener("click", doLogout);

  // Tabs
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // Delegados
  document.getElementById("btnRecargarDelegados").addEventListener("click", () => loadDelegadosFull(true));
  document.getElementById("searchDelegados").addEventListener("input", filterDelegados);

  // Asistencia
  document.getElementById("btnRecargarAsistencia").addEventListener("click", () => loadAsistencia(true));
  document.getElementById("searchAsistencia").addEventListener("input", filterAsistencia);
  document.getElementById("btnGuardar").addEventListener("click", guardarCambios);
  document.getElementById("btnDescartarCambios").addEventListener("click", descartarCambios);

  // Stats
  document.getElementById("btnRecargarStats").addEventListener("click", () => loadStats(true));

  // Documentos
  document.getElementById("btnRecargarDocs").addEventListener("click", () => loadDocumentosAdmin(true));

  // ── LOGIN ──────────────────────────────────────────────────
  async function doLogin() {
    const pwd = pwdInput.value.trim();
    if (!pwd) return;
    loginError.classList.remove("visible");
    btnLogin.disabled = true;
    btnLogin.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando…';
    try {
      const url  = APPS_SCRIPT_URL + "?action=auth&password=" + encodeURIComponent(pwd) + "&t=" + Date.now();
      const resp = await fetch(url);
      const json = await resp.json();
      if (json.status === "ok" && json.data.valid) {
        adminPwd = pwd;
        loginScreen.classList.add("hidden");
        setTimeout(() => loginScreen.style.display = "none", 400);
        appShell.classList.add("visible");
        loadDelegadosFull();
      } else {
        loginError.classList.add("visible");
        pwdInput.select();
      }
    } catch (e) {
      loginError.querySelector("span").textContent = "Error de conexión. Intenta de nuevo.";
      loginError.classList.add("visible");
    } finally {
      btnLogin.disabled = false;
      btnLogin.innerHTML = '<i class="fas fa-lock-open"></i> Ingresar';
    }
  }

  function doLogout() {
    adminPwd = ""; delegadosData = null; asistenciaData = null;
    pendingChanges.clear(); tabsLoaded = {};
    appShell.classList.remove("visible");
    loginScreen.style.display = "flex";
    setTimeout(() => loginScreen.classList.remove("hidden"), 10);
    pwdInput.value = "";
  }

  // ── TABS ───────────────────────────────────────────────────
  function switchTab(id) {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === id));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.toggle("active", c.id === id));
    if (id === "tab-asistencia" && !tabsLoaded.asistencia) loadAsistencia();
    if (id === "tab-stats"      && !tabsLoaded.stats)      loadStats();
    if (id === "tab-documentos" && !tabsLoaded.documentos) loadDocumentosAdmin();
  }

  // ── DELEGADOS FULL ─────────────────────────────────────────
  async function loadDelegadosFull(forceReload = false) {
    if (delegadosData && !forceReload) { renderDelegados(); return; }
    showLoading("loadingDelegados", true);
    document.getElementById("tableDelegadosWrap").style.display = "none";
    document.getElementById("controlsDelegados").style.display  = "none";
    try {
      const url  = APPS_SCRIPT_URL + "?action=getDelegadosFull&password=" + encodeURIComponent(adminPwd) + "&t=" + Date.now();
      const resp = await fetch(url);
      const json = await resp.json();
      if (json.status !== "ok") throw new Error(json.message);
      delegadosData = json.data;
      renderDelegados();
    } catch (e) {
      showToast("Error: " + e.message, "error");
    } finally {
      showLoading("loadingDelegados", false);
    }
  }

  function renderDelegados(filter = "") {
    if (!delegadosData) return;
    const { headers, rows } = delegadosData;
    const norm     = filter.toLowerCase();
    const filtered = rows.filter(r => !norm || r.some(cell => cell.toLowerCase().includes(norm)));

    const thead = document.getElementById("delegadosHead");
    if (!thead.children.length) {
      headers.forEach(h => {
        const th = document.createElement("th");
        th.scope = "col"; th.textContent = h;
        thead.appendChild(th);
      });
    }

    document.getElementById("delegadosBody").innerHTML = filtered.map((row, i) =>
      `<tr style="animation-delay:${Math.min(i * 0.02, 0.35)}s">
        ${row.map((cell, ci) => ci === 0
          ? `<td><div class="nombre-cell"><span class="row-num">${i + 1}</span>${escapeHtml(cell)}</div></td>`
          : `<td>${escapeHtml(cell || "—")}</td>`
        ).join("")}
      </tr>`
    ).join("");

    document.getElementById("countDelegados").textContent = filtered.length + " delegados";
    document.getElementById("controlsDelegados").style.display  = "";
    document.getElementById("tableDelegadosWrap").style.display = "";
  }

  function filterDelegados() { renderDelegados(document.getElementById("searchDelegados").value); }

  // ── ASISTENCIA ─────────────────────────────────────────────
  async function loadAsistencia(forceReload = false) {
    if (asistenciaData && !forceReload) { renderAsistencia(); return; }
    tabsLoaded.asistencia = true;
    showLoading("loadingAsistencia", true);
    document.getElementById("asistenciaWrap").style.display      = "none";
    document.getElementById("saveToolbar").style.display         = "none";
    document.getElementById("controlsAsistencia").style.display  = "none";
    try {
      const url  = APPS_SCRIPT_URL + "?action=getAsistencia&password=" + encodeURIComponent(adminPwd) + "&t=" + Date.now();
      const resp = await fetch(url);
      const json = await resp.json();
      if (json.status !== "ok") throw new Error(json.message);
      asistenciaData = json.data;
      pendingChanges.clear();
      renderAsistencia();
    } catch (e) {
      showToast("Error cargando asistencia: " + e.message, "error");
    } finally {
      showLoading("loadingAsistencia", false);
    }
  }

  function renderAsistencia(filter = "") {
    if (!asistenciaData) return;
    const { talleres, delegados } = asistenciaData;
    const norm     = filter.toLowerCase();
    const filtered = delegados.filter(d => !norm || d.nombre.toLowerCase().includes(norm));

    // Cabecera
    const thead = document.getElementById("asistenciaHead");
    thead.innerHTML = `<th class="col-delegado" scope="col">Delegado</th>`;
    talleres.forEach(t => {
      const th = document.createElement("th");
      th.className = "col-taller"; th.scope = "col"; th.title = t;
      th.textContent = t.length > 25 ? t.substring(0, 24) + "…" : t;
      thead.appendChild(th);
    });
    const thPct = document.createElement("th");
    thPct.className = "col-pct"; thPct.scope = "col"; thPct.textContent = "% Asist.";
    thead.appendChild(thPct);

    // Filas
    const tbody = document.getElementById("asistenciaBody");
    tbody.innerHTML = "";
    filtered.forEach((del, i) => {
      const tr = document.createElement("tr");
      tr.dataset.nombre = del.nombre;
      tr.style.animationDelay = Math.min(i * 0.02, 0.3) + "s";

      const tdNombre = document.createElement("td");
      tdNombre.innerHTML = `<div class="nombre-cell"><span class="row-num">${i + 1}</span>${escapeHtml(del.nombre)}</div>`;
      tr.appendChild(tdNombre);

      talleres.forEach(taller => {
        const td       = document.createElement("td");
        const key      = del.nombre + "||" + taller;
        const current  = pendingChanges.has(key) ? pendingChanges.get(key) : (del.asistencia[taller] || "");
        const modified = pendingChanges.has(key);
        const cell     = buildAsistenciaCell(current, modified);
        cell.addEventListener("click", () => toggleCell(cell, del.nombre, taller));
        td.appendChild(cell);
        tr.appendChild(td);
      });

      const pcts   = talleres.map(t => {
        const k = del.nombre + "||" + t;
        return (pendingChanges.has(k) ? pendingChanges.get(k) : (del.asistencia[t] || "")) === "Presente";
      });
      const pctVal = Math.round((pcts.filter(Boolean).length / talleres.length) * 100);
      const tdPct  = document.createElement("td");
      tdPct.dataset.pct = del.nombre;
      tdPct.innerHTML   = buildPctCell(pctVal);
      tr.appendChild(tdPct);

      tbody.appendChild(tr);
    });

    document.getElementById("countAsistencia").textContent      = filtered.length + " delegados";
    document.getElementById("controlsAsistencia").style.display = "";
    document.getElementById("saveToolbar").style.display        = "";
    document.getElementById("asistenciaWrap").style.display     = "";
    updatePendingCount();
  }

  function buildAsistenciaCell(estado, modified) {
    const cell = document.createElement("div");
    cell.className = "asistencia-cell " + (ESTADO_CLASS[estado] || "estado-vacio");
    if (modified) cell.classList.add("modified");
    cell.textContent   = ESTADO_LABEL[estado] || "—";
    cell.dataset.estado = estado;
    return cell;
  }

  function buildPctCell(pctVal) {
    return `<div class="pct-cell">
      <span class="pct-num">${pctVal}%</span>
      <div class="pct-bar"><div class="pct-fill" style="width:${pctVal}%"></div></div>
    </div>`;
  }

  function toggleCell(cell, nombre, taller) {
    const key     = nombre + "||" + taller;
    const current = cell.dataset.estado || "";
    const nextIdx = (ESTADOS.indexOf(current) + 1) % ESTADOS.length;
    const next    = ESTADOS[nextIdx];
    const orig    = asistenciaData.delegados.find(d => d.nombre === nombre)?.asistencia[taller] || "";

    cell.className     = "asistencia-cell " + ESTADO_CLASS[next];
    cell.textContent   = ESTADO_LABEL[next];
    cell.dataset.estado = next;

    if (next !== orig) { pendingChanges.set(key, next); cell.classList.add("modified"); }
    else               { pendingChanges.delete(key);    cell.classList.remove("modified"); }

    actualizarPctFila(nombre);
    updatePendingCount();
  }

  function actualizarPctFila(nombre) {
    const { talleres } = asistenciaData;
    const pcts   = talleres.map(t => {
      const k = nombre + "||" + t;
      return (pendingChanges.has(k) ? pendingChanges.get(k) : (asistenciaData.delegados.find(d => d.nombre === nombre)?.asistencia[t] || "")) === "Presente";
    });
    const pctVal = Math.round((pcts.filter(Boolean).length / talleres.length) * 100);
    const tdPct  = document.querySelector(`[data-pct="${CSS.escape(nombre)}"]`);
    if (tdPct) tdPct.innerHTML = buildPctCell(pctVal);
  }

  function updatePendingCount() {
    const n = pendingChanges.size;
    document.getElementById("pendingCount").textContent = n;
    document.getElementById("btnGuardar").disabled = n === 0;
  }

  function filterAsistencia() { renderAsistencia(document.getElementById("searchAsistencia").value); }

  function descartarCambios() {
    pendingChanges.clear();
    renderAsistencia(document.getElementById("searchAsistencia").value);
    showToast("Cambios descartados.", "info");
  }

  async function guardarCambios() {
    if (pendingChanges.size === 0) return;
    const btn = document.getElementById("btnGuardar");
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando…';

    const updates = Array.from(pendingChanges.entries()).map(([key, status]) => {
      const [delegado, taller] = key.split("||");
      return { delegado, taller, status };
    });

    try {
      const url  = APPS_SCRIPT_URL
        + "?action=markBatch"
        + "&password=" + encodeURIComponent(adminPwd)
        + "&updates="  + encodeURIComponent(JSON.stringify(updates))
        + "&t=" + Date.now();
      const resp = await fetch(url);
      const json = await resp.json();
      if (json.status !== "ok") throw new Error(json.message);

      for (const [key, status] of pendingChanges) {
        const [nombre, taller] = key.split("||");
        const del = asistenciaData.delegados.find(d => d.nombre === nombre);
        if (del) del.asistencia[taller] = status;
      }
      pendingChanges.clear();
      showToast("✓ " + json.data.updated + " registros guardados.", "success");
      renderAsistencia(document.getElementById("searchAsistencia").value);
      tabsLoaded.stats = false;
    } catch (e) {
      showToast("Error al guardar: " + e.message, "error");
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-floppy-disk"></i> Guardar cambios';
    }
  }

  // ── ESTADÍSTICAS ───────────────────────────────────────────
  async function loadStats(forceReload = false) {
    tabsLoaded.stats = true;
    if (asistenciaData && !forceReload) { renderStats(); return; }
    showLoading("loadingStats", true);
    document.getElementById("statsContent").style.display = "none";
    try {
      const url  = APPS_SCRIPT_URL + "?action=getAsistencia&password=" + encodeURIComponent(adminPwd) + "&t=" + Date.now();
      const resp = await fetch(url);
      const json = await resp.json();
      if (json.status !== "ok") throw new Error(json.message);
      asistenciaData = json.data;
      renderStats();
    } catch (e) {
      showToast("Error: " + e.message, "error");
    } finally {
      showLoading("loadingStats", false);
    }
  }

  function renderStats() {
    if (!asistenciaData) return;
    const { talleres, delegados, statsTaller } = asistenciaData;
    const totalDel   = delegados.length;
    const conTodos   = delegados.filter(d => d.presentes === talleres.length).length;
    const conNinguno = delegados.filter(d => d.presentes === 0).length;
    const pctGlobal  = totalDel ? Math.round(delegados.reduce((s, d) => s + d.pct, 0) / totalDel) : 0;

    document.getElementById("statsCards").innerHTML = `
      <div class="stat-card">
        <span class="stat-label">Total delegados</span>
        <span class="stat-value">${totalDel}</span>
        <span class="stat-sub">${talleres.length} talleres registrados</span>
      </div>
      <div class="stat-card green">
        <span class="stat-label">% promedio asistencia</span>
        <span class="stat-value">${pctGlobal}%</span>
        <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${pctGlobal}%"></div></div>
      </div>
      <div class="stat-card accent">
        <span class="stat-label">Asistencia perfecta</span>
        <span class="stat-value">${conTodos}</span>
        <span class="stat-sub">Todos los talleres completados</span>
      </div>
      <div class="stat-card red">
        <span class="stat-label">Sin asistencia registrada</span>
        <span class="stat-value">${conNinguno}</span>
        <span class="stat-sub">0 talleres marcados</span>
      </div>
    `;

    const talleresGrid = document.getElementById("statsTalleres");
    talleresGrid.innerHTML = "";
    talleres.forEach(t => {
      const s    = statsTaller[t] || {};
      const card = document.createElement("div");
      card.className = "taller-stat-card";
      card.innerHTML = `
        <div class="taller-stat-header">
          <span class="taller-stat-nombre">${escapeHtml(t)}</span>
          <span class="taller-stat-pct">${s.pct ?? 0}%</span>
        </div>
        <div class="progress-bar-wrap" style="margin-bottom:.75rem;">
          <div class="progress-bar-fill" style="width:${s.pct ?? 0}%"></div>
        </div>
        <div class="taller-stat-row">
          <span style="color:#16a34a;font-weight:600;"><i class="fas fa-circle-check"></i> ${s.presentes ?? 0} presentes</span>
          <span style="color:#dc2626;font-weight:600;"><i class="fas fa-circle-xmark"></i> ${s.ausentes ?? 0} ausentes</span>
        </div>
        <div class="taller-stat-row">
          <span>${s.total ?? 0} delegados totales</span>
          <span>${(s.total ?? 0) - (s.presentes ?? 0) - (s.ausentes ?? 0)} sin registrar</span>
        </div>
      `;
      talleresGrid.appendChild(card);
    });

    const sorted = [...delegados].sort((a, b) => b.pct - a.pct);
    document.getElementById("statsDelegados").innerHTML = sorted.map((d, i) => {
      const color = d.pct >= 80 ? "#16a34a" : d.pct >= 50 ? "#d97706" : "#dc2626";
      return `<tr>
        <td><span class="row-num">${i + 1}</span></td>
        <td><span style="font-weight:500;">${escapeHtml(d.nombre)}</span></td>
        <td style="color:#16a34a;font-weight:600;">${d.presentes}</td>
        <td style="color:#dc2626;font-weight:600;">${d.ausentes}</td>
        <td>
          <div style="display:flex;align-items:center;gap:.6rem;">
            <span style="font-weight:700;color:${color};">${d.pct}%</span>
            <div style="flex:1;background:var(--border);border-radius:99px;height:6px;min-width:60px;">
              <div style="width:${d.pct}%;height:100%;background:${color};border-radius:99px;"></div>
            </div>
          </div>
        </td>
      </tr>`;
    }).join("");

    document.getElementById("statsContent").style.display = "";
  }

  // ── DOCUMENTOS ADMIN ───────────────────────────────────────
  let documentosData  = null;
  let selectedTaller  = null;

  async function loadDocumentosAdmin(forceReload = false) {
    tabsLoaded.documentos = true;
    if (documentosData && !forceReload) { renderTallerSelector(); return; }
    showLoading("loadingDocs", true);
    document.getElementById("docsFormCard").style.display  = "none";
    document.getElementById("docsListWrap").style.display  = "none";
    try {
      const url  = APPS_SCRIPT_URL + "?action=getDocumentos&t=" + Date.now();
      const resp = await fetch(url);
      const json = await resp.json();
      if (json.status !== "ok") throw new Error(json.message);
      documentosData = json.data;
      renderTallerSelector();
    } catch (e) {
      showToast("Error cargando documentos: " + e.message, "error");
    } finally {
      showLoading("loadingDocs", false);
    }
  }

  function renderTallerSelector() {
    if (!documentosData) return;
    const container = document.getElementById("docsList");
    container.innerHTML = "";

    // Tarjetas de selección de taller
    TALLERES_LIST.forEach((taller, idx) => {
      const links = documentosData[taller] || [];
      const icono = (TALLERES_ICONOS && TALLERES_ICONOS[taller]) || "fa-chalkboard-teacher";
      const card  = document.createElement("div");
      card.className = "docs-taller-select-card" + (selectedTaller === taller ? " selected" : "");
      card.style.animationDelay = (idx * 0.05) + "s";
      card.innerHTML = `
        <div class="docs-taller-select-icon"><i class="fas ${icono}"></i></div>
        <div class="docs-taller-select-info">
          <span class="docs-taller-select-num">Taller ${idx + 1}</span>
          <span class="docs-taller-select-name">${escapeHtml(taller)}</span>
        </div>
        <span class="docs-count-badge">${links.length}</span>
        <i class="fas fa-chevron-right docs-taller-select-arrow"></i>
      `;
      card.addEventListener("click", () => openTallerDocs(taller));
      container.appendChild(card);
    });

    document.getElementById("docsFormCard").style.display = "none";
    document.getElementById("docsListWrap").style.display = "";

    // Si había un taller seleccionado, reabrirlo
    if (selectedTaller) openTallerDocs(selectedTaller, false);
  }

  function openTallerDocs(taller, scrollTo = true) {
    selectedTaller = taller;

    // Marcar tarjeta activa
    document.querySelectorAll(".docs-taller-select-card").forEach(c => {
      c.classList.toggle("selected", c.querySelector(".docs-taller-select-name")?.textContent === taller);
    });

    const links = documentosData[taller] || [];
    const icono = (TALLERES_ICONOS && TALLERES_ICONOS[taller]) || "fa-chalkboard-teacher";
    const formCard = document.getElementById("docsFormCard");

    // Render panel lateral / expandido
    const existing = document.getElementById("docsDetailPanel");
    if (existing) existing.remove();

    const panel = document.createElement("div");
    panel.id = "docsDetailPanel";
    panel.className = "docs-detail-panel";
    panel.innerHTML = `
      <div class="docs-detail-header">
        <div class="docs-detail-title">
          <div class="docs-detail-icon"><i class="fas ${icono}"></i></div>
          <div>
            <p class="docs-detail-label">Taller seleccionado</p>
            <h4 class="docs-detail-name">${escapeHtml(taller)}</h4>
          </div>
        </div>
        <button class="docs-detail-close" id="docsDetailClose" aria-label="Cerrar">
          <i class="fas fa-xmark"></i>
        </button>
      </div>

      <!-- Links actuales -->
      <div class="docs-detail-links" id="docsDetailLinks">
        ${renderDetailLinks(taller, links)}
      </div>

      <!-- Formulario agregar -->
      <div class="docs-add-form">
        <p class="docs-add-form-title">
          <i class="fas fa-plus-circle"></i> Agregar nuevo enlace
        </p>
        <div class="docs-add-fields">
          <div class="field-group">
            <label for="docsTitulo">Título <span style="font-weight:400;opacity:.65;">(opcional)</span></label>
            <input type="text" id="docsTitulo" class="search-input"
              placeholder="Ej. Presentación Taller 1…" maxlength="80" />
          </div>
          <div class="field-group">
            <label for="docsUrl">URL del documento <span style="color:#dc2626;">*</span></label>
            <div class="search-wrapper">
              <i class="fas fa-link search-icon" style="font-size:.72rem;"></i>
              <input type="url" id="docsUrl" class="search-input"
                placeholder="https://drive.google.com/…" style="padding-left:2.5rem;" />
            </div>
          </div>
        </div>
        <div class="docs-add-actions">
          <div class="docs-form-error" id="docsFormError" style="display:none;">
            <i class="fas fa-triangle-exclamation"></i>
            <span id="docsFormErrorMsg">Error</span>
          </div>
          <button class="btn-guardar" id="btnAddDoc" style="min-width:155px;">
            <i class="fas fa-plus"></i> Agregar enlace
          </button>
        </div>
      </div>
    `;
    document.getElementById("docsListWrap").appendChild(panel);
    document.getElementById("docsDetailClose").addEventListener("click", () => {
      panel.remove();
      selectedTaller = null;
      document.querySelectorAll(".docs-taller-select-card").forEach(c => c.classList.remove("selected"));
    });
    document.getElementById("btnAddDoc").addEventListener("click", addDocumentoAdmin);

    if (scrollTo) panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function renderDetailLinks(taller, links) {
    if (!links.length) {
      return `<p class="doc-empty-msg"><i class="fas fa-inbox" style="margin-right:.4rem;opacity:.4;"></i>Sin enlaces cargados aún.</p>`;
    }
    return links.map(link => `
      <div class="doc-item">
        <div class="doc-item-icon"><i class="fas fa-file-lines"></i></div>
        <div class="doc-item-info">
          <p class="doc-item-titulo">${escapeHtml(link.titulo)}</p>
          <p class="doc-item-url">${escapeHtml(link.url)}</p>
        </div>
        <div class="doc-item-actions">
          <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer"
             class="btn-doc-open"><i class="fas fa-arrow-up-right-from-square"></i> Abrir</a>
          <button class="btn-doc-delete"
            data-taller="${escapeHtml(taller)}" data-row="${link.row}">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>`).join("") + `<div class="docs-detail-divider"></div>`;
  }

  function rebindDeleteButtons() {
    document.querySelectorAll("#docsDetailLinks .btn-doc-delete").forEach(btn => {
      btn.addEventListener("click", () =>
        deleteDocumentoAdmin(btn.dataset.taller, parseInt(btn.dataset.row), btn));
    });
  }

  async function addDocumentoAdmin() {
    if (!selectedTaller) return;
    const titulo = document.getElementById("docsTitulo").value.trim();
    const url    = document.getElementById("docsUrl").value.trim();
    const errEl  = document.getElementById("docsFormError");
    const errMsg = document.getElementById("docsFormErrorMsg");
    errEl.style.display = "none";

    if (!url) { errMsg.textContent = "La URL es requerida."; errEl.style.display = "flex"; return; }
    if (!url.startsWith("http")) { errMsg.textContent = "Ingresa una URL válida (debe comenzar con http)."; errEl.style.display = "flex"; return; }

    const btn = document.getElementById("btnAddDoc");
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando…';

    try {
      const reqUrl = APPS_SCRIPT_URL
        + "?action=addDocumento"
        + "&password=" + encodeURIComponent(adminPwd)
        + "&taller="   + encodeURIComponent(selectedTaller)
        + "&titulo="   + encodeURIComponent(titulo)
        + "&url="      + encodeURIComponent(url)
        + "&t=" + Date.now();
      const resp = await fetch(reqUrl);
      const json = await resp.json();
      if (json.status !== "ok") throw new Error(json.message);

      // Update local cache
      if (!documentosData[selectedTaller]) documentosData[selectedTaller] = [];
      documentosData[selectedTaller].push({ titulo: titulo || "Acceder al material", url, row: json.data.row });

      // Clear form fields
      document.getElementById("docsTitulo").value = "";
      document.getElementById("docsUrl").value    = "";

      // Refresh links panel & selector badge
      const linksDiv = document.getElementById("docsDetailLinks");
      if (linksDiv) {
        linksDiv.innerHTML = renderDetailLinks(selectedTaller, documentosData[selectedTaller]);
        rebindDeleteButtons();
      }
      // Update badge on taller card
      document.querySelectorAll(".docs-taller-select-card").forEach(c => {
        if (c.querySelector(".docs-taller-select-name")?.textContent === selectedTaller) {
          const badge = c.querySelector(".docs-count-badge");
          if (badge) badge.textContent = documentosData[selectedTaller].length;
        }
      });

      showToast("✓ Enlace agregado correctamente.", "success");
    } catch (e) {
      errMsg.textContent = e.message;
      errEl.style.display = "flex";
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-plus"></i> Agregar enlace';
    }
  }

  async function deleteDocumentoAdmin(taller, rowIndex, btnEl) {
    if (!confirm(`¿Eliminar este enlace del taller "${taller}"?`)) return;
    btnEl.disabled = true;
    btnEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    try {
      const url = APPS_SCRIPT_URL
        + "?action=deleteDocumento"
        + "&password="  + encodeURIComponent(adminPwd)
        + "&rowIndex="  + rowIndex
        + "&t=" + Date.now();
      const resp = await fetch(url);
      const json = await resp.json();
      if (json.status !== "ok") throw new Error(json.message);

      showToast("Enlace eliminado.", "info");
      // Recargar datos completos porque al borrar fila los índices cambian
      documentosData = null;
      await loadDocumentosAdmin(true);
    } catch (e) {
      showToast("Error al eliminar: " + e.message, "error");
      btnEl.disabled = false;
      btnEl.innerHTML = '<i class="fas fa-trash"></i>';
    }
  }

  // ── HELPERS ADMIN ──────────────────────────────────────────
  function showLoading(id, on) { document.getElementById(id).classList.toggle("visible", on); }

  function showToast(msg, type = "info") {
    const existing = document.querySelector(".toast");
    if (existing) existing.remove();
    const toast = document.createElement("div");
    toast.className = "toast " + type;
    const icon = type === "success" ? "fa-circle-check" : type === "error" ? "fa-circle-xmark" : "fa-circle-info";
    toast.innerHTML = `<i class="fas ${icon}"></i> ${escapeHtml(msg)}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }
}