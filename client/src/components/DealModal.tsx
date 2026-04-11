import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { tradesApi } from '../api';
import type { Bond } from '../types';
import { fmt, fmtPct } from '../utils/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Props {
  bond: Bond;
  mode: 'buy' | 'sell';
  onClose: () => void;
  onSuccess: () => void;
}

export default function DealModal({ bond, mode, onClose, onSuccess }: Props) {
  const availableBroker = bond.available_quantity ?? 0;
  const maxBuy = mode === 'buy' ? Math.max(0, availableBroker) : Number.MAX_SAFE_INTEGER;

  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode === 'buy') {
      setQuantity((q) => Math.min(Math.max(1, q), Math.max(1, maxBuy || 1)));
    } else {
      setQuantity((q) => Math.max(1, q));
    }
  }, [bond.id, mode, maxBuy]);

  const pricePerBond = mode === 'buy'
    ? parseFloat(bond.ask_price ?? '0')
    : parseFloat(bond.bid_price ?? '0');
  const dirtyPrice = parseFloat(bond.dirty_price ?? '0');
  const cleanPrice = parseFloat(bond.clean_price ?? '0');
  const nkd = dirtyPrice - cleanPrice;
  const totalAmount = pricePerBond * quantity;
  const nkdTotal = nkd * quantity;
  const nominal = parseFloat(bond.nominal);
  const ytm = parseFloat(bond.ytm ?? '0');

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await tradesApi.create(bond.id, mode, quantity);
      toast.success(`Сделка исполнена: ${mode === 'buy' ? 'куплено' : 'продано'} ${quantity} шт.`);
      onSuccess();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg ?? 'Ошибка при исполнении сделки');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === 'buy' ? 'Покупка' : 'Продажа'}: {bond.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-5 space-y-2.5 text-base">
            <Row label="ISIN" value={bond.isin} />
            <Row label="Купон" value={fmtPct(parseFloat(bond.coupon_rate) * 100)} />
            <Row label="Доходность (YTM)" value={fmtPct(ytm * 100)} />
            <Row label="Чистая цена" value={fmt(cleanPrice)} />
            <Row label="НКД" value={fmt(nkd)} />
            <Row
              label={mode === 'buy' ? 'Цена Ask (с НКД)' : 'Цена Bid (с НКД)'}
              value={fmt(pricePerBond)}
              highlight
            />
            {mode === 'buy' && <Row label="Доступно у брокера (шт.)" value={String(availableBroker)} />}
          </div>

          <div className="space-y-2">
            <Label htmlFor="qty">Количество (шт.)</Label>
            <Input
              id="qty"
              type="number"
              min={1}
              max={mode === 'buy' ? maxBuy : undefined}
              value={quantity}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10) || 1;
                if (mode === 'buy') setQuantity(Math.min(Math.max(1, v), Math.max(1, maxBuy)));
                else setQuantity(Math.max(1, v));
              }}
            />
            <p className="text-sm text-muted-foreground">Номинал одной бумаги: {fmt(nominal)} сом</p>
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-5 space-y-2.5 text-base">
            <Row label="Цена за 1 шт." value={fmt(pricePerBond)} />
            <Row label={`НКД × ${quantity}`} value={fmt(nkdTotal)} />
            <div className="border-t border-primary/20 pt-2">
              <Row label="Итого к оплате" value={`${fmt(totalAmount)} сом`} highlight />
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button
            variant={mode === 'buy' ? 'default' : 'destructive'}
            onClick={handleConfirm}
            disabled={loading || (mode === 'buy' && (availableBroker <= 0 || quantity > availableBroker))}
          >
            {loading ? 'Обработка...' : mode === 'buy' ? 'Подтвердить покупку' : 'Подтвердить продажу'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={highlight ? 'font-semibold text-primary' : 'font-medium'}>{value}</span>
    </div>
  );
}
