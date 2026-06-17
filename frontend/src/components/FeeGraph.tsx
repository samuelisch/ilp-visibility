import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceArea,
  ResponsiveContainer,
} from 'recharts';
import type { YearRow } from '../lib/illustration';

const money = (v: number) => `$${Math.round(v).toLocaleString()}`;

export function FeeGraph({ rows, mipYears }: { rows: YearRow[]; mipYears: number | null }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
        {mipYears != null && (
          <ReferenceArea x1={1} x2={mipYears} fill="#3b82f6" fillOpacity={0.06} />
        )}
        <XAxis dataKey="year" tick={{ fontSize: 11 }} />
        <YAxis
          tick={{ fontSize: 11 }}
          width={64}
          tickFormatter={(v) => `$${Math.round(v / 1000)}k`}
        />
        <Tooltip formatter={(v: number) => money(v)} labelFormatter={(y) => `Year ${y}`} />
        <Legend />
        <Line
          type="monotone"
          dataKey="premiumsPaid"
          name="Premiums paid"
          stroke="#94a3b8"
          strokeDasharray="4 3"
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="grossValue"
          name="Gross (no fees)"
          stroke="#9ca3af"
          strokeDasharray="6 3"
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="netValue"
          name="Net (after fees)"
          stroke="#2563eb"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
