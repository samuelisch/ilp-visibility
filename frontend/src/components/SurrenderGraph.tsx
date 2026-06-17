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

export function SurrenderGraph({ rows, mipYears }: { rows: YearRow[]; mipYears: number | null }) {
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
        <Tooltip
          formatter={(v: number) => `$${Math.round(v).toLocaleString()}`}
          labelFormatter={(y) => `Year ${y}`}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="netValue"
          name="Net value"
          stroke="#2563eb"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="surrenderFee"
          name="Surrender fee ($)"
          stroke="#d97706"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
