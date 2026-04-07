const fs = require('fs');
const logContent = fs.readFileSync('C:/Users/User/.gemini/antigravity/brain/5add05d1-ddb2-4cf3-a8c0-6e6ed400b82a/.system_generated/logs/overview.txt', 'utf8');

const yillikMatch = logContent.match(/export const YILLIK_REJA = \[(?:[^]*?)\];/g);
const haftalikMatch = logContent.match(/export const TORT_HAFTALIK_REJA = \[(?:[^]*?)\];/g);

if (yillikMatch && haftalikMatch) {
  // Get the last occurrences (the ones the user just sent)
  const yillik = yillikMatch[yillikMatch.length - 1];
  const haftalik = haftalikMatch[haftalikMatch.length - 1];

  const content = `export interface TaskItem {
  ish: string;
  davriylik: string;
  bajaruvchi: string;
  jurnal: string;
  nsh: string;
}

export interface BolimList {
  bolim: string;
  ishlar: TaskItem[];
}

${yillik.replace('export const YILLIK_REJA =', 'export const YILLIK_REJA: BolimList[] =')}

${haftalik.replace('export const TORT_HAFTALIK_REJA =', 'export const TORT_HAFTALIK_REJA: BolimList[] =')}
`;
  fs.writeFileSync('lib/reja-data.ts', content);
  console.log('Successfully wrote reja-data.ts');
} else {
  console.log('Could not find matches');
}
