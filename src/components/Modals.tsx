import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Upload,
  Trash2,
  Image as ImageIcon,
  ArrowRight,
} from 'lucide-react';
import { PERSON_INFO, PersonId, SettlementRecord } from '../types';
import {
  CoupleSettlementSummary,
  compressSlipImage,
  formatCurrency,
} from '../utils/calculations';
import { ThaiDatePicker, formatThaiDate } from './ThaiDateInput';

interface SettleUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  coupleSummary: CoupleSettlementSummary;
  settlements: SettlementRecord[];
  defaultMonth: number;
  defaultYear: number;
  onAddSettlement: (data: Omit<SettlementRecord, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteSettlement: (id: string) => Promise<void>;
}

export const SettleUpModal: React.FC<SettleUpModalProps> = ({
  isOpen,
  onClose,
  coupleSummary,
  settlements,
  defaultMonth,
  defaultYear,
  onAddSettlement,
  onDeleteSettlement,
}) => {
  const [fromPerson, setFromPerson] = useState<PersonId>('nurse');
  const [toPerson, setToPerson] = useState<PersonId>('pee');
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [slipUrl, setSlipUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [viewSlipUrl, setViewSlipUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (coupleSummary.netDirection === 'nurse_pays_pee') {
        setFromPerson('nurse');
        setToPerson('pee');
        setAmount(String(coupleSummary.netAmount));
      } else if (coupleSummary.netDirection === 'pee_pays_nurse') {
        setFromPerson('pee');
        setToPerson('nurse');
        setAmount(String(coupleSummary.netAmount));
      } else {
        setFromPerson('nurse');
        setToPerson('pee');
        setAmount('');
      }
      setDate(new Date().toISOString().slice(0, 10));
      setNote('');
      setSlipUrl('');
    }
  }, [isOpen, coupleSummary.netDirection, coupleSummary.netAmount]);

  if (!isOpen) return null;

  const handleDirectionChange = (from: PersonId) => {
    setFromPerson(from);
    setToPerson(from === 'nurse' ? 'pee' : 'nurse');
  };

  const handleSlipChange = async (file: File | undefined) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const compressed = await compressSlipImage(file);
      setSlipUrl(compressed);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = parseFloat(amount);
    if (isNaN(numAmt) || numAmt <= 0) return;

    const parts = date.split('-');
    const y = parseInt(parts[0], 10) || defaultYear;
    const m = parseInt(parts[1], 10) || defaultMonth;

    setIsSubmitting(true);
    try {
      await onAddSettlement({
        fromPerson,
        toPerson,
        amount: numAmt,
        date,
        month: m,
        year: y,
        ...(note.trim() ? { note: note.trim() } : {}),
        ...(slipUrl ? { slipUrl } : {}),
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900">
              💸 เคลียร์ค่าใช้จ่ายระหว่างกัน
            </span>
            <h3 className="text-lg font-extrabold text-slate-900 mt-1">
              บันทึกการโอนเงินเคลียร์ยอด
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5 text-slate-700" />
          </button>
        </div>

        {/* Current Net Status Banner */}
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
          {coupleSummary.netDirection === 'settled' ? (
            <p className="text-sm font-bold text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              ตอนนี้ยอดสมดุลกันแล้ว ไม่มียอดค้างชำระ 🎉
            </p>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-amber-900 font-semibold">ยอดคงค้างที่ต้องเคลียร์ตอนนี้:</p>
                <p className="text-base font-extrabold text-slate-900 mt-0.5">
                  {coupleSummary.netDirection === 'nurse_pays_pee'
                    ? `👩‍💼 เนิร์ส โอนคืน 👨‍💻 พี = ฿${formatCurrency(coupleSummary.netAmount)}`
                    : `👨‍💻 พี โอนคืน 👩‍💼 เนิร์ส = ฿${formatCurrency(coupleSummary.netAmount)}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (coupleSummary.netDirection === 'nurse_pays_pee') {
                    handleDirectionChange('nurse');
                  } else {
                    handleDirectionChange('pee');
                  }
                  setAmount(String(coupleSummary.netAmount));
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-900 text-amber-300 text-xs font-bold shrink-0 cursor-pointer"
              >
                ใส่ยอดเต็ม
              </button>
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              เลือกฝั่งที่โอนเงินเคลียร์ยอด
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleDirectionChange('nurse')}
                className={`p-3 rounded-2xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  fromPerson === 'nurse'
                    ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <span>👩‍💼 เนิร์ส</span>
                <ArrowRight className="w-4 h-4" />
                <span>👨‍💻 พี</span>
              </button>

              <button
                type="button"
                onClick={() => handleDirectionChange('pee')}
                className={`p-3 rounded-2xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  fromPerson === 'pee'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <span>👨‍💻 พี</span>
                <ArrowRight className="w-4 h-4" />
                <span>👩‍💼 เนิร์ส</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                จำนวนเงินที่โอนเคลียร์ (บาท) *
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white text-xl font-extrabold text-slate-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                วันที่โอนคืน (วัน / เดือน / ปี พ.ศ.)
              </label>
              <ThaiDatePicker value={date} onChange={setDate} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                หมายเหตุ (ถ้ามี)
              </label>
              <input
                type="text"
                placeholder="เช่น เคลียร์ค่าข้าวอาทิตย์นี้"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                แนบสลิปโอนเงิน (ถ้ามี)
              </label>
              <div className="flex items-center gap-2">
                <label className="flex-1 py-2.5 px-3 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center gap-1.5 border border-blue-200 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  {isUploading
                    ? 'กำลังย่อรูป...'
                    : slipUrl
                    ? 'แนบสลิปแล้ว ✓'
                    : 'เลือกรูปสลิป'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleSlipChange(e.target.files?.[0])}
                  />
                </label>
                {slipUrl && (
                  <button
                    type="button"
                    onClick={() => setViewSlipUrl(slipUrl)}
                    className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold cursor-pointer"
                  >
                    ดูรูป
                  </button>
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isUploading}
            className="w-full py-3.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-5 h-5" />
            {isSubmitting
              ? 'กำลังบันทึกการเคลียร์ยอด...'
              : `ยืนยัน: ${PERSON_INFO[fromPerson].name} โอนคืนให้ ${
                  PERSON_INFO[toPerson].name
                } ฿${formatCurrency(parseFloat(amount) || 0)}`}
          </button>
        </form>

        {/* Settlement History */}
        {settlements.length > 0 && (
          <div className="pt-4 border-t border-slate-100 space-y-2.5">
            <h4 className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">
              ประวัติการเคลียร์ยอดล่าสุด ({settlements.length} รายการ)
            </h4>
            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {settlements.slice(0, 8).map((s) => (
                <div
                  key={s.id}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900">
                      {PERSON_INFO[s.fromPerson].avatar} {PERSON_INFO[s.fromPerson].name} โอนคืน{' '}
                      {PERSON_INFO[s.toPerson].avatar} {PERSON_INFO[s.toPerson].name}
                    </span>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      📅 {formatThaiDate(s.date)} {s.note ? `• ${s.note}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-emerald-700 text-sm">
                      ฿{formatCurrency(s.amount)}
                    </span>
                    {s.slipUrl && (
                      <button
                        type="button"
                        onClick={() => setViewSlipUrl(s.slipUrl!)}
                        className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer"
                        title="ดูสลิป"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDeleteSettlement(s.id)}
                      className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white cursor-pointer"
                      title="ยกเลิกรายการเคลียร์ยอดนี้"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {viewSlipUrl && (
          <div
            className="fixed inset-0 z-50 bg-slate-900/75 flex items-center justify-center p-4"
            onClick={() => setViewSlipUrl(null)}
          >
            <div className="bg-white p-3 rounded-3xl max-w-sm w-full space-y-2">
              <div className="flex justify-between items-center px-1">
                <span className="text-xs font-bold text-slate-700">สลิปการโอนเคลียร์ยอด</span>
                <button
                  type="button"
                  onClick={() => setViewSlipUrl(null)}
                  className="p-1 rounded-full bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <img
                src={viewSlipUrl}
                alt="Slip"
                className="w-full max-h-[65vh] object-contain rounded-2xl"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
