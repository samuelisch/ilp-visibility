import type { ReactNode } from 'react';

export function Card({
  children,
  interactive = false,
  className = '',
}: {
  children: ReactNode;
  interactive?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-line bg-surface p-5 shadow-sm ${
        interactive ? 'transition duration-200 hover:-translate-y-0.5 hover:shadow-md' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
