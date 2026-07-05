import sharp from 'sharp';
import { statSync } from 'fs';

const images = [
  { src: 'public/afrosiyob.png',  dst: 'public/afrosiyob.webp'  },
  { src: 'public/manguberdi.png', dst: 'public/manguberdi.webp' },
  { src: 'public/login-hero.png', dst: 'public/login-hero.webp' },
  { src: 'public/login2.jpg',     dst: 'public/login2.webp'     },
  { src: 'public/login.jpg',      dst: 'public/login.webp'      },
];

for (const { src, dst } of images) {
  // Maksimal 1920px — UI da bundan katta o'lcham kerak emas
  await sharp(src)
    .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82, effort: 6 })
    .toFile(dst);
  const oldKB = (statSync(src).size / 1024).toFixed(0);
  const newKB = (statSync(dst).size / 1024).toFixed(0);
  console.log(`${src}: ${oldKB}KB -> ${newKB}KB`);
}
