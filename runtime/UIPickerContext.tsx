'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type UIPickerValue = {
  selected: string;
  setSelected: (variant: string) => void;
  storageKey: string;
};

const UIPickerContext = createContext<UIPickerValue | null>(null);

type ProviderProps = {
  children: ReactNode;
  storageKey?: string;
  defaultVariant?: string;
};

export function UIPickerProvider({
  children,
  storageKey = 'ui-picker',
  defaultVariant = 'a',
}: ProviderProps) {
  const [selected, setSelectedState] = useState<string>(defaultVariant);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) setSelectedState(stored);
    } catch {}
  }, [storageKey]);

  const setSelected = useCallback(
    (variant: string) => {
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
