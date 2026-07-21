import { useEffect, useState } from 'react';

/**
 * Recharts' hover tooltip can remain active after a touch gesture ends. Keep the
 * tooltip hover-driven, but explicitly suppress it until the next interaction.
 */
export function useChartTooltipDismissal() {
  const [active, setActive] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const dismiss = () => setActive(false);
    window.addEventListener('touchend', dismiss, { passive: true });
    window.addEventListener('touchcancel', dismiss, { passive: true });

    return () => {
      window.removeEventListener('touchend', dismiss);
      window.removeEventListener('touchcancel', dismiss);
    };
  }, []);

  return {
    active,
    enable: () => setActive(undefined),
    dismiss: () => setActive(false),
  };
}
