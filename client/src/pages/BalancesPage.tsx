import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { reportsApi } from '../api';
import type { BalanceReport } from '../types';
import { fmt } from '../utils/format';
import Spinner from '../components/Spinner';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function BalancesPage() {
  const [data, setData] = useState<BalanceReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportsApi
      .balances()
      .then(({ data }) => setData(data))
      .catch(() => toast.error('Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center h-64 items-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const totalValue = data.reduce((s, r) => s + parseFloat(r.current_value ?? '0'), 0);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">Реестр остатков клиентов</h1>
        <p className="text-base text-muted-foreground mt-2">
          Суммарная стоимость портфелей: <strong>{fmt(totalValue)} сом</strong>
        </p>
      </div>

      {data.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">Нет данных</CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Инвестор</TableHead>
                  <TableHead>ISIN</TableHead>
                  <TableHead className="text-right">Кол-во</TableHead>
                  <TableHead className="text-right">Ср. цена</TableHead>
                  <TableHead className="text-right">Тек. стоимость</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="font-medium">{row.full_name}</div>
                      <div className="text-sm text-muted-foreground">{row.email}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{row.isin}</div>
                      <div className="text-sm text-muted-foreground">{row.bond_name}</div>
                    </TableCell>
                    <TableCell className="text-right">{row.quantity}</TableCell>
                    <TableCell className="text-right">{fmt(row.avg_price)}</TableCell>
                    <TableCell className="text-right font-semibold">{fmt(row.current_value)}</TableCell>
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
