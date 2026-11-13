// Lugares conocidos de Juan Lacaze. Coordenadas tomadas de OpenStreetMap.
// Se usan en el modo "Lugares conocidos" y, en el modo al azar, para decir
// "Estabas a 120 m de ..." al revelar la respuesta.
// Para agregar más, abrí editor.html, marcá el lugar en el mapa y copiá el resultado acá.
//
// Campos:
//   nombre       (obligatorio) se muestra después de adivinar
//   lat, lng     (obligatorio) ubicación real
//   descripcion  (opcional)    texto que aparece al revelar el lugar
//   pista        (opcional)    texto que se muestra arriba de la imagen
//
// Vista de calle (con clave de Google): el juego busca solo la toma de Street View más cercana
// y apunta la cámara hacia el lugar. Para elegir una toma exacta:
//   streetview   (opcional)    link de Google Maps estando en Street View
//   heading, pitch (opcionales) hacia dónde mira la cámara (0 = norte, 90 = este) e inclinación
//   desde        (opcional)    { lat, lng } punto de la calle desde donde mirar
//
// Sin clave de Google se usa fotos/<nombre-sin-tildes-con-guiones>.jpg
// (ej: "Puerto Sauce" -> fotos/puerto-sauce.jpg) o, si no hay foto, la vista satelital.
//   foto         (opcional)    otra ruta de foto
//   zoom         (opcional)    zoom de la vista satelital (por defecto 18)
const LUGARES = [
  {
    nombre: 'Puerto Sauce',
    lat: -34.43969, lng: -57.44340,
    descripcion: 'El puerto de Juan Lacaze, sobre el Río de la Plata.',
    zoom: 17,
  },
  {
    nombre: 'Fanapel',
    lat: -34.44104, lng: -57.44096,
    descripcion: 'La ex fábrica de papel, una de las industrias históricas de la ciudad.',
    zoom: 17,
  },
  {
    nombre: 'Playa Charrúa',
    lat: -34.44008, lng: -57.43496,
    descripcion: 'La playa urbana de Juan Lacaze.',
  },
  {
    nombre: 'Playa Verde',
    lat: -34.43355, lng: -57.44520,
    descripcion: 'Playa sobre la costa oeste de la ciudad.',
  },
  {
    nombre: 'Playa De los Piamonteses',
    lat: -34.43301, lng: -57.41684,
    descripcion: 'Playa agreste al este de la ciudad.',
    zoom: 17,
  },
  {
    nombre: 'Estadio Miguel Campomar',
    lat: -34.42572, lng: -57.44422,
    descripcion: 'El estadio de fútbol de la ciudad, sobre Ruta 54.',
  },
  {
    nombre: 'Plaza de Deportes',
    lat: -34.42778, lng: -57.44656,
  },
  {
    nombre: 'Liceo de Juan Lacaze',
    lat: -34.42441, lng: -57.44599,
  },
  {
    nombre: 'Escuela Técnica (UTU) Juan Lacaze',
    lat: -34.43771, lng: -57.43449,
  },
  {
    nombre: 'Círculo Juan Lacaze (hospital)',
    lat: -34.43596, lng: -57.43771,
  },
  {
    nombre: 'Cementerio',
    lat: -34.42294, lng: -57.42942,
    zoom: 17,
  },
  {
    nombre: 'Seccional Policial 8ª',
    lat: -34.43520, lng: -57.43878,
  },
  {
    nombre: 'Escuela 39',
    lat: -34.43370, lng: -57.43746,
  },
];
