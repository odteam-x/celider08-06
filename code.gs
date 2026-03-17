// ============================================================
// Code.gs — CELIDER 08-06 · Backend Completo
// Cubre: delegados públicos, delegados full (admin),
//        asistencia individual (pública), asistencia completa (admin),
//        marcado de asistencia (admin) y setup de hoja Talleres.
// ============================================================

// ── CONFIGURACIÓN ────────────────────────────────────────────
// ⚠️  Cambia ADMIN_PASSWORD antes de redesplegar el Web App.
const ADMIN_PASSWORD = "celider2026";

// Nombres exactos de las hojas en el spreadsheet
const SHEET_DELEGADOS  = "Delegados";
const SHEET_TALLERES   = "Talleres";   // será creada/reconfigurada por setupTalleresSheet()
const SHEET_DOCUMENTOS = "Documentos"; // enlaces de materiales por taller

// Lista oficial de talleres (orden y ortografía exacta)
const TALLERES_LIST = [
  "Introducción a los Modelos de Naciones Unidas",
  "Procedimiento Parlamentario",
  "Redacción Diplomática y Documentos de Trabajo",
  "Propuestas y Construcción de Soluciones",
  "Liderazgo",
  "Oratoria y Argumentación"
];

// Valores válidos para el campo asistencia
const VALOR_PRESENTE = "Presente";
const VALOR_AUSENTE  = "Ausente";

// ── HELPERS ──────────────────────────────────────────────────
/** Devuelve una respuesta JSON con cabeceras CORS. */
function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Normaliza texto: sin tildes, minúsculas, sin espacios extremos. */
function normalize(str) {
  return str.toString().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

/** Obtiene una hoja por nombre. Lanza error si no existe. */
function getSheet(name) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error("Hoja '" + name + "' no encontrada. Ejecuta setupTalleresSheet() si es la primera vez.");
  return sheet;
}

// ── ROUTER GET ───────────────────────────────────────────────
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || "getDelegados";
  try {
    switch (action) {

      // Público ─────────────────────────────────────────────
      case "getDelegados":
        return respond({ status: "ok", data: getDelegados() });

      case "getAsistenciaDelegado":
        return respond({ status: "ok", data: getAsistenciaDelegado(e.parameter.nombre) });

      case "getTalleres":
        return respond({ status: "ok", data: TALLERES_LIST });

      // Admin ───────────────────────────────────────────────
      case "auth":
        return respond({ status: "ok", data: { valid: e.parameter.password === ADMIN_PASSWORD } });

      case "getDelegadosFull":
        return respond({ status: "ok", data: getDelegadosFull(e.parameter.password) });

      case "getAsistencia":
        return respond({ status: "ok", data: getAsistencia(e.parameter.password) });

      case "markAsistencia":
        return respond({ status: "ok", data: markAsistencia(e.parameter) });

      case "markBatch":
        return respond({ status: "ok", data: markBatch(e.parameter) });

      // Documentos ──────────────────────────────────────────
      case "getDocumentos":
        return respond({ status: "ok", data: getDocumentos() });

      case "addDocumento":
        return respond({ status: "ok", data: addDocumento(e.parameter) });

      case "deleteDocumento":
        return respond({ status: "ok", data: deleteDocumento(e.parameter) });

      default:
        return respond({ status: "error", message: "Acción no válida: " + action });
    }
  } catch (err) {
    return respond({ status: "error", message: err.message });
  }
}

// ── DELEGADOS PÚBLICO ─────────────────────────────────────────
/**
 * Retorna lista simplificada: { nombre, centro }.
 * Usada por index.html y talleres.html para autocompletado.
 */
