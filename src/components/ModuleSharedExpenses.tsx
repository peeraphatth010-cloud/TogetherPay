import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Navigation,
  Plus,
  Trash2,
  Calendar,
  Filter,
  Users,
  ArrowUpRight,
  ExternalLink,
  Check,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import {
  CATEGORIES,
  ExpenseCategory,
  PERSON_INFO,
  PersonId,
  SharedExpense,
  SplitType,
  THAI_MONTHS,
} from '../types';
import { calculateSharedItemBreakdown, formatCurrency } from '../utils/calculations';

interface ModuleSharedExpensesProps {
  expenses: SharedExpense[];
  onAddExpense: (data: Omit<SharedExpense, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
}

export const ModuleSharedExpenses: React.FC<ModuleSharedExpensesProps> = ({
  expenses,
  onAddExpense,
  onDeleteExpense,
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

      // Reset form and sync filter to the added expense's month/year
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

  // Filtered expenses by selected month & year
  const filteredExpenses = expenses.filter(
    (item) => item.month === filterMonth && item.year === filterYear
  );

  // Live preview of current form split
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

  // Monthly summary for filtered list
  const monthlySummary = filteredExpenses.reduce(
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

  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i);

  return (
    <div className="space-y-6">
      {/* Top Filter Bar: Month & Year (Defaults to Current Month & Year) */}
      <div className="bento-card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-slate-900">
                โมดูล 1 : บันทึกค่าใช้จ่าย (ร่วมกัน)
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800">
                ร่วมกัน
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              บันทึกมื้ออาหาร ทริป หรือค่าใช้จ่ายที่เนิร์สและพีออกให้กันหรือหารกัน
            </p>
          </div>
        </div>

        {/* Month & Year Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-100/90 px-3 py-2 rounded-2xl border border-slate-200/80">
            <Filter className="w-4 h-4 text-blue-600" />
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(Number(e.target.value))}
              className="bg-transparent text-sm font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              {THAI_MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  เดือน{m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100/90 px-3 py-2 rounded-2xl border border-slate-200/80">
            <Calendar className="w-4 h-4 text-blue-600" />
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(Number(e.target.value))}
              className="bg-transparent text-sm font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  พ.ศ. {y + 543} ({y})
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
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              เดือนปัจจุบัน
            </button>
          )}
        </div>
      </div>

      {/* Asymmetric 2-Column Bento Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5 cols): Add Shared Expense Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-5 bento-card p-6 sm:p-7 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">
                + เพิ่มรายการใช้จ่าย (ร่วมกัน)
              </h3>
              <p className="text-xs text-slate-500">กรอกข้อมูลและเลือกวิธีหารเงิน</p>
            </div>
            <span className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              ฿
            </span>
          </div>

          {/* 1. จำนวนเงิน (บาท) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
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
                className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-500/10 text-2xl font-extrabold text-slate-900 transition outline-none"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                บาท (THB)
              </span>
            </div>
            {/* Quick Amount Chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[100, 250, 500, 1000, 1500].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(String(val))}
                  className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 transition cursor-pointer"
                >
                  +{val}฿
                </button>
              ))}
            </div>
          </div>

          {/* 2. รายการ ชื่อ & วันที่ */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                ชื่อรายการ *
              </label>
              <input
                type="text"
                required
                placeholder="เช่น กินชาบู, เติมน้ำมัน, ค่าโรงแรม"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white text-sm font-semibold text-slate-900 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                วันที่
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white text-xs font-bold text-slate-800 outline-none transition"
              />
            </div>
          </div>

          {/* 3. ปุ่มเลือกหมวด (น้ำมัน, อาหาร, ที่พัก, ช้อปปิ้ง, ท่องเที่ยว) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              เลือกหมวดหมู่
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/25 scale-[1.02]'
                        : 'bg-slate-50/80 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-lg mb-0.5">{cat.emoji}</span>
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. ใครเป็นคนออก (เนิร์ส, พี) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              ใครเป็นคนออกเงินก่อน? (เนิร์ส / พี)
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['nurse', 'pee'] as PersonId[]).map((personKey) => {
                const p = PERSON_INFO[personKey];
                const active = payer === personKey;
                return (
                  <button
                    key={personKey}
                    type="button"
                    onClick={() => setPayer(personKey)}
                    className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl border font-bold text-sm transition-all cursor-pointer ${
                      active
                        ? personKey === 'nurse'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20'
                          : 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-lg">{p.avatar}</span>
                    <span>{p.name} เป็นคนออก</span>
                    {active && <Check className="w-4 h-4 ml-auto" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. การหารเงิน (หาร 2, เนิร์สคนเดียว, พีคนเดียว) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              การหารเงิน
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'split_2' as SplitType, label: 'หาร 2 เท่ากัน', desc: '50% : 50%' },
                { id: 'nurse_only' as SplitType, label: 'เนิร์สคนเดียว', desc: 'ของเนิร์ส 100%' },
                { id: 'pee_only' as SplitType, label: 'พีคนเดียว', desc: 'ของพี 100%' },
              ].map((opt) => {
                const active = splitType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSplitType(opt.id)}
                    className={`py-2.5 px-3 rounded-2xl border text-center transition-all cursor-pointer ${
                      active
                        ? 'bg-amber-400 text-slate-950 border-amber-500 font-extrabold shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 font-semibold hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-xs sm:text-sm">{opt.label}</div>
                    <div className="text-[10px] opacity-75 mt-0.5">{opt.desc}</div>
                  </button>
                );
              })}
            </div>

            {/* Live Calculation Preview Pill */}
            {previewAmount > 0 && (
              <div className="mt-3 p-3 rounded-2xl bg-blue-50/90 border border-blue-200/80 text-xs text-slate-700 flex items-center justify-between">
                <span className="font-semibold">
                  💡 พีรับผิดชอบ <b>฿{formatCurrency(previewBreakdown.peeResponsible)}</b> • เนิร์สรับผิดชอบ{' '}
                  <b>฿{formatCurrency(previewBreakdown.nurseResponsible)}</b>
                </span>
                <span className="font-extrabold text-blue-700">
                  {previewBreakdown.peeAdvancedForNurse > 0
                    ? `พีออกแทนเนิร์ส ฿${formatCurrency(previewBreakdown.peeAdvancedForNurse)}`
                    : previewBreakdown.nurseAdvancedForPee > 0
                    ? `เนิร์สออกแทนพี ฿${formatCurrency(previewBreakdown.nurseAdvancedForPee)}`
                    : 'ไม่ต้องโอนคืน'}
                </span>
              </div>
            )}
          </div>

          {/* 6. สถานที่ (เปิด GPS ให้เชื่อมต่อได้ด้วย) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                สถานที่ (รองรับพิกัด GPS)
              </label>
              <button
                type="button"
                onClick={handleConnectGPS}
                disabled={isLocating}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-full transition cursor-pointer"
              >
                <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                {isLocating ? 'กำลังดึงพิกัด GPS...' : 'ดึงพิกัด GPS ปัจจุบัน'}
              </button>
            </div>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="พิมพ์ชื่อร้าน / สถานที่ หรือกดปุ่มดึงพิกัด GPS ด้านบน"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white text-sm font-medium text-slate-900 outline-none transition"
              />
            </div>
            {locationCoords && (
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                <span>
                  📍 เชื่อมต่อพิกัด GPS แล้ว ({locationCoords.lat}, {locationCoords.lng})
                </span>
                <a
                  href={`https://www.google.com/maps?q=${locationCoords.lat},${locationCoords.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-bold inline-flex items-center gap-0.5"
                >
                  ดูแผนที่ <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
            {locationError && (
              <p className="mt-1.5 text-xs text-rose-600 font-medium">{locationError}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-extrabold text-sm shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
            {isSubmitting ? 'กำลังบันทึกข้อมูล...' : 'บันทึกค่าใช้จ่าย (ร่วมกัน)'}
          </button>
        </form>

        {/* Right Column (7 cols): Monthly Summary & Shared Expenses List */}
        <div className="lg:col-span-7 space-y-5">
          {/* Mini Bento Summary Row for Selected Month */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bento-card p-5">
              <p className="text-xs font-bold text-slate-500">ยอดใช้จ่ายร่วมกันเดือนนี้</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">
                ฿{formatCurrency(monthlySummary.total)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                ทั้งหมด {filteredExpenses.length} รายการ
              </p>
            </div>

            <div className="bento-card p-5 border-l-4 border-l-blue-600">
              <p className="text-xs font-bold text-blue-700">👨‍💻 พีออกแทนเนิร์ส (เดือนนี้)</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">
                ฿{formatCurrency(monthlySummary.peeAdv)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                พีจ่ายรวม ฿{formatCurrency(monthlySummary.peePaid)}
              </p>
            </div>

            <div className="bento-card p-5 border-l-4 border-l-rose-500">
              <p className="text-xs font-bold text-rose-700">👩‍💼 เนิร์สออกแทนพี (เดือนนี้)</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">
                ฿{formatCurrency(monthlySummary.nurseAdv)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                เนิร์สจ่ายรวม ฿{formatCurrency(monthlySummary.nursePaid)}
              </p>
            </div>
          </div>

          {/* List of Shared Expenses */}
          <div className="bento-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  รายการใช้จ่าย (ร่วมกัน) ประจำเดือน
                  {THAI_MONTHS.find((m) => m.value === filterMonth)?.label} {filterYear + 543}
                </h3>
                <p className="text-xs text-slate-500">
                  แสดงรายการพร้อมคนออกเงิน การหาร และสถานที่ GPS
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700">
                {filteredExpenses.length} รายการ
              </span>
            </div>

            {filteredExpenses.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-3xl bg-slate-50/70 border border-dashed border-slate-200">
                <Sparkles className="w-10 h-10 text-blue-400 mx-auto mb-2" />
                <p className="text-base font-bold text-slate-700">
                  ยังไม่มีรายการค่าใช้จ่ายร่วมกันในเดือนนี้
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  กรอกข้อมูลฝั่งซ้ายเพื่อเริ่มบันทึกมื้ออาหาร ค่าน้ำมัน หรือทริปท่องเที่ยวได้เลย!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredExpenses.map((item) => {
                  const catObj =
                    CATEGORIES.find((c) => c.id === item.category) || CATEGORIES[0];
                  const payerInfo = PERSON_INFO[item.payer];
                  const breakdown = calculateSharedItemBreakdown(item);

                  const splitLabel =
                    item.splitType === 'split_2'
                      ? 'หาร 2 เท่ากัน'
                      : item.splitType === 'nurse_only'
                      ? 'เนิร์สคนเดียว'
                      : 'พีคนเดียว';

                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl bg-slate-50/80 hover:bg-white border border-slate-200/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                    >
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`w-12 h-12 rounded-2xl ${catObj.bgLight} ${catObj.textDark} border ${catObj.border} flex items-center justify-center text-xl shrink-0`}
                        >
                          {catObj.emoji}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-base">{item.title}</h4>
                            <span
                              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${payerInfo.badgeBg} ${payerInfo.badgeText}`}
                            >
                              {payerInfo.avatar} {payerInfo.name}ออกเงิน
                            </span>
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900">
                              {splitLabel}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                            <span>📅 {item.date}</span>
                            <span>• หมวด{item.category}</span>
                            {item.locationName && (
                              <span className="inline-flex items-center gap-1 text-blue-600 font-medium">
                                <MapPin className="w-3.5 h-3.5" />
                                {item.locationLat && item.locationLng ? (
                                  <a
                                    href={`https://www.google.com/maps?q=${item.locationLat},${item.locationLng}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="hover:underline inline-flex items-center gap-0.5"
                                  >
                                    {item.locationName}
                                    <ArrowUpRight className="w-3 h-3" />
                                  </a>
                                ) : (
                                  item.locationName
                                )}
                              </span>
                            )}
                          </div>

                          <div className="mt-1.5 text-[11px] font-semibold text-slate-600">
                            {breakdown.peeAdvancedForNurse > 0 ? (
                              <span className="text-blue-700">
                                👉 พีออกแทนเนิร์ส ฿{formatCurrency(breakdown.peeAdvancedForNurse)}
                              </span>
                            ) : breakdown.nurseAdvancedForPee > 0 ? (
                              <span className="text-rose-600">
                                👉 เนิร์สออกแทนพี ฿{formatCurrency(breakdown.nurseAdvancedForPee)}
                              </span>
                            ) : (
                              <span className="text-slate-500">
                                👉 ออกให้ตัวเอง ไม่มียอดค้างกันในรายการนี้
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                        <div className="text-right">
                          <p className="text-lg font-extrabold text-slate-900">
                            ฿{formatCurrency(item.amount)}
                          </p>
                          {item.splitType === 'split_2' && (
                            <p className="text-[11px] text-slate-500">
                              คนละ ฿{formatCurrency(item.amount / 2)}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => onDeleteExpense(item.id)}
                          title="ลบรายการ"
                          className="w-9 h-9 rounded-full bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white flex items-center justify-center transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
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
