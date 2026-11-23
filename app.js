/* =====================================================
   LÓGICA DE LA APP · Taberna Itsas Txoko (demo)
   ÍNDICE
   1. Datos de ejemplo (la carta, INVENTADA)
   2. Guardado y sincronización (nube o, si no hay, este navegador)
   3. Acceso del personal (sala y cocina)
   4. Estado de la app
   5. Navegación entre secciones
   6. Carta
   7. Pedido
   8. Cocina y comandas de sala
   9. Reservas
   10. Arranque (incluye la mesa que viene del QR)
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
const margenReservaMinutos = 15; // no se puede reservar para "dentro de un cuarto de hora"

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

/* Firma del contenido de un pedido o reserva, con una sal aleatoria.
   Sirve para el REINTENTO seguro: si la respuesta se pierde (cobertura
   mala), comprobamos DESPUÉS si el dato quedó guardado leyendo solo su
   firma (único campo público; sin ella no se lee nada de nadie).
   - firma guardada y coincide -> el bar lo tiene: éxito de verdad.
   - no coincide o no existe -> aviso de "no confirmado" y se conserva
     el pedido para reintentar con el mismo identificador: no duplica.
   Nadie puede pisar el dato: las reglas solo dejan crearlo una vez, y
   los cambios del personal (listo, servido, aceptada) son suyos. */
function estable(x) {
  if (Array.isArray(x)) return "[" + x.map(estable).join(",") + "]";
  if (x && typeof x === "object") {
    return "{" + Object.keys(x).sort().map((k) => JSON.stringify(k) + ":" + estable(x[k])).join(",") + "}";
  }
  return JSON.stringify(x);
}
function firmaDe(obj, sal) {
  const s = sal + estable(obj);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return sal + "-" + h.toString(36) + "-" + s.length.toString(36);
}

/* ¿Quedó guardado con esta firma? Lee SOLO ese campo (es lo único público) */
async function confirmarGuardado(nombre, id, firma) {
  if (!modoNube) return true; // en local, guardar nunca falla a medias
  try {
    const respuesta = await fetch(`${urlNube}/${nombre}/${id}/firma.json`);
    if (!respuesta.ok) return false;
    return (await respuesta.json()) === firma;
  } catch (e) { return false; }
}

/* Todas las llamadas a la nube pasan por aquí:
   - añade la credencial del personal cuando hace falta (ver sección 3)
   - si la respuesta es un error, lanza una excepción para que la app
     avise en pantalla en vez de fingir que todo fue bien */
async function fetchNube(camino, opciones = {}) {
  let url = `${urlNube}/${camino}`;
  const token = await tokenDelPersonal();
  if (token) url += (url.includes("?") ? "&" : "?") + "auth=" + token;
  let respuesta;
  try {
    respuesta = await fetch(url, opciones);
  } catch (e) {
    const error = new Error("sin conexión");
    error.estado = 0;
    throw error;
  }
  if (!respuesta.ok) {
    const error = new Error("la nube respondió " + respuesta.status);
    error.estado = respuesta.status;
    throw error;
  }
  return respuesta;
}

/* Lee todos los datos de una colección ("pedidos" o "reservas")
   y los devuelve como lista, de más antiguo a más nuevo.
   Ojo: en la nube solo el personal identificado puede leer. */
async function leerColeccion(nombre) {
  let objeto;
  if (modoNube) {
    const respuesta = await fetchNube(`${nombre}.json`);
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
    await fetchNube(`${nombre}/${id}.json`, { method: "PUT", body: JSON.stringify(dato) });
  } else {
    const objeto = JSON.parse(localStorage.getItem(nombre) || "{}");
    objeto[id] = dato;
    localStorage.setItem(nombre, JSON.stringify(objeto));
  }
}

/* Cambia solo algunos campos de un dato (por ejemplo, servido: true) */
async function actualizarDato(nombre, id, cambios) {
  if (modoNube) {
    await fetchNube(`${nombre}/${id}.json`, { method: "PATCH", body: JSON.stringify(cambios) });
  } else {
    const objeto = JSON.parse(localStorage.getItem(nombre) || "{}");
    objeto[id] = { ...objeto[id], ...cambios };
    localStorage.setItem(nombre, JSON.stringify(objeto));
  }
}

/* Borra una colección entera (botón "Borrar datos de la demo").
   Solo se usa en MODO LOCAL: en la nube nadie puede borrar desde la app. */
