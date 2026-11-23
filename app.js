/* =====================================================
   LÓGICA DE LA APP · Taberna Itsas Txoko (demo)
   ÍNDICE
   1. Datos de ejemplo (la carta, INVENTADA)
   2. Guardado y sincronización (nube o, si no hay, este navegador)
   3. Estado de la app
   4. Navegación entre secciones
   5. Carta
   6. Pedido
   7. Cocina
   8. Reservas
   9. Arranque (incluye la mesa que viene del QR)
   ===================================================== */

/* 1. DATOS DE EJEMPLO ------------------------------------------------
   Todo inventado. En un bar real, esto vendría de una base de datos
   que el dueño edita desde un panel (por ejemplo Firebase o Supabase). */
const carta = [
  { id: 1,  categoria: "Pintxos",   nombre: "Pintxo de tortilla",      descripcion: "Con cebolla caramelizada",        precio: 2.50 },
  { id: 2,  categoria: "Pintxos",   nombre: "Gilda clásica",           descripcion: "Aceituna, anchoa y guindilla",    precio: 2.20 },
  { id: 3,  categoria: "Pintxos",   nombre: "Txangurro gratinado",     descripcion: "Centollo al horno",               precio: 4.80 },
  { id: 4,  categoria: "Raciones",  nombre: "Croquetas de jamón",      descripcion: "Caseras, 8 unidades",             precio: 9.00 },
  { id: 5,  categoria: "Raciones",  nombre: "Pimientos de Gernika",    descripcion: "Fritos con sal gorda",            precio: 8.50 },
  { id: 6,  categoria: "Raciones",  nombre: "Rabas de calamar",        descripcion: "Con limón y alioli",              precio: 12.50 },
  { id: 7,  categoria: "Platos",    nombre: "Bacalao al pil-pil",      descripcion: "Receta de la casa",               precio: 17.50 },
  { id: 8,  categoria: "Platos",    nombre: "Chuletón a la brasa",     descripcion: "Para compartir, 500 g",           precio: 32.00 },
  { id: 9,  categoria: "Bebidas",   nombre: "Txakoli",                 descripcion: "Copa",                            precio: 3.20 },
  { id: 10, categoria: "Bebidas",   nombre: "Caña",                    descripcion: "Cerveza de barril",               precio: 2.00 },
  { id: 11, categoria: "Postres",   nombre: "Tarta de queso",          descripcion: "Cremosa, estilo vasco",           precio: 5.50 }
];
/* Iconos dibujados en SVG (uno por categoría). Así se ven igual en todos los móviles */
const iconos = {
  Pintxos:  '<path d="M4 16h16M6 16c0-3 2-5 6-5s6 2 6 5"/><path d="M12 11V4M10 4h4"/>',
  Raciones: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/>',
  Platos:   '<path d="M3 17h18M5 17a7 7 0 0114 0"/><path d="M12 7V5"/>',
  Bebidas:  '<path d="M7 4h10l-1.5 15a2 2 0 01-2 2h-3a2 2 0 01-2-2z"/><path d="M7.5 9h9"/>',
  Postres:  '<path d="M3 17l18-5-18-5z"/><path d="M3 17h18"/>'
};
const dibujarIcono = (categoria) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true">${iconos[categoria]}</svg>`;

const categorias = ["Todo", "Pintxos", "Raciones", "Platos", "Bebidas", "Postres"];
const numeroDeMesas = 12;
const horasReserva = ["13:00", "13:30", "14:00", "14:30", "20:30", "21:00", "21:30", "22:00"];

/* 2. GUARDADO Y SINCRONIZACIÓN ----------------------------------------
   Los pedidos y las reservas se guardan en una "base de datos".
   Hay dos modos, y la app elige sola según config.js:

   - MODO NUBE: si en config.js hay una dirección, los datos van a una
     base de datos de internet (Firebase Realtime Database, gratis).
     Así la cocina ve al instante los pedidos de TODOS los móviles.
   - MODO LOCAL: si config.js está vacío, se usa localStorage. Solo se
     comparte entre pestañas del mismo navegador (sirve para probar).

   Cada dato (un pedido, una reserva) se guarda con un identificador
   único. La base de datos es como un árbol:
       pedidos/ID_DEL_PEDIDO  -> { mesa, tipo, platos, total, ... }
       reservas/ID_DE_LA_RESERVA -> { nombre, personas, ... }       */
const urlNube = (typeof configuracionNube !== "undefined" && configuracionNube.urlBaseDeDatos || "").replace(/\/$/, "");
const modoNube = urlNube !== "";

