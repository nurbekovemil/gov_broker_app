import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { tradesApi } from '../api';
import type { Bond } from '../types';
import { fmt, fmtInt, fmtPct } from '../utils/format';
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

  const [quantityInput, setQuantityInput] = useState('1');
  const [loading, setLoading] = useState(false);

  const parseQuantity = (value: string): number => {
    const digits = value.replace(/\D/g, '');
    if (!digits) return 0;
    const parsed = parseInt(digits, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  useEffect(() => {
    const parsed = parseQuantity(quantityInput);
    if (!parsed) return;

    if (mode === 'buy') {
      const clamped = Math.min(Math.max(1, parsed), Math.max(1, maxBuy || 1));
      if (clamped !== parsed) setQuantityInput(fmtInt(clamped));
    } else {
      const clamped = Math.max(1, parsed);
      if (clamped !== parsed) setQuantityInput(fmtInt(clamped));
    }
  }, [bond.id, mode, maxBuy, quantityInput]);

  const pricePerBond = mode === 'buy'
    ? parseFloat(bond.ask_price ?? '0')
    : parseFloat(bond.bid_price ?? '0');
  const dirtyPrice = parseFloat(bond.dirty_price ?? '0');
  const cleanPrice = parseFloat(bond.clean_price ?? '0');
  const nkd = dirtyPrice - cleanPrice;
  const actualQuantity = parseQuantity(quantityInput);
  const totalAmount = pricePerBond * actualQuantity;
  const nkdTotal = nkd * actualQuantity;
  const nominal = parseFloat(bond.nominal);
  const ytm = parseFloat(bond.ytm ?? '0');

  const handleConfirm = async () => {
    setLoading(true);
    try {
      if (!actualQuantity || actualQuantity < 1) {
        toast.error('Введите количество больше нуля');
        return;
      }

      await tradesApi.create(bond.id, mode, actualQuantity);
      toast.success(`Сделка исполнена: ${mode === 'buy' ? 'куплено' : 'продано'} ${actualQuantity} шт.`);
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
          <div className="rounded-2xl bg-muted/80 p-4 space-y-2.5 text-[0.9375rem] border border-border/40">
            <Row label="ISIN" value={bond.isin} />
            <Row label="Купон" value={fmtPct(parseFloat(bond.coupon_rate) * 100)} />
            <Row label="Доходность (YTM)" value={fmtPct(ytm * 100)} />
            <Row label="Чистая цена" value={fmt(cleanPrice)} />
            <Row label="НКД" value={fmt(nkd)} />
            <Row
              label={mode === 'buy' ? 'Цена продажи (с НКД)' : 'Цена купли (с НКД)'}
              value={fmt(pricePerBond)}
              highlight
            />
            {mode === 'buy' && <Row label="Доступно у брокера (шт.)" value={fmtInt(availableBroker)} />}
          </div>

          <div className="space-y-2">
            <Label htmlFor="qty">Количество (шт.)</Label>
            <Input
              id="qty"
              type="text"
              inputMode="numeric"
              value={quantityInput}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '');
                if (!digits) {
                  setQuantityInput('');
                  return;
                }
                let value = parseInt(digits, 10);
                if (Number.isNaN(value)) return;
                if (mode === 'buy') value = Math.min(Math.max(1, value), Math.max(1, maxBuy));
                else value = Math.max(1, value);
                setQuantityInput(fmtInt(value));
              }}
            />
            <p className="text-sm text-muted-foreground">Номинал одной бумаги: {fmt(nominal)} сом</p>
          </div>

          <div className="rounded-2xl border-2 border-primary/25 bg-primary/[0.07] p-4 space-y-2.5 text-[0.9375rem]">
            <Row label="Цена за 1 шт." value={fmt(pricePerBond)} />
            <Row label={`НКД × ${fmtInt(actualQuantity)}`} value={fmt(nkdTotal)} />
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
            disabled={
              loading
              || !actualQuantity
              || (mode === 'buy' && (availableBroker <= 0 || actualQuantity > availableBroker))
            }
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
