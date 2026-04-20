'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const UIPickerContext = createContext(null);

export function UIPickerProvider({
  children,
  storageKey = 'ui-picker',
  defaultVariant = 'a',
}) {
  const [selected, setSelectedState] = useState(defaultVariant);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) setSelectedState(stored);
    } catch {}
  }, [storageKey]);

  const setSelected = useCallback(
    (variant) => {
      setSelectedState(variant);
      try {
        localStorage.setItem(storageKey, variant);
      } catch {}
    },
    [storageKey],
  );

  const value = useMemo(
    () => ({ selected, setSelected, storageKey }),
    [selected, setSelected, storageKey],
  );

  return <UIPickerContext.Provider value={value}>{children}</UIPickerContext.Provider>;
}

export function useUIPicker() {
  const ctx = useContext(UIPickerContext);
  if (!ctx) throw new Error('useUIPicker must be used inside UIPickerProvider');
  return ctx;
}
