// ============================================================
// script.js — Lógica del Panel de Consulta PLE-RD
// Maneja: carga de datos, búsqueda, filtros y orden alfabético
// ============================================================

// ============================================================
// CONFIGURACIÓN
// Reemplaza APPS_SCRIPT_URL con la URL que genera Apps Script
// al publicar el Web App (Implementar → Nueva implementación).
// ============================================================
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyZ-GJYk0h-YPCbYnaQu7VvYI8ZgCEifwiZwW7K02gSm97qU8v6McQVtepSb_aRlToW/exec";
// ============================================================
// ESTADO GLOBAL
// ============================================================
let allStudents  = [];   // Todos los datos cargados desde Apps Script
let currentSort  = "az"; // Orden actual: "az" | "za"
let filterCentro = "";   // Filtro de centro educativo activo
let searchQuery  = "";   // Texto de búsqueda activo

// ============================================================
// REFERENCIAS AL DOM
// ============================================================
const tableBody      = document.getElementById("tableBody");
const searchInput    = document.getElementById("searchInput");
const centroSelect   = document.getElementById("centroFilter");
const btnAZ          = document.getElementById("btnAZ");
const btnZA          = document.getElementById("btnZA");
const btnClear       = document.getElementById("btnClear");
const resultsCount   = document.getElementById("resultsCount");
const loadingState   = document.getElementById("loadingState");
const emptyState     = document.getElementById("emptyState");
const tableSection   = document.getElementById("tableSection");

// ============================================================
// INICIALIZACIÓN
// Espera a que el DOM esté listo antes de cargar datos.
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  initEventListeners();
  loadStudents();
});

// ============================================================
// initEventListeners()
// Registra todos los eventos de interacción del usuario.
// ============================================================
function initEventListeners() {
  // Búsqueda en tiempo real
  searchInput.addEventListener("input", () => {
    searchQuery = searchInput.value.trim().toLowerCase();
    renderTable();
  });

  // Filtro por centro educativo
  centroSelect.addEventListener("change", () => {
    filterCentro = centroSelect.value;
    renderTable();
  });

  // Ordenamiento A → Z
  btnAZ.addEventListener("click", () => {
    currentSort = "az";
    updateSortButtons();
    renderTable();
  });

  // Ordenamiento Z → A
  btnZA.addEventListener("click", () => {
    currentSort = "za";
    updateSortButtons();
    renderTable();
  });

  // Botón limpiar filtros
  btnClear.addEventListener("click", clearFilters);
}

// ============================================================
// loadStudents()
// Hace fetch al Web App de Apps Script y carga los datos.
// Maneja estados de carga y error.
// ============================================================
async function loadStudents() {
  showLoading(true);

  try {
    // Agrega timestamp para evitar caché del navegador
    const url = APPS_SCRIPT_URL + "?t=" + Date.now();
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Error HTTP: " + response.status);
    }

    const json = await response.json();

    if (json.status === "error") {
      throw new Error(json.message || "Error en el servidor");
    }

    allStudents = json.data || [];

    // Poblar dropdown de centros únicos
    populateCentroFilter();

    // Renderizar tabla por primera vez
    renderTable();

  } catch (error) {
    console.error("Error al cargar datos:", error);
    showError(error.message);
  } finally {
    showLoading(false);
  }
}

// ============================================================
// populateCentroFilter()
// Genera las opciones del dropdown de centros educativos
// a partir de los datos reales (sin duplicados, orden alfabético).
// ============================================================
function populateCentroFilter() {
  // Obtener centros únicos y ordenados
  const centros = [...new Set(
    allStudents
      .map(s => s.centro)
      .filter(c => c && c.trim() !== "")
  )].sort((a, b) => a.localeCompare(b, "es"));

  // Limpiar opciones previas (conservar la opción por defecto)
  centroSelect.innerHTML = '<option value="">Todos los centros</option>';

  centros.forEach(centro => {
    const opt = document.createElement("option");
    opt.value  = centro;
    opt.textContent = centro;
    centroSelect.appendChild(opt);
  });
}

// ============================================================
// renderTable()
// Filtra, ordena y renderiza los datos en la tabla HTML.
// Aplica búsqueda por nombre, filtro por centro y orden.
// ============================================================
function renderTable() {
  let filtered = [...allStudents];

  // 1. Filtrar por búsqueda de nombre
  if (searchQuery) {
    filtered = filtered.filter(s =>
      s.nombre.toLowerCase().includes(searchQuery)
    );
  }

  // 2. Filtrar por centro educativo
  if (filterCentro) {
    filtered = filtered.filter(s => s.centro === filterCentro);
  }

  // 3. Ordenar alfabéticamente
  filtered.sort((a, b) => {
    const comparison = a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" });
    return currentSort === "az" ? comparison : -comparison;
  });

  // Actualizar contador de resultados
  updateResultsCount(filtered.length);

  // Mostrar/ocultar estado vacío
  if (filtered.length === 0) {
    tableSection.style.display  = "none";
    emptyState.classList.add("visible");
    return;
  }

  tableSection.style.display  = "";
  emptyState.classList.remove("visible");

  // Generar filas de la tabla
  tableBody.innerHTML = filtered.map((student, index) => `
    <tr style="animation-delay: ${Math.min(index * 0.03, 0.4)}s">
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
    </tr>
  `).join("");
}

// ============================================================
// clearFilters()
// Restablece todos los filtros y recarga la vista.
// ============================================================
function clearFilters() {
  searchInput.value    = "";
  centroSelect.value   = "";
  currentSort          = "az";
  searchQuery          = "";
  filterCentro         = "";
  updateSortButtons();
  renderTable();
}

// ============================================================
// updateSortButtons()
// Actualiza el estilo visual de los botones de ordenamiento.
// ============================================================
function updateSortButtons() {
  btnAZ.classList.toggle("active", currentSort === "az");
  btnZA.classList.toggle("active", currentSort === "za");
}

// ============================================================
// updateResultsCount()
// Actualiza el contador de resultados mostrados.
// ============================================================
function updateResultsCount(count) {
  const total = allStudents.length;
  if (count === total) {
    resultsCount.innerHTML = `Mostrando <strong>${total}</strong> delegados`;
  } else {
    resultsCount.innerHTML = `Mostrando <strong>${count}</strong> de <strong>${total}</strong> delegados`;
  }
}

// ============================================================
// showLoading(state)
// Muestra u oculta el estado de carga.
// ============================================================
function showLoading(state) {
  if (state) {
    loadingState.classList.add("visible");
    tableSection.style.display  = "none";
    emptyState.classList.remove("visible");
  } else {
    loadingState.classList.remove("visible");
  }
}

// ============================================================
// showError(msg)
// Muestra un mensaje de error en el área de la tabla.
// ============================================================
function showError(msg) {
  loadingState.classList.remove("visible");
  tableSection.style.display = "none";
  emptyState.classList.add("visible");
  emptyState.querySelector("p").textContent = "Error al cargar los datos";
  emptyState.querySelector("span").textContent = msg || "Verifica la configuración del Web App";
}

// ============================================================
// escapeHtml(text)
// Sanitiza texto para evitar XSS al insertar en el DOM.
// ============================================================
function escapeHtml(text) {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

// ============================================================
// PREPARACIÓN PARA FUTURAS FUNCIONES:
// Aquí irán las funciones relacionadas con comisiones.html
// cuando se implemente esa vista.
// ============================================================
// function loadComisiones() { ... }