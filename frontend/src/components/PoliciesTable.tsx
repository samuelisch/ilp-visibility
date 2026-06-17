import type { PolicyListItem } from '../types/policy';
import { formatPremiumType, formatProductSubtext } from '../lib/format';

interface PoliciesTableProps {
  policies: PolicyListItem[];
  onRowClick: (id: number) => void;
}

// Pure presentational table. Receives already-filtered, already-sorted rows;
// owns no fetching or filter/sort state (that lives in the page container).
export function PoliciesTable({ policies, onRowClick }: PoliciesTableProps) {
  return (
    <table className="w-full border-collapse text-left text-sm">
      <thead>
        <tr className="border-b border-gray-200 text-xs font-medium tracking-wide text-gray-500 uppercase">
          <th className="px-4 py-3">Policy product</th>
          <th className="px-4 py-3">Insurer</th>
          <th className="px-4 py-3">Premium type</th>
        </tr>
      </thead>
      <tbody>
        {policies.map((policy) => (
          <tr
            key={policy.id}
            role="button"
            tabIndex={0}
            onClick={() => onRowClick(policy.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onRowClick(policy.id);
              }
            }}
            className="cursor-pointer border-b border-gray-100 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
          >
            <td className="px-4 py-3">
              <div className="font-medium text-gray-900">{policy.name}</div>
              <div className="text-xs text-gray-500">{formatProductSubtext(policy)}</div>
            </td>
            <td className="px-4 py-3 text-gray-700">{policy.provider.name}</td>
            <td className="px-4 py-3 text-gray-700">
              {formatPremiumType(policy.paymentTermYears)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
