import React, { createContext, useState, useContext, useCallback } from 'react';

const CommandPaletteContext = createContext();

export const useCommandPalette = () => {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error('useCommandPalette must be used within a CommandPaletteProvider');
  }
  return context;
};

export const CommandPaletteProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [commands, setCommands] = useState([]);

  const registerCommand = useCallback((command) => {
    setCommands(prev => [...prev, command]);
    return () => {
      setCommands(prev => prev.filter(cmd => cmd.id !== command.id));
    };
  }, []);

  const executeCommand = useCallback((commandId) => {
    const command = commands.find(cmd => cmd.id === commandId);
    if (command && command.action) {
      command.action();
      setIsOpen(false);
    }
  }, [commands]);

  const openCommandPalette = useCallback(() => setIsOpen(true), []);
  const closeCommandPalette = useCallback(() => setIsOpen(false), []);
  const toggleCommandPalette = useCallback(() => setIsOpen(prev => !prev), []);

  const value = {
    isOpen,
    commands,
    registerCommand,
    executeCommand,
    openCommandPalette,
    closeCommandPalette,
    toggleCommandPalette
  };

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
    </CommandPaletteContext.Provider>
  );
};

export default CommandPaletteContext;