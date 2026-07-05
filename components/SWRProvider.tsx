'use client';

import { SWRConfig } from 'swr';

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig 
      value={{
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        // Bir xil kalit bo'yicha 5s ichidagi takroriy so'rovlar birlashtiriladi.
        // Fokus almashganda va bir necha komponent bir manbani so'raganda
        // ortiqcha tarmoq yukini kamaytiradi (natija o'zgarmaydi).
        dedupingInterval: 5000,
        keepPreviousData: true,
      }}
    >
      {children}
    </SWRConfig>
  );
}
