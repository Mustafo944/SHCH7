'use client';

import { SWRConfig } from 'swr';

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig 
      value={{
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        // Bir xil kalit bo'yicha 30s ichidagi takroriy so'rovlar birlashtiriladi.
        // Sxemalar orasida tez-tez o'tganda qayta yuklanishning oldini oladi.
        dedupingInterval: 30000,
        keepPreviousData: true,
      }}
    >
      {children}
    </SWRConfig>
  );
}
