/* =====================================================
   CONFIGURACIÓN · Taberna Itsas Txoko
   Aquí se decide dónde se guardan los pedidos y reservas.

   - urlBaseDeDatos vacía ("") -> MODO LOCAL: solo se ven entre pestañas
     del mismo navegador.
   - Con la dirección de tu base de datos de Firebase (como ahora) ->
     MODO NUBE: la cocina ve los pedidos de todos los móviles en tiempo real.
     Ejemplo: "https://taberna-itsas-txoko-default-rtdb.europe-west1.firebasedatabase.app"

   - claveApi: la "clave de API web" del proyecto Firebase. Es pública por
     diseño (va en todas las apps con Firebase) y solo sirve para que sala
     y cocina entren con su correo y contraseña. Quien manda de verdad son
     las reglas de la base de datos (firebase-reglas.json): sin sesión,
     nadie puede leer ni cambiar pedidos o reservas.
     Se copia de: consola.firebase.google.com -> tu proyecto ->
     Configuración del proyecto -> Clave de API web.
   ===================================================== */
const configuracionNube = {
  urlBaseDeDatos: "https://taberna-itsas-txoko-default-rtdb.europe-west1.firebasedatabase.app",
  claveApi: "AIzaSyDhp8CboTnSYctdM7oE5D0I56cV3CEGry0"
};
