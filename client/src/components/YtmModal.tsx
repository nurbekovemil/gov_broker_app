import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import { bondsApi } from '../api';
import type { Bond } from '../types';
import { fmtPct } from '../utils/format';

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
    <Modal title={`YTM для ${bond.isin}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-500">Облигация</span>
            <span className="font-medium">{bond.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Текущий YTM</span>
            <span className="font-medium">{bond.ytm ? fmtPct(parseFloat(bond.ytm) * 100) : 'не задан'}</span>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label">Новый YTM (%)</label>
            <div className="relative">
              <input
                type="number"
                step="0.001"
                min="0.001"
                max="99.999"
                className="input pr-8"
                value={ytm}
                onChange={(e) => setYtm(e.target.value)}
                placeholder="8.800"
                required
                autoFocus
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              После сохранения система пересчитает Ask/Bid и обновит витрину в реальном времени
            </p>
          </div>
          <div className="flex gap-3">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>Отмена</button>
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? 'Пересчёт...' : 'Сохранить YTM'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
