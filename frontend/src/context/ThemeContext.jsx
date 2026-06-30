import React, { createContext, useContext } from 'react';

const ThemeContext = createContext(null);

export const useTheme = () => {
  return { theme: 'light', toggleTheme: () => {} };
};

export const ThemeProvider = ({ children }) => {
  return (
    <ThemeContext.Provider value={{ theme: 'light', toggleTheme: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
};
