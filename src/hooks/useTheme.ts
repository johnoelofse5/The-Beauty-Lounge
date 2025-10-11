'use client'

import { useState, useEffect } from 'react';
import { getTheme, setTheme, applyTheme, getEffectiveTheme, type Theme } from '@/lib/theme-utils';

/**
 * React hook for theme management
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('system');
  const [mounted, setMounted] = useState(false);

  // Initialize theme on mount
  useEffect(() => {
    const currentTheme = getTheme();
    setThemeState(currentTheme);
    applyTheme(currentTheme);
    setMounted(true);
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    if (!mounted) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, mounted]);

  const updateTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    updateTheme(newTheme);
    return newTheme;
  };

  const effectiveTheme = getEffectiveTheme();

  return {
    theme,
    setTheme: updateTheme,
    toggleTheme,
    effectiveTheme,
    mounted
  };
}
