import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { bondsApi, reportsApi } from '../api';
import type { Bond, MarginReport, Summary } from '../types';
import { fmt, fmtPct, fmtDate } from '../utils/format';
import Spinner from '../components/Spinner';
import AddBondModal from '../components/AddBondModal';
import YtmModal from '../components/YtmModal';
import InventoryModal from '../components/InventoryModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminPage() {
  const [bonds, setBonds] = useState<Bond[]>([]);
  const [margin, setMargin] = useState<MarginReport[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddBond, setShowAddBond] = useState(false);
  const [ytmBond, setYtmBond] = useState<Bond | null>(null);
  const [inventoryBond, setInventoryBond] = useState<Bond | null>(null);

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

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleDeactivate = async (id: string) => {
    if (!confirm('Деактивировать облигацию?')) return;
    try {
      await bondsApi.deactivate(id);
      toast.success('Облигация деактивирована');
      void fetchData();
    } catch {
      toast.error('Ошибка');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center h-64 items-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">Панель администратора</h1>
        <Button onClick={() => setShowAddBond(true)}>+ Добавить ГЦБ</Button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 mb-8">
          <StatCard label="Сделок сегодня" value={summary.todayTrades.count ?? '0'} />
          <StatCard label="Объём сегодня" value={`${fmt(summary.todayTrades.volume ?? 0)} сом`} />
          <StatCard label="Маржа всего" value={`${fmt(summary.totalMargin)} сом`} highlight />
          <StatCard label="Активных ГЦБ" value={String(summary.activeBonds)} />
        </div>
      )}

      <Tabs defaultValue="bonds" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bonds">Облигации</TabsTrigger>
          <TabsTrigger value="margin">Ведомость маржи</TabsTrigger>
        </TabsList>

        <TabsContent value="bonds">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ISIN / Название</TableHead>
                    <TableHead>Купон</TableHead>
                    <TableHead>Номинал</TableHead>
                    <TableHead>Погашение</TableHead>
                    <TableHead className="text-right">YTM</TableHead>
                    <TableHead className="text-right">Ask / Bid</TableHead>
                    <TableHead className="text-right">Остаток</TableHead>
                    <TableHead className="min-w-[320px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bonds.map((bond) => (
                    <TableRow key={bond.id}>
                      <TableCell>
                        <div className="font-medium">{bond.isin}</div>
                        <div className="text-sm text-muted-foreground">{bond.name}</div>
                      </TableCell>
                      <TableCell>{fmtPct(parseFloat(bond.coupon_rate) * 100)}</TableCell>
                      <TableCell>{fmt(bond.nominal)}</TableCell>
                      <TableCell>{fmtDate(bond.maturity_date)}</TableCell>
                      <TableCell className="text-right">
                        {bond.ytm ? (
                          <Badge variant="secondary" className="font-normal">
                            {fmtPct(parseFloat(bond.ytm) * 100)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">не задан</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {bond.ask_price ? (
                          <div>
                            <span className="text-red-600 font-medium">{fmt(bond.ask_price)}</span>
                            {' / '}
                            <span className="text-emerald-600 font-medium">{fmt(bond.bid_price ?? 0)}</span>
                          </div>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {(bond.available_quantity ?? 0).toLocaleString('ru-RU')}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2 justify-end">
                          <Button variant="outline" className="h-10 px-4" onClick={() => setInventoryBond(bond)}>
                            Остаток
                          </Button>
                          <Button variant="outline" className="h-10 px-4" onClick={() => setYtmBond(bond)}>
                            Задать YTM
                          </Button>
                          <Button variant="destructive" className="h-10 px-4" onClick={() => handleDeactivate(bond.id)}>
                            Деакт.
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="margin">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>ISIN</TableHead>
                    <TableHead className="text-right">Кол-во сделок</TableHead>
                    <TableHead className="text-right">Кол-во бумаг</TableHead>
                    <TableHead className="text-right">Объём</TableHead>
                    <TableHead className="text-right">Маржа</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {margin.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>{fmtDate(row.trade_date)}</TableCell>
                      <TableCell>
                        <div className="font-medium">{row.isin}</div>
                        <div className="text-sm text-muted-foreground">{row.bond_name}</div>
                      </TableCell>
                      <TableCell className="text-right">{row.trade_count}</TableCell>
                      <TableCell className="text-right">{row.total_quantity}</TableCell>
                      <TableCell className="text-right">{fmt(row.total_volume)}</TableCell>
                      <TableCell className="text-right font-semibold text-primary">{fmt(row.total_margin)}</TableCell>
                    </TableRow>
                  ))}
                  {margin.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Нет данных
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showAddBond && (
        <AddBondModal
          onClose={() => setShowAddBond(false)}
          onSuccess={() => {
            setShowAddBond(false);
            void fetchData();
          }}
        />
      )}
      {ytmBond && (
        <YtmModal
          bond={ytmBond}
          onClose={() => setYtmBond(null)}
          onSuccess={() => {
            setYtmBond(null);
            void fetchData();
          }}
        />
      )}
      {inventoryBond && (
        <InventoryModal
          bond={inventoryBond}
          onClose={() => setInventoryBond(null)}
          onSuccess={() => {
            setInventoryBond(null);
            void fetchData();
          }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-normal text-muted-foreground uppercase tracking-wide">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold lg:text-3xl ${highlight ? 'text-primary' : ''}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
