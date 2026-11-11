import React, { useState, useRef } from 'react';
import {
  User,
  Plus,
  Trash2,
  Calendar,
  Filter,
  Sparkles,
  Check,
  Wallet,
} from 'lucide-react';
import {
  CATEGORIES,
  ExpenseCategory,
  PERSON_INFO,
  PersonId,
  PersonalExpense,
  THAI_MONTHS,
} from '../types';
import { formatCurrency } from '../utils/calculations';

interface ModulePersonalExpensesProps {
  expenses: PersonalExpense[];
  onAddExpense: (data: Omit<PersonalExpense, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
}

function getTodayISOString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const ModulePersonalExpenses: React.FC<ModulePersonalExpensesProps> = ({
  expenses,
  onAddExpense,
  onDeleteExpense,
}) => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [selectedPerson, setSelectedPerson] = useState<PersonId>('pee');
  const [filterMonth, setFilterMonth] = useState<number>(currentMonth);
  const [filterYear, setFilterYear] = useState<number>(currentYear);

  // Form states
  const [isFormHighlighted, setIsFormHighlighted] = useState<boolean>(false);
  const [date, setDate] = useState<string>(getTodayISOString);
  const [amount, setAmount] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<ExpenseCategory>('อาหาร');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const amountInputRef = useRef<HTMLInputElement>(null);

  // กดปุ่ม "เพิ่มค่าใช้จ่าย" -> เลือกวันที่เป็น "วันนี้เสมอ" อัตโนมัติ และโฟกัสช่องกรอกเงิน
  const handleStartAddExpense = () => {
    const todayStr = getTodayISOString();
    setDate(todayStr);
    setIsFormHighlighted(true);
    setTimeout(() => setIsFormHighlighted(false), 1200);
    amountInputRef.current?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    if (!title.trim() || isNaN(numericAmount) || numericAmount <= 0) return;

    const parsedDate = new Date(date);
    const expMonth = !isNaN(parsedDate.getTime()) ? parsedDate.getMonth() + 1 : currentMonth;
    const expYear = !isNaN(parsedDate.getTime()) ? parsedDate.getFullYear() : currentYear;

    setIsSubmitting(true);
    try {
      await onAddExpense({
        owner: selectedPerson,
        title: title.trim(),
        amount: numericAmount,
        category,
        date,
        month: expMonth,
        year: expYear,
      });

      // Reset form & set date back to today automatically
      setAmount('');
      setTitle('');
      setDate(getTodayISOString());
      setFilterMonth(expMonth);
      setFilterYear(expYear);
    } finally {
      setIsSubmitting(false);
    }
  };

  const personExpenses = expenses.filter(
    (item) =>
      item.owner === selectedPerson &&
      item.month === filterMonth &&
      item.year === filterYear
  );

