import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { reportsApi } from '../api';
import type { BalanceReport } from '../types';
import { fmt } from '../utils/format';
import Spinner from '../components/Spinner';

export default function BalancesPage() {
  const [data, setData] = useState<BalanceReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportsApi.balances()
      .then(({ data }) => setData(data))
      .catch(() => toast.error('Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center h-64 items-center"><Spinner size="lg" /></div>;

  const totalValue = data.reduce((s, r) => s + parseFloat(r.current_value ?? '0'), 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Реестр остатков клиентов</h1>
        <p className="text-sm text-gray-500 mt-1">Суммарная стоимость портфелей: <strong>{fmt(totalValue)} сом</strong></p>
      </div>

      {data.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">Нет данных</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Инвестор</th>
                <th className="table-th">ISIN</th>
                <th className="table-th text-right">Кол-во</th>
                <th className="table-th text-right">Ср. цена</th>
                <th className="table-th text-right">Тек. стоимость</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="table-td">
                    <div className="font-medium">{row.full_name}</div>
                    <div className="text-xs text-gray-500">{row.email}</div>
                  </td>
                  <td className="table-td">
                    <div className="font-medium">{row.isin}</div>
                    <div className="text-xs text-gray-500">{row.bond_name}</div>
                  </td>
                  <td className="table-td text-right">{row.quantity}</td>
                  <td className="table-td text-right">{fmt(row.avg_price)}</td>
                  <td className="table-td text-right font-semibold">{fmt(row.current_value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
