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

export function SurrenderGraph({ rows, mipYears }: { rows: YearRow[]; mipYears: number | null }) {
  const reduceMotion = useReducedMotion();
  const tooltip = useChartTooltipDismissal();
  return (
    <figure aria-describedby="surrender-chart-instructions" onFocus={tooltip.enable}>
      <figcaption id="surrender-chart-instructions" className="sr-only">
        Interactive line chart of net value and surrender fee by policy year. Use a pointer or
        keyboard to inspect a year. The full values are also available in the surrender charge by
        year table below.
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
            formatter={(v) => formatMoney(v as number)}
            labelFormatter={(y) => `Year ${y}`}
            contentStyle={tooltipStyle}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="netValue"
            name="Net value"
            stroke="#2f6f6a"
            strokeWidth={2}
            dot={false}
            isAnimationActive={!reduceMotion}
            animationDuration={600}
          />
          <Line
            type="monotone"
            dataKey="surrenderFee"
            name="Surrender fee ($)"
            stroke="#c56b4a"
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
