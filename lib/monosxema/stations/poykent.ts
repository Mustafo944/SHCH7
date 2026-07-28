import type { StationDef } from '../types'

// Poykent bekati — sxema ta'rifi. qorlitog_server loyihasidan portlangan
// (src/stations/poykent.js), koordinatalar o'zgartirilmagan.

const tracks: StationDef['tracks'] = [
  { name: 'БП', left: 20, top: 330, w: 235 },
  { name: 'ГП', left: 20, top: 450, w: 235 },

  { name: '4СП', left: 265, top: 330, w: 190, sw: '2-4', pathType: 'straight' },
  { name: '2СП', left: 265, top: 450, w: 190, sw: '2-4', pathType: 'straight' },
  { name: '4СП', left: 305, top: 450, w: 156, rot: '-50.2deg', sw: '2-4', pathType: 'side' },

  { name: '10СП', left: 455, top: 330, w: 110, sw: '10', pathType: 'straight' },
  { name: '10СП', left: 495, top: 330, w: 147, rot: '-54.7deg', sw: '10', pathType: 'side' },

  { name: '3П', left: 575, top: 210, w: 370 },
  { name: '1П', left: 565, top: 330, w: 515 },
  { name: '16СП', left: 455, top: 450, w: 110 },
  { name: '2П', left: 565, top: 450, w: 780 },

  { name: '5СП', left: 795, top: 90, w: 150 },

  { name: '3П',  left: 945, top: 210, w: 60, sw: '5', pathType: 'straight' },
  { name: '5СП', left: 945, top: 90, w: 134, rot: '63.4deg', sw: '5', pathType: 'side' },

  { name: '1СП', left: 1000, top: 210, w: 230, rot: '31.5deg', sw: '1', pathType: 'side' },
  { name: '1СП', left: 1080, top: 330, w: 240, switchPoints: [{ at: 1196, sw: '1' }], reverse: true },

  { name: '9П', left: 1320, top: 330, w: 120 },

  { name: '9СП', left: 1450, top: 330, w: 170, sw: '7-9', pathType: 'straight' },
  { name: '9СП', left: 1520, top: 330, w: 156, rot: '50.2deg', sw: '7-9', pathType: 'side' },
  { name: '7СП', left: 1345, top: 450, w: 365, sw: '7-9', pathType: 'straight' },

  { name: '9СП', left: 1620, top: 330, w: 270 },
  { name: 'НДП', left: 1710, top: 450, w: 180 },
]

const izostik: StationDef['izostik'] = [
  { left: 260, top: 326, h: 16 }, { left: 455, top: 326, h: 16 },
  { left: 565, top: 326, h: 16 }, { left: 1080, top: 326, h: 16 },
  { left: 1318, top: 326, h: 16 }, { left: 1440, top: 326, h: 16 },
  { left: 260, top: 446, h: 16 }, { left: 455, top: 446, h: 16 },
  { left: 565, top: 446, h: 16 }, { left: 1345, top: 446, h: 16 },
  { left: 1708, top: 446, h: 16 },
]

const crossings: StationDef['crossings'] = [
  { left: 185,  w: 43, top: 289, h: 213 },
  { left: 1466, w: 43, top: 289, h: 213 },
]

const signals: StationDef['signals'] = [
  { name: 'ЧГ', sigLeft: 70,   sigTop: 350, labelLeft: 30,   labelTop: 345, display: 'ЧГ' },
  { name: 'ЧК', sigLeft: 70,   sigTop: 470, labelLeft: 30,   labelTop: 465, display: 'ЧК' },
  { name: 'Ч5', sigLeft: 890,  sigTop: 110, labelLeft: 850,  labelTop: 105, display: 'Ч5' },
  { name: 'Ч3', sigLeft: 890,  sigTop: 230, labelLeft: 850,  labelTop: 225, display: 'Ч3' },
  { name: 'Ч1', sigLeft: 1085, sigTop: 350, labelLeft: 1045, labelTop: 345, display: 'Ч1' },
  { name: 'Ч2', sigLeft: 1350, sigTop: 470, labelLeft: 1310, labelTop: 465, display: 'Ч2' },

  { name: 'Н3', sigLeft: 660,  sigTop: 180, labelLeft: 710,  labelTop: 175, display: 'Н3' },
  { name: 'Н1', sigLeft: 620,  sigTop: 300, labelLeft: 670,  labelTop: 295, display: 'Н1' },
  { name: 'Н2', sigLeft: 620,  sigTop: 420, labelLeft: 670,  labelTop: 415, display: 'Н2' },
  { name: 'НД', sigLeft: 1815, sigTop: 300, labelLeft: 1865, labelTop: 295, display: 'НД' },
  { name: 'Н',  sigLeft: 1840, sigTop: 420, labelLeft: 1890, labelTop: 415, display: 'Н'  },
]

