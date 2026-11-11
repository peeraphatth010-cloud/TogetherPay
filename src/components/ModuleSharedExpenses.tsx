import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Navigation,
  Plus,
  Trash2,
  Calendar,
  Filter,
  ArrowUpRight,
  ExternalLink,
  Check,
  Sparkles,
  RotateCcw,
  HandCoins,
  CheckCircle2,
} from 'lucide-react';
import {
  CATEGORIES,
  ExpenseCategory,
  PERSON_INFO,
  PersonId,
  SettlementRecord,
  SharedExpense,
  SplitType,
  THAI_MONTHS,
} from '../types';
import {
  CoupleSettlementSummary,
  calculateSharedItemBreakdown,
  formatCurrency,
} from '../utils/calculations';

interface ModuleSharedExpensesProps {
  expenses: SharedExpense[];
  settlements: SettlementRecord[];
  coupleSummary: CoupleSettlementSummary;
  onAddExpense: (data: Omit<SharedExpense, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
  onOpenSettleModal: () => void;
}

export const ModuleSharedExpenses: React.FC<ModuleSharedExpensesProps> = ({
  expenses,
  settlements,
  coupleSummary,
  onAddExpense,
  onDeleteExpense,
  onOpenSettleModal,
}) => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // เมื่อเปิดมาหน้านี้ ให้เลือกเดือนและปีปัจจุบันเสมอ
  const [filterMonth, setFilterMonth] = useState<number>(currentMonth);
  const [filterYear, setFilterYear] = useState<number>(currentYear);

  useEffect(() => {
    const today = new Date();
    setFilterMonth(today.getMonth() + 1);
    setFilterYear(today.getFullYear());
  }, []);

