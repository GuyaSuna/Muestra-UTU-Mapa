# ¿Dónde estoy? — Juan Lacaze

Juego de adivinar ubicaciones en Juan Lacaze (Colonia, Uruguay). Aparecés parado en una calle de la
ciudad, en primera persona, y tenés que marcar en el mapa dónde estás. Cuanto más cerca, más puntos
(máximo 1000 por ronda).

## Modos

- **Cualquier calle de la ciudad**: el juego elige solo un punto al azar dentro de Juan Lacaze y te
  pone en la vista de calle más cercana. Al revelar muestra la dirección y el lugar conocido más cercano.
- **Lugares conocidos**: te pone en la calle mirando hacia uno de los lugares de `lugares.js`
  (Puerto Sauce, Estadio Miguel Campomar, la UTU, etc.).

Por defecto la cámara queda fija. Con la opción "Poder girar la cámara" se puede mirar alrededor,
pero nunca caminar. Nunca se muestran nombres de calles ni direcciones en la vista.

## Configurar la clave de Google (necesaria para la vista de calle)

La vista en primera persona es Google Street View, que necesita una clave gratuita:

1. Entrá a [Google Cloud Console](https://console.cloud.google.com/google/maps-apis), creá un proyecto
   y activá **Maps JavaScript API**. Pide una tarjeta, pero tiene un cupo gratis mensual que alcanza
   de sobra para una muestra.
2. En *Credenciales* creá una **clave de API**.
3. Copiá `config.example.js` como `config.js` y pegá la clave:
   ```js
   window.GOOGLE_MAPS_KEY = 'AIza...';
   ```
   `config.js` está en `.gitignore`: la clave nunca se sube a GitHub.
4. **Protegé la clave** (en Credenciales → tu clave):
   - *Restricciones de API*: solo **Maps JavaScript API**.
   - *Restricción de aplicación → Sitios web*: `http://localhost:8000/*` (y la dirección del sitio
     si lo publicás). Así Google rechaza la clave en cualquier otra página.
   - En *Cuotas* de la API, un límite diario bajo; y una alerta de presupuesto en Facturación.

   La clave siempre queda visible en el navegador (así funciona Google Maps); estas restricciones
   hacen que no le sirva a nadie más. Con la restricción de sitios web, la página ya no anda
   abierta con doble clic: hay que usar el servidor local de abajo.

Sin clave el juego igual funciona, pero solo en modo "Lugares conocidos" con fotos propias
(`fotos/<nombre>.jpg`) o la vista satelital.

## Cómo jugar

- Abrí `index.html` en el navegador, o con un servidor local:
  ```powershell
  npx serve -l 8000
  ```
  y entrá a http://localhost:8000
- Publicado en GitHub Pages: https://guyasuna.github.io/Muestra-UTU-Mapa/ (ver abajo).
- `Enter` confirma la respuesta y pasa a la siguiente ronda.

## Publicar en GitHub Pages

La publicación es automática con `.github/workflows/pages.yml`: cada push a `main` arma el sitio y
escribe `config.js` con la clave guardada como secret (la clave nunca queda en el repositorio).

Configuración (una sola vez):
1. En GitHub: *Settings → Secrets and variables → Actions → New repository secret*,
   nombre `GOOGLE_MAPS_KEY`, valor: la clave.
2. *Settings → Pages → Build and deployment → Source:* **GitHub Actions**.
3. En Google Cloud, en la clave, agregá a los sitios web permitidos:
   `https://guyasuna.github.io/*`
   (sin la ruta del repositorio: el navegador solo le informa a Google el dominio, así que
   `https://guyasuna.github.io/Muestra-UTU-Mapa/*` da el error `RefererNotAllowedMapError`).

## Agregar lugares conocidos

1. Abrí `editor.html`.
2. Pegá un link de Street View (la cámara queda como la dejaste en Google Maps) o hacé clic en el mapa.
3. Completá nombre/descripción y tocá **Agregar**.
4. Copiá el texto generado y reemplazá todo el contenido de `lugares.js`.

## Archivos

| Archivo       | Qué hace                                         |
|---------------|--------------------------------------------------|
| `index.html`  | Pantallas del juego                              |
| `juego.js`    | Lógica: rondas, puntos al azar, Street View, mapa |
| `config.js`   | Clave de Google Maps (no se sube a GitHub)       |
| `config.example.js` | Plantilla de `config.js`                   |
| `lugares.js`  | Lugares conocidos (nombre, coordenadas…)         |
| `editor.html` | Herramienta para cargar lugares nuevos           |
| `style.css`   | Estilos                                          |
| `fotos/`      | Fotos propias (respaldo si no hay clave)         |
| `.github/workflows/pages.yml` | Publicación automática en GitHub Pages |

Vista de calle: Google Street View. Mapas: © Esri, OpenStreetMap. Librería: [Leaflet](https://leafletjs.com).