  const totalPersonalMonth = personExpenses.reduce((sum, i) => sum + i.amount, 0);
  const activePersonInfo = PERSON_INFO[selectedPerson];
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i);

  return (
    <div className="space-y-6">
      {/* Header Bar with Person Switcher & "+ เพิ่มค่าใช้จ่าย" Button */}
      <div className="bento-card p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-2xl text-white flex items-center justify-center shadow-md ${
              selectedPerson === 'nurse'
                ? 'bg-rose-500 shadow-rose-500/20'
                : 'bg-blue-600 shadow-blue-600/20'
            }`}
          >
            <User className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">
              โมดูล 2 : ค่าใช้จ่ายส่วนตัว ({activePersonInfo.name})
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              บันทึกค่าใช้จ่ายเฉพาะของใครของมัน แยกกระเป๋าส่วนตัวชัดเจน
            </p>
          </div>
        </div>

        {/* Person Selector (เนิร์ส / พี) + ปุ่มเพิ่มค่าใช้จ่าย */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center gap-1 border border-slate-200">
            {(['nurse', 'pee'] as PersonId[]).map((pid) => {
              const p = PERSON_INFO[pid];
              const isSelected = selectedPerson === pid;
              return (
                <button
                  key={pid}
                  type="button"
                  onClick={() => setSelectedPerson(pid)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                    isSelected
                      ? pid === 'nurse'
                        ? 'bg-rose-500 text-white shadow-xs'
                        : 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>{p.avatar}</span>
                  <span>ของ{p.name}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleStartAddExpense}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            เพิ่มค่าใช้จ่าย (วันนี้)
          </button>
        </div>
      </div>

      {/* Asymmetric 2-Column Bento Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5 cols): Form */}
        <form
          onSubmit={handleSubmit}
          className={`lg:col-span-5 bento-card p-6 sm:p-7 space-y-5 transition-all ${
            isFormHighlighted ? 'ring-4 ring-blue-500/30 scale-[1.01]' : ''
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full border ${activePersonInfo.badgeBg} ${activePersonInfo.badgeText}`}
              >
                {activePersonInfo.avatar} กระเป๋าส่วนตัวของ{activePersonInfo.name}
              </span>
              <h3 className="text-lg font-extrabold text-slate-900 mt-1.5">
                + บันทึกค่าใช้จ่ายส่วนตัว
              </h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-lg">
              {activePersonInfo.avatar}
            </div>
          </div>

          {/* เลือกคนในฟอร์มได้ด้วย */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              บันทึกเป็นของใคร
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {(['nurse', 'pee'] as PersonId[]).map((pid) => {
                const p = PERSON_INFO[pid];
                const active = selectedPerson === pid;
                return (
                  <button
                    key={pid}
                    type="button"
                    onClick={() => setSelectedPerson(pid)}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl border text-sm font-bold transition cursor-pointer ${
                      active
                        ? pid === 'nurse'
                          ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                          : 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{p.avatar}</span>
                    <span>{p.name}</span>
                    {active && <Check className="w-4 h-4 ml-auto" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* วันที่ (เลือกได้ แต่กดเพิ่มให้เลือกอัตโนมัติเองก่อนว่าวันนี้เสมอ) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                วันที่ใช้จ่าย *
              </label>
              <button
                type="button"
                onClick={() => setDate(getTodayISOString())}
                className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
              >
                ตั้งเป็นวันนี้ ({getTodayISOString()})
              </button>
            </div>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white text-sm font-bold text-slate-900 outline-none transition"
            />
          </div>

          {/* จำนวนเงิน (บาท) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              จำนวนเงิน (บาท) *
            </label>
            <div className="relative">
              <input
                ref={amountInputRef}
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white text-2xl font-extrabold text-slate-900 outline-none transition"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                บาท
              </span>
            </div>
          </div>

          {/* รายการ ชื่อ */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              ชื่อรายการ *
            </label>
            <input
              type="text"
              required
              placeholder="เช่น กาแฟตอนเช้า, ช้อปปิ้งออนไลน์, เติมน้ำมันรถตัวเอง"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white text-sm font-semibold text-slate-900 outline-none transition"
            />
          </div>

          {/* ปุ่มเลือกหมวด (น้ำมัน, อาหาร, ที่พัก, ช้อปปิ้ง, ท่องเที่ยว) */}
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
                        ? selectedPerson === 'nurse'
                          ? 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/20'
                          : 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-lg mb-0.5">{cat.emoji}</span>
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-4 px-6 rounded-2xl text-white font-extrabold text-sm shadow-lg flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 ${
              selectedPerson === 'nurse'
                ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/25'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/25'
            }`}
          >
            <Plus className="w-5 h-5" />
            {isSubmitting
              ? 'กำลังบันทึก...'
              : `บันทึกค่าใช้จ่ายส่วนตัวของ${activePersonInfo.name}`}
          </button>
        </form>

        {/* Right Column (7 cols): Personal Summary & History */}
        <div className="lg:col-span-7 space-y-5">
          {/* Summary Banner + Month Filter */}
          <div className="bento-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`w-14 h-14 rounded-3xl flex items-center justify-center text-2xl border ${activePersonInfo.badgeBg}`}
              >
                <Wallet className={`w-7 h-7 ${activePersonInfo.badgeText}`} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500">
                  รวมค่าใช้จ่ายส่วนตัวของ{activePersonInfo.name}
                </p>
                <p className="text-3xl font-extrabold text-slate-900 mt-0.5">
                  ฿{formatCurrency(totalPersonalMonth)}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  เดือน{THAI_MONTHS.find((m) => m.value === filterMonth)?.label}{' '}
                  {filterYear + 543} ({personExpenses.length} รายการ)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-2 rounded-2xl border border-slate-200">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(Number(e.target.value))}
                  className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
                >
                  {THAI_MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-2 rounded-2xl border border-slate-200">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(Number(e.target.value))}
                  className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y + 543}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* List of Personal Expenses */}
          <div className="bento-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold text-slate-900">
                รายการส่วนตัวของ{activePersonInfo.name}
              </h3>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border ${activePersonInfo.badgeBg} ${activePersonInfo.badgeText}`}
              >
                {personExpenses.length} รายการ
              </span>
            </div>

            {personExpenses.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-3xl bg-slate-50/70 border border-dashed border-slate-200">
                <Sparkles className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-base font-bold text-slate-700">
                  ยังไม่มีรายการค่าใช้จ่ายส่วนตัวของ{activePersonInfo.name}ในเดือนนี้
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  กดปุ่ม &ldquo;เพิ่มค่าใช้จ่าย (วันนี้)&rdquo; เพื่อบันทึกรายการได้เลย
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {personExpenses.map((item) => {
                  const catObj =
                    CATEGORIES.find((c) => c.id === item.category) || CATEGORIES[0];
                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl bg-slate-50/80 hover:bg-white border border-slate-200/80 transition flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-11 h-11 rounded-2xl ${catObj.bgLight} ${catObj.textDark} border ${catObj.border} flex items-center justify-center text-lg shrink-0`}
                        >
                          {catObj.emoji}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                            {item.title}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                            <span>📅 {item.date}</span>
                            <span>• หมวด{item.category}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-base sm:text-lg font-extrabold text-slate-900">
                          ฿{formatCurrency(item.amount)}
                        </span>
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
