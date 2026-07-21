import { useEffect, useRef, useState } from 'react';
import { Field, inputClass } from './ui/Field';

export function PremiumInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setDraft(String(value));
  }, [value]);

  return (
    <Field label={label} className="w-40">
      <input
        type="number"
        min={0}
        inputMode="decimal"
        value={draft}
        onFocus={() => {
          focused.current = true;
        }}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          onChange(next === '' ? 0 : Number(next) || 0);
        }}
        onBlur={() => {
          focused.current = false;
          const next = draft.trim() === '' ? '0' : draft;
          setDraft(next);
          onChange(next === '' ? 0 : Number(next) || 0);
        }}
        className={`${inputClass} tnum`}
      />
    </Field>
  );
}
