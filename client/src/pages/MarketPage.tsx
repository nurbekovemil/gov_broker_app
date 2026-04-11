import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { bondsApi } from '../api';
import type { Bond } from '../types';
import { fmt, fmtPct, fmtDate } from '../utils/format';
import { usePricesUpdated } from '../hooks/useSocket';
import DealModal from '../components/DealModal';
import Spinner from '../components/Spinner';
import { useAuthStore } from '../store/auth';

export default function MarketPage() {
  const { user } = useAuthStore();
  const [bonds, setBonds] = useState<Bond[]>([]);
  const [loading, setLoading] = useState(true);
  const [deal, setDeal] = useState<{ bond: Bond; mode: 'buy' | 'sell' } | null>(null);

  const fetchBonds = useCallback(async () => {
    try {
      const { data } = await bondsApi.list();
      setBonds(data);
    } catch {
      toast.error('Ошибка загрузки витрины');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBonds(); }, [fetchBonds]);

  usePricesUpdated((updatedBond) => {
    setBonds((prev) =>
      prev.map((b) => {
        if (b.id !== updatedBond.id) return b;
        // Server emits merged object with both snake_case and numeric keys
        const raw = updatedBond as Bond & Record<string, unknown>;
        return {
          ...b,
          ytm: String(raw.ytm ?? b.ytm),
          ask_price: String(raw.ask_price ?? b.ask_price),
          bid_price: String(raw.bid_price ?? b.bid_price),
          dirty_price: String(raw.dirty_price ?? b.dirty_price),
          clean_price: String(raw.clean_price ?? b.clean_price),
          price_date: String(raw.price_date ?? b.price_date),
        };
      }),
    );
    toast('Цены обновлены', { icon: '📊' });
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Витрина ГЦБ</h1>
        <p className="text-sm text-gray-500 mt-1">Котировки обновляются в реальном времени</p>
      </div>

      {bonds.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">Нет доступных ценных бумаг</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">ISIN / Название</th>
                <th className="table-th">Купон</th>
                <th className="table-th">YTM</th>
                <th className="table-th">Дата погашения</th>
                <th className="table-th text-right">Bid</th>
                <th className="table-th text-right">Ask</th>
                <th className="table-th text-right">НКД</th>
                {user?.role === 'investor' && <th className="table-th"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bonds.map((bond) => {
                const nkd = parseFloat(bond.dirty_price ?? '0') - parseFloat(bond.clean_price ?? '0');
                return (
                  <tr key={bond.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td">
                      <div className="font-medium text-gray-900">{bond.isin}</div>
                      <div className="text-xs text-gray-500">{bond.name}</div>
                    </td>
                    <td className="table-td">{fmtPct(parseFloat(bond.coupon_rate) * 100)}</td>
                    <td className="table-td">
                      {bond.ytm ? (
                        <span className="badge bg-blue-100 text-blue-700">
                          {fmtPct(parseFloat(bond.ytm) * 100)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="table-td">{fmtDate(bond.maturity_date)}</td>
                    <td className="table-td text-right">
                      <span className="text-emerald-700 font-semibold">
                        {bond.bid_price ? fmt(bond.bid_price) : '—'}
                      </span>
                    </td>
                    <td className="table-td text-right">
                      <span className="text-red-600 font-semibold">
                        {bond.ask_price ? fmt(bond.ask_price) : '—'}
                      </span>
                    </td>
                    <td className="table-td text-right text-gray-500">{fmt(nkd)}</td>
                    {user?.role === 'investor' && (
                      <td className="table-td">
                        <div className="flex gap-2 justify-end">
                          <button
                            className="btn-success text-xs px-3 py-1.5"
                            onClick={() => setDeal({ bond, mode: 'buy' })}
                            disabled={!bond.ask_price}
                          >
                            Купить
                          </button>
                          <button
                            className="btn-danger text-xs px-3 py-1.5"
                            onClick={() => setDeal({ bond, mode: 'sell' })}
                            disabled={!bond.bid_price}
                          >
                            Продать
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {deal && (
        <DealModal
          bond={deal.bond}
          mode={deal.mode}
          onClose={() => setDeal(null)}
          onSuccess={() => setDeal(null)}
        />
      )}
    </div>
  );
}
