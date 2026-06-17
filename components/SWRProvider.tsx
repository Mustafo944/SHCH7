'use client';

import { SWRConfig } from 'swr';

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig 
      value={{ 
        revalidateOnFocus: false,
        revalidateIfStale: false, // optional: prevents revalidation on mount if data exists
      }}
    >
      {children}
    </SWRConfig>
  );
}
