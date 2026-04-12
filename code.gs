// ============================================================
// code.gs — CELIDER 08-06 · v3
// ============================================================

const ADMIN_PASSWORD  = "celider2026";
const SHEET_DELEGADOS  = "delegados";
const SHEET_TALLERES   = "Talleres";
const SHEET_DOCUMENTOS = "Documentos";
const SHEET_COMISIONES = "Comisiones";
const SKIP_COLS_ADMIN  = ["marca temporal", "fallo", "fallos", "error"];

// ── Helpers ───────────────────────────────────────────────────
function respond(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
function normalize(str) {
  return str.toString().toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"").trim();
}
function getSheet(name) {
  const s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!s) throw new Error("Hoja '"+name+"' no encontrada.");
  return s;
}
function requireAdmin(pwd) {
  if (pwd !== ADMIN_PASSWORD) throw new Error("Contraseña incorrecta.");
}
function shouldSkipCol(header) {
  const h = normalize(header.toString());
  return SKIP_COLS_ADMIN.some(s => h.includes(s));
}
function getTalleresFromSheet() {
  try {
    const s = getSheet(SHEET_TALLERES);
    const h = s.getRange(1,1,1,s.getLastColumn()).getValues()[0];
    const t = h.slice(1).map(v=>v.toString().trim()).filter(v=>v);
    return t.length ? t : [];
  } catch(e) { return []; }
}

// ── Router ────────────────────────────────────────────────────
function doGet(e) {
  const action = (e&&e.parameter&&e.parameter.action)||"getDelegados";
  try {
    switch(action) {
      case "getDelegados":         return respond({status:"ok",data:getDelegados()});
      case "getAsistenciaDelegado":return respond({status:"ok",data:getAsistenciaDelegado(e.parameter.nombre)});
      case "getTalleres":          return respond({status:"ok",data:getTalleresFromSheet()});
      case "getDocumentos":        return respond({status:"ok",data:getDocumentos()});
      case "getComisiones":        return respond({status:"ok",data:getComisiones()});
      case "auth":                 return respond({status:"ok",data:{valid:e.parameter.password===ADMIN_PASSWORD}});
      case "getDelegadosFull":     requireAdmin(e.parameter.password); return respond({status:"ok",data:getDelegadosFull()});
      case "getAsistencia":        requireAdmin(e.parameter.password); return respond({status:"ok",data:getAsistencia()});
      case "markBatch":            requireAdmin(e.parameter.password); return respond({status:"ok",data:markBatch(e.parameter)});
      case "getComisionesAdmin":   requireAdmin(e.parameter.password); return respond({status:"ok",data:getComisionesAdmin()});
      case "updateRow":            requireAdmin(e.parameter.password); return respond({status:"ok",data:updateRow(e.parameter)});
      case "addDocumento":         requireAdmin(e.parameter.password); return respond({status:"ok",data:addDocumento(e.parameter)});
      case "deleteDocumento":      requireAdmin(e.parameter.password); return respond({status:"ok",data:deleteDocumento(e.parameter)});
      default: return respond({status:"error",message:"Acción desconocida: "+action});
    }
  } catch(err) { return respond({status:"error",message:err.message}); }
}

// ── getDelegados ──────────────────────────────────────────────
function getDelegados() {
  const sheet=getSheet(SHEET_DELEGADOS); const rows=sheet.getDataRange().getValues();
  if(rows.length<2) return [];
  const h=rows[0].map(c=>normalize(c));
  const ni=h.findIndex(c=>c.includes("nombre")); const ci=h.findIndex(c=>c.includes("centro"));
  const ei=h.findIndex(c=>c.includes("correo")||c.includes("mail"));
  if(ni<0) throw new Error("Columna 'Nombre' no encontrada.");
  const ki=h.findIndex(c=>c.includes("codigo")||c.includes("código"));
  return rows.slice(1).filter(r=>r[ni]&&r[ni].toString().trim())
    .map(r=>({nombre:r[ni].toString().trim(),centro:ci>=0?r[ci].toString().trim():"",correo:ei>=0?r[ei].toString().trim():"",codigo:ki>=0?r[ki].toString().trim():""}));
}

