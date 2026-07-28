import type { StationDef } from '../types'

// Qorli Tog' stansiyasi — sxema ta'rifi. qorlitog_server loyihasidan portlangan
// (src/stations/qorlitog.js), koordinatalar o'zgartirilmagan.

const tracks: StationDef['tracks'] = [
  { name: '1ЧП',   left: 10,   top: 140,  w: 230, bg: 'rgb(216,204,204)', rot: '' },
  { name: '2СП',   left: 250,  top: 140,  w: 350, bg: 'rgb(177,163,163)', rot: '', switchPoints: [{ at: 470, sw: '2-4' }] },
  { name: 'IП',    left: 610,  top: 140,  w: 620, bg: 'rgb(177,163,163)', rot: '' },
  { name: '1СП',   left: 1240, top: 140,  w: 260, bg: 'rgb(177,163,163)', rot: '', switchPoints: [{ at: 1367, sw: '1' }], reverse: true },
  { name: '1НП',   left: 1510, top: 140,  w: 290, bg: 'rgb(177,163,163)', rot: '' },
  { name: '4-6СП', left: 500, top: 260,  w: 260, bg: '', rot: '', switchPoints: [{ at: 538, sw: '2-4' }, { at: 680, sw: '6' }] },
  { name: 'IIП',   left: 770,  top: 260,  w: 320, bg: '', rot: '' },
  { name: '3-5СП', left: 1100, top: 260,  w: 150, bg: '', rot: '', switchPoints: [{ at: 1167, sw: '5' }], reverse: true },
  { name: 'IVП',   left: 801,  top: 380,  w: 249, bg: '', rot: '' },
  { name: '2СП',   left: 470,  top: 140,  w: 90,  bg: 'rgb(177,163,163)', rot: '45deg', sw: '2-4', pathType: 'side' },
  { name: '4-6СП', left: 680, top: 260,  w: 70,  bg: '', rot: '45deg', sw: '6', pathType: 'side' },
  { name: '4-6СП', left: 538, top: 213,  w: 65,  bg: '', rot: '45deg', sw: '2-4', pathType: 'side' },
  { name: '1СП',   left: 1310, top: 200,  w: 80,  bg: 'rgb(177,163,163)', rot: '-45deg', sw: '1', pathType: 'side' },
  { name: '3-5СП', left: 1250, top: 260,  w: 80,  bg: '', rot: '-45deg' },
  { name: '3-5СП', left: 1110, top: 320,  w: 80,  bg: '', rot: '-45deg', sw: '5', pathType: 'side' },
  { name: 'IVП',   left: 1050, top: 380,  w: 75,  bg: '', rot: '-45deg' },
  { name: 'IVП',   left: 802,  top: 380,  w: 95,  bg: '', rot: '-135deg' },
]

const signals: StationDef['signals'] = [
  { name: 'N1',                              sigLeft: 570,  sigTop: 95,  labelLeft: 620,  labelTop: 90,  display: 'Н1',     type: '' },
  { name: 'N',                               sigLeft: 1460, sigTop: 95,  labelLeft: 1510, labelTop: 90,  display: 'Н',      type: '' },
  { name: 'N2',                              sigLeft: 715,  sigTop: 230, labelLeft: 770,  labelTop: 225, display: 'Н2',     type: '' },
  { name: 'N4',                              sigLeft: 800,  sigTop: 350, labelLeft: 850,  labelTop: 345, display: 'Н4',     type: '' },
  { name: 'Ч',                               sigLeft: 260,  sigTop: 160, labelLeft: 233,  labelTop: 155, display: 'Ч',      type: '' },
  { name: 'Ч1',                              sigLeft: 1220, sigTop: 160, labelLeft: 1180, labelTop: 155, display: 'Ч1',     type: '' },
  { name: 'Ч2',                              sigLeft: 1060, sigTop: 280, labelLeft: 1030, labelTop: 275, display: 'Ч2',     type: '' },
  { name: 'Ч4',                              sigLeft: 1025, sigTop: 400, labelLeft: 995,  labelTop: 395, display: 'Ч4',     type: '' },
  { name: 'ПС/ПП_Ч',    sigLeft: 2,   sigTop: 50,  labelLeft: 0,   labelTop: 70,  display: 'ПС/ПП', type: 'signal-arrow' },
  { name: 'КП_Ч',       sigLeft: 70,  sigTop: 0,   labelLeft: 70,  labelTop: 25,  display: 'КП',     type: 'signal-square' },
  { name: 'ДСО/ПП_Ч',   sigLeft: 110, sigTop: 50,  labelLeft: 110, labelTop: 70,  display: 'ДСО/ПП', type: 'signal-arrow' },
  { name: 'ПС/ПП_N',    sigLeft: 1660,sigTop: 50,  labelLeft: 1660,labelTop: 70,  display: 'ПС/ПП', type: 'signal-arrow' },
  { name: 'КП_N',       sigLeft: 1750,sigTop: 0,   labelLeft: 1750,labelTop: 25,  display: 'КП',     type: 'signal-square' },
  { name: 'ДСО/ПП_N',   sigLeft: 1800,sigTop: 50,  labelLeft: 1800,labelTop: 70,  display: 'ДСО/ПП', type: 'signal-arrow' },
]