function getDelegados() {
  const sheet = getSheet(SHEET_DELEGADOS);
  const rows  = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];

  const h  = rows[0].map(c => normalize(c));
  const ni = h.findIndex(c => c.includes("nombre"));
  const ci = h.findIndex(c => c.includes("centro"));
  const ei = h.findIndex(c => c.includes("correo") || c.includes("email") || c.includes("mail"));

  if (ni < 0) throw new Error("No se encontró columna 'Nombre' en la hoja Delegados.");

  return rows.slice(1)
    .filter(r => r[ni] && r[ni].toString().trim())
    .map(r => ({
      nombre: r[ni].toString().trim(),
      centro: ci >= 0 ? r[ci].toString().trim() : "",
      correo: ei >= 0 ? r[ei].toString().trim() : ""
    }));
}

// ── DELEGADOS COMPLETO (ADMIN) ────────────────────────────────
/**
 * Retorna TODAS las columnas de la hoja Delegados.
 * Requiere contraseña de admin.
 */
function getDelegadosFull(pwd) {
  if (pwd !== ADMIN_PASSWORD) throw new Error("Contraseña incorrecta.");
  const sheet = getSheet(SHEET_DELEGADOS);
  const rows  = sheet.getDataRange().getValues();
  if (rows.length < 2) return { headers: [], rows: [] };

  return {
    headers: rows[0].map(c => c.toString().trim()),
    rows: rows.slice(1)
      .filter(r => r.some(c => c.toString().trim() !== ""))
      .map(r => r.map(c => {
        // Formatear fechas automáticamente
        if (c instanceof Date) {
          return Utilities.formatDate(c, Session.getScriptTimeZone(), "dd/MM/yyyy");
        }
        return c.toString().trim();
      }))
  };
}

// ── ASISTENCIA INDIVIDUAL (PÚBLICO) ──────────────────────────
/**
 * Retorna la asistencia de un delegado dado su nombre.
 * Búsqueda exacta primero, luego parcial/fuzzy.
 * No requiere contraseña.
 */
function getAsistenciaDelegado(nombre) {
  if (!nombre || !nombre.trim()) return { found: false };

  const sheet = getSheet(SHEET_TALLERES);
  const data  = sheet.getDataRange().getValues();
  if (data.length < 2) return { found: false };

  const headers = data[0];  // [Delegado, Taller1, Taller2, ...]
  const norm    = normalize(nombre);

  // 1. Búsqueda exacta
  let foundRow = null;
  for (let i = 1; i < data.length; i++) {
    if (normalize(data[i][0].toString()) === norm) { foundRow = data[i]; break; }
  }

  // 2. Búsqueda parcial
  if (!foundRow) {
    for (let i = 1; i < data.length; i++) {
      const n = normalize(data[i][0].toString());
      if (n.includes(norm) || norm.includes(n)) { foundRow = data[i]; break; }
    }
  }

  if (!foundRow) return { found: false, nombre: nombre.trim() };

  const asistencia = {};
  for (let i = 1; i < headers.length; i++) {
    const t = headers[i].toString().trim();
    if (t) asistencia[t] = foundRow[i] ? foundRow[i].toString().trim() : "";
  }

  // Calcular resumen
  const valores   = Object.values(asistencia);
  const presentes = valores.filter(v => v === VALOR_PRESENTE).length;
  const total     = TALLERES_LIST.length;

  return {
    found:      true,
    nombre:     foundRow[0].toString().trim(),
    talleres:   TALLERES_LIST,
    asistencia,
    resumen:    { presentes, ausentes: valores.filter(v => v === VALOR_AUSENTE).length, total, porcentaje: Math.round((presentes / total) * 100) }
  };
}

// ── ASISTENCIA COMPLETA (ADMIN) ───────────────────────────────
/**
 * Retorna la matriz completa: lista de talleres + lista de delegados
 * con su asistencia a cada taller.
 * Requiere contraseña de admin.
 */
