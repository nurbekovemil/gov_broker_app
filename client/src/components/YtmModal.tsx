import { useState } from 'react';
import toast from 'react-hot-toast';
import { bondsApi } from '../api';
import type { Bond } from '../types';
import { fmtPct } from '../utils/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Props {
  bond: Bond;
  onClose: () => void;
  onSuccess: () => void;
}

export default function YtmModal({ bond, onClose, onSuccess }: Props) {
  const [ytm, setYtm] = useState(bond.ytm ? (parseFloat(bond.ytm) * 100).toFixed(3) : '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ytmDecimal = parseFloat(ytm) / 100;
    if (isNaN(ytmDecimal) || ytmDecimal <= 0 || ytmDecimal >= 1) {
      toast.error('Введите корректное значение YTM (0-100%)');
      return;
    }
    setLoading(true);
    try {
      await bondsApi.updateYtm(bond.id, ytmDecimal);
      toast.success('YTM обновлён, цены пересчитаны');
      onSuccess();
    } catch {
      toast.error('Ошибка обновления YTM');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>YTM для {bond.isin}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-5 text-base space-y-2">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Облигация</span>
              <span className="font-medium text-right">{bond.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Текущий YTM</span>
              <span className="font-medium">{bond.ytm ? fmtPct(parseFloat(bond.ytm) * 100) : 'не задан'}</span>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="ytm">Новый YTM (%)</Label>
              <div className="relative">
                <Input
                  id="ytm"
                  type="number"
                  step="0.001"
                  min="0.001"
                  max="99.999"
                  className="pr-8"
                  value={ytm}
                  onChange={(e) => setYtm(e.target.value)}
                  placeholder="8.800"
                  required
                  autoFocus
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
              </div>
              <p className="text-sm text-muted-foreground">
                После сохранения система пересчитает Ask/Bid и обновит витрину в реальном времени
              </p>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Отмена
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Пересчёт...' : 'Сохранить YTM'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
