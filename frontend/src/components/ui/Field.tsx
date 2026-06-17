import type { ReactNode } from 'react';

export const inputClass =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink focus:border-accent focus:outline-none';

export function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`text-sm ${className}`}>
      <span className="mb-1 block font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
