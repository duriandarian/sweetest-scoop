import { useEffect, useRef } from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import { CircleX } from 'lucide-react';

type EntryFieldProps = ComponentPropsWithoutRef<'input'> & {
  label: string; error?: string; inputTestId: string; errorTestId: string;
};

export function RoomEntryField({ label, error, inputTestId, errorTestId, ...input }: EntryFieldProps) {
  const field = useRef<HTMLDivElement>(null);
  const errorId = `${inputTestId}-error`;
  useEffect(() => {
    if (!error || !field.current) return;
    // If the browser has panned for the keyboard, reveal only what is hidden.
    const { top, bottom } = field.current.getBoundingClientRect();
    const visible = window.visualViewport;
    const viewportTop = visible?.offsetTop ?? 0;
    const headerBottom = field.current.closest('.home-forms-screen')?.querySelector('.g-bar')?.getBoundingClientRect().bottom ?? 0;
    const viewportBottom = viewportTop + (visible?.height ?? window.innerHeight);
    if (top < Math.max(viewportTop, headerBottom) || bottom > viewportBottom)
      field.current.scrollIntoView({ block: 'nearest' });
  }, [error]);
  return <div className="g-entry-field" ref={field}>
    <label htmlFor={inputTestId}>{label}</label>
    <input {...input} id={inputTestId} data-testid={inputTestId}
      aria-invalid={!!error} aria-describedby={error ? errorId : undefined}/>
    {error && <p className="g-feedback-coral" role="alert" id={errorId} data-testid={errorTestId}>
      <CircleX size={18} aria-hidden="true"/><span>{error}</span>
    </p>}
  </div>;
}

export function RoomNameField(props: Omit<EntryFieldProps, 'label'>) {
  return <RoomEntryField {...props} className="g-input" label="Display name" placeholder="Your name" maxLength={32} required/>;
}
