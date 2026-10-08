/* FORJA — datos por defecto e iconografía */
'use strict';

/* Iconos de ejercicios: siluetas de línea en una cuadrícula de 24×24.
   Las cabezas son círculos rellenos; el resto, trazo. */
const H = (cx, cy, r = 1.7) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="currentColor" stroke="none"/>`;

const EX_ICONS = {
  bench: `${H(18, 12.3)}<path d="M16 13.6H8.6M8.6 13.6L6.2 10.8L5.2 19M14.6 13.6V6M10 6H19.2M10.6 4.4V7.6M18.6 4.4V7.6M3.8 15.6H19.4M9 15.6V20M17 15.6V20"/>`,
  incline: `${H(8, 7.6)}<path d="M14 15L9.6 9.6M14 15L18.4 14L18.4 20M9.6 9.6V3M5 3H14.2M5.6 1.6V4.4M13.6 1.6V4.4M16.2 16.6L10.6 9.8M12 17H17"/>`,
  ohp: `${H(12, 6.4)}<path d="M12 8.6V15M12 15L9.6 21M12 15L14.4 21M12 10L8 3.4M12 10L16 3.4M4.6 3.4H19.4M5.6 1.8V5M18.4 1.8V5"/>`,
  lateral: `${H(12, 4.4)}<path d="M12 6.6V14M12 14L9.8 21M12 14L14.2 21M5 8.6H19M4.4 7V10.2M19.6 7V10.2"/>`,
  dips: `${H(12, 4)}<path d="M12 6.1V13M8 11L12 7.2L16 11M12 13L11 17.4L13.6 19.8M4.6 11H9.2M14.8 11H19.4M6 11V21M18 11V21"/>`,
  pushdown: `${H(9.6, 5)}<path d="M9.6 7.1V14.4M9.6 14.4L7.8 21M9.6 14.4L11.6 21M9.8 8.6L11.2 11.8L15 12.6M16.2 2.2L15 12.6M13.4 12.6H16.6"/><circle cx="16.4" cy="2.2" r="1"/>`,
  fly: `${H(12, 4.6)}<path d="M12 6.8V14M12 14L10 21M12 14L14 21M12 8.8Q7.4 9 5.6 5M12 8.8Q16.6 9 18.4 5"/><circle cx="5.2" cy="4.2" r="1.3"/><circle cx="18.8" cy="4.2" r="1.3"/>`,
  pullup: `${H(12, 7)}<path d="M3 3H21M7.6 3L10.4 9.6M16.4 3L13.6 9.6M10.4 9.6H13.6M12 9.6V15.6M12 15.6L11 21.4M12 15.6L13.8 18.6L12.6 21.4"/>`,
  pulldown: `${H(12, 8)}<path d="M12 5V1.6M6 5H18M7 5L9.8 10.6M17 5L14.2 10.6M9.8 10.6H14.2M12 10.6V16M8 16H16M10 16V21M14 16V21"/>`,
  row: `${H(17.4, 6.6)}<path d="M15.4 8.4L8 11M8 11L9.6 16L8.2 21M15.4 8.4L12.6 10.6L13.6 14"/><circle cx="13.6" cy="15.8" r="2.4"/>`,
  cablerow: `${H(8.6, 5.6)}<path d="M8.8 7.8L9.6 14M9.6 14L14.6 11.6L18.6 14.6M9.2 9.4L15 10.4M15 10.4H21.4M19.6 12.6V17M5 16H12.6"/>`,
  facepull: `${H(12, 6.8)}<path d="M12 9V15.4M12 15.4L10 21M12 15.4L14 21M12 10.4L7.4 9L9.8 6M12 10.4L16.6 9L14.2 6M2.6 6H21.4"/>`,
  curl: `${H(11, 4.4)}<path d="M11 6.6V14M11 14L9.4 21M11 14L12.6 21M11.4 8L12 12.4L15.6 9"/><circle cx="16.4" cy="8.2" r="1.4"/>`,
  hammer: `${H(11, 4.4)}<path d="M11 6.6V14M11 14L9.4 21M11 14L12.6 21M11.4 8L12 12.4L15.6 9.2M15 6.8L16.6 11"/>`,
  squat: `${H(12.6, 4.4)}<path d="M12.2 6.6L8.6 13M8.6 13L14 14.4L12.2 20.6M10.6 20.6H14.6M6.6 7H17.4M7.2 5.4V8.6M16.8 5.4V8.6"/>`,
  deadlift: `${H(16.2, 6.4)}<path d="M14.6 8.4L8 10.6M8 10.6L10.6 15L9.6 20.6M14.6 8.4L13.4 15.6M3 21.4H21"/><circle cx="13.2" cy="18.4" r="2.6"/>`,
  legpress: `${H(5.4, 7.8, 1.6)}<path d="M6.4 10L9.2 16M9.2 16L13.2 11L17.4 12.6M15.8 9.4L19 15.8M4 18.4H12.4M3.6 12L5.8 18.4"/>`,
  legext: `${H(8, 4.4)}<path d="M8 6.6V13M8 13H14M14 13L18.6 9.8M5 15H15M7 15V21M13 15V21M5 15V6.4"/>`,
  legcurl: `${H(4.2, 12.4, 1.6)}<path d="M6.2 13H13M13 13H17M17 13L19.6 8M3 15.2H19M5 15.2V20M17 15.2V20"/>`,
  lunge: `${H(12, 4)}<path d="M12 6.2V13M12 13L16 15.6V20.6M12 13L8.8 17L5.4 19.6M12 8.2L13.4 12.4"/><circle cx="13.8" cy="13.8" r="1.2"/>`,
  calf: `${H(13, 3.8)}<path d="M13 6V13.4M13 13.4V18.4M13 18.4L14.6 19.4M13 8L13.6 12.6M6 14.6V8M4 10L6 8L8 10"/><rect x="10" y="19.4" width="9" height="2.2" rx=".6"/>`,
  hipthrust: `${H(4.4, 8.8, 1.6)}<path d="M6 11H13M13 11L17.4 11.6L17.6 20.4M2.6 11.6H7V20.4M2 20.6H22"/><circle cx="12.4" cy="8" r="2.4"/>`,
  crunch: `${H(6, 11.4)}<path d="M12 18.4L7.6 13.4M12 18.4L16 13L20 18.4M7.6 13.4L9.8 10.4M2 20.2H22"/>`,
  plank: `${H(19, 11.2)}<path d="M17.2 12.8L4 18.4M17.2 12.8V18.6H14M2 20.2H22"/>`,
  legraise: `${H(12, 6.2, 1.6)}<path d="M3 3H21M8.8 3L10.8 8M15.2 3L13.2 8M10.8 8H13.2M12 8V14M12 14H19.4"/>`,
  dumbbell: `<path d="M8 12H16M5.2 8.6V15.4M8 7V17M16 7V17M18.8 8.6V15.4M3 12H5.2M18.8 12H21"/>`,
  kettlebell: `<path d="M9 7.2A3 3 0 0 1 15 7.2M8.2 9.6A6.4 6.4 0 1 0 15.8 9.6M8.2 9.6H15.8M9 7.2V9.6M15 7.2V9.6M7 21H17"/>`,
};

const ICON_LIST = Object.keys(EX_ICONS);

const UI_ICONS = {
  gear: `<path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"/><path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.6-2-3.4-2.4.9a7.6 7.6 0 0 0-2.6-1.5L14 2.4h-4l-.4 2.5A7.6 7.6 0 0 0 7 6.4l-2.4-.9-2 3.4 2 1.6a7.6 7.6 0 0 0 0 3l-2 1.6 2 3.4 2.4-.9a7.6 7.6 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.6 7.6 0 0 0 2.6-1.5l2.4.9 2-3.4-2-1.6Z"/>`,
  chart: `<path d="M3.5 20.5h17M5.5 16.5l4-5 3.5 3 6-7.5"/><circle cx="19" cy="7" r="1.2" fill="currentColor" stroke="none"/>`,
  plus: `<path d="M12 5v14M5 12h14"/>`,
  list: `<path d="M9 6.5h11M9 12h11M9 17.5h11"/><circle cx="4.6" cy="6.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="4.6" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="4.6" cy="17.5" r="1.1" fill="currentColor" stroke="none"/>`,
  back: `<path d="M15 5l-7 7 7 7"/>`,
  chev: `<path d="M9 5l7 7-7 7"/>`,
  down: `<path d="M5 9l7 7 7-7"/>`,
  up: `<path d="M5 15l7-7 7 7"/>`,
  x: `<path d="M6 6l12 12M18 6L6 18"/>`,
  check: `<path d="M4.5 12.5l5 5 10-11"/>`,
  trash: `<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>`,
  edit: `<path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4"/>`,
  minus: `<path d="M5 12h14"/>`,
  calendar: `<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>`,
  clock: `<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>`,
  flame: `<path d="M12 21c-4 0-6.5-2.7-6.5-6.2 0-3.7 3-5.5 3.5-9.3 2.4 1.5 3.4 3.6 3.5 5.6 1-.7 1.6-1.8 1.8-3 2.4 2 4.2 4.4 4.2 7 0 3.4-2.6 5.9-6.5 5.9Z"/>`,
  search: `<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>`,
  trophy: `<path d="M8 4h8v5a4 4 0 0 1-8 0V4ZM8 6H4.5a3 3 0 0 0 3.6 4.4M16 6h3.5a3 3 0 0 1-3.6 4.4M12 13v4M8.5 20.5h7M9.5 17h5"/>`,
  download: `<path d="M12 4v11M7 10.5l5 5 5-5M4.5 20h15"/>`,
  upload: `<path d="M12 16V5M7 9.5l5-5 5 5M4.5 20h15"/>`,
  scale: `<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M7.5 9.5a6.4 6.4 0 0 1 9 0"/><path d="M12 12l1.6-3"/>`,
};

