const fs = require('fs');
const tortJson = fs.readFileSync('tort.json', 'utf8');
const yillikJson = fs.readFileSync('yillik.json', 'utf8');

const code = `export interface TaskItem {
  ish: string;
  davriylik: string;
  bajaruvchi: string;
  jurnal: string;
  nsh: string;
}
export interface ParsedTaskItem extends TaskItem {
  manba: string;
  raqam: string;
}

export function parseTaskSource(nsh: string): { manba: string; raqam: string } {
  const value = (nsh || '').trim();

  if (!value) {
    return { manba: 'TEX-KARTA', raqam: '' };
  }

  if (value.startsWith('ESSO')) {
    return {
      manba: 'ESSO',
      raqam: value.replace(/^ESSO\\s*/i, '').trim(),
    };
  }

  if (value.startsWith('NSH-01')) {
    return {
      manba: 'NSH-01',
      raqam: value.replace(/^NSH-01\\s*/i, '').trim(),
    };
  }

  if (value.startsWith('NSH-17')) {
    return {
      manba: 'NSH-17',
      raqam: value.replace(/^NSH-17\\s*/i, '').trim(),
    };
  }

  if (/KSSP/i.test(value)) {
    return {
      manba: 'KSSP',
      raqam: value
        .replace(/^Tex\\.?karta\\s*/i, '')
        .replace(/^Tex-karta\\s*/i, '')
        .replace(/^Tex\\.karta\\s*/i, '')
        .replace(/^KSSP\\s*/i, '')
        .trim(),
    };
  }

  if (/Tex/i.test(value) || /№/.test(value)) {
    return {
      manba: 'TEX-KARTA',
      raqam: value
        .replace(/^Tex\\.?karta\\s*/i, '')
        .replace(/^Tex-karta\\s*/i, '')
        .replace(/^Tex\\.karta\\s*/i, '')
        .trim(),
    };
  }

  return { manba: 'BOSHQA', raqam: value };
}

export interface BolimList {
  bolim: string;
  ishlar: TaskItem[];
}

export const TORT_HAFTALIK_REJA: BolimList[] = ${tortJson};

export const YILLIK_REJA: BolimList[] = ${yillikJson};

export const YILLIK_REJA_FLAT: ParsedTaskItem[] = YILLIK_REJA.flatMap((bolim) =>
  bolim.ishlar.map((item) => {
    const parsed = parseTaskSource(item.nsh);
    return {
      ...item,
      manba: parsed.manba,
      raqam: parsed.raqam,
    };
  })
);

export const TORT_HAFTALIK_REJA_FLAT: ParsedTaskItem[] = TORT_HAFTALIK_REJA.flatMap((bolim) =>
  bolim.ishlar.map((item) => {
    const parsed = parseTaskSource(item.nsh);
    return {
      ...item,
      manba: parsed.manba,
      raqam: parsed.raqam,
    };
  })
);
`

fs.writeFileSync('lib/reja-data.ts', code, 'utf8');
console.log('Cleaned and rebuilt lib/reja-data.ts');
