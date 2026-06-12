/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig, RuntimeCaching } from "serwist";
import { Serwist, NetworkFirst, CacheFirst, ExpirationPlugin } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Maxsus Supabase kesh strategiyalari
const supabaseCaching: RuntimeCaching[] = [
  // Supabase REST API (ma'lumotlar bazasi so'rovlari)
  // NetworkFirst - doim yangi ma'lumot olishga harakat qiladi, 
  // internet yo'q bo'lsa yoki sekin bo'lsa (3 soniyadan ko'p) keshni qaytaradi
  {
    matcher: ({ url }) => url.origin.includes('supabase.co') && url.pathname.includes('/rest/v1/'),
    handler: new NetworkFirst({
      cacheName: 'supabase-api-cache',
      networkTimeoutSeconds: 3,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 24 * 60 * 60, // 24 soat keshda saqlanadi
        }),
      ],
    }),
  },
  // Supabase Storage (rasmlar va sxemalar)
  // CacheFirst - avval keshdan qidiradi, bo'lmasa tarmoqdan yuklaydi
  {
    matcher: ({ url }) => url.origin.includes('supabase.co') && url.pathname.includes('/storage/v1/object/public/'),
    handler: new CacheFirst({
      cacheName: 'supabase-storage-cache',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 300,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 yil
        }),
      ],
    }),
  }
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  // Bizning strategiyalarimiz birinchi navbatda tekshiriladi
  runtimeCaching: [...supabaseCaching, ...defaultCache],
});

serwist.addEventListeners();
