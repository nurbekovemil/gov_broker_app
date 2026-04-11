import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { portfolioApi } from '../api';
import type { PortfolioItem } from '../types';
import { fmt, fmtPct, fmtDate } from '../utils/format';
import Spinner from '../components/Spinner';

export default function PortfolioPage() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portfolioApi.list()
      .then(({ data }) => setItems(data))
      .catch(() => toast.error('Ошибка загрузки портфеля'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center h-64 items-center"><Spinner size="lg" /></div>;

  const totalValue = items.reduce((s, i) => s + i.quantity * parseFloat(i.current_price ?? i.avg_price), 0);
  const totalCost = items.reduce((s, i) => s + i.quantity * parseFloat(i.avg_price), 0);
  const pnl = totalValue - totalCost;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Мой портфель</h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <p className="text-sm text-gray-500">Текущая стоимость</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(totalValue)} сом</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Себестоимость</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(totalCost)} сом</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">П/У</p>
          <p className={`text-2xl font-bold mt-1 ${pnl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {pnl >= 0 ? '+' : ''}{fmt(pnl)} сом
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">В портфеле нет ценных бумаг</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">ISIN / Название</th>
                <th className="table-th">Купон</th>
                <th className="table-th">Погашение</th>
                <th className="table-th text-right">Кол-во</th>
                <th className="table-th text-right">Ср. цена</th>
                <th className="table-th text-right">Тек. цена</th>
                <th className="table-th text-right">Стоимость</th>
                <th className="table-th text-right">П/У</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => {
                const curPrice = parseFloat(item.current_price ?? item.avg_price);
                const avgPrice = parseFloat(item.avg_price);
                const value = item.quantity * curPrice;
                const cost = item.quantity * avgPrice;
                const itemPnl = value - cost;
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="table-td">
                      <div className="font-medium">{item.isin}</div>
                      <div className="text-xs text-gray-500">{item.bond_name}</div>
                    </td>
                    <td className="table-td">{fmtPct(parseFloat(item.coupon_rate) * 100)}</td>
                    <td className="table-td">{fmtDate(item.maturity_date)}</td>
                    <td className="table-td text-right font-medium">{item.quantity}</td>
                    <td className="table-td text-right">{fmt(avgPrice)}</td>
                    <td className="table-td text-right">{fmt(curPrice)}</td>
                    <td className="table-td text-right font-semibold">{fmt(value)}</td>
                    <td className={`table-td text-right font-semibold ${itemPnl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {itemPnl >= 0 ? '+' : ''}{fmt(itemPnl)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