  // Form states
  const [amount, setAmount] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<ExpenseCategory>('อาหาร');
  const [payer, setPayer] = useState<PersonId>('pee');
  const [splitType, setSplitType] = useState<SplitType>('split_2');
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [locationName, setLocationName] = useState<string>('');
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // GPS Handler
  const handleConnectGPS = () => {
    setLocationError('');
    if (!navigator.geolocation) {
      setLocationError('เบราว์เซอร์ของคุณไม่รองรับการดึงพิกัด GPS');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setLocationCoords({ lat, lng });

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=th`
          );
          if (response.ok) {
            const data = await response.json();
            const place =
              data.name ||
              data.address?.amenity ||
              data.address?.shop ||
              data.address?.suburb ||
              data.address?.city ||
              data.display_name?.split(',')[0] ||
              `พิกัด ${lat}, ${lng}`;
            setLocationName(place);
          } else {
            if (!locationName) setLocationName(`พิกัด GPS (${lat}, ${lng})`);
          }
        } catch {
          if (!locationName) setLocationName(`พิกัด GPS (${lat}, ${lng})`);
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError('กรุณาอนุญาตการเข้าถึงตำแหน่ง (Location Permission) ในเบราว์เซอร์');
        } else {
          setLocationError('ไม่สามารถดึงพิกัด GPS ได้ในขณะนี้ คุณสามารถพิมพ์ชื่อสถานที่ได้โดยตรง');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    if (!title.trim() || isNaN(numericAmount) || numericAmount <= 0) return;

    const parsedDate = new Date(date);
    const expMonth = !isNaN(parsedDate.getTime()) ? parsedDate.getMonth() + 1 : filterMonth;
    const expYear = !isNaN(parsedDate.getTime()) ? parsedDate.getFullYear() : filterYear;

    setIsSubmitting(true);
    try {
      await onAddExpense({
        title: title.trim(),
        amount: numericAmount,
        category,
        payer,
        splitType,
        date,
        month: expMonth,
        year: expYear,
        ...(locationName.trim() ? { locationName: locationName.trim() } : {}),
        ...(locationCoords
          ? { locationLat: locationCoords.lat, locationLng: locationCoords.lng }
          : {}),
      });

      setAmount('');
      setTitle('');
      setLocationName('');
      setLocationCoords(null);
      setFilterMonth(expMonth);
      setFilterYear(expYear);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredExpenses = expenses.filter(
    (item) => item.month === filterMonth && item.year === filterYear
  );

  const filteredSettlements = settlements.filter(
    (s) => s.month === filterMonth && s.year === filterYear
  );

  const previewAmount = parseFloat(amount) || 0;
  const previewBreakdown = calculateSharedItemBreakdown({
    id: 'preview',
    title: title || 'ตัวอย่าง',
    amount: previewAmount,
    category,
    payer,
    splitType,
    date,
    month: filterMonth,
    year: filterYear,
    createdAt: Date.now(),
  });

  // Filtered monthly summary including settlements
  const monthlyRaw = filteredExpenses.reduce(
    (acc, item) => {
      const b = calculateSharedItemBreakdown(item);
      acc.total += item.amount;
      acc.peePaid += b.peePaid;
      acc.nursePaid += b.nursePaid;
      acc.peeAdv += b.peeAdvancedForNurse;
      acc.nurseAdv += b.nurseAdvancedForPee;
      return acc;
    },
    { total: 0, peePaid: 0, nursePaid: 0, peeAdv: 0, nurseAdv: 0 }
  );

  const nurseSettledMonth = filteredSettlements
    .filter((s) => s.fromPerson === 'nurse' && s.toPerson === 'pee')
    .reduce((sum, s) => sum + s.amount, 0);
  const peeSettledMonth = filteredSettlements
    .filter((s) => s.fromPerson === 'pee' && s.toPerson === 'nurse')
    .reduce((sum, s) => sum + s.amount, 0);

  const remainingPeeAdv = Math.max(0, monthlyRaw.peeAdv - nurseSettledMonth);
  const remainingNurseAdv = Math.max(0, monthlyRaw.nurseAdv - peeSettledMonth);

  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Compact Mobile-First Sun-Yellow Settlement & Filter Banner */}
      <div className="bento-yellow-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <div>
            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-slate-900/10 text-slate-900">
              โมดูล 1 • บันทึกค่าใช้จ่าย (ร่วมกัน)
            </span>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">
              {coupleSummary.netDirection === 'settled' ? (
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-800" />
                  เคลียร์ยอดกันเรียบร้อย (฿0)
                </span>
              ) : coupleSummary.netDirection === 'nurse_pays_pee' ? (
                <>👩‍💼 เนิร์ส ต้องโอนคืน 👨‍💻 พี ฿{formatCurrency(coupleSummary.netAmount)}</>
              ) : (
                <>👨‍💻 พี ต้องโอนคืน 👩‍💼 เนิร์ส ฿{formatCurrency(coupleSummary.netAmount)}</>
              )}
            </h2>
          </div>

          <button
            type="button"
            onClick={onOpenSettleModal}
            className="sm:hidden shrink-0 px-3.5 py-2.5 rounded-2xl bg-slate-900 text-amber-300 font-extrabold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <HandCoins className="w-4 h-4" />
            เคลียร์เงิน
          </button>
        </div>

        {/* Filter Month / Year + Desktop Settle Button */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2">
          <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-slate-900/10">
            <Filter className="w-3.5 h-3.5 text-slate-700" />
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(Number(e.target.value))}
              className="bg-transparent text-xs sm:text-sm font-extrabold text-slate-900 focus:outline-none cursor-pointer"
            >
              {THAI_MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  เดือน{m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-slate-900/10">
            <Calendar className="w-3.5 h-3.5 text-slate-700" />
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(Number(e.target.value))}
              className="bg-transparent text-xs sm:text-sm font-extrabold text-slate-900 focus:outline-none cursor-pointer"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  พ.ศ. {y + 543}
                </option>
              ))}
            </select>
          </div>

          {(filterMonth !== currentMonth || filterYear !== currentYear) && (
            <button
              type="button"
              onClick={() => {
                setFilterMonth(currentMonth);
                setFilterYear(currentYear);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/90 text-slate-900 text-xs font-bold cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              เดือนนี้
            </button>
          )}

          <button
            type="button"
            onClick={onOpenSettleModal}
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-amber-300 font-extrabold text-xs shadow-md transition cursor-pointer"
          >
            <HandCoins className="w-4 h-4" />
            เคลียร์เงินคืนกัน
          </button>
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (5 cols): Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-5 bento-card p-5 sm:p-6 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                + บันทึกค่าใช้จ่าย (ร่วมกัน)
              </h3>
              <p className="text-xs text-slate-500">กรอกจำนวนเงิน เลือกคนออกและวิธีหาร</p>
            </div>
            <span className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-extrabold text-sm">
              ฿
            </span>
          </div>

          {/* 1. จำนวนเงิน (บาท) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              จำนวนเงิน (บาท) *
            </label>
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white text-2xl font-extrabold text-slate-900 outline-none"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                บาท
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[60, 100, 200, 500, 1000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(String(val))}
                  className="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 transition cursor-pointer"
                >
                  +{val}฿
                </button>
              ))}
            </div>
          </div>

          {/* 2. รายการ ชื่อ & วันที่ */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ชื่อรายการ *
              </label>
              <input
                type="text"
                required
                placeholder="เช่น กินหมูกระทะ, เติมน้ำมัน, ค่าที่พัก"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white text-sm font-semibold text-slate-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                วันที่
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none"
              />
            </div>
          </div>

          {/* 3. ปุ่มเลือกหมวด */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              เลือกหมวดหมู่
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-2xl border text-[11px] font-bold transition cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span className="text-base">{cat.emoji}</span>
                    <span className="mt-0.5 truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. ใครเป็นคนออก */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              ใครเป็นคนออกเงิน?
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {(['nurse', 'pee'] as PersonId[]).map((personKey) => {
                const p = PERSON_INFO[personKey];
                const active = payer === personKey;
                return (
                  <button
                    key={personKey}
                    type="button"
                    onClick={() => setPayer(personKey)}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl border font-bold text-xs sm:text-sm transition cursor-pointer ${
                      active
                        ? personKey === 'nurse'
                          ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                          : 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span>{p.avatar}</span>
                    <span>{p.name} ออกเงิน</span>
                    {active && <Check className="w-4 h-4 ml-auto" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. การหารเงิน */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              การหารเงิน
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'split_2' as SplitType, label: 'หาร 2', desc: 'คนละครึ่ง' },
                { id: 'nurse_only' as SplitType, label: 'เนิร์สคนเดียว', desc: 'เนิร์ส 100%' },
                { id: 'pee_only' as SplitType, label: 'พีคนเดียว', desc: 'พี 100%' },
              ].map((opt) => {
                const active = splitType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSplitType(opt.id)}
                    className={`py-2 px-2 rounded-2xl border text-center transition cursor-pointer ${
                      active
                        ? 'bg-amber-400 text-slate-950 border-amber-500 font-extrabold shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 font-semibold'
                    }`}
                  >
                    <div className="text-xs">{opt.label}</div>
                    <div className="text-[10px] opacity-75">{opt.desc}</div>
                  </button>
                );
              })}
            </div>

            {previewAmount > 0 && (
              <div className="mt-2.5 p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-slate-700 flex items-center justify-between">
                <span>
                  พี <b>฿{formatCurrency(previewBreakdown.peeResponsible)}</b> • เนิร์ส{' '}
                  <b>฿{formatCurrency(previewBreakdown.nurseResponsible)}</b>
                </span>
                <span className="font-extrabold text-blue-700">
                  {previewBreakdown.peeAdvancedForNurse > 0
                    ? `พีออกให้เนิร์ส ฿${formatCurrency(previewBreakdown.peeAdvancedForNurse)}`
                    : previewBreakdown.nurseAdvancedForPee > 0
                    ? `เนิร์สออกให้พี ฿${formatCurrency(previewBreakdown.nurseAdvancedForPee)}`
                    : 'ไม่ต้องโอนคืน'}
                </span>
              </div>
            )}
          </div>

          {/* 6. สถานที่ GPS */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                สถานที่ (เชื่อมต่อ GPS ได้)
              </label>
              <button
                type="button"
                onClick={handleConnectGPS}
                disabled={isLocating}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full cursor-pointer"
              >
                <Navigation className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
                {isLocating ? 'กำลังดึงพิกัด...' : 'ดึงพิกัด GPS'}
              </button>
            </div>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ชื่อร้าน / สถานที่ หรือกดดึงพิกัด GPS"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-medium text-slate-900 outline-none"
              />
            </div>
            {locationCoords && (
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                <span>
                  📍 ({locationCoords.lat}, {locationCoords.lng})
                </span>
                <a
                  href={`https://www.google.com/maps?q=${locationCoords.lat},${locationCoords.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-bold inline-flex items-center gap-0.5"
                >
                  แผนที่ <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
            {locationError && (
              <p className="mt-1 text-[11px] text-rose-600 font-medium">{locationError}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
            {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกรายการ (ร่วมกัน)'}
          </button>
        </form>

        {/* Right Column (7 cols): Summary & Items */}
        <div className="lg:col-span-7 space-y-4">
          {/* 3 Compact Summary Boxes */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
            <div className="bento-card p-3.5 sm:p-5">
              <p className="text-[11px] font-bold text-slate-500">ใช้จ่ายร่วมเดือนนี้</p>
              <p className="text-base sm:text-2xl font-extrabold text-slate-900 mt-0.5">
                ฿{formatCurrency(monthlyRaw.total)}
              </p>
              <p className="text-[10px] text-slate-400">{filteredExpenses.length} รายการ</p>
            </div>

            <div className="bento-card p-3.5 sm:p-5 border-l-4 border-l-blue-600">
              <p className="text-[11px] font-bold text-blue-700">👨‍💻 พีออกให้เนิร์ส</p>
              <p className="text-base sm:text-2xl font-extrabold text-slate-900 mt-0.5">
                ฿{formatCurrency(remainingPeeAdv)}
              </p>
              {nurseSettledMonth > 0 && (
                <p className="text-[10px] text-emerald-600 font-bold">
                  เคลียร์แล้ว ฿{formatCurrency(nurseSettledMonth)}
                </p>
              )}
            </div>

            <div className="bento-card p-3.5 sm:p-5 border-l-4 border-l-rose-500">
              <p className="text-[11px] font-bold text-rose-700">👩‍💼 เนิร์สออกให้พี</p>
              <p className="text-base sm:text-2xl font-extrabold text-slate-900 mt-0.5">
                ฿{formatCurrency(remainingNurseAdv)}
              </p>
              {peeSettledMonth > 0 && (
                <p className="text-[10px] text-emerald-600 font-bold">
                  เคลียร์แล้ว ฿{formatCurrency(peeSettledMonth)}
                </p>
              )}
            </div>
          </div>

          {/* Shared Expenses List */}
          <div className="bento-card p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                รายการใช้จ่ายร่วมกัน • เดือน
                {THAI_MONTHS.find((m) => m.value === filterMonth)?.label} {filterYear + 543}
              </h3>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700">
                {filteredExpenses.length} รายการ
              </span>
            </div>

            {filteredExpenses.length === 0 ? (
              <div className="text-center py-10 px-4 rounded-2xl bg-slate-50/70 border border-dashed border-slate-200">
                <Sparkles className="w-8 h-8 text-blue-400 mx-auto mb-1.5" />
                <p className="text-sm font-bold text-slate-700">
                  ยังไม่มีรายการค่าใช้จ่ายร่วมกันในเดือนนี้
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredExpenses.map((item) => {
                  const catObj =
                    CATEGORIES.find((c) => c.id === item.category) || CATEGORIES[0];
                  const payerInfo = PERSON_INFO[item.payer];
                  const breakdown = calculateSharedItemBreakdown(item);
                  const splitLabel =
                    item.splitType === 'split_2'
                      ? 'หาร 2'
                      : item.splitType === 'nurse_only'
                      ? 'เนิร์สคนเดียว'
                      : 'พีคนเดียว';

                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/80 flex items-center justify-between gap-2.5"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-2xl ${catObj.bgLight} ${catObj.textDark} border ${catObj.border} flex items-center justify-center text-lg shrink-0`}
                        >
                          {catObj.emoji}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h4 className="font-bold text-slate-900 text-sm truncate">
                              {item.title}
                            </h4>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${payerInfo.badgeBg} ${payerInfo.badgeText}`}
                            >
                              {payerInfo.name}ออก
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                              {splitLabel}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            <span>📅 {item.date}</span>
                            {item.locationName && (
                              <span className="inline-flex items-center gap-0.5 text-blue-600 font-medium truncate max-w-[180px]">
                                <MapPin className="w-3 h-3 shrink-0" />
                                {item.locationLat && item.locationLng ? (
                                  <a
                                    href={`https://www.google.com/maps?q=${item.locationLat},${item.locationLng}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="hover:underline inline-flex items-center gap-0.5 truncate"
                                  >
                                    {item.locationName}
                                    <ArrowUpRight className="w-3 h-3 shrink-0" />
                                  </a>
                                ) : (
                                  item.locationName
                                )}
                              </span>
                            )}
                          </div>

                          <div className="mt-1 text-[11px] font-bold">
                            {breakdown.peeAdvancedForNurse > 0 ? (
                              <span className="text-blue-700">
                                พีออกแทนเนิร์ส ฿{formatCurrency(breakdown.peeAdvancedForNurse)}
                              </span>
                            ) : breakdown.nurseAdvancedForPee > 0 ? (
                              <span className="text-rose-600">
                                เนิร์สออกแทนพี ฿{formatCurrency(breakdown.nurseAdvancedForPee)}
                              </span>
                            ) : (
                              <span className="text-slate-400">ออกให้ตัวเอง</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <p className="text-base font-extrabold text-slate-900">
                            ฿{formatCurrency(item.amount)}
                          </p>
                          {item.splitType === 'split_2' && (
                            <p className="text-[10px] text-slate-500">
                              คนละ ฿{formatCurrency(item.amount / 2)}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => onDeleteExpense(item.id)}
                          className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white flex items-center justify-center cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
