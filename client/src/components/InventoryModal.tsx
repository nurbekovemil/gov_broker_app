import { useState } from 'react';
import toast from 'react-hot-toast';
import { bondsApi } from '../api';
import type { Bond } from '../types';
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
  onClose: () => void;
  onSuccess: () => void;
}

export default function InventoryModal({ bond, onClose, onSuccess }: Props) {
  const [qty, setQty] = useState(String(bond.available_quantity ?? 0));
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseInt(qty, 10);
    if (Number.isNaN(n) || n < 0) {
      toast.error('Введите неотрицательное целое число');
      return;
    }
    setLoading(true);
    try {
      await bondsApi.update(bond.id, { availableQuantity: n });
      toast.success('Остаток обновлён');
      onSuccess();
    } catch {
      toast.error('Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Остаток брокера: {bond.isin}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-base text-muted-foreground">{bond.name}</p>
          <div className="space-y-2">
            <Label htmlFor="inv-qty">Доступно к продаже (шт.)</Label>
            <Input
              id="inv-qty"
              type="number"
              min={0}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              required
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
