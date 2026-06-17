import type { ReactNode } from 'react';

export function Pill({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'accent';
}) {
  const tones = {
    neutral: 'bg-paper text-muted border-line',
    accent: 'bg-accent-soft text-accent border-transparent',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