async function borrarColeccion(nombre) {
  if (modoNube) await fetchNube(`${nombre}.json`, { method: "DELETE" });
  else localStorage.removeItem(nombre);
}

/* "Avísame cuando cambie algo": llama a la función que le pasemos
   cada vez que hay datos nuevos, vengan de donde vengan.
   Solo la usa el personal identificado: los clientes no leen datos. */
let conexionesNube = [];
function alCambiarDatos(funcion) {
  if (modoNube) {
    /* Cierra las conexiones anteriores antes de abrir unas nuevas */
    conexionesNube.forEach((c) => c.close());
    conexionesNube = [];
    tokenDelPersonal().then((token) => {
      if (!token) return;
      /* La base de datos nos avisa por una conexión abierta (EventSource) */
      for (const nombre of ["pedidos", "reservas"]) {
        const conexion = new EventSource(`${urlNube}/${nombre}.json?auth=${token}`);
        conexion.addEventListener("put", funcion);
        conexion.addEventListener("patch", funcion);
        conexionesNube.push(conexion);
      }
    });
    /* Plan B por si la conexión se corta: preguntar cada 10 segundos */
    if (!alCambiarDatos.intervalo) alCambiarDatos.intervalo = setInterval(funcion, 10000);
  } else {
    /* "storage" se dispara cuando OTRA pestaña cambia el localStorage */
    window.addEventListener("storage", funcion);
  }
}

/* Los nombres de las reservas y las notas los escribe cualquiera: antes
   de pintarlos en pantalla quitamos los caracteres especiales para que
   nadie pueda colar código en la cocina. */
const limpiar = (texto) => String(texto).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* Aviso rojo breve en la parte baja de la pantalla (errores del personal) */
let avisoTemporizador = null;
function avisarError(texto) {
  let caja = el("aviso-error");
  if (!caja) {
    caja = document.createElement("div");
    caja.id = "aviso-error";
    document.body.appendChild(caja);
  }
  caja.textContent = texto;
  caja.hidden = false;
  clearTimeout(avisoTemporizador);
  avisoTemporizador = setTimeout(() => { caja.hidden = true; }, 5000);
}

/* 3. ACCESO DEL PERSONAL ----------------------------------------------
   Los clientes piden y reservan sin cuenta (es lo normal con un QR).
   Sala y cocina entran con correo y contraseña (Firebase Auth), y la
   base de datos solo les deja leer y cambiar cosas a ellos. Las reglas
   están en firebase-reglas.json: sin sesión, nadie puede leer pedidos
   ni reservas, ni marcar comandas, ni borrar nada.

   La sesión se guarda en localStorage para que el móvil de sala o la
   tablet de cocina no pidan la contraseña cada vez que se abre la app. */
const claveApi = (typeof configuracionNube !== "undefined" && configuracionNube.claveApi) || "";
let sesion = null; // { idToken, tokenRefresco, caduca }

function cargarSesion() {
  try { sesion = JSON.parse(localStorage.getItem("sesionTaberna") || "null"); }
  catch (e) { sesion = null; }
}

async function iniciarSesion(correo, contrasena) {
  const respuesta = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${claveApi}`,
    { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: correo, password: contrasena, returnSecureToken: true }) });
  if (!respuesta.ok) throw new Error("acceso denegado");
  const datos = await respuesta.json();
  sesion = {
    idToken: datos.idToken,
    tokenRefresco: datos.refreshToken,
    caduca: Date.now() + (Number(datos.expiresIn) - 60) * 1000
  };
  localStorage.setItem("sesionTaberna", JSON.stringify(sesion));
}

/* La credencial dura una hora; se renueva sola cuando hace falta */
async function tokenDelPersonal() {
  if (!modoNube || !sesion || !claveApi) return null;
  if (Date.now() < sesion.caduca) return sesion.idToken;
  const respuesta = await fetch(`https://securetoken.googleapis.com/v1/token?key=${claveApi}`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=refresh_token&refresh_token=${sesion.tokenRefresco}`
  });
  if (!respuesta.ok) { cerrarSesion(); return null; }
  const datos = await respuesta.json();
  sesion.idToken = datos.id_token;
  sesion.tokenRefresco = datos.refresh_token;
  sesion.caduca = Date.now() + (Number(datos.expires_in) - 60) * 1000;
  localStorage.setItem("sesionTaberna", JSON.stringify(sesion));
  return sesion.idToken;
}

