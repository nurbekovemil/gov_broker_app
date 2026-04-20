import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { bondsApi, reportsApi } from '../api';
import type { Bond, MarginReport, Summary } from '../types';
import { fmt, fmtInt, fmtPct, fmtDate } from '../utils/format';
import Spinner from '../components/Spinner';
import AddBondModal from '../components/AddBondModal';
import YtmModal from '../components/YtmModal';
import InventoryModal from '../components/InventoryModal';
import { Ban, CirclePlus, MoreVertical, Package, Percent } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

function bondStatusBadge(status: Bond['status']) {
  switch (status) {
    case 'active':
      return <Badge className="border-0 bg-emerald-600/15 text-emerald-800 hover:bg-emerald-600/20">Активна</Badge>;
    case 'inactive':
      return <Badge variant="secondary" className="border-0 bg-muted text-muted-foreground">Неактивна</Badge>;
    case 'matured':
      return <Badge variant="outline" className="border-amber-200/80 bg-amber-50 text-amber-900">Погашена</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function AdminPage() {
  const [bonds, setBonds] = useState<Bond[]>([]);
  const [margin, setMargin] = useState<MarginReport[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddBond, setShowAddBond] = useState(false);
  const [ytmBond, setYtmBond] = useState<Bond | null>(null);
  const [inventoryBond, setInventoryBond] = useState<Bond | null>(null);
  const [deactivateBond, setDeactivateBond] = useState<Bond | null>(null);
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [b, m, s] = await Promise.all([
        bondsApi.list({ includeInactive: true }),
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

  const confirmDeactivate = async () => {
    if (!deactivateBond) return;
    setDeactivateLoading(true);
    try {
      await bondsApi.deactivate(deactivateBond.id);
      toast.success('Облигация деактивирована');
      setDeactivateBond(null);
      void fetchData();
    } catch {
      toast.error('Ошибка');
    } finally {
      setDeactivateLoading(false);
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
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">Панель администратора</h1>
        <Button onClick={() => setShowAddBond(true)}>
          <CirclePlus className="h-4 w-4" />
          Добавить ГЦБ
        </Button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <StatCard label="Сделок сегодня" value={fmtInt(summary.todayTrades.count ?? 0)} />
          <StatCard label="Объём сегодня" value={`${fmt(summary.todayTrades.volume ?? 0)} сом`} />
          <StatCard label="Маржа всего" value={`${fmt(summary.totalMargin)} сом`} highlight />
          <StatCard label="Активных ГЦБ" value={fmtInt(summary.activeBonds)} />
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
                    <TableHead>Статус</TableHead>
                    <TableHead>Купон</TableHead>
                    <TableHead>Номинал</TableHead>
                    <TableHead>Погашение</TableHead>
                    <TableHead className="text-right">YTM</TableHead>
                    <TableHead className="text-center">Купля</TableHead>
                    <TableHead className="text-center">Продажа</TableHead>
                    <TableHead className="text-right">Остаток</TableHead>
                    <TableHead className="w-14 text-right">
                      <span className="sr-only">Действия</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bonds.map((bond) => (
                    <TableRow
                      key={bond.id}
                      className={cn(
                        bond.status !== 'active' && 'bg-muted/55 hover:bg-muted/65',
                      )}
                    >
                      <TableCell>
                        <div className="font-medium">{bond.isin}</div>
                        <div className="text-sm text-muted-foreground">{bond.name}</div>
                      </TableCell>
                      <TableCell>{bondStatusBadge(bond.status)}</TableCell>
                      <TableCell>{fmtPct(parseFloat(bond.coupon_rate) * 100)}</TableCell>
                      <TableCell>{fmt(bond.nominal)}</TableCell>
                      <TableCell>{fmtDate(bond.maturity_date)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {bond.ytm ? (
                          fmtPct(parseFloat(bond.ytm) * 100)
                        ) : (
                          <span className="text-muted-foreground text-sm">не задан</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center align-middle tabular-nums">
                        {bond.bid_price != null && bond.bid_price !== '' ? (
                          <span className="font-semibold text-[#00695C]">{fmt(bond.bid_price)}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center align-middle tabular-nums">
                        {bond.ask_price != null && bond.ask_price !== '' ? (
                          <span className="font-semibold text-[#C62828]">{fmt(bond.ask_price)}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">{fmtInt(bond.available_quantity ?? 0)}</TableCell>
                      <TableCell className="text-right align-middle">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="shrink-0"
                              aria-label="Действия с бумагой"
                            >
                              <MoreVertical className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setInventoryBond(bond)}>
                              <Package className="text-muted-foreground" />
                              Изменить остаток
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setYtmBond(bond)}>
                              <Percent className="text-muted-foreground" />
                              Установить доходность
                            </DropdownMenuItem>
                            {bond.status === 'active' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                  onSelect={() => setDeactivateBond(bond)}
                                >
                                  <Ban />
                                  Деактивировать
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
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
                      <TableCell className="text-right">{fmtInt(row.trade_count)}</TableCell>
                      <TableCell className="text-right">{fmtInt(row.total_quantity)}</TableCell>
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

      <Dialog open={!!deactivateBond} onOpenChange={(open) => !open && !deactivateLoading && setDeactivateBond(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Деактивировать выпуск?</DialogTitle>
            <DialogDescription className="pt-1 text-left">
              <span className="font-semibold text-foreground">
                {deactivateBond?.isin} — {deactivateBond?.name}
              </span>
              {' '}
              исчезнет с витрины; новые сделки будут недоступны. История сделок и портфели не меняются.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" disabled={deactivateLoading} onClick={() => setDeactivateBond(null)}>
              Отмена
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deactivateLoading}
              onClick={() => void confirmDeactivate()}
            >
              {deactivateLoading ? 'Обработка...' : 'Деактивировать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs sm:text-sm font-normal text-muted-foreground uppercase tracking-wide">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold lg:text-3xl ${highlight ? 'text-primary' : ''}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
