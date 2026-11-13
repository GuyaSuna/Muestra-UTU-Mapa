// ¿Dónde estoy? Juan Lacaze — lógica del juego
(() => {
  // Zona del mapa: no deja salir de acá
  const LIMITES = L.latLngBounds([-34.455, -57.475], [-34.405, -57.385]);
  // Zona urbana donde se eligen los puntos al azar (límites de la ciudad según OpenStreetMap)
  const ZONA_AZAR = { sur: -34.4425, norte: -34.4041, oeste: -57.4611, este: -57.4286 };
  const CENTRO = [-34.432, -57.440];
  const PUNTOS_MAX = 1000;
  const SEPARACION_MIN = 250; // metros entre rondas de una misma partida
  const CLAVE_PUNTAJES = 'donde-estoy-jl-puntajes';
  const CLAVE_GOOGLE = (window.GOOGLE_MAPS_KEY || '').trim();

  const $ = (id) => document.getElementById(id);

  const estado = {
    modo: 'azar',
    total: 5,
    lugares: [],      // en modo "lugares": orden de la partida
    actual: 0,
    puntos: 0,
    historial: [],
    ronda: null,      // { lat, lng, nombre, descripcion }
    marcador: null,
    capasResultado: [],
    adivinado: false,
    listo: false,
    pedido: 0,        // para ignorar búsquedas viejas
    ultimaPartida: null, // puntaje pendiente de guardar con iniciales
  };

  // ---------- Utilidades ----------
  function mezclar(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const rad = (x) => (x * Math.PI) / 180;

  function distanciaMetros(a, b) {
    const dLat = rad(b.lat - a.lat);
    const dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 +
      Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * 6371000 * Math.asin(Math.sqrt(h));
  }

  // Hacia dónde hay que mirar desde a para ver b (0 = norte, 90 = este)
  function rumbo(a, b) {
    const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat));
    const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) -
      Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng));
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  }

  // 1000 puntos si estás a menos de 25 m; baja rápido después (a 250 m ≈ 370, a 1 km ≈ 20)
  function calcularPuntos(m) {
    if (m <= 25) return PUNTOS_MAX;
    return Math.round(PUNTOS_MAX * Math.exp(-(m - 25) / 230));
  }

  function formatoDistancia(m) {
    return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(2)} km`;
  }

  function lugarMasCercano(p) {
    let mejor = null;
    for (const l of LUGARES) {
      const d = distanciaMetros(p, l);
      if (!mejor || d < mejor.d) mejor = { lugar: l, d };
    }
    return mejor;
  }

  // Lee un link de Google Maps en Street View (opcional en lugares.js: campo `streetview`)
  //   .../@-34.4376687,-57.4406757,3a,75y,156.96h,82.47t/data=...!1s<PANO>!2e0...
  function leerLinkStreetView(url) {
    const m = (url || '').match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),3a,(?:([\d.]+)y,)?([\d.]+)h(?:,([\d.]+)t)?/);
    if (!m) return null;
    const pano = url.match(/!1s([^!]+)!2e0/);
    return {
      lat: +m[1], lng: +m[2], heading: +m[4],
      pitch: m[5] ? +m[5] - 90 : 0,
      pano: pano ? decodeURIComponent(pano[1]) : null,
    };
  }

  // ---------- Tabla de puntajes (se guarda en este navegador) ----------
  // Se ordena por porcentaje de aciertos, así se pueden comparar partidas de 5, 10 o 15 rondas.
  function leerPuntajes() {
    try {
      const lista = JSON.parse(localStorage.getItem(CLAVE_PUNTAJES));
      return Array.isArray(lista) ? lista : [];
    } catch { return []; }
  }
  function guardarPuntajes(lista) {
    try { localStorage.setItem(CLAVE_PUNTAJES, JSON.stringify(lista)); } catch { /* sin almacenamiento */ }
  }
  const ordenarPuntajes = (lista) =>
    lista.sort((a, b) => b.pct - a.pct || b.puntos - a.puntos || a.fecha - b.fecha);

  function dibujarTabla(contenedor, cantidad, resaltarId) {
    const lista = ordenarPuntajes(leerPuntajes()).slice(0, cantidad);
    contenedor.innerHTML = '';
    if (!lista.length) {
      contenedor.innerHTML = '<p class="tabla-vacia">Todavía no hay puntajes. ¡Sé el primero!</p>';
      return;
    }
    const tabla = document.createElement('table');
    tabla.className = 'tabla-puntajes';
    tabla.innerHTML = '<thead><tr><th>#</th><th>Jugador</th><th class="num">Puntos</th><th class="num">%</th></tr></thead>';
    const cuerpo = document.createElement('tbody');
    lista.forEach((p, i) => {
      const tr = document.createElement('tr');
      if (p.id === resaltarId) tr.className = 'nuevo';
      const celdas = [
        ['pos', `${i + 1}`],
        ['ini', p.iniciales],
        ['num', `${p.puntos} / ${p.max}`],
        ['num', `${Math.round(p.pct * 100)}%`],
      ];
      celdas.forEach(([clase, texto]) => {
        const td = document.createElement('td');
        td.className = clase;
        td.textContent = texto;
        tr.appendChild(td);
      });
      cuerpo.appendChild(tr);
    });
    tabla.appendChild(cuerpo);
    contenedor.appendChild(tabla);
  }

  function limpiarIniciales(texto) {
    return texto.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Z0-9]/g, '').slice(0, 3);
  }

  function guardarIniciales(e) {
    e.preventDefault();
    const p = estado.ultimaPartida;
    const iniciales = limpiarIniciales($('iniciales').value);
    if (!p || !iniciales) { $('iniciales').focus(); return; }

    const entrada = { id: Date.now(), iniciales, puntos: p.puntos, max: p.max, pct: p.pct, fecha: Date.now() };
    const lista = ordenarPuntajes([...leerPuntajes(), entrada]).slice(0, 100);
    guardarPuntajes(lista);
    estado.ultimaPartida = null; // no se puede guardar dos veces la misma partida

    const puesto = lista.findIndex((x) => x.id === entrada.id) + 1;
    $('form-iniciales').classList.add('oculto');
    const msg = $('guardado');
    msg.textContent = puesto > 0
      ? `¡Guardado, ${iniciales}! Quedaste en el puesto ${puesto}.`
      : `¡Guardado, ${iniciales}!`;
    msg.classList.remove('oculto');
    dibujarTabla($('tabla-final'), 10, entrada.id);
  }

  function mostrarPantalla(id) {
    document.querySelectorAll('.pantalla').forEach((p) => p.classList.toggle('activa', p.id === id));
  }

  function mostrarCargando(texto) {
    $('cargando').textContent = texto || '';
    $('cargando').classList.toggle('oculto', !texto);
  }

  // ---------- Google Street View ----------
  let google_ = null;      // namespace google.maps cuando está cargado
  let panorama = null;
  let servicioSV = null;
  let errorGoogle = '';

  function cargarGoogle() {
    if (!CLAVE_GOOGLE) return Promise.reject(new Error('sin clave'));
    if (google_) return Promise.resolve(google_);
    return new Promise((resolver, rechazar) => {
      window.__googleListo = () => { google_ = window.google.maps; resolver(google_); };
      // Google llama a esta función si la clave es inválida o no tiene la API activada
      window.gm_authFailure = () => {
        errorGoogle = 'Google rechazó la clave. Revisá que tenga activada la "Maps JavaScript API" ' +
          'y que permita este sitio (ver README).';
        mostrarCargando(errorGoogle);
      };
      const s = document.createElement('script');
      s.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(CLAVE_GOOGLE) +
        '&callback=__googleListo&language=es&region=UY&v=weekly';
      s.async = true;
      s.onerror = () => rechazar(new Error('No se pudo cargar Google Maps (¿hay internet?)'));
      document.head.appendChild(s);
    });
  }

  function crearPanorama() {
    if (panorama) return;
    panorama = new google_.StreetViewPanorama($('calle'), {
      // Nada que delate el lugar: sin dirección, sin nombres de calles, sin poder caminar
      addressControl: false,
      showRoadLabels: false,
      linksControl: false,
      clickToGo: false,
      keyboardShortcuts: false,
      disableDefaultUI: true,
      zoomControl: true,
      fullscreenControl: false,
      motionTracking: false,
      motionTrackingControl: false,
      enableCloseButton: false,
      disableDoubleClickZoom: true,
    });
    servicioSV = new google_.StreetViewService();
  }

  // Busca la toma de calle más cercana a un punto. Devuelve null si no hay.
  async function buscarToma(opciones) {
    const fuente = google_.StreetViewSource.GOOGLE || google_.StreetViewSource.OUTDOOR;
    try {
      const { data } = await servicioSV.getPanorama({
        preference: google_.StreetViewPreference.NEAREST,
        source: fuente,
        ...opciones,
      });
      const ll = data.location.latLng;
      return {
        pano: data.location.pano,
        lat: ll.lat(),
        lng: ll.lng(),
        direccion: data.location.description || '',
      };
    } catch {
      return null; // ZERO_RESULTS
    }
  }

  function lejosDeAnteriores(p) {
    return estado.historial.every((h) => distanciaMetros(h.real, p) >= SEPARACION_MIN);
  }

  async function rondaAlAzar() {
    for (let intento = 0; intento < 40; intento++) {
      if (errorGoogle) return null;
      const punto = {
        lat: ZONA_AZAR.sur + Math.random() * (ZONA_AZAR.norte - ZONA_AZAR.sur),
        lng: ZONA_AZAR.oeste + Math.random() * (ZONA_AZAR.este - ZONA_AZAR.oeste),
      };
      const toma = await buscarToma({ location: punto, radius: 80 });
      if (!toma || !LIMITES.contains([toma.lat, toma.lng]) || !lejosDeAnteriores(toma)) continue;

      const cerca = lugarMasCercano(toma);
      return {
        ...toma,
        heading: Math.random() * 360,
        pitch: 0,
        nombre: toma.direccion || 'Una calle de Juan Lacaze',
        descripcion: cerca && cerca.d < 500
          ? `Estabas a ${formatoDistancia(cerca.d)} de ${cerca.lugar.nombre}.`
          : '',
      };
    }
    return null;
  }

  async function rondaDeLugar(lugar) {
    const link = leerLinkStreetView(lugar.streetview);
    const toma = link?.pano
      ? await buscarToma({ pano: link.pano })
      : await buscarToma({ location: link || lugar.desde || lugar, radius: link ? 20 : 150 });
    if (!toma) return null;
    return {
      ...toma,
      heading: lugar.heading ?? link?.heading ?? rumbo(toma, lugar),
      pitch: lugar.pitch ?? link?.pitch ?? 0,
      nombre: lugar.nombre,
      descripcion: lugar.descripcion || '',
    };
  }

  // ---------- Respaldo sin Google: foto propia o vista satelital ----------
  function nombreArchivo(nombre) {
    return nombre.normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function mostrarRespaldo(lugar) {
    $('calle').classList.add('oculto');
    const foto = $('foto');
    foto.classList.add('visible');
    foto.onerror = () => {
      foto.classList.remove('visible');
      vista.invalidateSize();
      vista.setView([lugar.lat, lugar.lng], lugar.zoom || 18, { animate: false });
    };
    foto.src = lugar.foto || `fotos/${nombreArchivo(lugar.nombre)}.jpg`;
  }

  // ---------- Mapas ----------
  // Mapas de Esri: funcionan aunque la página se abra con doble clic (file://).
  // openstreetmap.org y CARTO bloquean ese caso, por eso no se usan.
  const capaCalles = () => L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: '© Esri, OpenStreetMap',
  });
  const capaSinEtiquetas = () => L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    maxNativeZoom: 16, // este mapa no tiene más detalle; se agranda a partir de ahí
    attribution: '© Esri, OpenStreetMap',
  });
  const capaSatelite = () => L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { maxZoom: 19, attribution: 'Imágenes © Esri' }
  );

  let mapa = null;     // donde el jugador adivina
  let vista = null;    // satélite de respaldo
  let capaBase = null;

  function crearMapas() {
    mapa = L.map('mapa', {
      maxBounds: LIMITES.pad(0.05),
      maxBoundsViscosity: 1.0,
      minZoom: 14,
    });
    mapa.fitBounds(LIMITES);
    mapa.on('click', alHacerClick);

    vista = L.map('vista', {
      zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false,
      boxZoom: false, keyboard: false, touchZoom: false,
    });
    capaSatelite().addTo(vista);
    vista.setView(CENTRO, 17);
  }

  function ponerCapaBase(conEtiquetas) {
    if (capaBase) mapa.removeLayer(capaBase);
    capaBase = (conEtiquetas ? capaCalles() : capaSinEtiquetas()).addTo(mapa);
  }

  // ---------- Flujo del juego ----------
  async function empezar() {
    estado.modo = $('opt-modo').value;
    const n = parseInt($('opt-rondas').value, 10);
    estado.lugares = mezclar(LUGARES);
    estado.total = estado.modo === 'lugares' ? Math.min(n, estado.lugares.length) : n;
    estado.actual = 0;
    estado.puntos = 0;
    estado.historial = [];
    $('bloqueo').classList.toggle('oculto', $('opt-girar').checked);

    mostrarPantalla('juego');
    if (!mapa) crearMapas();
    ponerCapaBase($('opt-etiquetas').checked);
    $('ronda-total').textContent = estado.total;
    // Leaflet necesita recalcular tamaño cuando el contenedor pasa a ser visible
    setTimeout(() => { mapa.invalidateSize(); vista.invalidateSize(); iniciarRonda(); }, 0);
  }

  // ---------- Mapa desplegable ----------
  const mapaAbierto = () => $('panel-mapa').classList.contains('abierto');

  function abrirMapa() {
    if (!estado.listo) return;
    $('panel-mapa').classList.add('abierto');
    $('btn-abrir-mapa').classList.add('oculto');
    mapa.invalidateSize();
  }

  function cerrarMapa() {
    if (estado.adivinado) return;
    $('panel-mapa').classList.remove('abierto', 'grande');
    $('btn-abrir-mapa').classList.remove('oculto');
  }

  function limpiarMapa() {
    if (estado.marcador) { mapa.removeLayer(estado.marcador); estado.marcador = null; }
    estado.capasResultado.forEach((c) => mapa.removeLayer(c));
    estado.capasResultado = [];
  }

  async function iniciarRonda() {
    const pedido = ++estado.pedido;
    limpiarMapa();
    estado.adivinado = false;
    estado.listo = false;
    cerrarMapa();
    estado.ronda = null;
    $('ronda-n').textContent = estado.actual + 1;
    $('puntos').textContent = estado.puntos;
    $('resultado').classList.add('oculto');
    $('pista').textContent = '';
    const btn = $('btn-adivinar');
    btn.disabled = true;
    btn.textContent = 'Marcá un punto en el mapa';
    btn.classList.remove('oculto');
    mapa.fitBounds(LIMITES);

    const lugar = estado.modo === 'lugares' ? estado.lugares[estado.actual] : null;

    if (!google_) {
      // Sin Google solo se puede jugar con lugares conocidos (foto propia o satélite)
      estado.ronda = { ...lugar, descripcion: lugar.descripcion || '' };
      $('pista').textContent = lugar.pista || '';
      mostrarRespaldo(lugar);
      estado.listo = true;
      return;
    }

    $('calle').classList.remove('oculto');
    $('foto').classList.remove('visible');
    mostrarCargando(estado.modo === 'azar' ? 'Buscando una calle de Juan Lacaze…' : 'Yendo al lugar…');

    let ronda = lugar ? await rondaDeLugar(lugar) : await rondaAlAzar();
    if (pedido !== estado.pedido) return;
    if (!ronda && lugar) {
      // Este lugar no tiene Street View cerca: usamos su foto o el satélite
      estado.ronda = { ...lugar, descripcion: lugar.descripcion || '' };
      mostrarCargando('');
      $('pista').textContent = lugar.pista || '';
      mostrarRespaldo(lugar);
      estado.listo = true;
      return;
    }
    if (!ronda) {
      mostrarCargando(errorGoogle || 'No se encontraron imágenes de calle. Probá de nuevo más tarde.');
      return;
    }

    estado.ronda = ronda;
    if (lugar?.pista) $('pista').textContent = lugar.pista;
    panorama.setPano(ronda.pano);
    panorama.setPov({ heading: ronda.heading, pitch: ronda.pitch });
    panorama.setZoom(0);
    panorama.setVisible(true);
    mostrarCargando(errorGoogle);
    estado.listo = true;
  }

  function alHacerClick(e) {
    if (estado.adivinado || !estado.listo) return;
    if (estado.marcador) estado.marcador.setLatLng(e.latlng);
    else estado.marcador = L.marker(e.latlng).addTo(mapa);
    const btn = $('btn-adivinar');
    btn.disabled = false;
    btn.textContent = '¡Acá es!';
  }

  function adivinar() {
    if (!estado.marcador || estado.adivinado || !estado.listo) return;
    estado.adivinado = true;
    const r = estado.ronda;
    const real = L.latLng(r.lat, r.lng);
    const elegido = estado.marcador.getLatLng();
    const m = distanciaMetros(elegido, real);
    const pts = calcularPuntos(m);
    estado.puntos += pts;
    estado.historial.push({ nombre: r.nombre, m, pts, real: { lat: r.lat, lng: r.lng } });

    const marcaReal = L.circleMarker(real, {
      radius: 10, color: '#fff', weight: 3, fillColor: '#2e7d32', fillOpacity: 1,
    }).addTo(mapa).bindTooltip('Estabas acá', { permanent: true, direction: 'top', offset: [0, -10] });
    const linea = L.polyline([elegido, real], { color: '#e53935', dashArray: '6 8', weight: 3 }).addTo(mapa);
    estado.capasResultado.push(marcaReal, linea);
    // Agrandamos el mapa a pantalla completa y, cuando termina la animación, encuadramos
    // los dos puntos dejando lugar abajo para la tarjeta del resultado
    $('panel-mapa').classList.add('abierto', 'grande');
    setTimeout(() => {
      mapa.invalidateSize();
      mapa.fitBounds(L.latLngBounds([elegido, real]), {
        maxZoom: 17, paddingTopLeft: [60, 60], paddingBottomRight: [60, 230],
      });
    }, 250);

    $('btn-adivinar').classList.add('oculto');
    $('res-nombre').textContent = r.nombre;
    $('res-desc').textContent = r.descripcion || '';
    $('res-dist').textContent = `Marcaste a ${formatoDistancia(m)}`;
    $('res-pts').textContent = `+${pts} puntos`;
    $('puntos').textContent = estado.puntos;
    $('btn-siguiente').textContent =
      estado.actual + 1 < estado.total ? 'Siguiente' : 'Ver resultado';
    $('resultado').classList.remove('oculto');
  }

  function siguiente() {
    estado.actual++;
    if (estado.actual < estado.total) iniciarRonda();
    else terminar();
  }

  function terminar() {
    estado.pedido++;
    const max = estado.historial.length * PUNTOS_MAX;
    const pct = max ? estado.puntos / max : 0;
    $('final-puntos').textContent = estado.puntos;
    $('final-max').textContent = max;
    $('final-msg').textContent =
      pct > 0.85 ? '¡Sos de Juan Lacaze de toda la vida! 🏆' :
      pct > 0.6 ? '¡Muy bien! Conocés la ciudad.' :
      pct > 0.35 ? 'Nada mal, pero hay que salir a caminar más.' :
      '¿Seguro que estuviste en Juan Lacaze? 😅';

    const lista = $('final-lista');
    lista.innerHTML = '';
    estado.historial.forEach((h) => {
      const li = document.createElement('li');
      li.innerHTML = `<b></b> — ${formatoDistancia(h.m)} · ${h.pts} pts`;
      li.querySelector('b').textContent = h.nombre;
      lista.appendChild(li);
    });

    // Formulario de iniciales (solo si se jugó al menos una ronda)
    estado.ultimaPartida = max ? { puntos: estado.puntos, max, pct } : null;
    $('form-iniciales').classList.toggle('oculto', !max);
    $('guardado').classList.add('oculto');
    $('iniciales').value = '';
    dibujarTabla($('tabla-final'), 10);

    mostrarPantalla('final');
    if (max) $('iniciales').focus();
  }

  function mostrarTablaInicio() {
    const hay = leerPuntajes().length > 0;
    $('bloque-tabla-inicio').classList.toggle('oculto', !hay);
    if (hay) dibujarTabla($('tabla-inicio'), 5);
  }

  // ---------- Inicio ----------
  async function prepararInicio() {
    const aviso = $('aviso');
    const btn = $('btn-jugar');
    const opcAzar = $('opt-modo').querySelector('option[value="azar"]');
    try {
      btn.disabled = true;
      btn.textContent = 'Cargando…';
      await cargarGoogle();
      crearPanorama();
      aviso.textContent = '';
    } catch (e) {
      // Sin Google: solo modo lugares con fotos propias o satélite
      opcAzar.disabled = true;
      $('opt-modo').value = 'lugares';
      $('opt-girar').closest('label').classList.add('oculto');
      aviso.textContent = CLAVE_GOOGLE
        ? e.message
        : 'Falta la clave de Google en config.js, así que no hay vista de calle: se juega con fotos o satélite. (Ver README)';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Jugar';
    }
  }

  $('btn-jugar').addEventListener('click', empezar);
  $('btn-adivinar').addEventListener('click', adivinar);
  $('btn-siguiente').addEventListener('click', siguiente);
  $('btn-abrir-mapa').addEventListener('click', abrirMapa);
  $('btn-cerrar-mapa').addEventListener('click', cerrarMapa);
  $('btn-otra').addEventListener('click', () => { mostrarPantalla('inicio'); mostrarTablaInicio(); });
  $('form-iniciales').addEventListener('submit', guardarIniciales);
  $('iniciales').addEventListener('input', (e) => { e.target.value = limpiarIniciales(e.target.value); });
  $('btn-borrar-puntajes').addEventListener('click', () => {
    if (!confirm('¿Borrar todos los puntajes guardados en esta computadora?')) return;
    guardarPuntajes([]);
    mostrarTablaInicio();
  });
  // Enter: abre el mapa → confirma → siguiente ronda.  Esc: vuelve a la calle.
  document.addEventListener('keydown', (e) => {
    if (!$('juego').classList.contains('activa')) return;
    if (e.key === 'Escape') { cerrarMapa(); return; }
    if (e.key !== 'Enter') return;
    if (estado.adivinado) siguiente();
    else if (!mapaAbierto()) abrirMapa();
    else adivinar();
  });

  mostrarTablaInicio();
  prepararInicio();
})();