const MUSCLES = ['Pecho', 'Espalda', 'Hombro', 'Bíceps', 'Tríceps', 'Cuádriceps', 'Femoral', 'Glúteo', 'Gemelo', 'Core', 'Otro'];

const DEFAULT_LIBRARY = [
  { id: 'bench', name: 'Press banca', muscle: 'Pecho', icon: 'bench' },
  { id: 'incline_db', name: 'Press inclinado mancuernas', muscle: 'Pecho', icon: 'incline' },
  { id: 'fly', name: 'Aperturas', muscle: 'Pecho', icon: 'fly' },
  { id: 'ohp', name: 'Press militar', muscle: 'Hombro', icon: 'ohp' },
  { id: 'lateral', name: 'Elevaciones laterales', muscle: 'Hombro', icon: 'lateral' },
  { id: 'dips', name: 'Fondos', muscle: 'Tríceps', icon: 'dips' },
  { id: 'pushdown', name: 'Extensión tríceps polea', muscle: 'Tríceps', icon: 'pushdown' },
  { id: 'pullup', name: 'Dominadas', muscle: 'Espalda', icon: 'pullup' },
  { id: 'row', name: 'Remo con barra', muscle: 'Espalda', icon: 'row' },
  { id: 'pulldown', name: 'Jalón al pecho', muscle: 'Espalda', icon: 'pulldown' },
  { id: 'cablerow', name: 'Remo en polea baja', muscle: 'Espalda', icon: 'cablerow' },
  { id: 'facepull', name: 'Face pull', muscle: 'Hombro', icon: 'facepull' },
  { id: 'curl', name: 'Curl bíceps', muscle: 'Bíceps', icon: 'curl' },
  { id: 'hammer', name: 'Curl martillo', muscle: 'Bíceps', icon: 'hammer' },
  { id: 'squat', name: 'Sentadilla', muscle: 'Cuádriceps', icon: 'squat' },
  { id: 'deadlift', name: 'Peso muerto', muscle: 'Femoral', icon: 'deadlift' },
  { id: 'rdl', name: 'Peso muerto rumano', muscle: 'Femoral', icon: 'deadlift' },
  { id: 'legpress', name: 'Prensa', muscle: 'Cuádriceps', icon: 'legpress' },
  { id: 'legext', name: 'Extensión de cuádriceps', muscle: 'Cuádriceps', icon: 'legext' },
  { id: 'legcurl', name: 'Curl femoral', muscle: 'Femoral', icon: 'legcurl' },
  { id: 'lunge', name: 'Zancadas', muscle: 'Glúteo', icon: 'lunge' },
  { id: 'hipthrust', name: 'Hip thrust', muscle: 'Glúteo', icon: 'hipthrust' },
  { id: 'calf', name: 'Elevación de gemelos', muscle: 'Gemelo', icon: 'calf' },
  { id: 'crunch', name: 'Crunch abdominal', muscle: 'Core', icon: 'crunch' },
  { id: 'legraise', name: 'Elevación de piernas colgado', muscle: 'Core', icon: 'legraise' },
  { id: 'plank', name: 'Plancha', muscle: 'Core', icon: 'plank' },
];

