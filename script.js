// ============================================================
// script.js — CELIDER 08-06
// Lógica unificada para index.html, talleres.html y admin.html
// ============================================================

// ── URL DEL WEB APP ──────────────────────────────────────────
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx9ekZ6p_NtApAWyZm1fkgDFtr2hjTcExilGte4ZSgvsg-cNgpHKThYaK904XLFMSLJ/exec";

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

  cargarNombres();

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