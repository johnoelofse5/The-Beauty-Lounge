'use client'

import { useEffect } from 'react';
import { initializeTheme } from '@/lib/theme-utils';

/**
 * Theme provider component that initializes theme on app load
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initializeTheme();
  }, []);

  return <>{children}</>;
}