function cerrarSesion() {
  sesion = null;
  localStorage.removeItem("sesionTaberna");
  conexionesNube.forEach((c) => c.close());
  conexionesNube = [];
  location.reload();
}

/* Panel de entrada del personal: se muestra encima cuando hace falta */
function mostrarAcceso() {
  if (!modoNube) return; // en modo local no hay cuentas: es solo para probar
  el("acceso-personal").hidden = false;
  el("mensaje-acceso").hidden = true;
  el("boton-volver-acceso").hidden = document.body.classList.contains("vista-cocina");
}

async function enviarAcceso(evento) {
  evento.preventDefault();
  const boton = el("boton-entrar");
  const mensaje = el("mensaje-acceso");
  boton.disabled = true;
  boton.textContent = "Entrando…";
  mensaje.hidden = true;
  try {
    await iniciarSesion(el("acceso-correo").value.trim(), el("acceso-contrasena").value);
    el("acceso-personal").hidden = true;
    arrancarPersonal();
  } catch (e) {
    mensaje.hidden = false;
    mensaje.textContent = "No se pudo entrar. Revisa el correo y la contraseña.";
  } finally {
    boton.disabled = false;
    boton.textContent = "Entrar";
  }
}

/* Cuando el personal ya está dentro: pinta sus secciones y se conecta
   a los cambios en tiempo real */
function arrancarPersonal() {
  el("boton-cerrar-sesion").hidden = !modoNube;
  pintarContadorCocina();
  pintarContadorComandas();
  if (el("seccion-cocina").classList.contains("activa")) pintarCocina();
  if (el("seccion-comandas").classList.contains("activa")) pintarComandasSala();
  if (el("seccion-reservas").classList.contains("activa")) pintarReservas();
  alCambiarDatos(() => {
    pintarContadorCocina();
    pintarContadorComandas();
    if (el("seccion-cocina").classList.contains("activa")) pintarCocina();
    if (el("seccion-reservas").classList.contains("activa")) pintarReservas();
    if (el("seccion-comandas").classList.contains("activa")) pintarComandasSala();
  });
}

/* 4. ESTADO DE LA APP ------------------------------------------------- */
let pedidoActual = [];        // lista de { id, cantidad, nota }
let categoriaActiva = "Todo"; // filtro de la carta
let tipoPedido = "mesa";      // "mesa" o "llevar"
let enviandoPedido = false;   // candado contra dobles pulsaciones
let enviandoReserva = false;
let envioPedido = null;   // { id, creado, hora } estables entre reintentos: reintentar no duplica
let envioReserva = null;  // { id, creado }

/* Atajos para no repetir document.getElementById */
const el = (id) => document.getElementById(id);
const formatoPrecio = (n) => n.toFixed(2).replace(".", ",") + " €";

/* Cuánto lleva esperando una comanda, en texto: "ahora mismo", "hace 12 min" */
const textoEspera = (creado) => {
  const minutos = Math.max(0, Math.floor((Date.now() - creado) / 60000));
  return minutos === 0 ? "ahora mismo" : `hace ${minutos} min`;
};

/* Fecha de hoy en formato AAAA-MM-DD, con la hora local del móvil
   (new Date().toISOString() daría el día en hora UTC y fallaría
   alrededor de medianoche) */
