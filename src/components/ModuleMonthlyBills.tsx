import React, { useState } from 'react';
import {
  CheckSquare,
  Plus,
  Trash2,
  Calendar,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  Users,
  X,
  Edit3,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  CATEGORIES,
  ExpenseCategory,
  MonthlyBill,
  MonthlyBillPayment,
  PERSON_INFO,
  PersonId,
  THAI_MONTHS,
} from '../types';
import {
  compressSlipImage,
  formatCurrency,
  formatYearMonth,
  isBillActiveInYearMonth,
} from '../utils/calculations';

interface ModuleMonthlyBillsProps {
  bills: MonthlyBill[];
  payments: MonthlyBillPayment[];
  onAddBill: (data: Omit<MonthlyBill, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteBill: (id: string) => Promise<void>;
  onUpsertPayment: (payment: Omit<MonthlyBillPayment, 'id' | 'updatedAt'>) => Promise<void>;
}

export const ModuleMonthlyBills: React.FC<ModuleMonthlyBillsProps> = ({
  bills,
  payments,
  onAddBill,
  onDeleteBill,
  onUpsertPayment,
}) => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [selectedPersonFilter, setSelectedPersonFilter] = useState<'all' | PersonId>('all');
  const [checklistMonth, setChecklistMonth] = useState<number>(currentMonth);
  const [checklistYear, setChecklistYear] = useState<number>(currentYear);
  const [showCreateFormMobile, setShowCreateFormMobile] = useState<boolean>(false);

  // Add Bill Form States
  const [owner, setOwner] = useState<PersonId>('pee');
  const [title, setTitle] = useState<string>('');
  const [minAmount, setMinAmount] = useState<string>('');
  const [category, setCategory] = useState<ExpenseCategory>('ที่พัก');
  const [startMonth, setStartMonth] = useState<string>(
    `${currentYear}-${String(currentMonth).padStart(2, '0')}`
  );
  const [endMonth, setEndMonth] = useState<string>(`${currentYear}-12`);
  const [splitWithPartner, setSplitWithPartner] = useState<boolean>(true);
  const [customPartnerShare, setCustomPartnerShare] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Editing monthly actual amount inline state
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [tempActualTotal, setTempActualTotal] = useState<string>('');
  const [tempPartnerShare, setTempPartnerShare] = useState<string>('');

  // Slip preview modal
  const [previewSlip, setPreviewSlip] = useState<{
    url: string;
    title: string;
    payerName: string;
  } | null>(null);
  const [uploadingSlipKey, setUploadingSlipKey] = useState<string | null>(null);