function getAsistencia(pwd) {
  if (pwd !== ADMIN_PASSWORD) throw new Error("Contraseña incorrecta.");

  const sheet = getSheet(SHEET_TALLERES);
  const data  = sheet.getDataRange().getValues();
  if (data.length < 2) return { talleres: TALLERES_LIST, delegados: [] };

  const tallerHeaders = data[0].slice(1).map(h => h.toString().trim()).filter(Boolean);

  const delegados = data.slice(1)
    .filter(r => r[0] && r[0].toString().trim())
    .map(r => {
      const asistencia = {};
      for (let i = 0; i < tallerHeaders.length; i++) {
        asistencia[tallerHeaders[i]] = r[i + 1] ? r[i + 1].toString().trim() : "";
      }
      const vals      = Object.values(asistencia);
      const presentes = vals.filter(v => v === VALOR_PRESENTE).length;
      return {
        nombre:    r[0].toString().trim(),
        asistencia,
        presentes,
        ausentes:  vals.filter(v => v === VALOR_AUSENTE).length,
        total:     tallerHeaders.length,
        pct:       tallerHeaders.length ? Math.round((presentes / tallerHeaders.length) * 100) : 0
      };
    });

  // Stats por taller
  const statsTaller = {};
  for (const t of tallerHeaders) {
    const presentes = delegados.filter(d => d.asistencia[t] === VALOR_PRESENTE).length;
    const ausentes  = delegados.filter(d => d.asistencia[t] === VALOR_AUSENTE).length;
    statsTaller[t]  = { presentes, ausentes, total: delegados.length, pct: Math.round((presentes / delegados.length) * 100) };
  }

  return { talleres: tallerHeaders, delegados, statsTaller };
}

// ── MARCAR ASISTENCIA INDIVIDUAL (ADMIN) ─────────────────────
function markAsistencia(params) {
  if (params.password !== ADMIN_PASSWORD) throw new Error("Contraseña incorrecta.");
  _setCell(params.delegado, params.taller, params.status);
  return { updated: 1 };
}

// ── MARCAR ASISTENCIA BATCH (ADMIN) ──────────────────────────
/**
 * Actualiza múltiples celdas de asistencia en una sola llamada.
 * params.updates debe ser un JSON stringificado de [{delegado, taller, status}].
 */
function markBatch(params) {
  if (params.password !== ADMIN_PASSWORD) throw new Error("Contraseña incorrecta.");

  let updates;
  try {
    updates = JSON.parse(params.updates);
  } catch (e) {
    throw new Error("Formato de updates inválido.");
  }

  const sheet   = getSheet(SHEET_TALLERES);
  const data    = sheet.getDataRange().getValues();
  const headers = data[0];
  let count     = 0;

  for (const u of updates) {
    try {
      const tallerCol = headers.findIndex(h => h.toString().trim() === u.taller.trim());
      if (tallerCol < 0) continue;
      const norm   = normalize(u.delegado);
      const rowIdx = data.findIndex((r, i) => i > 0 && normalize(r[0].toString()) === norm);
      if (rowIdx < 0) continue;
      sheet.getRange(rowIdx + 1, tallerCol + 1).setValue(u.status);
      data[rowIdx][tallerCol] = u.status; // actualiza caché local
      count++;
    } catch (e) { /* continúa con el resto */ }
  }

  return { updated: count };
}

// ── _setCell (interno) ────────────────────────────────────────
function _setCell(delegado, taller, status) {
  const sheet    = getSheet(SHEET_TALLERES);
  const data     = sheet.getDataRange().getValues();
  const headers  = data[0];

  const tallerCol = headers.findIndex(h => h.toString().trim() === taller.trim());
  if (tallerCol < 0) throw new Error("Taller no encontrado: " + taller);

  const norm   = normalize(delegado);
  const rowIdx = data.findIndex((r, i) => i > 0 && normalize(r[0].toString()) === norm);
  if (rowIdx < 0) throw new Error("Delegado no encontrado: " + delegado);

  sheet.getRange(rowIdx + 1, tallerCol + 1).setValue(status);
}

// ── SETUP (ejecutar UNA VEZ desde el editor) ─────────────────
/**
 * Crea/reconfigura la hoja "Talleres" como matriz:
 *   Fila 1: [Delegado, Taller1, Taller2, …]
 *   Fila 2+: [nombre_delegado, "", "", …]
 *
 * IMPORTANTE: Renombra automáticamente la hoja "RF delegados taller"
 * si ya existe, para mantener los datos previos.
 * Ejecutar desde: Extensions → Apps Script → Ejecutar → setupTalleresSheet
 */
function setupTalleresSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Intentar reutilizar hoja existente con nombre parecido
  let sheet = ss.getSheetByName(SHEET_TALLERES);
  if (!sheet) {
    // Buscar variantes
    const variantes = ["RF delegados taller", "talleres", "Taller", "Asistencia"];
    for (const v of variantes) {
      const s = ss.getSheetByName(v);
      if (s) { s.setName(SHEET_TALLERES); sheet = s; break; }
    }
  }
  if (!sheet) sheet = ss.insertSheet(SHEET_TALLERES);

  // Limpiar contenido y formatos
  sheet.clearContents();
  sheet.clearFormats();

  // Obtener delegados
  const delegados = getDelegados();
  if (delegados.length === 0) {
    Logger.log("⚠️  No se encontraron delegados en la hoja '" + SHEET_DELEGADOS + "'. Verifica el nombre de la hoja.");
    return;
  }

  // Construir encabezados
  const headers = ["Delegado", ...TALLERES_LIST];

  // Escribir encabezados
  const hRange = sheet.getRange(1, 1, 1, headers.length);
  hRange.setValues([headers]);
  hRange.setBackground("#1a3a5c");
  hRange.setFontColor("#ffffff");
  hRange.setFontWeight("bold");
  hRange.setHorizontalAlignment("center");
  hRange.setWrap(true);

  // Escribir delegados (sin sobreescribir datos existentes si ya hay)
  const existingData = sheet.getRange(2, 1, Math.max(delegados.length, 1), headers.length).getValues();
  const existingNames = existingData.map(r => normalize(r[0].toString()));

  const rows = delegados.map(d => {
    const existIdx = existingNames.indexOf(normalize(d.nombre));
    if (existIdx >= 0) {
      // Preservar datos de asistencia existentes
      return [d.nombre, ...existingData[existIdx].slice(1)];
    }
    return [d.nombre, ...TALLERES_LIST.map(() => "")];
  });

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);

  // Estilo columna de nombres
  sheet.getRange(2, 1, rows.length, 1).setFontWeight("bold");

  // Validación de datos en celdas de asistencia
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList([VALOR_PRESENTE, VALOR_AUSENTE, ""], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 2, rows.length, TALLERES_LIST.length).setDataValidation(rule);

  // Anchos de columna
  sheet.setColumnWidth(1, 260);
  for (let i = 2; i <= headers.length; i++) sheet.setColumnWidth(i, 210);
  sheet.setRowHeight(1, 64);

  // Congelar primera fila y columna
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(1);

  Logger.log("✅ setupTalleresSheet completado: " + delegados.length + " delegados · " + TALLERES_LIST.length + " talleres.");
  SpreadsheetApp.getUi().alert("✅ Hoja 'Talleres' configurada con " + delegados.length + " delegados y " + TALLERES_LIST.length + " talleres.\n\nRecuerda redesplegar el Web App.");
}
// ── DOCUMENTOS (PÚBLICO) ─────────────────────────────────────
/**
 * Hoja "Documentos" — tabla plana de 3 columnas:
 *   Col A: Taller  (nombre exacto, ej. "Liderazgo")
 *   Col B: Título  (texto libre, opcional)
 *   Col C: URL     (enlace completo)
 *
 * Retorna: { "Nombre del Taller": [{titulo, url, row}, …], … }
 * No requiere contraseña.
 */
function getDocumentos() {
  const sheet = getSheet(SHEET_DOCUMENTOS);
  const last  = sheet.getLastRow();
  if (last < 2) return {};            // sin datos

  // Leer desde fila 2 (fila 1 = encabezados)
  const data   = sheet.getRange(2, 1, last - 1, 3).getValues();
  const result = {};

  data.forEach((row, i) => {
    const taller = row[0] ? row[0].toString().trim() : "";
    const titulo = row[1] ? row[1].toString().trim() : "";
    const url    = row[2] ? row[2].toString().trim() : "";

    if (!taller || !url || !url.startsWith("http")) return;  // fila inválida

    if (!result[taller]) result[taller] = [];
    result[taller].push({
      titulo: titulo || "Acceder al material",
      url,
      row: i + 2   // número de fila real en el sheet (1-based, +1 por encabezado)
    });
  });

  return result;
}

