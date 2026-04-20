import { useState } from 'react';
import toast from 'react-hot-toast';
import { bondsApi } from '../api';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddBondModal({ onClose, onSuccess }: Props) {
  const [form, setForm] = useState({
    isin: '',
    name: '',
    nominal: '1000',
    couponRate: '0.085',
    issueDate: '',
    maturityDate: '',
    couponFrequency: '2',
    availableQuantity: '100000',
  });
  const [loading, setLoading] = useState(false);

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await bondsApi.create({
        isin: form.isin,
        name: form.name,
        nominal: parseFloat(form.nominal),
        couponRate: parseFloat(form.couponRate),
        issueDate: form.issueDate,
        maturityDate: form.maturityDate,
        couponFrequency: parseInt(form.couponFrequency, 10),
        availableQuantity: parseInt(form.availableQuantity, 10) || 0,
      });
      toast.success('Облигация добавлена');
      onSuccess();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(typeof msg === 'string' ? msg : 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[40rem] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Добавить ГЦБ</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="ISIN (12 символов)" value={form.isin} onChange={(v) => set('isin', v)} placeholder="KG0001001004" maxLength={12} />
          <Field label="Название" value={form.name} onChange={(v) => set('name', v)} placeholder="ГЦБ Кыргызстан 2026-2030" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Номинал (сом)" value={form.nominal} onChange={(v) => set('nominal', v)} type="number" />
            <Field
              label="Купонная ставка (доли)"
              value={form.couponRate}
              onChange={(v) => set('couponRate', v)}
              type="number"
              step="0.001"
              placeholder="0.085"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Дата выпуска" value={form.issueDate} onChange={(v) => set('issueDate', v)} type="date" />
            <Field label="Дата погашения" value={form.maturityDate} onChange={(v) => set('maturityDate', v)} type="date" />
          </div>
          <div className="space-y-2">
            <Label>Доступно к продаже (шт., остаток госброкера)</Label>
            <Input
              type="number"
              min={0}
              value={form.availableQuantity}
              onChange={(e) => set('availableQuantity', e.target.value)}
              required
            />
            <p className="text-sm text-muted-foreground">
              Сколько бумаг брокер выставляет на витрину; при покупке остаток уменьшается, при выкупе у клиента — увеличивается.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Частота купона (раз/год)</Label>
            <Select value={form.couponFrequency} onValueChange={(v) => set('couponFrequency', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 (ежегодно)</SelectItem>
                <SelectItem value="2">2 (полугодовой)</SelectItem>
                <SelectItem value="4">4 (квартальный)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Сохранение...' : 'Добавить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  maxLength,
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  maxLength?: number;
  step?: string;
}) {
  const id = label.replace(/\s/g, '-').slice(0, 24);
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        step={step}
        required
      />
    </div>
  );
}
