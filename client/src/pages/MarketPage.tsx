import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { FileText } from 'lucide-react';
import { bondsApi } from '../api';
import type { Bond } from '../types';
import { fmt, fmtInt, fmtPct, fmtDate } from '../utils/format';
import { usePricesUpdated } from '../hooks/useSocket';
import DealModal from '../components/DealModal';
import Spinner from '../components/Spinner';
import { useAuthStore } from '../store/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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

  useEffect(() => {
    void fetchBonds();
  }, [fetchBonds]);

  usePricesUpdated((updatedBond) => {
    setBonds((prev) =>
      prev.map((b) => {
        if (b.id !== updatedBond.id) return b;
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
        <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">Витрина ГЦБ</h1>
        <p className="text-[0.9375rem] text-muted-foreground mt-2">Котировки обновляются в реальном времени</p>
      </div>

      {bonds.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center text-muted-foreground text-[0.9375rem]">Нет доступных ценных бумаг</CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ISIN / Название</TableHead>
                  <TableHead>Купон</TableHead>
                  <TableHead>Частота купона</TableHead>
                  <TableHead>YTM</TableHead>
                  <TableHead>Дата погашения</TableHead>
                  <TableHead className="text-right">Купля</TableHead>
                  <TableHead className="text-right">Продажа</TableHead>
                  <TableHead className="text-right">НКД (сом)</TableHead>
                  <TableHead className="text-right">Доступно</TableHead>
                  {user?.role === 'investor' && <TableHead className="w-[220px]" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {bonds.map((bond) => {
                  const nkd = parseFloat(bond.dirty_price ?? '0') - parseFloat(bond.clean_price ?? '0');
                  return (
                    <TableRow key={bond.id}>
                      <TableCell>
                        <div className="font-medium flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          {bond.isin}
                        </div>
                        <div className="text-sm text-muted-foreground">{bond.name}</div>
                      </TableCell>
                      <TableCell>{fmtPct(parseFloat(bond.coupon_rate) * 100)}</TableCell>
                      <TableCell>{bond.coupon_frequency ? `${fmtInt(bond.coupon_frequency)} раз/год` : '—'}</TableCell>
                      <TableCell>{bond.ytm ? fmtPct(parseFloat(bond.ytm) * 100) : '—'}</TableCell>
                      <TableCell>{fmtDate(bond.maturity_date)}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-700">
                        {bond.bid_price ? fmt(bond.bid_price) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-red-600">
                        {bond.ask_price ? fmt(bond.ask_price) : '—'}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{fmt(nkd)}</TableCell>
                      <TableCell className="text-right font-medium">{fmtInt(bond.available_quantity ?? 0)}</TableCell>
                      {user?.role === 'investor' && (
                        <TableCell>
                          <div className="flex gap-2 justify-end">
                            <Button
                              className="bg-emerald-600 px-4 text-base hover:bg-emerald-700"
                              onClick={() => setDeal({ bond, mode: 'buy' })}
                              disabled={!bond.ask_price || (bond.available_quantity ?? 0) <= 0}
                            >
                              Купить
                            </Button>
                            <Button
                              variant="destructive"
                              className="px-4 text-base"
                              onClick={() => setDeal({ bond, mode: 'sell' })}
                              disabled={!bond.bid_price}
                            >
                              Продать
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {deal && (
        <DealModal
          key={`${deal.bond.id}-${deal.mode}`}
          bond={deal.bond}
          mode={deal.mode}
          onClose={() => setDeal(null)}
          onSuccess={() => {
            void fetchBonds();
            setDeal(null);
          }}
        />
      )}
    </div>
  );
}