const hoyLocalISO = () => {
  const ahora = new Date();
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`;
};

/* 5. NAVEGACIÓN ENTRE SECCIONES --------------------------------------- */
function mostrarSeccion(nombre) {
  /* Cocina solo se abre con su dirección, y Comandas solo con la de sala */
  if (nombre === "cocina" && !document.body.classList.contains("vista-cocina")) return;
  if (nombre === "comandas" && !document.body.classList.contains("vista-sala")) return;
  /* Las secciones del personal piden sesión en la nube */
  if ((nombre === "cocina" || nombre === "comandas") && modoNube && !sesion) {
    mostrarAcceso();
    return;
  }
  document.querySelectorAll(".seccion").forEach((s) => s.classList.remove("activa"));
  el("seccion-" + nombre).classList.add("activa");
  document.querySelectorAll(".boton-nav").forEach((b) => {
    b.classList.toggle("activo", b.dataset.seccion === nombre);
  });
  if (nombre === "cocina") pintarCocina();
  if (nombre === "reservas") pintarReservas();
  if (nombre === "comandas") pintarComandasSala();
  window.scrollTo(0, 0);
}

/* 6. CARTA ------------------------------------------------------------ */
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

/* 7. PEDIDO ----------------------------------------------------------- */
function anadirAlPedido(id) {
  const linea = pedidoActual.find((l) => l.id === id);
  if (linea) linea.cantidad++;
  else pedidoActual.push({ id: id, cantidad: 1, nota: "" });
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

function cambiarNota(id, texto) {
  const linea = pedidoActual.find((l) => l.id === id);
  if (linea) linea.nota = texto;
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
        <input class="nota-plato" data-nota="${l.id}" maxlength="80"
               placeholder="Nota: sin cebolla, muy hecha…"
               value="${limpiar(l.nota || "")}" aria-label="Nota para cocina de ${p.nombre}">
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
  const boton = el("boton-enviar");
  if (enviandoPedido) return; // ya hay un envío en marcha
  if (pedidoActual.length === 0) {
    mensaje.hidden = false;
    mensaje.style.background = "#fde6e1";
    mensaje.style.color = "#a3321c";
    mensaje.textContent = "Añade algo a tu pedido antes de enviarlo.";
    return;
  }
  /* Bloqueamos el botón hasta que la base de datos conteste: así un doble
     toque no manda el pedido dos veces, y si falla la conexión el cliente
     lo ve y el pedido no se pierde */
  enviandoPedido = true;
  boton.disabled = true;
  boton.textContent = "Enviando…";
  mensaje.hidden = true;
  /* El pedido se guarda con un identificador que se REUSA en los reintentos:
     si el primer intento guardó pero la respuesta se perdió (cobertura mala),
     reintentar vuelve a escribir el MISMO pedido con el MISMO contenido.
     Las reglas de la base de datos permiten esa sobrescritura idéntica, así
     que un 200 en el reintento confirma de verdad que está guardado, sin
     duplicar y sin fingir éxito cuando la respuesta es incierta. */
  /* id, creado y hora se fijan en el PRIMER intento: el reintento manda
     exactamente el mismo contenido (misma firma) salvo que el cliente
     toque el pedido, en cuyo caso la firma cambia y la base de datos
     rechaza la reescritura de un pedido ya guardado (aviso, no falso éxito). */
  if (!envioPedido) {
    envioPedido = {
      id: nuevoId(),
      creado: Date.now(),
      sal: Math.random().toString(36).slice(2, 10),
      hora: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
    };
  }
  const pedido = {
    creado: envioPedido.creado,
    hora: envioPedido.hora,
    mesa: el("selector-mesa").value,
    tipo: tipoPedido,
    total: calcularTotal(),
    servido: false,
    listo: false,
    platos: pedidoActual.map((l) => {
      const p = carta.find((x) => x.id === l.id);
      const linea = { nombre: p.nombre, cantidad: l.cantidad };
      const nota = (l.nota || "").trim();
      if (nota) linea.nota = nota;
      return linea;
    })
  };
  pedido.firma = firmaDe(pedido, envioPedido.sal);
  let guardado = false;
  try {
    await guardarDato("pedidos", envioPedido.id, pedido);
    guardado = true;
  } catch (error) {
    /* Respuesta perdida o rechazo: comprobamos el recibo antes de decir nada */
    guardado = await confirmarGuardado("pedidos", envioPedido.id, pedido.firma);
  }
  if (guardado) {
    pedidoActual = [];
    envioPedido = null;
    pintarPedido();
    if (!modoNube || sesion) pintarContadorCocina();
    mensaje.style.background = "";
    mensaje.style.color = "";
    mensaje.textContent = "¡Pedido enviado a cocina! Enseguida te lo llevamos.";
    boton.textContent = "Enviar pedido a cocina";
  } else {
    /* NO confirmado: no fingimos éxito. El pedido se conserva con el mismo
       identificador y firma: Reintentar no duplica. */
    mensaje.style.background = "#fde6e1";
    mensaje.style.color = "#a3321c";
    mensaje.textContent = "No se pudo confirmar el envío. Tu pedido sigue aquí: pulsa Reintentar. Si el bar ya lo hubiera recibido, no se duplicará.";
    boton.textContent = "Reintentar envío";
  }
  mensaje.hidden = false;
  enviandoPedido = false;
  boton.disabled = false;
}

/* 8. COCINA Y COMANDAS DE SALA -----------------------------------------
   La cola de trabajo va primero lo urgente: pendientes de más antiguo
   a más nuevo, con el tiempo que llevan esperando. Las servidas pasan
   a un historial plegado para no estorbar durante el servicio. */
async function pintarContadorCocina() {
  if (modoNube && !sesion) { el("contador-cocina").hidden = true; return; }
  try {
    const pendientes = (await leerColeccion("pedidos")).filter((p) => !p.listo && !p.servido).length;
    el("contador-cocina").textContent = pendientes;
    el("contador-cocina").hidden = pendientes === 0;
  } catch (e) { el("contador-cocina").hidden = true; }
}

/* Aviso para sala: comandas que cocina ya tiene listas y aún no se han servido */
async function pintarContadorComandas() {
  if (modoNube && !sesion) { el("contador-comandas").hidden = true; return; }
  try {
    const listas = (await leerColeccion("pedidos")).filter((p) => p.listo && !p.servido).length;
    el("contador-comandas").textContent = listas;
    el("contador-comandas").hidden = listas === 0;
  } catch (e) { el("contador-comandas").hidden = true; }
}

/* Dibuja un ticket de comanda. "para" decide el botón o texto de abajo:
   en cocina se marca "lista", en sala se marca "servida". */
function dibujarTicket(p, para) {
  const espera = textoEspera(p.creado);
  const tarde = !p.servido && Date.now() - p.creado >= margenReservaMinutos * 60000;
  let pie;
  if (p.servido) {
    pie = `<strong class="texto-servido">Servida · ${limpiar(p.hora)}</strong>`;
  } else if (p.listo) {
    pie = para === "sala"
      ? `<strong class="texto-listo">Lista para servir</strong><button class="boton-servido" data-servido="${p.id}">Marcar como servida</button>`
      : `<strong class="texto-listo">Lista para servir</strong>`;
  } else {
    pie = para === "cocina"
      ? `<button class="boton-servido" data-listo="${p.id}">Marcar como lista</button>`
      : `<span class="texto-encocina">En cocina…</span>`;
  }
  return `
    <div class="ticket ${p.servido ? "servido" : ""}">
      <div class="ticket-cabecera">
        <span class="ticket-mesa">Mesa ${limpiar(p.mesa)}${p.tipo === "llevar" ? '<span class="etiqueta-llevar">PARA LLEVAR</span>' : ""}</span>
        <span class="ticket-hora">#${p.numero}${p.servido ? "" : ` · <b class="${tarde ? "espera-tarde" : ""}">${espera}</b>`}</span>
      </div>
      <ul>${p.platos.map((x) => `<li><b>${x.cantidad} ×</b> ${limpiar(x.nombre)}${x.nota ? `<span class="ticket-nota">${limpiar(x.nota)}</span>` : ""}</li>`).join("")}</ul>
      ${pie}
    </div>`;
}

/* Reparte las comandas en: pendientes (las primero), listas para servir
   y un historial plegado con las servidas (las últimas arriba) */
function pintarCola(pedidos, contenedor, para) {
  if (pedidos.length === 0) {
    contenedor.innerHTML = `<p class="vacio">No hay comandas todavía.</p>`;
    return;
  }
  const numeradas = pedidos.map((p, i) => ({ ...p, numero: i + 1 }));
  const pendientes = numeradas.filter((p) => !p.listo && !p.servido); // más antiguas primero
  const listas = numeradas.filter((p) => p.listo && !p.servido);
  const servidas = numeradas.filter((p) => p.servido).reverse();      // recientes arriba
  let html = "";
  if (pendientes.length) {
    html += `<h3 class="titulo-cola">En preparación (${pendientes.length})</h3>`;
    html += pendientes.map((p) => dibujarTicket(p, para)).join("");
  }
  if (listas.length) {
    html += `<h3 class="titulo-cola">Listas para servir (${listas.length})</h3>`;
    html += listas.map((p) => dibujarTicket(p, para)).join("");
  }
  if (!pendientes.length && !listas.length) {
    html += `<p class="vacio">Nada pendiente. ¡Todo servido!</p>`;
  }
  if (servidas.length) {
    html += `<details class="historial"><summary>Servidas (${servidas.length})</summary>`;
    html += servidas.map((p) => dibujarTicket(p, para)).join("");
    html += `</details>`;
  }
  contenedor.innerHTML = html;
}

async function pintarCocina() {
  if (modoNube && !sesion) { mostrarAcceso(); return; }
  try {
    pintarCola(await leerColeccion("pedidos"), el("lista-cocina"), "cocina");
  } catch (e) {
    if (e.estado === 401 || e.estado === 403) mostrarAcceso();
    else avisarError("No se pudieron cargar las comandas. Revisa la conexión.");
  }
  pintarContadorCocina();
}

/* Sala ve todas las comandas sin entrar en cocina: en preparación,
   listas para servir (con aviso) y servidas en el historial. */
async function pintarComandasSala() {
  if (modoNube && !sesion) { mostrarAcceso(); return; }
  try {
    pintarCola(await leerColeccion("pedidos"), el("lista-comandas-sala"), "sala");
  } catch (e) {
    if (e.estado === 401 || e.estado === 403) mostrarAcceso();
    else avisarError("No se pudieron cargar las comandas. Revisa la conexión.");
  }
  pintarContadorComandas();
}

async function marcarListo(id) {
  try {
    await actualizarDato("pedidos", id, { listo: true });
  } catch (e) {
    if (e.estado === 401 || e.estado === 403) { mostrarAcceso(); return; }
    avisarError("No se pudo marcar la comanda. Inténtalo de nuevo.");
  }
  pintarCocina();
  pintarContadorComandas();
}

async function marcarServido(id) {
  try {
    await actualizarDato("pedidos", id, { servido: true });
  } catch (e) {
    if (e.estado === 401 || e.estado === 403) { mostrarAcceso(); return; }
    avisarError("No se pudo marcar la comanda. Inténtalo de nuevo.");
  }
  pintarComandasSala();
  pintarContadorComandas();
}

/* 9. RESERVAS ---------------------------------------------------------- */
function prepararFormularioReserva() {
  el("reserva-personas").innerHTML = Array.from({ length: 10 }, (_, i) =>
    `<option value="${i + 1}">${i + 1} ${i === 0 ? "persona" : "personas"}</option>`).join("");
  /* El día mínimo es hoy: no se puede reservar en el pasado */
  el("reserva-dia").min = hoyLocalISO();
  el("reserva-dia").value = hoyLocalISO();
  pintarHorasReserva();
}

/* Las horas que se pueden elegir: si el día es hoy, solo las que aún no
   han pasado (con un margen). Si no queda ninguna, lo decimos claro. */
function pintarHorasReserva() {
  const dia = el("reserva-dia").value;
  let horas = horasReserva;
  if (dia === hoyLocalISO()) {
    const limite = new Date(Date.now() + margenReservaMinutos * 60000);
    const limiteTexto = `${String(limite.getHours()).padStart(2, "0")}:${String(limite.getMinutes()).padStart(2, "0")}`;
    horas = horasReserva.filter((h) => h >= limiteTexto);
  }
  el("reserva-hora").innerHTML = horas.length
    ? horas.map((h) => `<option>${h}</option>`).join("")
    : `<option value="">Sin horas libres hoy</option>`;
  el("boton-reservar").disabled = horas.length === 0;
}

async function guardarReserva(evento) {
  evento.preventDefault(); // evita que la página se recargue
  if (enviandoReserva) return;
  if (!el("reserva-hora").value) return; // no quedaban horas para ese día
  const boton = el("boton-reservar");
  enviandoReserva = true;
  boton.disabled = true;
  boton.textContent = "Enviando…";
  const caja = el("confirmacion-reserva");
  caja.hidden = true;
  /* La reserva llega como PENDIENTE: no se da por confirmada hasta que
     el personal de sala la acepta. Así nadie se presenta con una mesa
     que el bar no ha visto.
     Mismo identificador en los reintentos: reintentar no duplica (ver enviarPedido). */
  if (!envioReserva) envioReserva = { id: nuevoId(), creado: Date.now(), sal: Math.random().toString(36).slice(2, 10) };
  const reserva = {
    nombre: el("reserva-nombre").value.trim(),
    telefono: el("reserva-telefono").value.trim(),
    personas: el("reserva-personas").value,
    dia: new Date(el("reserva-dia").value + "T12:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" }),
    diaISO: el("reserva-dia").value,
    hora: el("reserva-hora").value,
    estado: "pendiente"
  };
  reserva.creado = envioReserva.creado;
  reserva.firma = firmaDe(reserva, envioReserva.sal);
  /* El bar no tiene cómo avisar por la app: la confirmación es una LLAMADA
     del personal al teléfono que el cliente deja en el formulario. */
  const textoRecibida = `<strong>Reserva recibida</strong><br>${limpiar(reserva.nombre)}, mesa para ${reserva.personas} el ${reserva.dia} a las ${reserva.hora}.<br>El personal la revisará y te llamará al ${limpiar(reserva.telefono)} para confirmarla.`;
  let guardada = false;
  try {
    await guardarDato("reservas", envioReserva.id, reserva);
    guardada = true;
  } catch (error) {
    guardada = await confirmarGuardado("reservas", envioReserva.id, reserva.firma);
  }
  if (guardada) {
    envioReserva = null;
    caja.style.background = "";
    caja.style.color = "";
    caja.innerHTML = textoRecibida;
    el("formulario-reserva").reset();
    prepararFormularioReserva();
    boton.textContent = "Reservar mesa";
  } else {
    /* NO confirmado: no fingimos éxito y conservamos los datos (mismo id
       y firma: Reintentar no duplica). */
    caja.style.background = "#fde6e1";
    caja.style.color = "#a3321c";
    caja.textContent = "No se pudo confirmar el envío. Tus datos siguen aquí: pulsa Reintentar. Si el bar ya la hubiera recibido, no se duplicará.";
    boton.textContent = "Reintentar";
  }
  caja.hidden = false;
  enviandoReserva = false;
  boton.disabled = false;
}

/* Las reservas las consulta el personal de sala, en su sección.
   Cocina no las ve: solo le llegan las comandas.
   Cada reserva llega PENDIENTE hasta que sala la acepta o la rechaza. */
async function pintarReservas() {
  const bloque = el("bloque-reservas-recibidas");
  if (!bloque || bloque.hidden) return; // vista de cliente: no hay lista
  const lista = el("lista-reservas-sala");
  if (modoNube && !sesion) {
    lista.innerHTML = `<p class="vacio">Esta lista es solo para el personal.<br>Entra con tu correo y contraseña para verla.</p>`;
    return;
  }
  let reservas;
  try {
    reservas = await leerColeccion("reservas");
  } catch (e) {
    if (e.estado === 401 || e.estado === 403) { mostrarAcceso(); return; }
    avisarError("No se pudieron cargar las reservas. Revisa la conexión.");
    return;
  }
  if (reservas.length === 0) {
    lista.innerHTML = `<p class="vacio">No hay reservas todavía.</p>`;
    return;
  }
  const pendientes = reservas.filter((r) => (r.estado || "pendiente") === "pendiente");
  const resueltas = reservas.filter((r) => r.estado && r.estado !== "pendiente").reverse();
  const tarjeta = (r) => `
    <div class="reserva-tarjeta ${r.estado === "rechazada" ? "reserva-rechazada" : ""}">
      <strong>${limpiar(r.nombre)}</strong> · ${limpiar(r.personas)} pers.${r.telefono ? ` · ${limpiar(r.telefono)}` : ""}<br>
      ${limpiar(r.dia)} a las ${limpiar(r.hora)}
      ${(r.estado || "pendiente") === "pendiente"
        ? `<div class="reserva-acciones">
             <button class="boton-aceptar" data-aceptar="${r.id}">Aceptar</button>
             <button class="boton-rechazar" data-rechazar="${r.id}">Rechazar</button>
           </div>`
        : `<div class="reserva-estado ${r.estado === "aceptada" ? "ok" : "mal"}">${r.estado === "aceptada" ? "Aceptada" : "Rechazada"}</div>`}
    </div>`;
  let html = "";
  if (pendientes.length) {
    html += `<h3 class="titulo-cola">Pendientes de aceptar (${pendientes.length})</h3>`;
    html += pendientes.map(tarjeta).join("");
  } else {
    html += `<p class="vacio">No hay reservas pendientes.</p>`;
  }
  if (resueltas.length) {
    html += `<details class="historial"><summary>Aceptadas y rechazadas (${resueltas.length})</summary>`;
    html += resueltas.map(tarjeta).join("");
    html += `</details>`;
  }
  lista.innerHTML = html;
}

async function cambiarEstadoReserva(id, estado) {
  try {
    await actualizarDato("reservas", id, { estado });
  } catch (e) {
    if (e.estado === 401 || e.estado === 403) { mostrarAcceso(); return; }
    avisarError("No se pudo actualizar la reserva. Inténtalo de nuevo.");
  }
  pintarReservas();
}

/* 10. ARRANQUE: conectamos los botones con las funciones --------------- */
function iniciar() {
  cargarSesion();

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
    if (b.dataset.listo) marcarListo(b.dataset.listo);
    if (b.dataset.aceptar) cambiarEstadoReserva(b.dataset.aceptar, "aceptada");
    if (b.dataset.rechazar) cambiarEstadoReserva(b.dataset.rechazar, "rechazada");
    if (b.dataset.tipo) {
      tipoPedido = b.dataset.tipo;
      document.querySelectorAll(".boton-tipo").forEach((x) => x.classList.toggle("activo", x === b));
    }
  });

  /* Las notas de los platos se guardan al escribir (evento "input") */
  document.addEventListener("input", (e) => {
    if (e.target.dataset && e.target.dataset.nota) cambiarNota(Number(e.target.dataset.nota), e.target.value);
  });

  el("boton-enviar").addEventListener("click", enviarPedido);
  el("formulario-reserva").addEventListener("submit", guardarReserva);
  el("reserva-dia").addEventListener("change", pintarHorasReserva);
  el("formulario-acceso").addEventListener("submit", enviarAcceso);
  el("boton-volver-acceso").addEventListener("click", () => { el("acceso-personal").hidden = true; });
  el("boton-cerrar-sesion").addEventListener("click", cerrarSesion);
  /* El botón de borrar datos solo existe en MODO LOCAL. En la nube los
     borrados se hacen desde la consola de Firebase: las reglas no permiten
     borrar ni al personal, así nadie vacía las comandas por accidente. */
  if (modoNube) {
    el("boton-borrar-demo").hidden = true;
  } else {
    el("boton-borrar-demo").addEventListener("click", async () => {
      try {
        await borrarColeccion("pedidos");
        await borrarColeccion("reservas");
      } catch (e) {
        avisarError("No se pudieron borrar los datos. Revisa la conexión.");
      }
      pintarCocina();
      pintarReservas();
    });
  }

  /* Tres entradas separadas:
     - CLIENTE (la dirección normal, y los QR con ?mesa=N): carta, pedido
       y el formulario de reservas. No ve cocina ni las reservas ajenas.
     - PERSONAL DE SALA (la dirección con ?sala): lo mismo, más las
       comandas y las reservas recibidas. Pide correo y contraseña.
     - COCINA (la dirección con ?cocina): solo las comandas, sin carta,
       sin pedido, sin reservas y sin barra de navegación. Pide correo
       y contraseña.
     Con las reglas de firebase-reglas.json:
     - sin sesión solo se pueden CREAR pedidos y reservas (pendientes);
     - la cuenta de COCINA solo lee pedidos y los marca como listos;
     - la cuenta de SALA lee pedidos y reservas, marca servidas y
       acepta o rechaza reservas;
     - cualquier otra cuenta, aunque exista, no tiene acceso a nada.
     Las cuentas y sus roles se apuntan en la consola de Firebase
     (nodo /personal): nadie puede darse de alta con permisos. */
  const esCocina = new URLSearchParams(location.search).has("cocina");
  const esSala = new URLSearchParams(location.search).has("sala");
  if (esCocina) {
    document.body.classList.add("vista-cocina");
    mostrarSeccion("cocina");
  } else {
    document.querySelector('[data-seccion="cocina"]').hidden = true;
    if (esSala) {
      document.body.classList.add("vista-sala");
      el("bloque-reservas-recibidas").hidden = false;
      document.querySelector('[data-seccion="comandas"]').hidden = false;
    }
  }

  /* Mesa que viene del QR: la dirección es ".../?mesa=5".
     Si existe, dejamos esa mesa elegida al abrir la app. */
  const mesaDelQr = Number(new URLSearchParams(location.search).get("mesa"));
  if (mesaDelQr >= 1 && mesaDelQr <= numeroDeMesas) el("selector-mesa").value = mesaDelQr;

  /* Si hay sesión del personal (este móvil ya entró otra vez), conectamos
     los avisos en tiempo real; si no, se conectarán al entrar. */
  if (sesion || !modoNube) arrancarPersonal();

  pintarFiltros();
  pintarCarta();
  pintarPedido();
  prepararFormularioReserva();
}
iniciar();