/* Crea un identificador único: la hora (en base 36) + letras al azar */
const nuevoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* Lee todos los datos de una colección ("pedidos" o "reservas")
   y los devuelve como lista, de más antiguo a más nuevo */
async function leerColeccion(nombre) {
  let objeto;
  if (modoNube) {
    const respuesta = await fetch(`${urlNube}/${nombre}.json`);
    objeto = (await respuesta.json()) || {};
  } else {
    objeto = JSON.parse(localStorage.getItem(nombre) || "{}");
  }
  return Object.entries(objeto)
    .map(([id, dato]) => ({ id, ...dato }))
    .sort((x, y) => x.creado - y.creado);
}

/* Guarda (o sobrescribe) un dato con su identificador */
async function guardarDato(nombre, id, dato) {
  if (modoNube) {
    await fetch(`${urlNube}/${nombre}/${id}.json`, { method: "PUT", body: JSON.stringify(dato) });
  } else {
    const objeto = JSON.parse(localStorage.getItem(nombre) || "{}");
    objeto[id] = dato;
    localStorage.setItem(nombre, JSON.stringify(objeto));
  }
}

/* Cambia solo algunos campos de un dato (por ejemplo, servido: true) */
async function actualizarDato(nombre, id, cambios) {
  if (modoNube) {
    await fetch(`${urlNube}/${nombre}/${id}.json`, { method: "PATCH", body: JSON.stringify(cambios) });
  } else {
    const objeto = JSON.parse(localStorage.getItem(nombre) || "{}");
    objeto[id] = { ...objeto[id], ...cambios };
    localStorage.setItem(nombre, JSON.stringify(objeto));
  }
}

/* Borra una colección entera (botón "Borrar datos de la demo") */
async function borrarColeccion(nombre) {
  if (modoNube) await fetch(`${urlNube}/${nombre}.json`, { method: "DELETE" });
  else localStorage.removeItem(nombre);
}

/* "Avísame cuando cambie algo": llama a la función que le pasemos
   cada vez que hay datos nuevos, vengan de donde vengan. */
function alCambiarDatos(funcion) {
  if (modoNube) {
    /* La base de datos nos avisa por una conexión abierta (EventSource) */
    for (const nombre of ["pedidos", "reservas"]) {
      const conexion = new EventSource(`${urlNube}/${nombre}.json`);
      conexion.addEventListener("put", funcion);
      conexion.addEventListener("patch", funcion);
    }
    /* Plan B por si la conexión se corta: preguntar cada 10 segundos */
    setInterval(funcion, 10000);
  } else {
    /* "storage" se dispara cuando OTRA pestaña cambia el localStorage */
    window.addEventListener("storage", funcion);
  }
}

/* Los nombres de las reservas los escribe cualquiera: antes de pintarlos
   en pantalla quitamos los caracteres especiales para que nadie pueda
   colar código en la cocina. */
const limpiar = (texto) => String(texto).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* 3. ESTADO DE LA APP ------------------------------------------------- */
let pedidoActual = [];        // lista de { id, cantidad }
let categoriaActiva = "Todo"; // filtro de la carta
let tipoPedido = "mesa";      // "mesa" o "llevar"

/* Atajos para no repetir document.getElementById */
const el = (id) => document.getElementById(id);
const formatoPrecio = (n) => n.toFixed(2).replace(".", ",") + " €";

/* 4. NAVEGACIÓN ENTRE SECCIONES --------------------------------------- */
function mostrarSeccion(nombre) {
  document.querySelectorAll(".seccion").forEach((s) => s.classList.remove("activa"));
  el("seccion-" + nombre).classList.add("activa");
  document.querySelectorAll(".boton-nav").forEach((b) => {
    b.classList.toggle("activo", b.dataset.seccion === nombre);
  });
  if (nombre === "cocina") pintarCocina();
  window.scrollTo(0, 0);
}

/* 5. CARTA ------------------------------------------------------------ */
function pintarFiltros() {
  el("filtros-categoria").innerHTML = categorias.map((c) =>
    `<button class="filtro ${c === categoriaActiva ? "activo" : ""}" data-categoria="${c}">${c}</button>`
  ).join("");
}

function pintarCarta() {
  const platos = carta.filter((p) => categoriaActiva === "Todo" || p.categoria === categoriaActiva);
  el("lista-carta").innerHTML = platos.map((p) => `
    <article class="plato">
      <div class="plato-foto">${dibujarIcono(p.categoria)}</div>
      <div class="plato-info">
        <div class="plato-nombre">${p.nombre}</div>
        <div class="plato-descripcion">${p.descripcion}</div>
        <div class="plato-precio">${formatoPrecio(p.precio)}</div>
      </div>
      <button class="boton-anadir" data-id="${p.id}" aria-label="Añadir ${p.nombre}">+</button>
    </article>`).join("");
}

