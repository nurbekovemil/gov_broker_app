import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { bondsApi, reportsApi } from '../api';
import type { Bond, MarginReport, Summary } from '../types';
import { fmt, fmtPct, fmtDate, fmtDateTime } from '../utils/format';
import Spinner from '../components/Spinner';
import AddBondModal from '../components/AddBondModal';
import YtmModal from '../components/YtmModal';

export default function AdminPage() {
  const [bonds, setBonds] = useState<Bond[]>([]);
  const [margin, setMargin] = useState<MarginReport[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'bonds' | 'margin'>('bonds');
  const [showAddBond, setShowAddBond] = useState(false);
  const [ytmBond, setYtmBond] = useState<Bond | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [b, m, s] = await Promise.all([
        bondsApi.list(),
        reportsApi.margin(),
        reportsApi.summary(),
      ]);
      setBonds(b.data);
      setMargin(m.data);
      setSummary(s.data);
    } catch {
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDeactivate = async (id: string) => {
    if (!confirm('Деактивировать облигацию?')) return;
    try {
      await bondsApi.deactivate(id);
      toast.success('Облигация деактивирована');
      fetchData();
    } catch {
      toast.error('Ошибка');
    }
  };

  if (loading) return <div className="flex justify-center h-64 items-center"><Spinner size="lg" /></div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Панель администратора</h1>
        <button className="btn-primary" onClick={() => setShowAddBond(true)}>+ Добавить ГЦБ</button>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <StatCard label="Сделок сегодня" value={summary.todayTrades.count ?? '0'} />
          <StatCard label="Объём сегодня" value={`${fmt(summary.todayTrades.volume ?? 0)} сом`} />
          <StatCard label="Маржа всего" value={`${fmt(summary.totalMargin)} сом`} highlight />
          <StatCard label="Активных ГЦБ" value={summary.activeBonds} />
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          {(['bonds', 'margin'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'bonds' ? 'Облигации' : 'Ведомость маржи'}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'bonds' && (
        <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">ISIN / Название</th>
                <th className="table-th">Купон</th>
                <th className="table-th">Номинал</th>
                <th className="table-th">Погашение</th>
                <th className="table-th text-right">YTM</th>
                <th className="table-th text-right">Ask / Bid</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bonds.map((bond) => (
                <tr key={bond.id} className="hover:bg-gray-50">
                  <td className="table-td">
                    <div className="font-medium">{bond.isin}</div>
                    <div className="text-xs text-gray-500">{bond.name}</div>
                  </td>
                  <td className="table-td">{fmtPct(parseFloat(bond.coupon_rate) * 100)}</td>
                  <td className="table-td">{fmt(bond.nominal)}</td>
                  <td className="table-td">{fmtDate(bond.maturity_date)}</td>
                  <td className="table-td text-right">
                    {bond.ytm ? (
                      <span className="badge bg-blue-100 text-blue-700">{fmtPct(parseFloat(bond.ytm) * 100)}</span>
                    ) : <span className="text-gray-400 text-xs">не задан</span>}
                  </td>
                  <td className="table-td text-right">
                    {bond.ask_price ? (
                      <div>
                        <span className="text-red-600">{fmt(bond.ask_price)}</span>
                        {' / '}
                        <span className="text-emerald-600">{fmt(bond.bid_price ?? 0)}</span>
                      </div>
                    ) : '—'}
                  </td>
                  <td className="table-td">
                    <div className="flex gap-2 justify-end">
                      <button className="btn-secondary text-xs px-2 py-1" onClick={() => setYtmBond(bond)}>
                        Задать YTM
                      </button>
                      <button className="btn-danger text-xs px-2 py-1" onClick={() => handleDeactivate(bond.id)}>
                        Деакт.
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'margin' && (
        <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Дата</th>
                <th className="table-th">ISIN</th>
                <th className="table-th text-right">Кол-во сделок</th>
                <th className="table-th text-right">Кол-во бумаг</th>
                <th className="table-th text-right">Объём</th>
                <th className="table-th text-right">Маржа</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {margin.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="table-td">{fmtDate(row.trade_date)}</td>
                  <td className="table-td">
                    <div className="font-medium">{row.isin}</div>
                    <div className="text-xs text-gray-500">{row.bond_name}</div>
                  </td>
                  <td className="table-td text-right">{row.trade_count}</td>
                  <td className="table-td text-right">{row.total_quantity}</td>
                  <td className="table-td text-right">{fmt(row.total_volume)}</td>
                  <td className="table-td text-right font-semibold text-brand-600">{fmt(row.total_margin)}</td>
                </tr>
              ))}
              {margin.length === 0 && (
                <tr><td colSpan={6} className="table-td text-center text-gray-400 py-8">Нет данных</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showAddBond && (
        <AddBondModal
          onClose={() => setShowAddBond(false)}
          onSuccess={() => { setShowAddBond(false); fetchData(); }}
        />
      )}
      {ytmBond && (
        <YtmModal
          bond={ytmBond}
          onClose={() => setYtmBond(null)}
          onSuccess={() => { setYtmBond(null); fetchData(); }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="card">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold mt-1 ${highlight ? 'text-brand-600' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}
