import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { tradesApi } from '../api';
import type { Trade } from '../types';
import { fmt, fmtDateTime, fmtInt } from '../utils/format';
import Spinner from '../components/Spinner';
import { useAuthStore } from '../store/auth';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function TradesPage() {
  const { user } = useAuthStore();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tradesApi
      .list()
      .then(({ data }) => setTrades(data))
      .catch(() => toast.error('Ошибка загрузки сделок'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center h-64 items-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">{isAdmin ? 'Все сделки' : 'Мои сделки'}</h1>
        <p className="text-[0.9375rem] text-muted-foreground mt-2">Журнал операций — {fmtInt(trades.length)} записей</p>
      </div>

      {trades.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center text-muted-foreground text-[0.9375rem]">Нет сделок</CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата/Время</TableHead>
                  {isAdmin && <TableHead>Инвестор</TableHead>}
                  <TableHead>ISIN</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead className="text-right">Кол-во</TableHead>
                  <TableHead className="text-right">Цена</TableHead>
                  <TableHead className="text-right">НКД</TableHead>
                  <TableHead className="text-right">Итого</TableHead>
                  {isAdmin && <TableHead className="text-right">Маржа</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {trades.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {fmtDateTime(t.created_at)}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="text-base font-medium">{t.investor_name}</div>
                        <div className="text-sm text-muted-foreground">{t.investor_email}</div>
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="font-medium">{t.isin}</div>
                      <div className="text-sm text-muted-foreground">{t.bond_name}</div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          t.trade_type === 'buy'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 font-medium'
                            : 'border-red-200 bg-red-50 text-red-600 font-medium'
                        }
                      >
                        {t.trade_type === 'buy' ? <ArrowDownLeft /> : <ArrowUpRight />}
                        {t.trade_type === 'buy' ? 'Покупка' : 'Продажа'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{fmtInt(t.quantity)}</TableCell>
                    <TableCell className="text-right">{fmt(t.price_per_bond)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{fmt(t.nkd_per_bond)}</TableCell>
                    <TableCell className="text-right font-semibold">{fmt(t.total_amount)}</TableCell>
                    {isAdmin && (
                      <TableCell className="text-right font-semibold text-primary">{fmt(t.broker_margin)}</TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
