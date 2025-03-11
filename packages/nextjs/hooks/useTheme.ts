import { useState, useEffect } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    // Always return 'light' during SSR
    if (typeof window === 'undefined') return 'light';

    // Get saved theme from localStorage
    const savedTheme = localStorage.getItem('theme');

    // If there's a saved theme, use it
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }

    return 'light';
  });

  // Synchronize theme changes with document and localStorage
  useEffect(() => {
    document.documentElement.className = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  return { theme, setTheme };
} 