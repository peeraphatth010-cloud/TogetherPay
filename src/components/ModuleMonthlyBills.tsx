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

  // Editing monthly actual amount modal/inline state
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeYearMonth = formatYearMonth(checklistYear, checklistMonth);

  // Filter bills active in the selected month & matching person filter
  const activeBills = bills.filter((b) => {
    if (!isBillActiveInYearMonth(b, activeYearMonth)) return false;
    if (selectedPersonFilter === 'all') return true;
    if (b.owner === selectedPersonFilter) return true;
    // If shared with partner, also show when partner is selected
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
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="bento-card p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">
              โมดูล 3 : ค่าใช้จ่าย เรียกเก็บรายเดือน (Checklist & สลิปโอนเงิน)
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              ตั้งค่าบิลรายเดือน กำหนดเดือนเริ่มต้น-สิ้นสุด แชร์ค่าห้อง/ค่าน้ำ/ค่าไฟ และแนบสลิปเมื่อจ่ายเสร็จสิ้น
            </p>
          </div>
        </div>

        {/* Person Filter & Month/Year Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 border border-slate-200">
            {[
              { id: 'all', label: 'ทั้งหมด' },
              { id: 'pee', label: '👨‍💻 ของพี' },
              { id: 'nurse', label: '👩‍💼 ของเนิร์ส' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedPersonFilter(tab.id as 'all' | PersonId)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  selectedPersonFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-2 rounded-2xl border border-emerald-200">
            <Calendar className="w-4 h-4 text-emerald-700" />
            <select
              value={checklistMonth}
              onChange={(e) => setChecklistMonth(Number(e.target.value))}
              className="bg-transparent text-xs sm:text-sm font-bold text-emerald-950 outline-none cursor-pointer"
            >
              {THAI_MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  เช็คลิสต์เดือน{m.label}
                </option>
              ))}
            </select>
            <select
              value={checklistYear}
              onChange={(e) => setChecklistYear(Number(e.target.value))}
              className="bg-transparent text-xs sm:text-sm font-bold text-emerald-950 outline-none cursor-pointer"
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

      {/* Asymmetric 2-Column Bento Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5 cols): Create Monthly Bill Form */}
        <form
          onSubmit={handleCreateBill}
          className="lg:col-span-5 bento-card p-6 sm:p-7 space-y-5"
        >
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-extrabold text-slate-900">
              + เพิ่มค่าใช้จ่ายเรียกเก็บรายเดือน
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              ใส่ยอดขั้นต่ำไว้ก่อน สามารถปรับยอดจริงในแต่ละเดือนและแนบสลิปได้
            </p>
          </div>

          {/* 1. ของใคร (เนิร์ส, พี) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              ใครเป็นเจ้าของบิลหลัก (เนิร์ส / พี)
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {(['pee', 'nurse'] as PersonId[]).map((pid) => {
                const p = PERSON_INFO[pid];
                const active = owner === pid;
                return (
                  <button
                    key={pid}
                    type="button"
                    onClick={() => setOwner(pid)}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl border text-sm font-bold transition cursor-pointer ${
                      active
                        ? pid === 'pee'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-rose-500 text-white border-rose-500 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                ชื่อบิลรายเดือน *
              </label>
              <input
                type="text"
                required
                placeholder="เช่น ค่าห้องคอนโด, ค่าไฟ+น้ำ, ค่าเน็ต"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:border-emerald-600 focus:bg-white text-sm font-semibold text-slate-900 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                หมวดหมู่
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full px-3 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-800 outline-none cursor-pointer"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. ยอดขั้นต่ำต่อเดือน (บาท) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              ยอดขั้นต่ำ / ยอดมาตรฐานต่อเดือน (บาท) *
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
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:border-emerald-600 focus:bg-white text-xl font-extrabold text-slate-900 outline-none"
            />
          </div>

          {/* 4. กำหนดช่วงเดือนเริ่มต้น ถึง เดือนสิ้นสุด */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                นับตั้งแต่เดือน *
              </label>
              <input
                type="month"
                required
                value={startMonth}
                onChange={(e) => setStartMonth(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-bold text-slate-800 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                ถึงเดือนที่สิ้นสุด *
              </label>
              <input
                type="month"
                required
                value={endMonth}
                min={startMonth}
                onChange={(e) => setEndMonth(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-bold text-slate-800 outline-none"
              />
            </div>
          </div>

          {/* 5. สร้างเพิ่มเรียกเก็บให้อีกฝ่ายไหม (แชร์กัน) */}
          <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-800" />
                <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                  แชร์และสร้างเรียกเก็บให้อีกฝ่ายด้วยไหม?
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
              <div className="space-y-2 pt-2 border-t border-amber-200/70">
                <p className="text-xs text-slate-700">
                  เช่น {PERSON_INFO[owner].name} มีบิล ฿{formatCurrency(numericMinAmount || 6000)}{' '}
                  แชร์กับ{PERSON_INFO[owner === 'pee' ? 'nurse' : 'pee'].name}:
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-white p-2.5 rounded-xl border border-amber-200">
                    <span className="text-[11px] font-bold text-slate-500 block">
                      ส่วนของ{PERSON_INFO[owner].name}
                    </span>
                    <span className="text-sm font-extrabold text-slate-900">
                      ฿{formatCurrency(ownerShareNum)}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-amber-200">
                    <label className="text-[11px] font-bold text-blue-700 block">
                      เรียกเก็บ{PERSON_INFO[owner === 'pee' ? 'nurse' : 'pee'].name} (ปรับได้)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder={String(numericMinAmount / 2 || 3000)}
                      value={customPartnerShare}
                      onChange={(e) => setCustomPartnerShare(e.target.value)}
                      className="w-full text-sm font-extrabold text-blue-700 bg-transparent outline-none border-b border-blue-200 focus:border-blue-600"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
            {isSubmitting ? 'กำลังสร้างรายการ...' : 'สร้างรายการเรียกเก็บรายเดือน'}
          </button>
        </form>

        {/* Right Column (7 cols): Monthly Checklist Cards + Slip Attachment */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bento-card p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  เช็คลิสต์บิลประจำเดือน
                  {THAI_MONTHS.find((m) => m.value === checklistMonth)?.label}{' '}
                  {checklistYear + 543}
                </h3>
                <p className="text-xs text-slate-500">
                  ติ๊กจ่ายเงิน ปรับยอดจริงประจำเดือน และแนบสลิปโอนเงินได้ในแต่ละรายการ
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 self-start sm:self-auto">
                {activeBills.length} บิลในเดือนนี้
              </span>
            </div>

            {activeBills.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-3xl bg-slate-50/70 border border-dashed border-slate-200">
                <Sparkles className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="text-base font-bold text-slate-700">
                  ยังไม่มีบิลรายเดือนในงวด {activeYearMonth}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  เพิ่มบิลรายเดือนฝั่งซ้าย (เช่น ค่าห้อง 6,000 บาท แชร์คนละ 3,000 บาท) เพื่อเริ่มใช้งานเช็คลิสต์
                </p>
              </div>
            ) : (
              <div className="space-y-4">
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
                      className={`p-5 rounded-3xl border transition-all ${
                        allPaid
                          ? 'bg-emerald-50/40 border-emerald-200'
                          : 'bg-slate-50/80 border-slate-200/90'
                      }`}
                    >
                      {/* Bill Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-slate-200/70">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-base font-extrabold text-slate-900">
                              {bill.title}
                            </h4>
                            <span
                              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${ownerInfo.badgeBg} ${ownerInfo.badgeText}`}
                            >
                              {ownerInfo.avatar} บิลของ{ownerInfo.name}
                            </span>
                            {bill.splitWithPartner && (
                              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900">
                                แชร์กับ{partnerInfo.name}
                              </span>
                            )}
                            {allPaid ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-600 text-white">
                                <CheckCircle2 className="w-3 h-3" /> จ่ายครบแล้ว
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500 text-white">
                                <Clock className="w-3 h-3" /> รอชำระ
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            📆 สัญญา/รอบบิล: {bill.startMonth} ถึง {bill.endMonth} • ยอดขั้นต่ำ ฿
                            {formatCurrency(bill.minAmount)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <div className="text-right mr-1">
                            <span className="text-[11px] font-semibold text-slate-500 block">
                              ยอดเดือนนี้
                            </span>
                            <span className="text-lg font-extrabold text-slate-900">
                              ฿{formatCurrency(payment.actualTotalAmount)}
                            </span>
                          </div>
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
                            title="แก้ไขยอดจริงของเดือนนี้"
                            className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-blue-500 text-xs font-bold text-slate-700 inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            ปรับยอดเดือนนี้
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteBill(bill.id)}
                            title="ลบบิลรายเดือนนี้"
                            className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white flex items-center justify-center transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Inline Edit Actual Amount for This Month */}
                      {isEditing && (
                        <div className="my-3 p-3.5 rounded-2xl bg-blue-50 border border-blue-200 flex flex-wrap items-end gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-blue-900 mb-1">
                              ยอดรวมจริงเดือนนี้ (บาท)
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
                              className="px-3 py-1.5 rounded-xl bg-white border border-blue-300 text-sm font-bold text-slate-900 w-36"
                            />
                          </div>
                          {bill.splitWithPartner && (
                            <div>
                              <label className="block text-[11px] font-bold text-blue-900 mb-1">
                                ยอดเรียกเก็บ{partnerInfo.name} (บาท)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={tempPartnerShare}
                                onChange={(e) => setTempPartnerShare(e.target.value)}
                                className="px-3 py-1.5 rounded-xl bg-white border border-blue-300 text-sm font-bold text-slate-900 w-36"
                              />
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => handleSaveCustomMonthAmount(bill)}
                            className="px-4 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 cursor-pointer"
                          >
                            บันทึกยอดเดือนนี้
                          </button>
                        </div>
                      )}

                      {/* Checklist Items: Owner & Partner (if shared) */}
                      <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* 1. Owner Checklist Card */}
                        <div
                          className={`p-3.5 rounded-2xl border flex flex-col justify-between gap-2.5 ${
                            payment.ownerPaid
                              ? 'bg-white border-emerald-300 shadow-2xs'
                              : 'bg-white/80 border-slate-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <label className="flex items-center gap-2.5 cursor-pointer select-none">
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
                              {payment.ownerPaid ? 'จ่ายแล้ว' : 'ยังไม่จ่าย'}
                            </span>
                          </div>

                          {/* Slip upload & preview for Owner */}
                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                            <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-xl cursor-pointer transition">
                              <Upload className="w-3.5 h-3.5" />
                              {uploadingSlipKey === `${bill.id}_owner`
                                ? 'กำลังอัปโหลด...'
                                : payment.ownerSlipUrl
                                ? 'เปลี่ยนสลิป'
                                : 'แนบสลิปเงิน'}
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
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl hover:bg-emerald-100 cursor-pointer"
                              >
                                <ImageIcon className="w-3.5 h-3.5" />
                                ดูสลิปที่แนบ
                              </button>
                            )}
                          </div>
                        </div>

                        {/* 2. Partner Checklist Card (if shared) */}
                        {bill.splitWithPartner && (
                          <div
                            className={`p-3.5 rounded-2xl border flex flex-col justify-between gap-2.5 ${
                              payment.partnerPaid
                                ? 'bg-white border-emerald-300 shadow-2xs'
                                : 'bg-white/80 border-amber-200'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <label className="flex items-center gap-2.5 cursor-pointer select-none">
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
                                    {partnerInfo.avatar} เรียกเก็บ{partnerInfo.name} (ส่วนที่หาร)
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
                                {payment.partnerPaid ? 'โอนแล้ว' : 'รอโอนคืน'}
                              </span>
                            </div>

                            {/* Slip upload & preview for Partner */}
                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                              <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-xl cursor-pointer transition">
                                <Upload className="w-3.5 h-3.5" />
                                {uploadingSlipKey === `${bill.id}_partner`
                                  ? 'กำลังอัปโหลด...'
                                  : payment.partnerSlipUrl
                                  ? 'เปลี่ยนสลิป'
                                  : 'แนบสลิปโอนเงิน'}
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
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl hover:bg-emerald-100 cursor-pointer"
                                >
                                  <ImageIcon className="w-3.5 h-3.5" />
                                  ดูสลิปที่แนบ
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

      {/* Modal for Viewing Attached Payment Slip */}
      {previewSlip && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewSlip(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-extrabold text-slate-900 text-base">
                  หลักฐานสลิปโอนเงิน • {previewSlip.payerName}
                </h4>
                <p className="text-xs text-slate-500">{previewSlip.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewSlip(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 flex items-center justify-center max-h-[70vh]">
              <img
                src={previewSlip.url}
                alt="Payment Slip"
                className="max-h-[65vh] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