// ── AGREGAR DOCUMENTO (ADMIN) ────────────────────────────────
/**
 * Agrega una nueva fila al final de la hoja Documentos.
 * Requiere contraseña de admin.
 */
function addDocumento(params) {
  if (params.password !== ADMIN_PASSWORD) throw new Error("Contraseña incorrecta.");

  const taller = (params.taller || "").trim();
  const titulo = (params.titulo || "").trim();
  const url    = (params.url    || "").trim();

  if (!taller) throw new Error("El taller es requerido.");
  if (!url)    throw new Error("La URL es requerida.");
  if (!url.startsWith("http")) throw new Error("La URL debe comenzar con http.");

  // Validar que el taller exista en la lista oficial
  if (!TALLERES_LIST.includes(taller)) throw new Error("Taller no reconocido: " + taller);

  const sheet    = getSheet(SHEET_DOCUMENTOS);
  const nextRow  = sheet.getLastRow() + 1;

  sheet.getRange(nextRow, 1, 1, 3).setValues([[taller, titulo, url]]);

  return { added: 1, row: nextRow };
}

// ── ELIMINAR DOCUMENTO (ADMIN) ───────────────────────────────
/**
 * Elimina la fila completa del documento por su número de fila.
 * Requiere contraseña de admin.
 */
function deleteDocumento(params) {
  if (params.password !== ADMIN_PASSWORD) throw new Error("Contraseña incorrecta.");

  const rowIndex = parseInt(params.rowIndex);
  if (isNaN(rowIndex) || rowIndex < 2) throw new Error("Índice de fila inválido.");

  const sheet = getSheet(SHEET_DOCUMENTOS);
  if (rowIndex > sheet.getLastRow()) throw new Error("Fila no encontrada.");

  sheet.deleteRow(rowIndex);
  return { deleted: 1 };
}

// ── SETUP DOCUMENTOS (ejecutar UNA VEZ desde el editor) ──────
/**
 * Crea/configura la hoja "Documentos" con la estructura de tabla plana:
 *   Fila 1: Encabezados  →  Taller | Título | URL
 *   Fila 2+: datos
 *
 * Si ya existe con la estructura antigua (columnas por taller),
 * la borra y la recrea desde cero.
 *
 * Ejecutar desde: Extensions → Apps Script → Ejecutar → setupDocumentosSheet
 */
function setupDocumentosSheet() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  let sheet   = ss.getSheetByName(SHEET_DOCUMENTOS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_DOCUMENTOS);
  } else {
    sheet.clearContents();
    sheet.clearFormats();
  }

  // Encabezados
  const headers = [["Taller", "Título", "URL"]];
  const hRange  = sheet.getRange(1, 1, 1, 3);
  hRange.setValues(headers);
  hRange.setBackground("#1a3a5c");
  hRange.setFontColor("#ffffff");
  hRange.setFontWeight("bold");
  hRange.setHorizontalAlignment("center");

  // Anchos
  sheet.setColumnWidth(1, 260);   // Taller
  sheet.setColumnWidth(2, 220);   // Título
  sheet.setColumnWidth(3, 420);   // URL

  // Validación: col A sólo acepta nombres de talleres de la lista
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(TALLERES_LIST, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange("A2:A1000").setDataValidation(rule);

  sheet.setFrozenRows(1);

  Logger.log("✅ setupDocumentosSheet completado — estructura: Taller | Título | URL");
  SpreadsheetApp.getUi().alert(
    "✅ Hoja 'Documentos' configurada.\n\n" +
    "Estructura:\n  Columna A → Taller\n  Columna B → Título\n  Columna C → URL\n\n" +
    "Recuerda redesplegar el Web App."
  );
}