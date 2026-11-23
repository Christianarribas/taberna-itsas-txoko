/* =====================================================
   CONFIGURACIÓN · Taberna Itsas Txoko
   Aquí se decide dónde se guardan los pedidos y reservas.

   - Vacío ("")  -> MODO LOCAL: solo se ven entre pestañas del mismo navegador.
   - Con la dirección de tu base de datos de Firebase (como ahora) -> MODO NUBE:
     la cocina ve los pedidos de todos los móviles en tiempo real.
     Ejemplo: "https://taberna-itsas-txoko-default-rtdb.europe-west1.firebasedatabase.app"
   ===================================================== */
const configuracionNube = {
  urlBaseDeDatos: "https://taberna-itsas-txoko-default-rtdb.europe-west1.firebasedatabase.app"
};
