/* ============================================================
   Taller Biker — Control de vehículos
   Todo se guarda en el navegador de esta computadora (localStorage).
   ============================================================ */

const CLAVE = 'tallerBiker.v1';

const ESTADOS = {
  recibido:    { label: 'Recibido',            clase: '' },
  diagnostico: { label: 'En diagnóstico',      clase: '' },
  reparacion:  { label: 'En reparación',       clase: 'b-reparacion' },
  repuesto:    { label: 'Esperando repuesto',  clase: 'b-repuesto' },
  listo:       { label: 'Listo para entrega',  clase: 'b-listo' },
  entregado:   { label: 'Entregado',           clase: 'b-entregado' }
};

const AJUSTES_DEF = {
  nombre: 'Taller Biker',
  telefono: '',
  moneda: 'C$',
  diasAviso: 5,
  diasUrgente: 10
};

const MESES = ['enero','febrero','marzo','abril','mayo','junio',
               'julio','agosto','septiembre','octubre','noviembre','diciembre'];

let DB = { vehiculos: [], ajustes: { ...AJUSTES_DEF }, meta: { ultimoRespaldo: null } };

/* ================== Almacenamiento ================== */

function cargar() {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (crudo) {
      const datos = JSON.parse(crudo);
      DB.vehiculos = Array.isArray(datos.vehiculos) ? datos.vehiculos : [];
      DB.ajustes = { ...AJUSTES_DEF, ...(datos.ajustes || {}) };
      DB.meta = { ultimoRespaldo: null, ...(datos.meta || {}) };
    }
  } catch (e) {
    console.error('No se pudieron leer los datos guardados', e);
    aviso('No se pudieron leer los datos guardados.');
  }
}

function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(DB));
  } catch (e) {
    console.error(e);
    aviso('No se pudo guardar. Revisa el espacio del navegador.');
  }
}

/* ================== Utilidades ================== */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function mesActual() {
  return hoyISO().slice(0, 7);
}

/** Convierte 'YYYY-MM-DD' a Date local (evita el corrimiento de zona horaria). */
function aFecha(iso) {
  if (!iso) return null;
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d);
}

function fmtFecha(iso) {
  const f = aFecha(iso);
  if (!f) return '—';
  return `${String(f.getDate()).padStart(2, '0')}/${String(f.getMonth() + 1).padStart(2, '0')}/${f.getFullYear()}`;
}

function fmtMoneda(n) {
  const v = Number(n) || 0;
  return DB.ajustes.moneda + ' ' + v.toLocaleString('es-NI', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });
}

