import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { fetchUserMemory, analyzeUserMemory, shouldRefreshMemory, clearUserMemory } from '../lib/memory';

const MemoryContext = createContext(null);

export const MemoryProvider = ({ children }) => {
  const { user } = useAuth();
  const [memory, setMemory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  // Load memory when user signs in
  useEffect(() => {
    if (user) {
      loadMemory();
    } else {
      setMemory(null);
    }
  }, [user?.id]);

  const loadMemory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchUserMemory();
      setMemory(data);

      // Check if we should auto-refresh
      const needsRefresh = await shouldRefreshMemory(data);
      if (needsRefresh) {
        refreshMemory();
      }
    } catch (error) {
      console.error('Error loading memory:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshMemory = useCallback(async () => {
    if (analyzing) return;
    setAnalyzing(true);
    try {
      const result = await analyzeUserMemory();
      if (result?.preferences) {
        // Reload from DB to get the full record
        const data = await fetchUserMemory();
        setMemory(data);
      }
    } catch (error) {
      console.error('Error refreshing memory:', error);
    } finally {
      setAnalyzing(false);
    }
  }, [analyzing]);

  const clearMemory = useCallback(async () => {
    await clearUserMemory();
    setMemory(null);
  }, []);

  return (
    <MemoryContext.Provider
      value={{
        memory,
        loading,
        analyzing,
        refreshMemory,
        clearMemory,
      }}
    >
      {children}
    </MemoryContext.Provider>
  );
};

export const useMemory = () => {
  const context = useContext(MemoryContext);
  if (!context) {
    throw new Error('useMemory must be used within a MemoryProvider');
  }
  return context;
};
