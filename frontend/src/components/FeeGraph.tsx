import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceArea,
  ResponsiveContainer,
} from 'recharts';
import { useReducedMotion } from 'motion/react';
import type { YearRow } from '../lib/illustration';
import { formatMoney } from '../lib/format';
import { useChartTooltipDismissal } from './useChartTooltipDismissal';

const axisTick = { fontSize: 11, fill: '#8c8279' };
const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e9e1d6',
  background: '#fffdf9',
  color: '#2a2521',
};

export function FeeGraph({ rows, mipYears }: { rows: YearRow[]; mipYears: number | null }) {
  const reduceMotion = useReducedMotion();
  const tooltip = useChartTooltipDismissal();
  return (
    <figure aria-describedby="fee-chart-instructions" onFocus={tooltip.enable}>
      <figcaption id="fee-chart-instructions" className="sr-only">
        Interactive line chart of premiums paid, gross value, and net value by policy year. Use a
        pointer or keyboard to inspect a year. The full values are also available in the
        year-by-year fees table below.
      </figcaption>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart
          accessibilityLayer
          data={rows}
          margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
          onMouseEnter={tooltip.enable}
          onTouchStart={tooltip.enable}
          onTouchEnd={tooltip.dismiss}
        >
          <CartesianGrid stroke="#e9e1d6" vertical={false} />
          {mipYears != null && (
            <ReferenceArea x1={1} x2={mipYears} fill="#c56b4a" fillOpacity={0.07} />
          )}
          <XAxis dataKey="year" tick={axisTick} stroke="#e9e1d6" />
          <YAxis
            tick={axisTick}
            stroke="#e9e1d6"
            width={64}
            tickFormatter={(v) => `$${Math.round(v / 1000)}k`}
          />
          <Tooltip
            active={tooltip.active}
            trigger="hover"
            formatter={(value) => formatMoney(value as number)}
            labelFormatter={(y) => `Year ${y}`}
            contentStyle={tooltipStyle}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="premiumsPaid"
            name="Premiums paid"
            stroke="#8c8279"
            strokeDasharray="4 3"
            dot={false}
            isAnimationActive={!reduceMotion}
            animationDuration={600}
          />
          <Line
            type="monotone"
            dataKey="grossValue"
            name="Gross (no fees)"
            stroke="#b9afa1"
            strokeDasharray="6 3"
            dot={false}
            isAnimationActive={!reduceMotion}
            animationDuration={600}
          />
          <Line
            type="monotone"
            dataKey="netValue"
            name="Net (after fees)"
            stroke="#2f6f6a"
            strokeWidth={2}
            dot={false}
            isAnimationActive={!reduceMotion}
            animationDuration={600}
          />
        </LineChart>
      </ResponsiveContainer>
    </figure>
  );
}
