import React, { createContext, useContext, useState, useEffect } from 'react';

const UnsavedChangesContext = createContext(null);

export function UnsavedChangesProvider({ children }) {
  const [isDirty, setIsDirty] = useState(false);

  // Catch browser refresh or tab close
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  return (
    <UnsavedChangesContext.Provider value={{ isDirty, setIsDirty }}>
      {children}
    </UnsavedChangesContext.Provider>
  );
}

export const useUnsavedChanges = () => {
  const context = useContext(UnsavedChangesContext);
  if (!context) throw new Error("useUnsavedChanges must be used within UnsavedChangesProvider");
  return context;
};