  const numericMinAmount = parseFloat(minAmount) || 0;
  const partnerShareNum = splitWithPartner
    ? customPartnerShare !== ''
      ? parseFloat(customPartnerShare) || 0
      : numericMinAmount / 2
    : 0;
  const ownerShareNum = Math.max(0, numericMinAmount - partnerShareNum);

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || numericMinAmount <= 0) return;

    setIsSubmitting(true);
    try {
      await onAddBill({
        owner,
        title: title.trim(),
        minAmount: numericMinAmount,
        category,
        startMonth,
        endMonth: endMonth >= startMonth ? endMonth : startMonth,
        splitWithPartner,
        ownerShareDefault: ownerShareNum,
        partnerShareDefault: partnerShareNum,
      });

      setTitle('');
      setMinAmount('');
      setCustomPartnerShare('');
      setShowCreateFormMobile(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeYearMonth = formatYearMonth(checklistYear, checklistMonth);

  const activeBills = bills.filter((b) => {
    if (!isBillActiveInYearMonth(b, activeYearMonth)) return false;
    if (selectedPersonFilter === 'all') return true;
    if (b.owner === selectedPersonFilter) return true;
    if (b.splitWithPartner) return true;
    return false;
  });

  const getBillPaymentState = (bill: MonthlyBill): MonthlyBillPayment => {
    const existing = payments.find(
      (p) => p.billId === bill.id && p.yearMonth === activeYearMonth
    );
    if (existing) return existing;

    return {
      id: `${bill.id}_${activeYearMonth}`,
      billId: bill.id,
      yearMonth: activeYearMonth,
      month: checklistMonth,
      year: checklistYear,
      actualTotalAmount: bill.minAmount,
      ownerShareAmount: bill.splitWithPartner ? bill.ownerShareDefault : bill.minAmount,
      partnerShareAmount: bill.splitWithPartner ? bill.partnerShareDefault : 0,
      ownerPaid: false,
      partnerPaid: false,
      updatedAt: Date.now(),
    };
  };

  const handleTogglePaid = async (
    bill: MonthlyBill,
    role: 'owner' | 'partner',
    nextPaid: boolean
  ) => {
    const current = getBillPaymentState(bill);
    const nowLabel = new Date().toLocaleString('th-TH');

    await onUpsertPayment({
      billId: bill.id,
      yearMonth: activeYearMonth,
      month: checklistMonth,
      year: checklistYear,
      actualTotalAmount: current.actualTotalAmount,
      ownerShareAmount: current.ownerShareAmount,
      partnerShareAmount: current.partnerShareAmount,
      ownerPaid: role === 'owner' ? nextPaid : current.ownerPaid,
      ownerPaidAt:
        role === 'owner' ? (nextPaid ? nowLabel : undefined) : current.ownerPaidAt,
      ownerSlipUrl: current.ownerSlipUrl,
      partnerPaid: role === 'partner' ? nextPaid : current.partnerPaid,
      partnerPaidAt:
        role === 'partner' ? (nextPaid ? nowLabel : undefined) : current.partnerPaidAt,
      partnerSlipUrl: current.partnerSlipUrl,
    });
  };

  const handleUploadSlip = async (
    bill: MonthlyBill,
    role: 'owner' | 'partner',
    file: File | undefined
  ) => {
    if (!file) return;
    const key = `${bill.id}_${role}`;
    setUploadingSlipKey(key);
    try {
      const compressedDataUrl = await compressSlipImage(file);
      const current = getBillPaymentState(bill);
      const nowLabel = new Date().toLocaleString('th-TH');

      await onUpsertPayment({
        billId: bill.id,
        yearMonth: activeYearMonth,
        month: checklistMonth,
        year: checklistYear,
        actualTotalAmount: current.actualTotalAmount,
        ownerShareAmount: current.ownerShareAmount,
        partnerShareAmount: current.partnerShareAmount,
        ownerPaid: role === 'owner' ? true : current.ownerPaid,
        ownerPaidAt: role === 'owner' ? current.ownerPaidAt || nowLabel : current.ownerPaidAt,
        ownerSlipUrl: role === 'owner' ? compressedDataUrl : current.ownerSlipUrl,
        partnerPaid: role === 'partner' ? true : current.partnerPaid,
        partnerPaidAt:
          role === 'partner' ? current.partnerPaidAt || nowLabel : current.partnerPaidAt,
        partnerSlipUrl: role === 'partner' ? compressedDataUrl : current.partnerSlipUrl,
      });
    } finally {
      setUploadingSlipKey(null);
    }
  };

  const handleSaveCustomMonthAmount = async (bill: MonthlyBill) => {
    const current = getBillPaymentState(bill);
    const newTotal = parseFloat(tempActualTotal);
    if (isNaN(newTotal) || newTotal < 0) return;

    let newPartnerShare = 0;
    let newOwnerShare = newTotal;

    if (bill.splitWithPartner) {
      const parsedPartner = parseFloat(tempPartnerShare);
      newPartnerShare = !isNaN(parsedPartner) ? parsedPartner : newTotal / 2;
      newOwnerShare = Math.max(0, newTotal - newPartnerShare);
    }

    await onUpsertPayment({
      billId: bill.id,
      yearMonth: activeYearMonth,
      month: checklistMonth,
      year: checklistYear,
      actualTotalAmount: newTotal,
      ownerShareAmount: newOwnerShare,
      partnerShareAmount: newPartnerShare,
      ownerPaid: current.ownerPaid,
      ownerPaidAt: current.ownerPaidAt,
      ownerSlipUrl: current.ownerSlipUrl,
      partnerPaid: current.partnerPaid,
      partnerPaidAt: current.partnerPaidAt,
      partnerSlipUrl: current.partnerSlipUrl,
    });

    setEditingBillId(null);
  };

  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - 1 + i);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Compact Header Bar */}
      <div className="bento-card p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shrink-0">
              <CheckSquare className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-extrabold text-slate-900">
                โมดูล 3 : บิลเรียกเก็บรายเดือน
              </h2>
              <p className="text-xs text-slate-500">
                เช็คลิสต์จ่ายบิล แชร์ค่าห้อง และแนบสลิปโอนเงิน
              </p>
            </div>
          </div>

          {/* Mobile Toggle to open Create Bill Form */}
          <button
            type="button"
            onClick={() => setShowCreateFormMobile((prev) => !prev)}
            className="lg:hidden px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-extrabold inline-flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            เพิ่มบิล
            {showCreateFormMobile ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Person Filter & Month/Year Selector */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
            {[
              { id: 'all', label: 'ทั้งหมด' },
              { id: 'pee', label: '👨‍💻 พี' },
              { id: 'nurse', label: '👩‍💼 เนิร์ส' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedPersonFilter(tab.id as 'all' | PersonId)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedPersonFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200">
            <Calendar className="w-3.5 h-3.5 text-emerald-700" />
            <select
              value={checklistMonth}
              onChange={(e) => setChecklistMonth(Number(e.target.value))}
              className="bg-transparent text-xs font-extrabold text-emerald-950 outline-none cursor-pointer"
            >
              {THAI_MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <select
              value={checklistYear}
              onChange={(e) => setChecklistYear(Number(e.target.value))}
              className="bg-transparent text-xs font-extrabold text-emerald-950 outline-none cursor-pointer"
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

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (5 cols): Create Monthly Bill Form (Collapsible on Mobile so Checklist is immediately visible!) */}
        <form
          onSubmit={handleCreateBill}
          className={`lg:col-span-5 bento-card p-5 sm:p-6 space-y-4 ${
            showCreateFormMobile ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                + เพิ่มรายการเรียกเก็บรายเดือน
              </h3>
              <p className="text-xs text-slate-500">
                ตั้งยอดขั้นต่ำและกำหนดเดือนเริ่มต้น-สิ้นสุด
              </p>
            </div>
          </div>

          {/* 1. ของใคร */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              ใครเป็นเจ้าของบิลหลัก
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['pee', 'nurse'] as PersonId[]).map((pid) => {
                const p = PERSON_INFO[pid];
                const active = owner === pid;
                return (
                  <button
                    key={pid}
                    type="button"
                    onClick={() => setOwner(pid)}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl border text-xs sm:text-sm font-bold transition cursor-pointer ${
                      active
                        ? pid === 'pee'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-rose-500 text-white border-rose-500 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span>{p.avatar}</span>
                    <span>บิลของ{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. ชื่อรายการ & หมวดหมู่ */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ชื่อบิลรายเดือน *
              </label>
              <input
                type="text"
                required
                placeholder="เช่น ค่าห้องคอนโด, ค่าไฟ, ค่าเน็ต"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                หมวดหมู่
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-bold text-slate-800 outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. ยอดขั้นต่ำต่อเดือน */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ยอดขั้นต่ำ / มาตรฐานต่อเดือน (บาท) *
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              required
              placeholder="เช่น 6000"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xl font-extrabold text-slate-900 outline-none"
            />
          </div>

          {/* 4. กำหนดช่วงเดือนเริ่มต้น ถึง เดือนสิ้นสุด */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ตั้งแต่เดือน *
              </label>
              <input
                type="month"
                required
                value={startMonth}
                onChange={(e) => setStartMonth(e.target.value)}
                className="w-full px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ถึงเดือนสิ้นสุด *
              </label>
              <input
                type="month"
                required
                value={endMonth}
                min={startMonth}
                onChange={(e) => setEndMonth(e.target.value)}
                className="w-full px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none"
              />
            </div>
          </div>

          {/* 5. แชร์กับอีกฝ่ายไหม */}
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-800" />
                <span className="text-xs font-extrabold text-slate-900">
                  แชร์และเรียกเก็บอีกฝ่ายด้วยไหม?
                </span>
              </div>
              <input
                type="checkbox"
                checked={splitWithPartner}
                onChange={(e) => setSplitWithPartner(e.target.checked)}
                className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
              />
            </div>

            {splitWithPartner && (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-amber-200/70">
                <div className="bg-white p-2 rounded-xl border border-amber-200">
                  <span className="text-[10px] font-bold text-slate-500 block">
                    ส่วนของ{PERSON_INFO[owner].name}
                  </span>
                  <span className="text-sm font-extrabold text-slate-900">
                    ฿{formatCurrency(ownerShareNum)}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-amber-200">
                  <label className="text-[10px] font-bold text-blue-700 block">
                    เรียกเก็บ{PERSON_INFO[owner === 'pee' ? 'nurse' : 'pee'].name}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={String(numericMinAmount / 2 || 3000)}
                    value={customPartnerShare}
                    onChange={(e) => setCustomPartnerShare(e.target.value)}
                    className="w-full text-sm font-extrabold text-blue-700 bg-transparent outline-none border-b border-blue-200"
                  />
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-lg flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
            {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกรายการรายเดือน'}
          </button>
        </form>

        {/* Right Column (7 cols): Monthly Checklist Cards */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bento-card p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                  เช็คลิสต์บิลเดือน
                  {THAI_MONTHS.find((m) => m.value === checklistMonth)?.label}{' '}
                  {checklistYear + 543}
                </h3>
                <p className="text-xs text-slate-500">
                  ติ๊กเมื่อจ่ายแล้ว ปรับยอดจริงประจำเดือน และแนบสลิปเงินได้
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 shrink-0">
                {activeBills.length} บิล
              </span>
            </div>

            {activeBills.length === 0 ? (
              <div className="text-center py-10 px-4 rounded-2xl bg-slate-50/70 border border-dashed border-slate-200">
                <Sparkles className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">
                  ยังไม่มีบิลรายเดือนในงวด {activeYearMonth}
                </p>
                <button
                  type="button"
                  onClick={() => setShowCreateFormMobile(true)}
                  className="mt-3 lg:hidden inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                >
                  <Plus className="w-4 h-4" /> กดเพื่อเพิ่มบิลรายเดือนแรก
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {activeBills.map((bill) => {
                  const payment = getBillPaymentState(bill);
                  const ownerInfo = PERSON_INFO[bill.owner];
                  const partnerId: PersonId = bill.owner === 'pee' ? 'nurse' : 'pee';
                  const partnerInfo = PERSON_INFO[partnerId];
                  const isEditing = editingBillId === bill.id;
                  const allPaid = bill.splitWithPartner
                    ? payment.ownerPaid && payment.partnerPaid
                    : payment.ownerPaid;

                  return (
                    <div
                      key={bill.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        allPaid
                          ? 'bg-emerald-50/40 border-emerald-200'
                          : 'bg-slate-50/90 border-slate-200'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/70">
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h4 className="text-sm sm:text-base font-extrabold text-slate-900">
                              {bill.title}
                            </h4>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ownerInfo.badgeBg} ${ownerInfo.badgeText}`}
                            >
                              {ownerInfo.name}
                            </span>
                            {allPaid ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                                <CheckCircle2 className="w-3 h-3" /> จ่ายครบ
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white">
                                <Clock className="w-3 h-3" /> รอจ่าย
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            📆 {bill.startMonth} ถึง {bill.endMonth} • ขั้นต่ำ ฿
                            {formatCurrency(bill.minAmount)}
                          </p>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-2">
                          <span className="text-base font-extrabold text-slate-900">
                            ฿{formatCurrency(payment.actualTotalAmount)}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (isEditing) {
                                setEditingBillId(null);
                              } else {
                                setEditingBillId(bill.id);
                                setTempActualTotal(String(payment.actualTotalAmount));
                                setTempPartnerShare(String(payment.partnerShareAmount));
                              }
                            }}
                            className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-[11px] font-bold text-slate-700 inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            ปรับยอด
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteBill(bill.id)}
                            className="w-7 h-7 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {isEditing && (
                        <div className="my-3 p-3 rounded-2xl bg-blue-50 border border-blue-200 flex flex-wrap items-end gap-2.5">
                          <div>
                            <label className="block text-[10px] font-bold text-blue-900 mb-1">
                              ยอดรวมจริงเดือนนี้
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={tempActualTotal}
                              onChange={(e) => {
                                setTempActualTotal(e.target.value);
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val) && bill.splitWithPartner) {
                                  setTempPartnerShare(String(val / 2));
                                }
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-white border border-blue-300 text-xs font-bold text-slate-900 w-28"
                            />
                          </div>
                          {bill.splitWithPartner && (
                            <div>
                              <label className="block text-[10px] font-bold text-blue-900 mb-1">
                                เรียกเก็บ{partnerInfo.name}
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={tempPartnerShare}
                                onChange={(e) => setTempPartnerShare(e.target.value)}
                                className="px-2.5 py-1.5 rounded-xl bg-white border border-blue-300 text-xs font-bold text-slate-900 w-28"
                              />
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => handleSaveCustomMonthAmount(bill)}
                            className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer"
                          >
                            บันทึก
                          </button>
                        </div>
                      )}

                      {/* Checklist Cards */}
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {/* Owner */}
                        <div
                          className={`p-3 rounded-2xl border flex flex-col justify-between gap-2 ${
                            payment.ownerPaid
                              ? 'bg-white border-emerald-300'
                              : 'bg-white/80 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={payment.ownerPaid}
                                onChange={(e) =>
                                  handleTogglePaid(bill, 'owner', e.target.checked)
                                }
                                className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                              />
                              <div>
                                <span className="text-xs font-extrabold text-slate-900 block">
                                  {ownerInfo.avatar} ส่วนของ{ownerInfo.name}
                                </span>
                                <span className="text-sm font-extrabold text-emerald-700">
                                  ฿{formatCurrency(payment.ownerShareAmount)}
                                </span>
                              </div>
                            </label>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                payment.ownerPaid
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {payment.ownerPaid ? 'จ่ายแล้ว' : 'รอจ่าย'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                            <label className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-xl cursor-pointer">
                              <Upload className="w-3 h-3" />
                              {uploadingSlipKey === `${bill.id}_owner`
                                ? 'อัปโหลด...'
                                : payment.ownerSlipUrl
                                ? 'เปลี่ยนสลิป'
                                : 'แนบสลิป'}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) =>
                                  handleUploadSlip(bill, 'owner', e.target.files?.[0])
                                }
                              />
                            </label>
                            {payment.ownerSlipUrl && (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewSlip({
                                    url: payment.ownerSlipUrl!,
                                    title: `${bill.title} (${activeYearMonth})`,
                                    payerName: ownerInfo.name,
                                  })
                                }
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl cursor-pointer"
                              >
                                <ImageIcon className="w-3 h-3" /> ดูสลิป
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Partner */}
                        {bill.splitWithPartner && (
                          <div
                            className={`p-3 rounded-2xl border flex flex-col justify-between gap-2 ${
                              payment.partnerPaid
                                ? 'bg-white border-emerald-300'
                                : 'bg-white/80 border-amber-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={payment.partnerPaid}
                                  onChange={(e) =>
                                    handleTogglePaid(bill, 'partner', e.target.checked)
                                  }
                                  className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                                />
                                <div>
                                  <span className="text-xs font-extrabold text-slate-900 block">
                                    {partnerInfo.avatar} เรียกเก็บ{partnerInfo.name}
                                  </span>
                                  <span className="text-sm font-extrabold text-blue-700">
                                    ฿{formatCurrency(payment.partnerShareAmount)}
                                  </span>
                                </div>
                              </label>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  payment.partnerPaid
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {payment.partnerPaid ? 'โอนแล้ว' : 'รอโอน'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                              <label className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-xl cursor-pointer">
                                <Upload className="w-3 h-3" />
                                {uploadingSlipKey === `${bill.id}_partner`
                                  ? 'อัปโหลด...'
                                  : payment.partnerSlipUrl
                                  ? 'เปลี่ยนสลิป'
                                  : 'แนบสลิป'}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) =>
                                    handleUploadSlip(bill, 'partner', e.target.files?.[0])
                                  }
                                />
                              </label>
                              {payment.partnerSlipUrl && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewSlip({
                                      url: payment.partnerSlipUrl!,
                                      title: `${bill.title} (${activeYearMonth})`,
                                      payerName: partnerInfo.name,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl cursor-pointer"
                                >
                                  <ImageIcon className="w-3 h-3" /> ดูสลิป
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {previewSlip && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewSlip(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">
                  สลิปโอนเงิน • {previewSlip.payerName}
                </h4>
                <p className="text-xs text-slate-500">{previewSlip.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewSlip(null)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={previewSlip.url}
              alt="Payment Slip"
              className="max-h-[65vh] w-full object-contain rounded-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
