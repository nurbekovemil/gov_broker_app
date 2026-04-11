import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import { tradesApi } from '../api';
import type { Bond } from '../types';
import { fmt, fmtPct } from '../utils/format';

interface Props {
  bond: Bond;
  mode: 'buy' | 'sell';
  onClose: () => void;
  onSuccess: () => void;
}

export default function DealModal({ bond, mode, onClose, onSuccess }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

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
    <Modal
      title={`${mode === 'buy' ? 'Покупка' : 'Продажа'}: ${bond.name}`}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
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
        </div>

        <div>
          <label className="label">Количество (шт.)</label>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            className="input"
          />
          <p className="text-xs text-gray-500 mt-1">Номинал одной бумаги: {fmt(nominal)} сом</p>
        </div>

        <div className="bg-brand-50 border border-brand-100 rounded-lg p-4 space-y-2 text-sm">
          <Row label="Цена за 1 шт." value={fmt(pricePerBond)} />
          <Row label={`НКД × ${quantity}`} value={fmt(nkdTotal)} />
          <div className="border-t border-brand-200 pt-2">
            <Row label="Итого к оплате" value={`${fmt(totalAmount)} сом`} highlight />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button className="btn-secondary flex-1" onClick={onClose}>Отмена</button>
          <button
            className={mode === 'buy' ? 'btn-success flex-1' : 'btn-danger flex-1'}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'Обработка...' : mode === 'buy' ? 'Подтвердить покупку' : 'Подтвердить продажу'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={highlight ? 'font-semibold text-brand-700' : 'font-medium'}>{value}</span>
    </div>
  );
}