const switches: StationDef['switches'] = [
  { name: '2-4ПК', display: '+',  colorType: 'green',  sigLeft: 20,  sigTop: 470,  labelLeft: 25,  labelTop: 450 },
  { name: '2-4МК', display: '-',  colorType: 'yellow', sigLeft: 70,  sigTop: 470,  labelLeft: 75,  labelTop: 450 },
  { name: '6ПК',   display: '+',  colorType: 'green',  sigLeft: 160, sigTop: 470,  labelLeft: 165, labelTop: 450 },
  { name: '6МК',   display: '-',  colorType: 'yellow', sigLeft: 210, sigTop: 470,  labelLeft: 215, labelTop: 450 },
  { name: '1ПК',  display: '+',  colorType: 'green',  sigLeft: 1640,sigTop: 470,  labelLeft: 1645,labelTop: 450 },
  { name: '1МК',  display: '-',  colorType: 'yellow', sigLeft: 1690,sigTop: 470,  labelLeft: 1695,labelTop: 450 },
  { name: '5ПК',  display: '+',  colorType: 'green',  sigLeft: 1770,sigTop: 470,  labelLeft: 1775,labelTop: 450 },
  { name: '5МК',  display: '-',  colorType: 'yellow', sigLeft: 1820,sigTop: 470,  labelLeft: 1825,labelTop: 450 },
]

const switchLabels: StationDef['switchLabels'] = [
  { text: '2-4', left: 45,  top: 420 },
  { text: '6',   left: 185, top: 420 },
  { text: '1',   left: 1665, top: 420 },
  { text: '5',   left: 1795, top: 420 },
]

const sections: StationDef['sections'] = [
  { name: '2СП',    left: 450,  top: 100, label: '2СП' },
  { name: '1ЧП',    left: 70,   top: 100, label: '1ЧП' },
  { name: '1НП',    left: 1600, top: 100, label: '1НП' },
  { name: '2СП',    left: 460,  top: 145, label: '2' },
  { name: '1СП',    left: 1370, top: 145, label: '1' },
  { name: 'IП',     left: 900,  top: 100, label: 'IП' },
  { name: '1СП',    left: 1350, top: 100, label: '1СП' },
  { name: '4-6СП', left: 620,  top: 220, label: '4-6СП' },
  { name: '4-6СП', left: 585,  top: 220, label: '4' },
  { name: 'IIП',    left: 900,  top: 220, label: 'IIП' },
  { name: '3-5СП',  left: 1130, top: 220, label: '3-5СП' },
  { name: '3-5СП',  left: 1170, top: 270, label: '5' },
  { name: '4-6СП', left: 670,  top: 270, label: '6' },
  { name: 'IVП',    left: 900,  top: 345, label: 'IVП' },
]

const qorlitogStation: StationDef = {
  id: 'qorlitog',
  name: "Qorli Tog' stansiyasi",
  subtitle: "Monitoring va arxiv ko'rsatkichi",

  width: 1920,
  height: 560,

  leftLabel: 'Buxoro tomoni',
  rightLabel: 'Miskent tomoni',
  leftLabelX: 140,
  rightLabelX: 240,

  layoutReady: true,

  archiveMarker: { left: '50%', transform: 'translateX(-50%)' },

  tracks,
  izostik: [],
  crossings: [],
  signals,
  switches,
  switchLabels,
  sections,

  trackCount: 8,

  voltageSections: [
    '1ЧП', '2СП', 'IП', '1СП', '1НП',
    '4-6СП', 'IIП', '3-5СП', 'IVП',
  ],

  devices: ['esp32-1', 'esp32-2', 'esp32-3', 'esp32-4', 'esp32-5'],
}

export default qorlitogStation
