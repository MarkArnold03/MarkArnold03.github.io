// Map data for the dispatch demo: a schematic Stockholm in a 1000 x 640 box.
// Used by the build (to draw the static map) and embedded as JSON for the browser (routing).
// Positions are approximate and stylised, not a real map. Drivers are fictional.

export const nodes = [
  { id: 'vas', name: 'Västberga', x: 360, y: 585, depot: true, dy: 32 },
  { id: 'lil', name: 'Liljeholmen', x: 345, y: 470, dy: -19 },
  { id: 'hag', name: 'Hägersten', x: 215, y: 525, dy: 32 },
  { id: 'ars', name: 'Årsta', x: 485, y: 555, dy: 32 },
  { id: 'glo', name: 'Globen', x: 610, y: 560, dy: 32 },
  { id: 'ham', name: 'Hammarby', x: 665, y: 440, dy: -19 },
  { id: 'nac', name: 'Nacka', x: 845, y: 450, dy: -19 },
  { id: 'sod', name: 'Södermalm', x: 505, y: 440, dy: -19 },
  { id: 'gst', name: 'Gamla stan', x: 500, y: 345, dy: 5, dx: 58 },
  { id: 'nor', name: 'Norrmalm', x: 490, y: 265, dy: -19 },
  { id: 'vst', name: 'Vasastan', x: 425, y: 185, dy: -19 },
  { id: 'ost', name: 'Östermalm', x: 615, y: 230, dy: -19 },
  { id: 'djg', name: 'Djurgården', x: 690, y: 300, dy: 32 },
  { id: 'lid', name: 'Lidingö', x: 865, y: 180, dy: -19 },
  { id: 'kun', name: 'Kungsholmen', x: 340, y: 300, dy: -19 },
  { id: 'bro', name: 'Bromma', x: 150, y: 265, dy: -19 },
  { id: 'sun', name: 'Sundbyberg', x: 245, y: 120, dy: -19 },
  { id: 'sol', name: 'Solna', x: 390, y: 95, dy: -19 },
];

export const edges = [
  ['sun', 'sol'], ['sun', 'bro'], ['sol', 'vst'], ['bro', 'kun'], ['kun', 'vst'], ['kun', 'nor'], ['vst', 'nor'],
  ['nor', 'ost'], ['ost', 'lid'], ['ost', 'djg'], ['nor', 'gst'], ['gst', 'sod'], ['sod', 'ham'], ['ham', 'nac'],
  ['sod', 'lil'], ['kun', 'lil'], ['lil', 'hag'], ['hag', 'vas'], ['lil', 'vas'], ['vas', 'ars'], ['ars', 'glo'],
  ['glo', 'ham'], ['ars', 'sod'], ['glo', 'nac'], ['sol', 'ost'],
];

// Water drawn as wide stroked curves: [path, width]
export const water = [
  ['M-20 382 C120 368 210 394 300 386 S430 368 482 378', 58], // Mälaren / Riddarfjärden
  ['M258 384 C246 322 264 262 238 186', 30], // Bromma arm
  ['M522 374 C600 386 664 364 760 356 S900 334 1020 322', 72], // Saltsjön
  ['M722 40 C742 132 748 222 772 348', 32], // Lidingö strait
  ['M420 492 C520 500 610 506 720 478 S800 472 900 500', 26], // Hammarby sjö
];

export const trucks = [
  { id: 'T-01', driver: 'Sara', online: true },
  { id: 'T-02', driver: 'Ali', online: true },
  { id: 'T-03', driver: 'Johan', online: true },
  { id: 'T-04', driver: 'Emma', online: true },
  { id: 'T-05', driver: 'Mohammed', online: false },
  { id: 'T-06', driver: 'Linnea', online: false },
];
