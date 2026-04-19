'use client';

import { useEffect, useRef } from 'react';
import './ui-picker.js';
import { useUIPicker } from './UIPickerContext';

export type Variant = { id: string; name: string };

type Props = {
  variants: Variant[];
  label: string;
};

type UIPickerElement = HTMLElement & { value: string };

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'ui-picker': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        'data-variants'?: string;
        'data-label'?: string;
        'data-storage-key'?: string;
      };
    }
  }
}

export function UIPickerOverlay({ variants, label }: Props) {
  const { selected, setSelected, storageKey } = useUIPicker();
  const ref = useRef<UIPickerElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string }>).detail;
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
      ref={ref as React.Ref<HTMLElement>}
      data-variants={JSON.stringify(variants)}
      data-label={label}
      data-storage-key={storageKey}
    />
  );
}