/* 6. PEDIDO ----------------------------------------------------------- */
function anadirAlPedido(id) {
  const linea = pedidoActual.find((l) => l.id === id);
  if (linea) linea.cantidad++;
  else pedidoActual.push({ id: id, cantidad: 1 });
  pintarPedido();
}

function cambiarCantidad(id, cambio) {
  const linea = pedidoActual.find((l) => l.id === id);
  linea.cantidad += cambio;
  if (linea.cantidad <= 0) pedidoActual = pedidoActual.filter((l) => l.id !== id);
  pintarPedido();
}

function quitarDelPedido(id) {
  pedidoActual = pedidoActual.filter((l) => l.id !== id);
  pintarPedido();
}

function calcularTotal() {
  return pedidoActual.reduce((suma, l) => {
    const plato = carta.find((p) => p.id === l.id);
    return suma + plato.precio * l.cantidad;
  }, 0);
}

function pintarPedido() {
  const contenedor = el("lista-pedido");
  if (pedidoActual.length === 0) {
    contenedor.innerHTML = `<p class="vacio">Tu pedido está vacío.<br>Añade platos desde la carta</p>`;
  } else {
    contenedor.innerHTML = pedidoActual.map((l) => {
      const p = carta.find((x) => x.id === l.id);
      return `
      <div class="linea-pedido">
        <div class="linea-nombre">${p.nombre}<small>${formatoPrecio(p.precio)} cada uno</small></div>
        <div class="cantidad">
          <button data-menos="${l.id}">−</button>
          <span>${l.cantidad}</span>
          <button data-mas="${l.id}">+</button>
        </div>
        <button class="boton-quitar" data-quitar="${l.id}" aria-label="Quitar">Quitar</button>
      </div>`;
    }).join("");
  }
  el("total-pedido").textContent = formatoPrecio(calcularTotal());
  /* Globito rojo con el número de platos en la barra inferior */
  const unidades = pedidoActual.reduce((s, l) => s + l.cantidad, 0);
  el("contador-pedido").textContent = unidades;
  el("contador-pedido").hidden = unidades === 0;
}

async function enviarPedido() {
  const mensaje = el("mensaje-pedido");
  if (pedidoActual.length === 0) {
    mensaje.hidden = false;
    mensaje.style.background = "#fde6e1";
    mensaje.style.color = "#a3321c";
    mensaje.textContent = "Añade algo a tu pedido antes de enviarlo.";
    return;
  }
  /* Guardamos el pedido con su identificador y la hora de creación */
  await guardarDato("pedidos", nuevoId(), {
    creado: Date.now(),
    mesa: el("selector-mesa").value,
    tipo: tipoPedido,
    hora: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
    total: calcularTotal(),
    servido: false,
    platos: pedidoActual.map((l) => {
      const p = carta.find((x) => x.id === l.id);
      return { nombre: p.nombre, cantidad: l.cantidad };
    })
  });

  pedidoActual = [];
  pintarPedido();
  pintarContadorCocina();
  mensaje.hidden = false;
  mensaje.style.background = "";
  mensaje.style.color = "";
  mensaje.textContent = "¡Pedido enviado a cocina! Enseguida te lo llevamos.";
}

/* 7. COCINA ----------------------------------------------------------- */
async function pintarContadorCocina() {
  const pendientes = (await leerColeccion("pedidos")).filter((p) => !p.servido).length;
  el("contador-cocina").textContent = pendientes;
  el("contador-cocina").hidden = pendientes === 0;
}

async function pintarCocina() {
  const pedidos = await leerColeccion("pedidos");
  /* El número del pedido es su posición: el más antiguo es el nº 1 */
  el("lista-cocina").innerHTML = pedidos.length === 0
    ? `<p class="vacio">No hay pedidos todavía.</p>`
    : pedidos.map((p, i) => ({ ...p, numero: i + 1 })).reverse().map((p) => `
      <div class="ticket ${p.servido ? "servido" : ""}">
        <div class="ticket-cabecera">
          <span class="ticket-mesa">Mesa ${limpiar(p.mesa)}${p.tipo === "llevar" ? '<span class="etiqueta-llevar">PARA LLEVAR</span>' : ""}</span>
          <span class="ticket-hora">#${p.numero} · ${limpiar(p.hora)}</span>
        </div>
        <ul>${p.platos.map((x) => `<li><b>${x.cantidad} ×</b> ${limpiar(x.nombre)}</li>`).join("")}</ul>
        ${p.servido
          ? "<strong class=\"texto-servido\">Servido</strong>"
          : `<button class="boton-servido" data-servido="${p.id}">Marcar como servido</button>`}
      </div>`).join("");

  const reservas = await leerColeccion("reservas");
  el("lista-reservas-cocina").innerHTML = reservas.length === 0
    ? `<p class="vacio">No hay reservas todavía.</p>`
    : reservas.map((r) => `
      <div class="reserva-tarjeta"><strong>${limpiar(r.nombre)}</strong> · ${limpiar(r.personas)} pers.<br>
      ${limpiar(r.dia)} a las ${limpiar(r.hora)}</div>`).join("");
  pintarContadorCocina();
}

