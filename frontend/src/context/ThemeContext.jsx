import React, { createContext, useContext, useState, useEffect } from 'react';

// Función para calcular automáticamente si un color requiere texto claro u oscuro (WCAG Luminance)
export const getContrastTextColor = (hexColor) => {
  if (!hexColor || typeof hexColor !== 'string') return '#FFFFFF';
  try {
    let cleanHex = hexColor.replace('#', '').trim();
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split('').map(c => c + c).join('');
    }
    if (cleanHex.length !== 6) return '#FFFFFF';
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return '#FFFFFF';
    
    // Fórmula YIQ estándar
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 150 ? '#000000' : '#FFFFFF';
  } catch {
    return '#FFFFFF';
  }
};

const defaultTheme = {
  primaryColor: '#DEB841',
  secondaryColor: '#b08d2b',
  textColor: '#FFFFFF',
  buttonStyle: 'gradient', // 'gradient' | 'solid'
  logoUrl: 'https://i.imgur.com/0z5756T.png',
  tenantName: 'Studio 5'
};

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    try {
      const saved = localStorage.getItem('studio5_theme_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...defaultTheme, ...parsed };
      }
      return defaultTheme;
    } catch {
      return defaultTheme;
    }
  });

  const applyThemeToCSS = (themeData) => {
    try {
      const data = themeData || defaultTheme;
      const root = document.documentElement;
      const primary = (typeof data.primaryColor === 'string' && data.primaryColor) ? data.primaryColor : defaultTheme.primaryColor;
      const secondary = (typeof data.secondaryColor === 'string' && data.secondaryColor) ? data.secondaryColor : defaultTheme.secondaryColor;
      const buttonStyle = data.buttonStyle || 'gradient';
      const btnTextColor = getContrastTextColor(primary);
      const titleTextColor = (typeof data.textColor === 'string' && data.textColor) ? data.textColor : '#FFFFFF';
      const logoUrl = (typeof data.logoUrl === 'string' && data.logoUrl) ? data.logoUrl : defaultTheme.logoUrl;

      root.style.setProperty('--primary-color', primary);
      root.style.setProperty('--accent', primary);
      root.style.setProperty('--accent-glow', `${primary}55`);
      root.style.setProperty('--secondary-color', secondary);
      root.style.setProperty('--accent-secondary', secondary);
      root.style.setProperty('--btn-text-color', btnTextColor);
      root.style.setProperty('--title-text-color', titleTextColor);
      root.style.setProperty('--btn-bg', buttonStyle === 'solid' ? primary : `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`);
      root.style.setProperty('--logo-url', `url("${logoUrl}")`);
    } catch (err) {
      console.warn('Error applying theme:', err);
    }
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
