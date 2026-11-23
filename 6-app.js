/* =====================================================
   LÓGICA DE LA APP · Taberna Itsas Txoko (demo)
   ÍNDICE
   1. Datos de ejemplo (la carta, INVENTADA)
   2. Guardado en el móvil (localStorage)
   3. Estado de la app
   4. Navegación entre secciones
   5. Carta
   6. Pedido
   7. Cocina
   8. Reservas
   9. Arranque
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

/* 2. GUARDADO EN EL MÓVIL ---------------------------------------------
   localStorage guarda texto en el propio navegador. Solo lo ve este
   móvil. En la versión real, estas dos funciones enviarían los datos
   a un servidor (base de datos) para que cocina los vea desde otro aparato. */
function leerDatos(clave) {
  return JSON.parse(localStorage.getItem(clave) || "[]");
}
function guardarDatos(clave, valor) {
  localStorage.setItem(clave, JSON.stringify(valor));
}

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

function enviarPedido() {
  const mensaje = el("mensaje-pedido");
  if (pedidoActual.length === 0) {
    mensaje.hidden = false;
    mensaje.style.background = "#fde6e1";
    mensaje.style.color = "#a3321c";
    mensaje.textContent = "Añade algo a tu pedido antes de enviarlo.";
    return;
  }
  /* Aquí se guarda el pedido. En la versión real: enviarlo a la base de datos. */
  const pedidos = leerDatos("pedidos");
  pedidos.push({
    numero: pedidos.length + 1,
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
  guardarDatos("pedidos", pedidos);

  pedidoActual = [];
  pintarPedido();
  pintarContadorCocina();
  mensaje.hidden = false;
  mensaje.style.background = "";
  mensaje.style.color = "";
  mensaje.textContent = "¡Pedido enviado a cocina! Enseguida te lo llevamos.";
}

/* 7. COCINA ----------------------------------------------------------- */
function pintarContadorCocina() {
  const pendientes = leerDatos("pedidos").filter((p) => !p.servido).length;
  el("contador-cocina").textContent = pendientes;
  el("contador-cocina").hidden = pendientes === 0;
}

function pintarCocina() {
  const pedidos = leerDatos("pedidos");
  el("lista-cocina").innerHTML = pedidos.length === 0
    ? `<p class="vacio">No hay pedidos todavía.</p>`
    : pedidos.slice().reverse().map((p) => `
      <div class="ticket ${p.servido ? "servido" : ""}">
        <div class="ticket-cabecera">
          <span class="ticket-mesa">Mesa ${p.mesa}${p.tipo === "llevar" ? '<span class="etiqueta-llevar">PARA LLEVAR</span>' : ""}</span>
          <span class="ticket-hora">#${p.numero} · ${p.hora}</span>
        </div>
        <ul>${p.platos.map((x) => `<li><b>${x.cantidad} ×</b> ${x.nombre}</li>`).join("")}</ul>
        ${p.servido
          ? "<strong class=\"texto-servido\">Servido</strong>"
          : `<button class="boton-servido" data-servido="${p.numero}">Marcar como servido</button>`}
      </div>`).join("");

  const reservas = leerDatos("reservas");
  el("lista-reservas-cocina").innerHTML = reservas.length === 0
    ? `<p class="vacio">No hay reservas todavía.</p>`
    : reservas.map((r) => `
      <div class="reserva-tarjeta"><strong>${r.nombre}</strong> · ${r.personas} pers.<br>
      ${r.dia} a las ${r.hora}</div>`).join("");
  pintarContadorCocina();
}

function marcarServido(numero) {
  const pedidos = leerDatos("pedidos");
  const pedido = pedidos.find((p) => p.numero === numero);
  pedido.servido = true;
  guardarDatos("pedidos", pedidos);
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

function guardarReserva(evento) {
  evento.preventDefault(); // evita que la página se recargue
  const reserva = {
    nombre: el("reserva-nombre").value.trim(),
    personas: el("reserva-personas").value,
    dia: new Date(el("reserva-dia").value + "T12:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" }),
    hora: el("reserva-hora").value
  };
  /* Aquí se guarda la reserva. En la versión real: base de datos + aviso al bar. */
  const reservas = leerDatos("reservas");
  reservas.push(reserva);
  guardarDatos("reservas", reservas);

  const caja = el("confirmacion-reserva");
  caja.hidden = false;
  caja.innerHTML = `<strong>Reserva confirmada</strong><br>${reserva.nombre}, mesa para ${reserva.personas} el ${reserva.dia} a las ${reserva.hora}.`;
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
    if (b.dataset.servido) marcarServido(Number(b.dataset.servido));
    if (b.dataset.tipo) {
      tipoPedido = b.dataset.tipo;
      document.querySelectorAll(".boton-tipo").forEach((x) => x.classList.toggle("activo", x === b));
    }
  });
  el("boton-enviar").addEventListener("click", enviarPedido);
  el("formulario-reserva").addEventListener("submit", guardarReserva);
  el("boton-borrar-demo").addEventListener("click", () => {
    localStorage.removeItem("pedidos");
    localStorage.removeItem("reservas");
    pintarCocina();
  });

  pintarFiltros();
  pintarCarta();
  pintarPedido();
  prepararFormularioReserva();
  pintarContadorCocina();
}
iniciar();