// ── getAsistenciaDelegado ─────────────────────────────────────
function getAsistenciaDelegado(nombre) {
  if(!nombre||!nombre.trim()) return {found:false};
  const sheet=getSheet(SHEET_TALLERES); const data=sheet.getDataRange().getValues();
  if(data.length<2) return {found:false};
  const headers=data[0]; const norm=normalize(nombre);
  let row=null;
  for(let i=1;i<data.length;i++) if(normalize(data[i][0].toString())===norm){row=data[i];break;}
  if(!row) for(let i=1;i<data.length;i++) if(normalize(data[i][0].toString()).includes(norm)){row=data[i];break;}
  if(!row) return {found:false};
  const talleres=headers.slice(1).map(h=>h.toString().trim()).filter(h=>h);
  const asistencia={}; let presentes=0,ausentes=0,excusas=0;
  talleres.forEach((t,i)=>{
    const v=(row[i+1]||"").toString().trim(); asistencia[t]=v;
    if(v==="Presente")presentes++; else if(v==="Ausente")ausentes++; else if(v==="Excusa")excusas++;
  });
  return {found:true,nombre:row[0].toString().trim(),talleres,asistencia,
    resumen:{presentes,ausentes,excusas,porcentaje:talleres.length?Math.round(presentes/talleres.length*100):0}};
}

// ── getDocumentos ─────────────────────────────────────────────
function getDocumentos() {
  const sheet=getSheet(SHEET_DOCUMENTOS); const rows=sheet.getDataRange().getValues();
  if(rows.length<2) return {};
  const h=rows[0]; const tI=h.findIndex(c=>normalize(c).includes("taller"));
  const tiI=h.findIndex(c=>normalize(c).includes("titulo")||normalize(c).includes("título"));
  const uI=h.findIndex(c=>normalize(c).includes("url"));
  const docs={};
  rows.slice(1).forEach((r,ri)=>{
    const taller=tI>=0?r[tI].toString().trim():""; const titulo=tiI>=0?r[tiI].toString().trim():"Material";
    const url=uI>=0?r[uI].toString().trim():"";
    if(taller&&url){if(!docs[taller])docs[taller]=[];docs[taller].push({titulo:titulo||"Acceder al material",url,row:ri+2});}
  });
  return docs;
}

// ── getComisiones ─────────────────────────────────────────────
function getComisiones() {
  const sheet=getSheet(SHEET_COMISIONES); const rows=sheet.getDataRange().getValues();
  if(rows.length<2) return [];
  const h=rows[0].map(c=>normalize(c));
  const ci=h.findIndex(c=>c.includes("comision")||c.includes("comisión"));
  const ni=h.findIndex(c=>c.includes("nombre")); const ce=h.findIndex(c=>c.includes("centro"));
  const pi=h.findIndex(c=>c.includes("pais")||c.includes("país"));
  const groups={},order=[];
  let lc="",lp="";
  rows.slice(1).forEach(r=>{
    const comision=(r[ci]||"").toString().trim()||lc; const nombre=(r[ni]||"").toString().trim();
    const centro=ce>=0?(r[ce]||"").toString().trim():""; const pais=(r[pi]||"").toString().trim()||lp;
    if(!nombre) return; lc=comision; lp=pais;
    if(!groups[comision]){groups[comision]=[];order.push(comision);}
    groups[comision].push({nombre,centro,pais});
  });
  return order.map(n=>({nombre:n,abreviatura:n.split(" ")[0],delegados:groups[n]}));
}

// ── getDelegadosFull ──────────────────────────────────────────
function getDelegadosFull() {
  const sheet=getSheet(SHEET_DELEGADOS); const rows=sheet.getDataRange().getValues();
  if(rows.length<2) return {headers:[],rows:[]};
  const rawH=rows[0]; const colMap=[];
  rawH.forEach((h,i)=>{if(!shouldSkipCol(h))colMap.push({index:i,name:h.toString().trim()});});
  return {
    headers:colMap.map(c=>c.name),
    rows:rows.slice(1).filter(r=>r.some(c=>c.toString().trim())).map(r=>
      colMap.map(c=>{const v=r[c.index];return v instanceof Date?Utilities.formatDate(v,Session.getScriptTimeZone(),"dd/MM/yyyy"):v.toString().trim();})
    )
  };
}

