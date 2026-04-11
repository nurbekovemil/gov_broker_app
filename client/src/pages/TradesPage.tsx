import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { tradesApi } from '../api';
import type { Trade } from '../types';
import { fmt, fmtDateTime } from '../utils/format';
import Spinner from '../components/Spinner';
import { useAuthStore } from '../store/auth';

export default function TradesPage() {
  const { user } = useAuthStore();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tradesApi.list()
      .then(({ data }) => setTrades(data))
      .catch(() => toast.error('Ошибка загрузки сделок'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center h-64 items-center"><Spinner size="lg" /></div>;

  const isAdmin = user?.role === 'admin';

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{isAdmin ? 'Все сделки' : 'Мои сделки'}</h1>
        <p className="text-sm text-gray-500 mt-1">Журнал операций — {trades.length} записей</p>
      </div>

      {trades.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">Нет сделок</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-th">Дата/Время</th>
                  {isAdmin && <th className="table-th">Инвестор</th>}
                  <th className="table-th">ISIN</th>
                  <th className="table-th">Тип</th>
                  <th className="table-th text-right">Кол-во</th>
                  <th className="table-th text-right">Цена</th>
                  <th className="table-th text-right">НКД</th>
                  <th className="table-th text-right">Итого</th>
                  {isAdmin && <th className="table-th text-right">Маржа</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {trades.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="table-td text-xs text-gray-500">{fmtDateTime(t.created_at)}</td>
                    {isAdmin && (
                      <td className="table-td">
                        <div className="text-sm font-medium">{t.investor_name}</div>
                        <div className="text-xs text-gray-500">{t.investor_email}</div>
                      </td>
                    )}
                    <td className="table-td">
                      <div className="font-medium">{t.isin}</div>
                      <div className="text-xs text-gray-500">{t.bond_name}</div>
                    </td>
                    <td className="table-td">
                      <span className={`badge ${t.trade_type === 'buy' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {t.trade_type === 'buy' ? 'Покупка' : 'Продажа'}
                      </span>
                    </td>
                    <td className="table-td text-right">{t.quantity}</td>
                    <td className="table-td text-right">{fmt(t.price_per_bond)}</td>
                    <td className="table-td text-right text-gray-500">{fmt(t.nkd_per_bond)}</td>
                    <td className="table-td text-right font-semibold">{fmt(t.total_amount)}</td>
                    {isAdmin && (
                      <td className="table-td text-right text-brand-600 font-semibold">{fmt(t.broker_margin)}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