function num(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

/** Días transcurridos entre dos fechas ISO (si no hay fin, hasta hoy). */
function dias(desdeISO, hastaISO) {
  const a = aFecha(desdeISO);
  const b = aFecha(hastaISO || hoyISO());
  if (!a || !b) return 0;
  return Math.max(0, Math.round((b - a) / 86400000));
}

function diasEnTaller(v) {
  return dias(v.fechaIngreso, v.fechaEntrega);
}

function nivelAlerta(v) {
  if (v.estado === 'entregado') return '';
  const d = diasEnTaller(v);
  if (d >= DB.ajustes.diasUrgente) return 'rojo';
  if (d >= DB.ajustes.diasAviso) return 'amarillo';
  return '';
}

function montoDe(v) {
  return v.montoFinal != null ? num(v.montoFinal) : num(v.presupuesto);
}

function saldoDe(v) {
  return Math.max(0, montoDe(v) - num(v.abono));
}

function esc(txt) {
  return String(txt == null ? '' : txt)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function descripcionVehiculo(v) {
  return [v.tipo, v.marca, v.modelo].filter(Boolean).join(' ') || '—';
}

let toastTimer;
function aviso(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('oculto');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('oculto'), 2600);
}

function badgeEstado(estado) {
  const e = ESTADOS[estado] || ESTADOS.recibido;
  return `<span class="badge ${e.clase}">${esc(e.label)}</span>`;
}

/* ================== Render: Panel ================== */

function activos() {
  return DB.vehiculos.filter(v => v.estado !== 'entregado');
}

function facturadoDelMes(mes) {
  return DB.vehiculos
    .filter(v => v.estado === 'entregado' && (v.fechaEntrega || '').slice(0, 7) === mes)
    .reduce((s, v) => s + montoDe(v), 0);
}

function mesAnterior(mes) {
  const [a, m] = mes.split('-').map(Number);
  const d = new Date(a, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function renderPanel() {
  const enTaller = activos();
  const conAlerta = enTaller.filter(v => nivelAlerta(v));
  const mes = mesActual();
  const facturado = facturadoDelMes(mes);
  const anterior = facturadoDelMes(mesAnterior(mes));
  const porCobrar = DB.vehiculos
    .filter(v => v.estado === 'entregado')
    .reduce((s, v) => s + saldoDe(v), 0);

  $('#kpiEnTaller').textContent = enTaller.length;
  $('#kpiAtrasados').textContent = conAlerta.length;
  $('#kpiFacturado').textContent = fmtMoneda(facturado);
  $('#kpiPorCobrar').textContent = fmtMoneda(porCobrar);

  const nombreMes = MESES[Number(mes.slice(5, 7)) - 1];
  let pie = nombreMes;
  if (anterior > 0) {
    const dif = Math.round(((facturado - anterior) / anterior) * 100);
    pie += ` · ${dif >= 0 ? '+' : ''}${dif}% vs mes anterior`;
  }
  $('#kpiFacturadoPie').textContent = pie;

  // Recordatorios
  const alertas = conAlerta.sort((a, b) => diasEnTaller(b) - diasEnTaller(a));
  $('#listaAlertas').innerHTML = alertas.length
    ? alertas.map(filaItem).join('')
    : `<p class="vacio">Ningún vehículo pasa de ${DB.ajustes.diasAviso} días. Todo al día.</p>`;

  // En el taller
  const lista = enTaller.slice().sort((a, b) => diasEnTaller(b) - diasEnTaller(a));
  $('#listaActivos').innerHTML = lista.length
    ? lista.map(filaItem).join('')
    : '<p class="vacio">No hay vehículos en el taller.</p>';
}

function filaItem(v) {
  const d = diasEnTaller(v);
  return `
    <div class="item ${nivelAlerta(v)}" data-id="${v.id}">
      <div class="item-info">
        <div class="item-titulo">${esc(v.placa)} · ${esc(descripcionVehiculo(v))}</div>
        <div class="item-sub">${esc(v.problema || '')}${v.cliente ? ' — ' + esc(v.cliente) : ''}</div>
      </div>
      ${badgeEstado(v.estado)}
      <div class="item-dias">${d} ${d === 1 ? 'día' : 'días'}</div>
    </div>`;
}

/* ================== Render: Vehículos ================== */

function vehiculosFiltrados() {
  const q = $('#buscador').value.trim().toLowerCase();
  const estado = $('#filtroEstado').value;
  const rango = $('#filtroRango').value;

  return DB.vehiculos.filter(v => {
    if (rango === 'activos' && v.estado === 'entregado') return false;
    if (rango === 'entregados' && v.estado !== 'entregado') return false;
    if (estado && v.estado !== estado) return false;
    if (q) {
      const texto = [v.placa, v.cliente, v.telefono, v.problema, v.marca, v.modelo, v.mecanico]
        .filter(Boolean).join(' ').toLowerCase();
      if (!texto.includes(q)) return false;
    }
    return true;
  }).sort((a, b) => {
    if (a.estado === 'entregado' && b.estado !== 'entregado') return 1;
    if (b.estado === 'entregado' && a.estado !== 'entregado') return -1;
    return (b.fechaIngreso || '').localeCompare(a.fechaIngreso || '');
  });
}

function renderVehiculos() {
  const lista = vehiculosFiltrados();
  const cuerpo = $('#tablaVehiculos');

  cuerpo.innerHTML = lista.map(v => {
    const d = diasEnTaller(v);
    const nivel = nivelAlerta(v);
    const claseDias = nivel === 'rojo' ? 'dias-rojo' : nivel === 'amarillo' ? 'dias-amarillo' : '';
    const saldo = saldoDe(v);
    const pago = v.estado === 'entregado'
      ? (saldo > 0 ? `<span class="badge b-debe">debe ${fmtMoneda(saldo)}</span>` : '<span class="badge b-pagado">pagado</span>')
      : '';
    return `
      <tr data-id="${v.id}">
        <td class="placa">${esc(v.placa)}</td>
        <td>${esc(descripcionVehiculo(v))}</td>
        <td>${esc(v.cliente || '—')}<br><span class="muted mini">${esc(v.telefono || '')}</span></td>
        <td class="recorte" title="${esc(v.problema)}">${esc(v.problema)}</td>
        <td>${fmtFecha(v.fechaIngreso)}</td>
        <td class="${claseDias}">${d}</td>
        <td>${badgeEstado(v.estado)}</td>
        <td class="der">${montoDe(v) ? fmtMoneda(montoDe(v)) : '—'}<br>${pago}</td>
        <td class="der"><button class="btn btn-mini btn-ghost" data-ver="${v.id}">Ver</button></td>
      </tr>`;
  }).join('');

  $('#vacioVehiculos').classList.toggle('oculto', lista.length > 0);
}

/* ================== Render: Reportes ================== */

function renderReportes() {
  const mes = $('#mesReporte').value || mesActual();
  const entregados = DB.vehiculos
    .filter(v => v.estado === 'entregado' && (v.fechaEntrega || '').slice(0, 7) === mes)
    .sort((a, b) => (a.fechaEntrega || '').localeCompare(b.fechaEntrega || ''));

  const total = entregados.reduce((s, v) => s + montoDe(v), 0);
  const saldo = entregados.reduce((s, v) => s + saldoDe(v), 0);
  const prom = entregados.length ? total / entregados.length : 0;
  const anterior = facturadoDelMes(mesAnterior(mes));

  $('#repFacturado').textContent = fmtMoneda(total);
  $('#repEntregados').textContent = entregados.length;
  $('#repPromedio').textContent = fmtMoneda(prom);
  $('#repSaldo').textContent = fmtMoneda(saldo);

  const nombreMes = MESES[Number(mes.slice(5, 7)) - 1];
  $('#repComparacion').textContent = anterior > 0
    ? `${nombreMes} · mes anterior ${fmtMoneda(anterior)}`
    : nombreMes;

  $('#tablaReporte').innerHTML = entregados.map(v => `
    <tr data-id="${v.id}">
      <td>${fmtFecha(v.fechaEntrega)}</td>
      <td class="placa">${esc(v.placa)}</td>
      <td>${esc(v.cliente || '—')}</td>
      <td class="recorte" title="${esc(v.problema)}">${esc(v.problema)}</td>
      <td>${diasEnTaller(v)}</td>
      <td class="der">${fmtMoneda(montoDe(v))}</td>
      <td class="der">${fmtMoneda(num(v.abono))}</td>
      <td class="der">${saldoDe(v) > 0 ? `<span class="dias-rojo">${fmtMoneda(saldoDe(v))}</span>` : '—'}</td>
    </tr>`).join('');

  $('#vacioReporte').classList.toggle('oculto', entregados.length > 0);

  renderBarrasAnio(mes.slice(0, 4));
}

function renderBarrasAnio(anio) {
  $('#anioResumen').textContent = anio;
  const totales = MESES.map((_, i) => facturadoDelMes(`${anio}-${String(i + 1).padStart(2, '0')}`));
  const max = Math.max(...totales, 1);
  const actual = mesActual();

  $('#barrasAnio').innerHTML = MESES.map((nombre, i) => {
    const clave = `${anio}-${String(i + 1).padStart(2, '0')}`;
    const v = totales[i];
    return `
      <div class="barra-fila ${clave === actual ? 'actual' : ''}">
        <span class="barra-mes">${nombre.slice(0, 3)}</span>
        <span class="barra-pista">${v ? `<span class="barra-valor" style="width:${(v / max) * 100}%"></span>` : ""}</span>
        <span class="barra-monto">${v ? fmtMoneda(v) : '—'}</span>
      </div>`;
  }).join('');
}

/* ================== Render: Ajustes ================== */

function renderAjustes() {
  $('#setNombre').value = DB.ajustes.nombre;
  $('#setTelefono').value = DB.ajustes.telefono;
  $('#setMoneda').value = DB.ajustes.moneda;
  $('#setDiasAviso').value = DB.ajustes.diasAviso;
  $('#setDiasUrgente').value = DB.ajustes.diasUrgente;

  const ultimo = DB.meta.ultimoRespaldo;
  $('#infoRespaldo').textContent = ultimo
    ? `Último respaldo: ${fmtFecha(ultimo)} (hace ${dias(ultimo)} días).`
    : 'Todavía no has descargado ningún respaldo.';
}

function renderTodo() {
  $('#nombreTaller').textContent = DB.ajustes.nombre || 'Taller';
  document.title = `${DB.ajustes.nombre || 'Taller'} — Control de Vehículos`;
  renderPanel();
  renderVehiculos();
  renderReportes();
  renderAjustes();
  revisarRespaldo();
}

function revisarRespaldo() {
  const necesita = DB.vehiculos.length > 0 &&
    (!DB.meta.ultimoRespaldo || dias(DB.meta.ultimoRespaldo) >= 7);
  $('#avisoRespaldo').classList.toggle('oculto', !necesita);
}

/* ================== Detalle ================== */

function abrirDetalle(id) {
  const v = DB.vehiculos.find(x => x.id === id);
  if (!v) return;

  const d = diasEnTaller(v);
  const saldo = saldoDe(v);
  const opciones = Object.entries(ESTADOS)
    .filter(([k]) => k !== 'entregado')
    .map(([k, e]) => `<option value="${k}" ${v.estado === k ? 'selected' : ''}>${e.label}</option>`)
    .join('');

  $('#tituloDetalle').textContent = `${v.placa} · ${descripcionVehiculo(v)}`;
  $('#cuerpoDetalle').innerHTML = `
    <div class="detalle-grid">
      <div><div class="dato-label">Cliente</div><div class="dato-valor">${esc(v.cliente || '—')}</div></div>
      <div><div class="dato-label">Teléfono</div><div class="dato-valor">${esc(v.telefono || '—')}</div></div>
      <div><div class="dato-label">Ingreso</div><div class="dato-valor">${fmtFecha(v.fechaIngreso)}</div></div>
      <div><div class="dato-label">${v.estado === 'entregado' ? 'Entrega' : 'Tiempo en taller'}</div>
           <div class="dato-valor">${v.estado === 'entregado' ? fmtFecha(v.fechaEntrega) + ` (${d} días)` : d + (d === 1 ? ' día' : ' días')}</div></div>
      <div><div class="dato-label">Estado</div><div class="dato-valor">${badgeEstado(v.estado)}</div></div>
      <div><div class="dato-label">Mecánico</div><div class="dato-valor">${esc(v.mecanico || '—')}</div></div>
      <div><div class="dato-label">Color</div><div class="dato-valor">${esc(v.color || '—')}</div></div>
      <div><div class="dato-label">${v.montoFinal != null ? 'Cobrado' : 'Presupuesto'}</div>
           <div class="dato-valor">${montoDe(v) ? fmtMoneda(montoDe(v)) : '—'}
           ${num(v.abono) ? `<span class="muted mini"> · abonado ${fmtMoneda(v.abono)}${saldo > 0 ? ` · debe ${fmtMoneda(saldo)}` : ''}</span>` : ''}</div></div>
    </div>

    <div class="bloque">
      <div class="dato-label">Por qué entró</div>
      <div class="dato-valor">${esc(v.problema)}</div>
      ${v.notas ? `<div class="dato-label" style="margin-top:10px">Notas</div><div class="dato-valor">${esc(v.notas)}</div>` : ''}
    </div>

    <div class="bloque">
      <div class="dato-label" style="margin-bottom:8px">Acciones</div>
      <div class="acciones-estado">
        ${v.estado !== 'entregado' ? `
          <select id="cambiarEstado" style="width:auto">${opciones}</select>
          <button class="btn btn-ghost" data-accion="estado" data-id="${v.id}">Cambiar estado</button>
          <button class="btn btn-primary" data-accion="entregar" data-id="${v.id}">Registrar entrega</button>
        ` : `
          <button class="btn btn-ghost" data-accion="reabrir" data-id="${v.id}">Reabrir trabajo</button>
          ${saldo > 0 ? `<button class="btn btn-ghost" data-accion="cobrar" data-id="${v.id}">Registrar pago del saldo</button>` : ''}
        `}
        <button class="btn btn-ghost" data-accion="nota" data-id="${v.id}">Agregar nota</button>
        <button class="btn btn-ghost" data-accion="imprimir" data-id="${v.id}">Imprimir orden</button>
        <button class="btn btn-ghost" data-accion="editar" data-id="${v.id}">Editar</button>
        <button class="btn btn-peligro" data-accion="borrar" data-id="${v.id}">Eliminar</button>
      </div>
    </div>

    <div class="bloque">
      <div class="dato-label">Historial</div>
      <ul class="historial">
        ${(v.historial || []).slice().reverse().map(h =>
          `<li><span class="h-fecha">${fmtFecha(h.fecha)}</span>${esc(h.texto)}</li>`).join('')
          || '<li class="muted">Sin movimientos.</li>'}
      </ul>
    </div>`;

  abrirModal('#modalDetalle');
}

function agregarHistorial(v, texto) {
  if (!v.historial) v.historial = [];
  v.historial.push({ fecha: hoyISO(), texto });
}

/* ================== Modales ================== */

function abrirModal(sel) { $(sel).classList.remove('oculto'); }
function cerrarModal(sel) { $(sel).classList.add('oculto'); }

function abrirFormulario(id) {
  const esNuevo = !id;
  const v = esNuevo ? null : DB.vehiculos.find(x => x.id === id);

  $('#tituloForm').textContent = esNuevo ? 'Registrar entrada' : 'Editar vehículo';
  $('#fId').value = esNuevo ? '' : v.id;
  $('#fPlaca').value = esNuevo ? '' : v.placa;
  $('#fTipo').value = esNuevo ? 'Moto' : (v.tipo || 'Moto');
  $('#fMarca').value = esNuevo ? '' : (v.marca || '');
  $('#fModelo').value = esNuevo ? '' : (v.modelo || '');
  $('#fColor').value = esNuevo ? '' : (v.color || '');
  $('#fCliente').value = esNuevo ? '' : (v.cliente || '');
  $('#fTelefono').value = esNuevo ? '' : (v.telefono || '');
  $('#fProblema').value = esNuevo ? '' : v.problema;
  $('#fIngreso').value = esNuevo ? hoyISO() : v.fechaIngreso;
  $('#fEstado').value = esNuevo ? 'recibido' : v.estado;
  $('#fMecanico').value = esNuevo ? '' : (v.mecanico || '');
  $('#fPresupuesto').value = esNuevo ? '' : (v.presupuesto ?? '');
  $('#fAbono').value = esNuevo ? '' : (v.abono ?? '');
  $('#fNotas').value = esNuevo ? '' : (v.notas || '');

  cerrarModal('#modalDetalle');
  abrirModal('#modalForm');
  setTimeout(() => $('#fPlaca').focus(), 50);
}

function guardarFormulario(ev) {
  ev.preventDefault();
  const id = $('#fId').value;
  const datos = {
    placa: $('#fPlaca').value.trim().toUpperCase(),
    tipo: $('#fTipo').value,
    marca: $('#fMarca').value.trim(),
    modelo: $('#fModelo').value.trim(),
    color: $('#fColor').value.trim(),
    cliente: $('#fCliente').value.trim(),
    telefono: $('#fTelefono').value.trim(),
    problema: $('#fProblema').value.trim(),
    fechaIngreso: $('#fIngreso').value,
    estado: $('#fEstado').value,
    mecanico: $('#fMecanico').value.trim(),
    presupuesto: num($('#fPresupuesto').value),
    abono: num($('#fAbono').value),
    notas: $('#fNotas').value.trim()
  };

  if (id) {
    const v = DB.vehiculos.find(x => x.id === id);
    const estadoAnterior = v.estado;
    Object.assign(v, datos);
    if (estadoAnterior !== datos.estado) {
      agregarHistorial(v, `Estado: ${ESTADOS[datos.estado].label}`);
    }
    agregarHistorial(v, 'Datos actualizados');
    aviso('Cambios guardados.');
  } else {
    const nuevo = {
      id: uid(),
      ...datos,
      montoFinal: null,
      fechaEntrega: null,
      historial: [{ fecha: datos.fechaIngreso, texto: 'Ingresó al taller' }]
    };
    DB.vehiculos.push(nuevo);
    aviso(`${nuevo.placa} registrado.`);
  }

  guardar();
  renderTodo();
  cerrarModal('#modalForm');
}

function abrirEntrega(id) {
  const v = DB.vehiculos.find(x => x.id === id);
  if (!v) return;
  $('#eId').value = v.id;
  $('#eFecha').value = hoyISO();
  $('#eMonto').value = v.montoFinal != null ? v.montoFinal : (v.presupuesto || '');
  $('#eAbono').value = v.abono || '';
  $('#eTrabajo').value = '';
  $('#eResumen').textContent =
    `${v.placa} · ${descripcionVehiculo(v)} · ${diasEnTaller(v)} días en el taller`;
  cerrarModal('#modalDetalle');
  abrirModal('#modalEntrega');
}

function guardarEntrega(ev) {
  ev.preventDefault();
  const v = DB.vehiculos.find(x => x.id === $('#eId').value);
  if (!v) return;

  v.fechaEntrega = $('#eFecha').value;
  v.montoFinal = num($('#eMonto').value);
  v.abono = num($('#eAbono').value);
  v.estado = 'entregado';
  const trabajo = $('#eTrabajo').value.trim();
  if (trabajo) v.notas = (v.notas ? v.notas + '\n' : '') + trabajo;
  agregarHistorial(v, `Entregado · cobrado ${fmtMoneda(v.montoFinal)}${saldoDe(v) > 0 ? ` · queda debiendo ${fmtMoneda(saldoDe(v))}` : ''}`);

  guardar();
  renderTodo();
  cerrarModal('#modalEntrega');
  aviso(`${v.placa} entregado. Facturado ${fmtMoneda(v.montoFinal)}.`);
}

/* ================== Acciones del detalle ================== */

function manejarAccion(accion, id) {
  const v = DB.vehiculos.find(x => x.id === id);
  if (!v) return;

  if (accion === 'estado') {
    const nuevo = $('#cambiarEstado').value;
    if (nuevo !== v.estado) {
      v.estado = nuevo;
      agregarHistorial(v, `Estado: ${ESTADOS[nuevo].label}`);
      guardar();
      renderTodo();
      aviso('Estado actualizado.');
    }
    abrirDetalle(id);

  } else if (accion === 'entregar') {
    abrirEntrega(id);

  } else if (accion === 'reabrir') {
    v.estado = 'reparacion';
    v.fechaEntrega = null;
    agregarHistorial(v, 'Trabajo reabierto');
    guardar(); renderTodo(); abrirDetalle(id);
    aviso('Trabajo reabierto.');

  } else if (accion === 'cobrar') {
    const saldo = saldoDe(v);
    const txt = prompt(`Saldo pendiente: ${fmtMoneda(saldo)}\n¿Cuánto abonó ahora?`, saldo.toFixed(2));
    if (txt === null) return;
    const pago = num(txt);
    if (pago <= 0) return;
    v.abono = num(v.abono) + pago;
    agregarHistorial(v, `Abono de ${fmtMoneda(pago)}`);
    guardar(); renderTodo(); abrirDetalle(id);
    aviso('Pago registrado.');

  } else if (accion === 'nota') {
    const txt = prompt('Nota para el historial:');
    if (!txt) return;
    agregarHistorial(v, txt.trim());
    guardar(); renderTodo(); abrirDetalle(id);

  } else if (accion === 'editar') {
    abrirFormulario(id);

  } else if (accion === 'imprimir') {
    imprimirOrden(v);

  } else if (accion === 'borrar') {
    if (!confirm(`¿Eliminar el registro de ${v.placa}? No se puede deshacer.`)) return;
    DB.vehiculos = DB.vehiculos.filter(x => x.id !== id);
    guardar(); renderTodo(); cerrarModal('#modalDetalle');
    aviso('Registro eliminado.');
  }
}

/* ================== Impresión ================== */

function imprimirOrden(v) {
  const a = DB.ajustes;
  const saldo = saldoDe(v);
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>Orden ${esc(v.placa)}</title>
<style>
  body{font:14px/1.6 "Segoe UI",system-ui,sans-serif;color:#111;padding:32px;max-width:700px;margin:0 auto}
  h1{margin:0;font-size:22px} .sub{color:#666;font-size:13px;margin-bottom:20px}
  table{width:100%;border-collapse:collapse;margin:14px 0}
  td{padding:6px 0;vertical-align:top} td.l{color:#666;width:170px}
  .caja{border:1px solid #ddd;border-radius:8px;padding:12px 16px;margin-top:14px}
  .total{font-size:18px;font-weight:700}
  .firma{margin-top:56px;display:flex;gap:40px}
  .firma div{flex:1;border-top:1px solid #999;padding-top:6px;text-align:center;color:#666;font-size:12px}
</style></head><body>
<h1>${esc(a.nombre)}</h1>
<div class="sub">${esc(a.telefono || '')} · Orden de trabajo · Impresa el ${fmtFecha(hoyISO())}</div>
<table>
  <tr><td class="l">Placa</td><td><strong>${esc(v.placa)}</strong></td></tr>
  <tr><td class="l">Vehículo</td><td>${esc(descripcionVehiculo(v))}${v.color ? ' · ' + esc(v.color) : ''}</td></tr>
  <tr><td class="l">Cliente</td><td>${esc(v.cliente || '—')} ${v.telefono ? '· ' + esc(v.telefono) : ''}</td></tr>
  <tr><td class="l">Fecha de ingreso</td><td>${fmtFecha(v.fechaIngreso)}</td></tr>
  ${v.fechaEntrega ? `<tr><td class="l">Fecha de entrega</td><td>${fmtFecha(v.fechaEntrega)}</td></tr>` : ''}
  <tr><td class="l">Estado</td><td>${esc((ESTADOS[v.estado] || {}).label || '')}</td></tr>
  ${v.mecanico ? `<tr><td class="l">Mecánico</td><td>${esc(v.mecanico)}</td></tr>` : ''}
</table>
<div class="caja"><strong>Motivo de ingreso</strong><br>${esc(v.problema)}</div>
${v.notas ? `<div class="caja"><strong>Notas / trabajo realizado</strong><br>${esc(v.notas).replace(/\n/g, '<br>')}</div>` : ''}
<div class="caja">
  <table>
    <tr><td class="l">${v.montoFinal != null ? 'Total' : 'Presupuesto estimado'}</td>
        <td class="total">${fmtMoneda(montoDe(v))}</td></tr>
    ${num(v.abono) ? `<tr><td class="l">Abonado</td><td>${fmtMoneda(v.abono)}</td></tr>
    <tr><td class="l">Saldo</td><td><strong>${fmtMoneda(saldo)}</strong></td></tr>` : ''}
  </table>
</div>
<div class="firma"><div>Firma del cliente</div><div>Firma del taller</div></div>
</body></html>`;

  const w = window.open('', '_blank');
  if (!w) { aviso('El navegador bloqueó la ventana de impresión.'); return; }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}

/* ================== Respaldo / exportación ================== */

function descargar(nombre, contenido, tipo) {
  const blob = new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportarRespaldo() {
  const nombre = `respaldo-taller-${hoyISO()}.json`;
  descargar(nombre, JSON.stringify(DB, null, 2), 'application/json');
  DB.meta.ultimoRespaldo = hoyISO();
  guardar();
  renderAjustes();
  revisarRespaldo();
  aviso('Respaldo descargado.');
}

function importarRespaldo(archivo) {
  const lector = new FileReader();
  lector.onload = () => {
    try {
      const datos = JSON.parse(lector.result);
      if (!Array.isArray(datos.vehiculos)) throw new Error('formato');
      if (!confirm(`El respaldo tiene ${datos.vehiculos.length} vehículos. Esto reemplaza los datos actuales. ¿Continuar?`)) return;
      DB.vehiculos = datos.vehiculos;
      DB.ajustes = { ...AJUSTES_DEF, ...(datos.ajustes || {}) };
      DB.meta = { ultimoRespaldo: null, ...(datos.meta || {}) };
      guardar();
      renderTodo();
      aviso('Respaldo restaurado.');
    } catch (e) {
      aviso('El archivo no es un respaldo válido.');
    }
  };
  lector.readAsText(archivo);
}

function exportarCsv() {
  const mes = $('#mesReporte').value || mesActual();
  const filas = DB.vehiculos
    .filter(v => v.estado === 'entregado' && (v.fechaEntrega || '').slice(0, 7) === mes)
    .sort((a, b) => (a.fechaEntrega || '').localeCompare(b.fechaEntrega || ''));

  if (!filas.length) { aviso('No hay entregas en ese mes.'); return; }

  const cab = ['Fecha entrega', 'Placa', 'Vehiculo', 'Cliente', 'Telefono',
               'Problema', 'Ingreso', 'Dias', 'Monto', 'Abonado', 'Saldo'];
  const limpiar = (t) => `"${String(t == null ? '' : t).replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;

  const cuerpo = filas.map(v => [
    fmtFecha(v.fechaEntrega), v.placa, descripcionVehiculo(v), v.cliente, v.telefono,
    v.problema, fmtFecha(v.fechaIngreso), diasEnTaller(v),
    montoDe(v).toFixed(2), num(v.abono).toFixed(2), saldoDe(v).toFixed(2)
  ].map(limpiar).join(';'));

  const total = filas.reduce((s, v) => s + montoDe(v), 0);
  cuerpo.push(['', '', '', '', '', '', '', 'TOTAL', total.toFixed(2), '', ''].map(limpiar).join(';'));

  const csv = '﻿' + [cab.map(limpiar).join(';'), ...cuerpo].join('\r\n');
  descargar(`facturacion-${mes}.csv`, csv, 'text/csv;charset=utf-8');
  aviso('Archivo descargado.');
}

/* ================== Datos de ejemplo ================== */

function cargarDemo() {
  if (DB.vehiculos.length && !confirm('Ya hay registros. ¿Agregar los ejemplos de todas formas?')) return;

  const hace = (d) => {
    const f = new Date();
    f.setDate(f.getDate() - d);
    return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
  };

  const demo = [
    { placa: 'M 145-872', tipo: 'Moto', marca: 'Honda', modelo: 'CG 150', color: 'Rojo',
      cliente: 'Luis Martínez', telefono: '8845-1122', problema: 'No enciende, posible falla de bujía',
      fechaIngreso: hace(2), estado: 'diagnostico', mecanico: 'Carlos', presupuesto: 1200, abono: 0 },
    { placa: 'M 220-431', tipo: 'Moto', marca: 'Yamaha', modelo: 'YBR 125', color: 'Negro',
      cliente: 'Ana Rivas', telefono: '8790-6633', problema: 'Cambio de aceite y ajuste de frenos',
      fechaIngreso: hace(6), estado: 'reparacion', mecanico: 'Carlos', presupuesto: 850, abono: 400 },
    { placa: 'M 098-115', tipo: 'Moto', marca: 'Suzuki', modelo: 'GN 125', color: 'Azul',
      cliente: 'Pedro Gómez', telefono: '8511-9087', problema: 'Cambio de cadena y piñones, se espera repuesto',
      fechaIngreso: hace(14), estado: 'repuesto', mecanico: 'Jairo', presupuesto: 2300, abono: 1000 },
    { placa: 'M 331-706', tipo: 'Moto', marca: 'Bajaj', modelo: 'Pulsar 180', color: 'Blanco',
      cliente: 'María Sequeira', telefono: '8633-2211', problema: 'Revisión de embrague',
      fechaIngreso: hace(1), estado: 'recibido', mecanico: '', presupuesto: 1500, abono: 0 },
    { placa: 'M 777-004', tipo: 'Cuadraciclo', marca: 'Honda', modelo: 'TRX 250', color: 'Verde',
      cliente: 'Taller El Sol', telefono: '2255-7788', problema: 'Mantenimiento general',
      fechaIngreso: hace(9), estado: 'listo', mecanico: 'Jairo', presupuesto: 3200, abono: 3200 },
    { placa: 'M 412-559', tipo: 'Moto', marca: 'Honda', modelo: 'XR 150', color: 'Negro',
      cliente: 'Julio Blandón', telefono: '8899-4411', problema: 'Reparación de arranque eléctrico',
      fechaIngreso: hace(22), estado: 'entregado', mecanico: 'Carlos',
      presupuesto: 1800, montoFinal: 2100, abono: 2100, fechaEntrega: hace(17) },
    { placa: 'M 660-238', tipo: 'Moto', marca: 'Yamaha', modelo: 'FZ 150', color: 'Gris',
      cliente: 'Rosa Delgado', telefono: '8322-9910', problema: 'Cambio de llantas y balanceo',
      fechaIngreso: hace(12), estado: 'entregado', mecanico: 'Jairo',
      presupuesto: 4000, montoFinal: 4350, abono: 2000, fechaEntrega: hace(8) }
  ];

  demo.forEach(d => {
    DB.vehiculos.push({
      id: uid(), notas: '', montoFinal: null, fechaEntrega: null, ...d,
      historial: [{ fecha: d.fechaIngreso, texto: 'Ingresó al taller' }]
        .concat(d.fechaEntrega ? [{ fecha: d.fechaEntrega, texto: 'Entregado al cliente' }] : [])
    });
  });

  guardar();
  renderTodo();
  aviso('Ejemplos cargados.');
}

/* ================== Arranque y eventos ================== */

function llenarSelectsEstado() {
  const opciones = Object.entries(ESTADOS)
    .map(([k, e]) => `<option value="${k}">${e.label}</option>`).join('');
  $('#fEstado').innerHTML = opciones;
  $('#filtroEstado').innerHTML = '<option value="">Todos los estados</option>' + opciones;
}

function cambiarVista(nombre) {
  $$('.tab').forEach(t => t.classList.toggle('activo', t.dataset.vista === nombre));
  $$('.vista').forEach(v => v.classList.toggle('oculto', v.id !== 'vista-' + nombre));
}

function iniciar() {
  cargar();
  llenarSelectsEstado();

  const f = new Date();
  $('#fechaHoy').textContent =
    `${f.getDate()} de ${MESES[f.getMonth()]} de ${f.getFullYear()}`;
  $('#mesReporte').value = mesActual();

  renderTodo();

  // Navegación
  $$('.tab').forEach(t => t.addEventListener('click', () => cambiarVista(t.dataset.vista)));

  // Alta / edición
  $('#btnNuevo').addEventListener('click', () => abrirFormulario(null));
  $('#formVehiculo').addEventListener('submit', guardarFormulario);
  $('#formEntrega').addEventListener('submit', guardarEntrega);

  // Cierre de modales
  $$('[data-cerrar]').forEach(b => b.addEventListener('click', () => {
    b.closest('.overlay').classList.add('oculto');
  }));
  $$('.overlay').forEach(o => o.addEventListener('click', (ev) => {
    if (ev.target === o) o.classList.add('oculto');
  }));
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') $$('.overlay').forEach(o => o.classList.add('oculto'));
  });

  // Clics en listas del panel
  ['#listaAlertas', '#listaActivos'].forEach(sel => {
    $(sel).addEventListener('click', (ev) => {
      const item = ev.target.closest('.item');
      if (item) abrirDetalle(item.dataset.id);
    });
  });

  // Clics en tablas
  $('#tablaVehiculos').addEventListener('click', (ev) => {
    const fila = ev.target.closest('tr');
    if (fila) abrirDetalle(fila.dataset.id);
  });
  $('#tablaReporte').addEventListener('click', (ev) => {
    const fila = ev.target.closest('tr');
    if (fila) abrirDetalle(fila.dataset.id);
  });

  // Acciones dentro del detalle
  $('#cuerpoDetalle').addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-accion]');
    if (btn) manejarAccion(btn.dataset.accion, btn.dataset.id);
  });

  // Filtros
  $('#buscador').addEventListener('input', renderVehiculos);
  $('#filtroEstado').addEventListener('change', renderVehiculos);
  $('#filtroRango').addEventListener('change', renderVehiculos);
  $('#mesReporte').addEventListener('change', renderReportes);
  $('#btnExportarCsv').addEventListener('click', exportarCsv);

  // Ajustes
  $('#btnGuardarAjustes').addEventListener('click', () => {
    DB.ajustes.nombre = $('#setNombre').value.trim() || 'Taller';
    DB.ajustes.telefono = $('#setTelefono').value.trim();
    DB.ajustes.moneda = $('#setMoneda').value.trim() || 'C$';
    DB.ajustes.diasAviso = Math.max(1, parseInt($('#setDiasAviso').value, 10) || 5);
    DB.ajustes.diasUrgente = Math.max(DB.ajustes.diasAviso, parseInt($('#setDiasUrgente').value, 10) || 10);
    guardar();
    renderTodo();
    aviso('Ajustes guardados.');
  });

  // Respaldo
  $('#btnExportar').addEventListener('click', exportarRespaldo);
  $('#btnRespaldoAviso').addEventListener('click', exportarRespaldo);
  $('#btnCerrarAviso').addEventListener('click', () => $('#avisoRespaldo').classList.add('oculto'));
  $('#btnImportar').addEventListener('click', () => $('#archivoImportar').click());
  $('#archivoImportar').addEventListener('change', (ev) => {
    if (ev.target.files[0]) importarRespaldo(ev.target.files[0]);
    ev.target.value = '';
  });

  // Demo y borrado
  $('#btnDemo').addEventListener('click', cargarDemo);
  $('#btnBorrarTodo').addEventListener('click', () => {
    if (!confirm('Esto borra TODOS los vehículos registrados. ¿Seguro?')) return;
    if (!confirm('Última confirmación: se perderán los datos que no estén respaldados.')) return;
    DB.vehiculos = [];
    guardar();
    renderTodo();
    aviso('Datos borrados.');
  });
}

document.addEventListener('DOMContentLoaded', iniciar);