// ── getAsistencia ─────────────────────────────────────────────
function getAsistencia() {
  const sheetT=getSheet(SHEET_TALLERES); const sheetD=getSheet(SHEET_DELEGADOS);
  const talData=sheetT.getDataRange().getValues(); const delData=sheetD.getDataRange().getValues();
  if(talData.length<2) return {talleres:[],delegados:[]};
  const talleres=talData[0].slice(1).map(h=>h.toString().trim()).filter(h=>h);
  const centroMap={};
  if(delData.length>1){const dh=delData[0].map(c=>normalize(c));const dni=dh.findIndex(c=>c.includes("nombre"));const dci=dh.findIndex(c=>c.includes("centro"));delData.slice(1).forEach(r=>{if(dni>=0&&dci>=0)centroMap[r[dni].toString().trim()]=r[dci].toString().trim();});}
  const statsTaller={};
  talleres.forEach(t=>{statsTaller[t]={presentes:0,ausentes:0,excusas:0,total:0};});
  const delegados=talData.slice(1).filter(r=>r[0]&&r[0].toString().trim()).map(r=>{
    const nombre=r[0].toString().trim(); const asistencia={};
    let p=0,a=0,e=0;
    talleres.forEach((t,i)=>{const v=(r[i+1]||"").toString().trim();asistencia[t]=v;statsTaller[t].total++;if(v==="Presente"){p++;statsTaller[t].presentes++;}else if(v==="Ausente"){a++;statsTaller[t].ausentes++;}else if(v==="Excusa"){e++;statsTaller[t].excusas++;}});
    return {nombre,centro:centroMap[nombre]||"",asistencia,presentes:p,ausentes:a,excusas:e,pct:talleres.length?Math.round(p/talleres.length*100):0};
  });
  talleres.forEach(t=>{const s=statsTaller[t];s.pct=s.total?Math.round(s.presentes/s.total*100):0;});
  return {talleres,delegados,statsTaller};
}

// ── markBatch ────────────────────────────────────────────────
function markBatch(params) {
  const updates=JSON.parse(params.updates||"[]"); if(!updates.length) return {updated:0};
  const sheet=getSheet(SHEET_TALLERES); const data=sheet.getDataRange().getValues();
  const rowMap={},colMap={};
  data.slice(1).forEach((r,i)=>{rowMap[r[0].toString().trim()]=i+2;});
  data[0].slice(1).forEach((h,i)=>{colMap[h.toString().trim()]=i+2;});
  let updated=0;
  updates.forEach(u=>{const ri=rowMap[u.delegado];const ci=colMap[u.taller];if(ri&&ci){sheet.getRange(ri,ci).setValue(u.status);updated++;}});
  return {updated};
}

// ── getComisionesAdmin ────────────────────────────────────────
function getComisionesAdmin() {
  const sheet=getSheet(SHEET_COMISIONES); const rows=sheet.getDataRange().getValues();
  if(rows.length<2) return {headers:[],rows:[]};
  const headers=rows[0].map(h=>h.toString().trim());
  const h=headers.map(v=>normalize(v));
  const ci=h.findIndex(c=>c.includes("comision")||c.includes("comisión"));
  const pi=h.findIndex(c=>c.includes("pais")||c.includes("país"));
  let lc="",lp="";
  const dataRows=rows.slice(1).filter(r=>r.some(c=>c.toString().trim())).map((r,i)=>{
    const comision=(r[ci]||"").toString().trim()||lc; const pais=pi>=0?((r[pi]||"").toString().trim()||lp):"";
    lc=comision; lp=pais;
    const filled=r.map((v,col)=>{
      if(col===ci) return comision; if(col===pi) return pais;
      if(v instanceof Date) return Utilities.formatDate(v,Session.getScriptTimeZone(),"dd/MM/yyyy");
      return v.toString().trim();
    });
    return {rowIndex:i+2,data:filled};
  });
  return {headers,rows:dataRows};
}

// ── updateRow ─────────────────────────────────────────────────
function updateRow(params) {
  const sheetName=params.sheet;
  if(!["delegados","Comisiones"].includes(sheetName)) throw new Error("Hoja no editable.");
  const sheet=getSheet(sheetName);
  const headers=sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
  const rowIndex=parseInt(params.rowIndex);
  const newData=JSON.parse(decodeURIComponent(params.data||"{}"));
  headers.forEach((h,i)=>{const key=h.toString().trim();if(key in newData)sheet.getRange(rowIndex,i+1).setValue(newData[key]);});
  return {updated:true,rowIndex};
}

// ── addDocumento ──────────────────────────────────────────────
function addDocumento(params) {
  const sheet=getSheet(SHEET_DOCUMENTOS); const newRow=sheet.getLastRow()+1;
  sheet.getRange(newRow,1).setValue(params.taller||"");
  sheet.getRange(newRow,2).setValue(params.titulo||"Material");
  sheet.getRange(newRow,3).setValue(params.url||"");
  return {row:newRow};
}

// ── deleteDocumento ───────────────────────────────────────────
function deleteDocumento(params) {
  const rowIndex=parseInt(params.rowIndex);
  if(!rowIndex||rowIndex<2) throw new Error("Índice de fila inválido.");
  getSheet(SHEET_DOCUMENTOS).deleteRow(rowIndex);
  return {deleted:true};
}