import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { portfolioApi } from '../api';
import type { PortfolioItem } from '../types';
import { fmt, fmtPct, fmtDate } from '../utils/format';
import Spinner from '../components/Spinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function PortfolioPage() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portfolioApi
      .list()
      .then(({ data }) => setItems(data))
      .catch(() => toast.error('Ошибка загрузки портфеля'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center h-64 items-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const totalValue = items.reduce((s, i) => s + i.quantity * parseFloat(i.current_price ?? i.avg_price), 0);
  const totalCost = items.reduce((s, i) => s + i.quantity * parseFloat(i.avg_price), 0);
  const pnl = totalValue - totalCost;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">Мой портфель</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-normal text-muted-foreground">Текущая стоимость</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{fmt(totalValue)} сом</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-normal text-muted-foreground">Себестоимость</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{fmt(totalCost)} сом</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-normal text-muted-foreground">П/У</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${pnl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {pnl >= 0 ? '+' : ''}
              {fmt(pnl)} сом
            </p>
          </CardContent>
        </Card>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">В портфеле нет ценных бумаг</CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ISIN / Название</TableHead>
                  <TableHead>Купон</TableHead>
                  <TableHead>Погашение</TableHead>
                  <TableHead className="text-right">Кол-во</TableHead>
                  <TableHead className="text-right">Ср. цена</TableHead>
                  <TableHead className="text-right">Тек. цена</TableHead>
                  <TableHead className="text-right">Стоимость</TableHead>
                  <TableHead className="text-right">П/У</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const curPrice = parseFloat(item.current_price ?? item.avg_price);
                  const avgPrice = parseFloat(item.avg_price);
                  const value = item.quantity * curPrice;
                  const cost = item.quantity * avgPrice;
                  const itemPnl = value - cost;
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.isin}</div>
                        <div className="text-sm text-muted-foreground">{item.bond_name}</div>
                      </TableCell>
                      <TableCell>{fmtPct(parseFloat(item.coupon_rate) * 100)}</TableCell>
                      <TableCell>{fmtDate(item.maturity_date)}</TableCell>
                      <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                      <TableCell className="text-right">{fmt(avgPrice)}</TableCell>
                      <TableCell className="text-right">{fmt(curPrice)}</TableCell>
                      <TableCell className="text-right font-semibold">{fmt(value)}</TableCell>
                      <TableCell
                        className={`text-right font-semibold ${itemPnl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                      >
                        {itemPnl >= 0 ? '+' : ''}
                        {fmt(itemPnl)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
