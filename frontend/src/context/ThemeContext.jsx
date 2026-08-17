import React, { createContext, useContext, useState, useEffect } from 'react';

const defaultTheme = {
  primaryColor: '#DEB841',
  secondaryColor: '#b08d2b',
  logoUrl: 'https://i.imgur.com/0z5756T.png',
  tenantName: 'Studio 5'
};

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    try {
      const saved = localStorage.getItem('studio5_theme_config');
      return saved ? JSON.parse(saved) : defaultTheme;
    } catch {
      return defaultTheme;
    }
  });

  const applyThemeToCSS = (themeData) => {
    const root = document.documentElement;
    const primary = themeData.primaryColor || defaultTheme.primaryColor;
    const secondary = themeData.secondaryColor || defaultTheme.secondaryColor;

    root.style.setProperty('--primary-color', primary);
    root.style.setProperty('--accent', primary);
    root.style.setProperty('--accent-glow', `${primary}55`);
    root.style.setProperty('--secondary-color', secondary);
    root.style.setProperty('--accent-secondary', secondary);
    root.style.setProperty('--logo-url', `url("${themeData.logoUrl || defaultTheme.logoUrl}")`);
  };

  useEffect(() => {
    applyThemeToCSS(theme);
  }, [theme]);

  const updateTheme = (newTheme) => {
    const merged = { ...theme, ...newTheme };
    setThemeState(merged);
    try {
      localStorage.setItem('studio5_theme_config', JSON.stringify(merged));
    } catch (e) {
      console.warn('Error saving theme to localStorage:', e);
    }
    applyThemeToCSS(merged);
  };

  const applyEventTheme = (eventThemeConfig) => {
    if (!eventThemeConfig) return;
    try {
      const parsed = typeof eventThemeConfig === 'string' ? JSON.parse(eventThemeConfig) : eventThemeConfig;
      if (parsed.primaryColor || parsed.logoUrl) {
        applyThemeToCSS({ ...theme, ...parsed });
      }
    } catch (e) {
      console.warn('Error applying event theme:', e);
    }
  };

  const resetTheme = () => {
    setThemeState(defaultTheme);
    localStorage.removeItem('studio5_theme_config');
    applyThemeToCSS(defaultTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, updateTheme, applyEventTheme, resetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe usarse dentro de un ThemeProvider');
  }
  return context;
};
