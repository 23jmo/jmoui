'use client';

import { useEffect, useRef } from 'react';
import './ui-picker.js';
import { useUIPicker } from './UIPickerContext';

export function UIPickerOverlay({ variants, label }) {
  const { selected, setSelected, storageKey } = useUIPicker();
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onChange = (e) => {
      const detail = e.detail;
      if (detail?.id && detail.id !== selected) setSelected(detail.id);
    };
    el.addEventListener('variant-change', onChange);
    return () => el.removeEventListener('variant-change', onChange);
  }, [selected, setSelected]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.value !== selected) el.value = selected;
  }, [selected]);

  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <ui-picker
      ref={ref}
      data-variants={JSON.stringify(variants)}
      data-label={label}
      data-storage-key={storageKey}
    />
  );
}
