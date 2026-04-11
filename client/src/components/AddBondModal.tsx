import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import { bondsApi } from '../api';

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
        couponFrequency: parseInt(form.couponFrequency),
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
    <Modal title="Добавить ГЦБ" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="ISIN (12 символов)" value={form.isin} onChange={(v) => set('isin', v)} placeholder="KG0001001004" maxLength={12} />
        <Field label="Название" value={form.name} onChange={(v) => set('name', v)} placeholder="ГЦБ Кыргызстан 2026-2030" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Номинал (сом)" value={form.nominal} onChange={(v) => set('nominal', v)} type="number" />
          <Field label="Купонная ставка (доли)" value={form.couponRate} onChange={(v) => set('couponRate', v)} type="number" step="0.001" placeholder="0.085" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Дата выпуска" value={form.issueDate} onChange={(v) => set('issueDate', v)} type="date" />
          <Field label="Дата погашения" value={form.maturityDate} onChange={(v) => set('maturityDate', v)} type="date" />
        </div>
        <div>
          <label className="label">Частота купона (раз/год)</label>
          <select className="input" value={form.couponFrequency} onChange={(e) => set('couponFrequency', e.target.value)}>
            <option value="1">1 (ежегодно)</option>
            <option value="2">2 (полугодовой)</option>
            <option value="4">4 (квартальный)</option>
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Отмена</button>
          <button type="submit" className="btn-primary flex-1" disabled={loading}>
            {loading ? 'Сохранение...' : 'Добавить'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Field({
  label, value, onChange, type = 'text', placeholder, maxLength, step,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; maxLength?: number; step?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        type={type}
        className="input"
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