const r = (exId, sets = 3, reps = 10) => ({ exId, sets, reps });

const DEFAULT_DAYS = {
  push: { name: 'Push', icon: 'bench', desc: 'Pecho · Hombro · Tríceps',
    ex: [r('bench', 4, 8), r('incline_db', 3, 10), r('ohp', 3, 8), r('lateral', 3, 12), r('pushdown', 3, 12), r('dips', 3, 10)] },
  pull: { name: 'Pull', icon: 'pullup', desc: 'Espalda · Bíceps',
    ex: [r('pullup', 4, 8), r('row', 4, 8), r('pulldown', 3, 10), r('cablerow', 3, 10), r('facepull', 3, 15), r('curl', 3, 10)] },
  legs: { name: 'Legs', icon: 'squat', desc: 'Cuádriceps · Femoral · Gemelo',
    ex: [r('squat', 4, 6), r('rdl', 3, 8), r('legpress', 3, 10), r('legext', 3, 12), r('legcurl', 3, 12), r('calf', 4, 12)] },
  upper: { name: 'Upper', icon: 'ohp', desc: 'Torso completo',
    ex: [r('bench', 4, 6), r('row', 4, 8), r('ohp', 3, 8), r('pulldown', 3, 10), r('curl', 3, 10), r('pushdown', 3, 10)] },
  lower: { name: 'Lower', icon: 'deadlift', desc: 'Pierna · Glúteo · Core',
    ex: [r('deadlift', 3, 5), r('squat', 3, 8), r('lunge', 3, 10), r('hipthrust', 3, 10), r('legcurl', 3, 12), r('calf', 4, 12)] },
};

const DAY_ORDER = ['push', 'pull', 'legs', 'upper', 'lower'];