const switches: StationDef['switches'] = [
  { name: '2-4ПК', display: '+', colorType: 'green',  sigLeft: 40,   sigTop: 565, labelLeft: 45,   labelTop: 545 },
  { name: '2-4МК', display: '-', colorType: 'yellow', sigLeft: 84,   sigTop: 565, labelLeft: 89,   labelTop: 545 },
  { name: '10ПК',  display: '+', colorType: 'green',  sigLeft: 170,  sigTop: 565, labelLeft: 175,  labelTop: 545 },
  { name: '10МК',  display: '-', colorType: 'yellow', sigLeft: 214,  sigTop: 565, labelLeft: 219,  labelTop: 545 },
  { name: '1ПК',   display: '+', colorType: 'green',  sigLeft: 1560, sigTop: 565, labelLeft: 1565, labelTop: 545 },
  { name: '1МК',   display: '-', colorType: 'yellow', sigLeft: 1604, sigTop: 565, labelLeft: 1609, labelTop: 545 },
  { name: '5ПК',   display: '+', colorType: 'green',  sigLeft: 1690, sigTop: 565, labelLeft: 1695, labelTop: 545 },
  { name: '5МК',   display: '-', colorType: 'yellow', sigLeft: 1734, sigTop: 565, labelLeft: 1739, labelTop: 545 },
  { name: '7-9ПК', display: '+', colorType: 'green',  sigLeft: 1820, sigTop: 565, labelLeft: 1825, labelTop: 545 },
  { name: '7-9МК', display: '-', colorType: 'yellow', sigLeft: 1864, sigTop: 565, labelLeft: 1869, labelTop: 545 },
]

const switchLabels: StationDef['switchLabels'] = [
  { text: '2-4', left: 55,   top: 545 },
  { text: '10',  left: 188,  top: 545 },
  { text: '1',   left: 1578, top: 545 },
  { text: '5',   left: 1708, top: 545 },
  { text: '7-9', left: 1838, top: 545 },
]

const sections: StationDef['sections'] = [
  { name: 'БП',   left: 105,  top: 304, label: 'БП' },
  { name: 'ГП',   left: 105,  top: 424, label: 'ГП' },
  { name: '4СП',  left: 320,  top: 304, label: '4СП' },
  { name: '2СП',  left: 320,  top: 424, label: '2СП' },
  { name: '10СП', left: 470,  top: 302, label: '10СП' },
  { name: '16СП', left: 470,  top: 424, label: '16СП' },
  { name: '3П',   left: 800,  top: 186, label: '3П' },
  { name: '5СП',  left: 855,  top: 60,  label: 'б' },
  { name: '1П',   left: 800,  top: 304, label: '1П' },
  { name: '2П',   left: 800,  top: 424, label: '2П' },
  { name: '5СП',  left: 1030, top: 186, label: '5СП' },
  { name: '1СП',  left: 1230, top: 304, label: '1СП' },
  { name: '9П',   left: 1360, top: 304, label: '9П' },
  { name: '9СП',  left: 1520, top: 304, label: '9СП' },
  { name: '7СП',  left: 1620, top: 424, label: '7СП' },
  { name: 'НДП',  left: 1745, top: 424, label: 'НДП' },

  { name: '2СП',  left: 288,  top: 463, label: '2' },
  { name: '4СП',  left: 398,  top: 300, label: '4' },
  { name: '10СП', left: 488,  top: 340, label: '10' },
  { name: '5СП',  left: 1008, top: 180, label: '5' },
  { name: '1СП',  left: 1189, top: 300, label: '1' },
  { name: '9СП',  left: 1555, top: 340, label: '9' },
  { name: '7СП',  left: 1613, top: 463, label: '7' },
]

const poykentStation: StationDef = {
  id: 'poykent',
  name: 'Poykent bekati',
  subtitle: "Monitoring va arxiv ko'rsatkichi",

  width: 1920,
  height: 620,

  leftLabel: 'Ч tomoni',
  rightLabel: 'Н tomoni',
  leftLabelX: 120,
  rightLabelX: 120,

  layoutReady: true,

  archiveMarker: { left: 430 },

  tracks,
  izostik,
  crossings,
  signals,
  switches,
  switchLabels,
  sections,

  trackCount: 15,

  voltageSections: [
    'БП', '4СП', '10СП', '3П', '1П', '5СП', '1СП', '9П', '9СП',
    'ГП', '2СП', '16СП', '2П', '7СП', 'НДП',
  ],

  devices: [],
}

export default poykentStation
