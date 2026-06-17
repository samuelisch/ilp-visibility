import type { ButtonHTMLAttributes } from 'react';

export function Button({
  variant = 'solid',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'solid' | 'ghost' }) {
  const v = {
    solid: 'bg-accent text-white hover:opacity-90',
    ghost: 'border border-line text-ink hover:bg-paper',
  };
  return (
    <button
      className={`rounded-lg px-3 py-2 text-sm font-medium transition ${v[variant]} ${className}`}
      {...props}
    />
  );
}
