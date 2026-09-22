// Service worker mínimo — no cachea nada, solo existe para que los
// navegadores basados en Chromium (Brave, Chrome, Edge) consideren la app
// instalable y muestren el ícono de "Instalar" en la barra de direcciones.
self.addEventListener("fetch", () => {});
