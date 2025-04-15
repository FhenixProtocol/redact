import { useEffect, useState } from "react";

export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    // Always return 'light' during SSR
    if (typeof window === "undefined") return "light";

    // Get saved theme from localStorage
    const savedTheme = localStorage.getItem("theme");
    console.log("Initial savedTheme:", savedTheme);

    // If there's a saved theme, use it
    if (savedTheme === "light" || savedTheme === "dark") {
      console.log("Using saved theme:", savedTheme);
      return savedTheme;
    }

    // TODO: Enable after dark mode is implemented
    // If no saved theme, use system preference
    // const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    // const systemTheme = prefersDark ? 'dark' : 'light';
    // console.log('Using system theme:', systemTheme);

    // // Save the system preference
    // localStorage.setItem('theme', systemTheme);
    // return systemTheme;
    return "light";
  });

  // Synchronize theme changes with document and localStorage
  useEffect(() => {
    console.log("Theme changed to:", theme);
    document.documentElement.className = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  return { theme, setTheme };
}