async function marcarServido(id) {
  await actualizarDato("pedidos", id, { servido: true });
  pintarCocina();
}

/* 8. RESERVAS --------------------------------------------------------- */
function prepararFormularioReserva() {
  el("reserva-personas").innerHTML = Array.from({ length: 10 }, (_, i) =>
    `<option value="${i + 1}">${i + 1} ${i === 0 ? "persona" : "personas"}</option>`).join("");
  el("reserva-hora").innerHTML = horasReserva.map((h) => `<option>${h}</option>`).join("");
  /* El día mínimo es hoy: no se puede reservar en el pasado */
  const hoy = new Date().toISOString().split("T")[0];
  el("reserva-dia").min = hoy;
  el("reserva-dia").value = hoy;
}

async function guardarReserva(evento) {
  evento.preventDefault(); // evita que la página se recargue
  const reserva = {
    nombre: el("reserva-nombre").value.trim(),
    personas: el("reserva-personas").value,
    dia: new Date(el("reserva-dia").value + "T12:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" }),
    hora: el("reserva-hora").value
  };
  reserva.creado = Date.now();
  await guardarDato("reservas", nuevoId(), reserva);

  const caja = el("confirmacion-reserva");
  caja.hidden = false;
  caja.innerHTML = `<strong>Reserva confirmada</strong><br>${limpiar(reserva.nombre)}, mesa para ${reserva.personas} el ${reserva.dia} a las ${reserva.hora}.`;
  el("formulario-reserva").reset();
  prepararFormularioReserva();
}

/* 9. ARRANQUE: conectamos los botones con las funciones --------------- */
function iniciar() {
  /* Selector de mesa */
  el("selector-mesa").innerHTML = Array.from({ length: numeroDeMesas }, (_, i) =>
    `<option value="${i + 1}">Mesa nº ${i + 1}</option>`).join("");

  /* Un solo "escuchador" de clics para toda la página */
  document.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.seccion) mostrarSeccion(b.dataset.seccion);
    if (b.dataset.categoria) { categoriaActiva = b.dataset.categoria; pintarFiltros(); pintarCarta(); }
    if (b.dataset.id) anadirAlPedido(Number(b.dataset.id));
    if (b.dataset.mas) cambiarCantidad(Number(b.dataset.mas), 1);
    if (b.dataset.menos) cambiarCantidad(Number(b.dataset.menos), -1);
    if (b.dataset.quitar) quitarDelPedido(Number(b.dataset.quitar));
    if (b.dataset.servido) marcarServido(b.dataset.servido);
    if (b.dataset.tipo) {
      tipoPedido = b.dataset.tipo;
      document.querySelectorAll(".boton-tipo").forEach((x) => x.classList.toggle("activo", x === b));
    }
  });
  el("boton-enviar").addEventListener("click", enviarPedido);
  el("formulario-reserva").addEventListener("submit", guardarReserva);
  el("boton-borrar-demo").addEventListener("click", async () => {
    await borrarColeccion("pedidos");
    await borrarColeccion("reservas");
    pintarCocina();
  });

  /* Mesa que viene del QR: la dirección es ".../?mesa=5".
     Si existe, dejamos esa mesa elegida al abrir la app. */
  const mesaDelQr = Number(new URLSearchParams(location.search).get("mesa"));
  if (mesaDelQr >= 1 && mesaDelQr <= numeroDeMesas) el("selector-mesa").value = mesaDelQr;
  /* Y ".../?cocina" abre directamente la vista de cocina */
  const abrirCocina = new URLSearchParams(location.search).has("cocina");

  /* Cuando cambian los datos (otro móvil, otra pestaña), repintamos cocina */
  alCambiarDatos(() => {
    pintarContadorCocina();
    if (el("seccion-cocina").classList.contains("activa")) pintarCocina();
  });
  if (abrirCocina) mostrarSeccion("cocina");

  pintarFiltros();
  pintarCarta();
  pintarPedido();
  prepararFormularioReserva();
  pintarContadorCocina();
}
iniciar();
