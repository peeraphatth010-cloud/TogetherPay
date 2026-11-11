import React, { useState } from 'react';
import {
  Plus,
  Calendar,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Users,
  X,
  Wallet,
  PieChart,
  Bike,
  Home,
  Utensils,
  ShoppingBag,
  Plane,
  Fuel,
} from 'lucide-react';
import {
  MONTHLY_BILL_CATEGORIES,
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
import { ThaiMonthPicker, formatThaiYearMonth } from './ThaiDateInput';

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
  const [showMonthFilterPicker, setShowMonthFilterPicker] = useState<boolean>(false);

  // Modal: Create New Monthly Bill
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [owner, setOwner] = useState<PersonId>('pee');
  const [title, setTitle] = useState<string>('');
  const [minAmount, setMinAmount] = useState<string>('');
  const [category, setCategory] = useState<ExpenseCategory>('ค่ารถ');
  const [startMonth, setStartMonth] = useState<string>(
    `${currentYear}-${String(currentMonth).padStart(2, '0')}`
  );
  const [endMonth, setEndMonth] = useState<string>(`${currentYear + 1}-12`);
  const [splitWithPartner, setSplitWithPartner] = useState<boolean>(false);
  const [customPartnerShare, setCustomPartnerShare] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Modal: Record Payment ("บันทึกการชำระเงิน") / Edit Amount ("แก้ไข") / Details ("ดูรายละเอียด")
  const [activePaymentBill, setActivePaymentBill] = useState<{
    bill: MonthlyBill;
    mode: 'pay' | 'edit' | 'detail';
  } | null>(null);

  const [payRole, setPayRole] = useState<'owner' | 'partner'>('owner');
  const [payAmountInput, setPayAmountInput] = useState<string>('');
  const [payPartnerAmountInput, setPayPartnerAmountInput] = useState<string>('');
  const [paySlipUrl, setPaySlipUrl] = useState<string>('');
  const [isUploadingSlip, setIsUploadingSlip] = useState<boolean>(false);
  const [isSavingPayment, setIsSavingPayment] = useState<boolean>(false);

  // Full-screen slip viewer
  const [previewSlipUrl, setPreviewSlipUrl] = useState<string | null>(null);

  const numericMinAmount = parseFloat(minAmount) || 0;
  const partnerShareNum = splitWithPartner
    ? customPartnerShare !== ''
      ? parseFloat(customPartnerShare) || 0
      : numericMinAmount / 2
    : 0;
  const ownerShareNum = Math.max(0, numericMinAmount - partnerShareNum);

  const activeYearMonth = formatYearMonth(checklistYear, checklistMonth);
  const monthFullLabel =
    THAI_MONTHS.find((m) => m.value === checklistMonth)?.label || '';
  const yearBELabel = checklistYear + 543;

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

  // Calculate top summary totals for the dark navy card
  let totalMonthAmount = 0;
  let totalPaidAmount = 0;
  let totalPendingAmount = 0;
  let fullyPaidBillsCount = 0;

  for (const bill of activeBills) {
    const p = getBillPaymentState(bill);
    totalMonthAmount += p.actualTotalAmount;

    const ownerPaidAmt = p.ownerPaid ? p.ownerShareAmount : 0;
    const partnerPaidAmt =
      bill.splitWithPartner && p.partnerPaid ? p.partnerShareAmount : 0;
    const billPaidSum = ownerPaidAmt + partnerPaidAmt;

    totalPaidAmount += billPaidSum;
    totalPendingAmount += Math.max(0, p.actualTotalAmount - billPaidSum);

    const isBillFullyPaid = bill.splitWithPartner
      ? p.ownerPaid && p.partnerPaid
      : p.ownerPaid;
    if (isBillFullyPaid) {
      fullyPaidBillsCount += 1;
    }
  }

  const paidProgressPct =
    totalMonthAmount > 0
      ? Math.min(100, Math.round((totalPaidAmount / totalMonthAmount) * 100))
      : 0;

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
      setIsAddModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openBillModal = (bill: MonthlyBill, mode: 'pay' | 'edit' | 'detail') => {
    const p = getBillPaymentState(bill);
    setActivePaymentBill({ bill, mode });
    // Default role: if owner not paid, select owner; else if split & partner not paid, select partner
    const defaultRole: 'owner' | 'partner' =
      !p.ownerPaid || !bill.splitWithPartner ? 'owner' : 'partner';
    setPayRole(defaultRole);
    setPayAmountInput(String(p.actualTotalAmount));
    setPayPartnerAmountInput(String(p.partnerShareAmount));
    setPaySlipUrl(
      defaultRole === 'owner' ? p.ownerSlipUrl || '' : p.partnerSlipUrl || ''
    );
  };

  const handleConfirmRecordPayment = async (markPaid: boolean) => {
    if (!activePaymentBill) return;
    const { bill, mode } = activePaymentBill;
    const current = getBillPaymentState(bill);
    const nowLabel = new Date().toLocaleString('th-TH');

    const parsedTotal = parseFloat(payAmountInput);
    const newTotal =
      !isNaN(parsedTotal) && parsedTotal >= 0
        ? parsedTotal
        : current.actualTotalAmount;

    let newPartnerShare = current.partnerShareAmount;
    let newOwnerShare = newTotal;

    if (bill.splitWithPartner) {
      const parsedPartner = parseFloat(payPartnerAmountInput);
      newPartnerShare = !isNaN(parsedPartner) ? parsedPartner : newTotal / 2;
      newOwnerShare = Math.max(0, newTotal - newPartnerShare);
    }

    setIsSavingPayment(true);
    try {
      if (mode === 'edit') {
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
      } else {
        await onUpsertPayment({
          billId: bill.id,
          yearMonth: activeYearMonth,
          month: checklistMonth,
          year: checklistYear,
          actualTotalAmount: newTotal,
          ownerShareAmount: newOwnerShare,
          partnerShareAmount: newPartnerShare,
          ownerPaid: payRole === 'owner' ? markPaid : current.ownerPaid,
          ownerPaidAt:
            payRole === 'owner'
              ? markPaid
                ? nowLabel
                : undefined
              : current.ownerPaidAt,
          ownerSlipUrl:
            payRole === 'owner' ? paySlipUrl || current.ownerSlipUrl : current.ownerSlipUrl,
          partnerPaid: payRole === 'partner' ? markPaid : current.partnerPaid,
          partnerPaidAt:
            payRole === 'partner'
              ? markPaid
                ? nowLabel
                : undefined
              : current.partnerPaidAt,
          partnerSlipUrl:
            payRole === 'partner'
              ? paySlipUrl || current.partnerSlipUrl
              : current.partnerSlipUrl,
        });
      }
      setActivePaymentBill(null);
    } finally {
      setIsSavingPayment(false);
    }
  };

  const renderCategoryIcon = (cat: ExpenseCategory) => {
    switch (cat) {
      case 'ค่ารถ':
        return <Bike className="w-6 h-6 text-slate-700" />;
      case 'ที่พัก':
        return <Home className="w-6 h-6 text-slate-700" />;
      case 'อาหาร':
        return <Utensils className="w-6 h-6 text-slate-700" />;
      case 'ช้อปปิ้ง':
        return <ShoppingBag className="w-6 h-6 text-slate-700" />;
      case 'ท่องเที่ยว':
        return <Plane className="w-6 h-6 text-slate-700" />;
      case 'น้ำมัน':
        return <Fuel className="w-6 h-6 text-slate-700" />;
      default:
        return <Wallet className="w-6 h-6 text-slate-700" />;
    }
  };

  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - 1 + i);

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-8">
      {/* 1. Top Header: ค่าใช้จ่ายของฉัน + ปุ่มปฏิทินเลือกเดือน */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              ค่าใช้จ่ายของฉัน
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              จัดการบิลและติดตามการชำระเงิน
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowMonthFilterPicker((prev) => !prev)}
            className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-slate-200/80 flex items-center justify-center text-slate-700 hover:bg-slate-50 transition cursor-pointer shrink-0"
            title="เลือกเดือนและปี พ.ศ."
          >
            <Calendar className="w-5 h-5" />
          </button>
        </div>

        {/* Person Filter Pills + Collapsible Month/Year Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1 bg-white/90 p-1 rounded-2xl border border-slate-200/80 shadow-2xs">
            {[
              { id: 'all', label: 'ทั้งหมด' },
              { id: 'pee', label: 'ส่วนของพี' },
              { id: 'nurse', label: 'ส่วนของเนิร์ส' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedPersonFilter(tab.id as 'all' | PersonId)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  selectedPersonFilter === tab.id
                    ? 'bg-[#182238] text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <select
              value={checklistMonth}
              onChange={(e) => setChecklistMonth(Number(e.target.value))}
              className="bg-transparent text-xs font-extrabold text-slate-800 outline-none cursor-pointer"
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
              className="bg-transparent text-xs font-extrabold text-slate-800 outline-none cursor-pointer"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y + 543}
                </option>
              ))}
            </select>
          </div>
        </div>

        {showMonthFilterPicker && (
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-700">
              เลือกงวดเดือนที่ต้องการดู:
            </span>
            <div className="flex items-center gap-2">
              <select
                value={checklistMonth}
                onChange={(e) => setChecklistMonth(Number(e.target.value))}
                className="px-3 py-1.5 rounded-xl bg-slate-100 text-xs font-bold text-slate-900 outline-none"
              >
                {THAI_MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    เดือน{m.label}
                  </option>
                ))}
              </select>
              <select
                value={checklistYear}
                onChange={(e) => setChecklistYear(Number(e.target.value))}
                className="px-3 py-1.5 rounded-xl bg-slate-100 text-xs font-bold text-slate-900 outline-none"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    พ.ศ. {y + 543}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 2. Dark Navy Summary Card (Matches Image 2) */}
      <div className="rounded-[28px] bg-[#182238] text-white p-6 shadow-xl space-y-4">
        <div>
          <p className="text-xs sm:text-sm font-medium text-slate-300">
            ยอดค่าใช้จ่ายทั้งหมด · {monthFullLabel} {yearBELabel}
          </p>
          <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mt-1.5">
            ฿
            {new Intl.NumberFormat('th-TH', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(totalMonthAmount)}
          </p>
        </div>

        <div className="border-t border-white/10 pt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-400 font-medium">จ่ายแล้ว</p>
            <p className="text-2xl font-extrabold text-emerald-400 mt-1">
              ฿{formatCurrency(totalPaidAmount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">รอจ่าย</p>
            <p className="text-2xl font-extrabold text-amber-300 mt-1">
              ฿{formatCurrency(totalPendingAmount)}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2 pt-1">
          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all duration-500"
              style={{ width: `${paidProgressPct}%` }}
            />
          </div>
          <p className="text-xs text-slate-300 font-medium">
            ชำระแล้ว {fullyPaidBillsCount} จาก {activeBills.length} รายการ
          </p>
        </div>
      </div>

      {/* 3. Section Header: รายการค่าใช้จ่าย */}
      <div className="flex items-center justify-between pt-1">
        <h3 className="text-lg font-extrabold text-slate-900">รายการค่าใช้จ่าย</h3>
        <span className="text-sm font-semibold text-slate-500">
          {activeBills.length} รายการ
        </span>
      </div>

      {/* 4. Bill Cards List (Matches Image 2 & Image 3) */}
      {activeBills.length === 0 ? (
        <div className="bg-white rounded-[28px] p-10 text-center border border-slate-200/70 shadow-xs space-y-3">
          <p className="text-base font-bold text-slate-700">
            ยังไม่มีรายการบิลในเดือน{monthFullLabel} {yearBELabel}
          </p>
          <p className="text-xs text-slate-500">
            กดปุ่ม &ldquo;+ เพิ่มรายการค่าใช้จ่าย&rdquo; ด้านล่างเพื่อเริ่มสร้างบิลรายเดือน
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeBills.map((bill) => {
            const payment = getBillPaymentState(bill);
            const ownerInfo = PERSON_INFO[bill.owner];
            const partnerId: PersonId = bill.owner === 'pee' ? 'nurse' : 'pee';
            const partnerInfo = PERSON_INFO[partnerId];
            const allPaid = bill.splitWithPartner
              ? payment.ownerPaid && payment.partnerPaid
              : payment.ownerPaid;

            return (
              <div
                key={bill.id}
                className="bg-white rounded-[28px] p-5 sm:p-6 shadow-sm border border-slate-200/70 space-y-4"
              >
                {/* Top Row: Icon + Title/Category + Status Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
                      {renderCategoryIcon(bill.category)}
                    </div>
                    <div>
                      <h4 className="text-lg font-extrabold text-slate-900 leading-snug">
                        {bill.title}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        หมวด{bill.category} · {monthFullLabel} {yearBELabel}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-extrabold shrink-0 ${
                      allPaid
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-800'
                    }`}
                  >
                    {allPaid ? 'จ่ายแล้ว' : 'รอจ่าย'}
                  </span>
                </div>

                {/* Big Amount */}
                <div>
                  <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
                    ฿{formatCurrency(payment.actualTotalAmount)}
                  </p>
                </div>

                <div className="border-t border-slate-100 pt-4 space-y-3">
                  {/* Owner Share Block */}
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-base font-extrabold text-slate-900">
                          ส่วนของ{ownerInfo.name}
                        </p>
                        <p className="text-xs text-slate-400 font-medium">
                          ยอดที่ต้องชำระ
                        </p>
                      </div>
                      <p className="text-lg font-extrabold text-slate-900">
                        ฿{formatCurrency(payment.ownerShareAmount)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <span className="text-slate-400 font-medium">
                        ครบกำหนด {formatThaiYearMonth(bill.endMonth)}
                      </span>
                      <span
                        className={`font-extrabold ${
                          payment.ownerPaid ? 'text-emerald-600' : 'text-amber-600'
                        }`}
                      >
                        {payment.ownerPaid ? 'ชำระแล้ว ✓' : 'ยังไม่ชำระ'}
                      </span>
                    </div>
                  </div>

                  {/* Partner Share Block (if shared) */}
                  {bill.splitWithPartner && (
                    <div className="pt-3 border-t border-slate-100 space-y-1.5">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-base font-extrabold text-slate-900">
                            ส่วนของ{partnerInfo.name} (หารร่วมกัน)
                          </p>
                          <p className="text-xs text-slate-400 font-medium">
                            ยอดที่ต้องชำระ
                          </p>
                        </div>
                        <p className="text-lg font-extrabold text-slate-900">
                          ฿{formatCurrency(payment.partnerShareAmount)}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-0.5">
                        <span className="text-slate-400 font-medium">
                          ครบกำหนด {formatThaiYearMonth(bill.endMonth)}
                        </span>
                        <span
                          className={`font-extrabold ${
                            payment.partnerPaid ? 'text-emerald-600' : 'text-amber-600'
                          }`}
                        >
                          {payment.partnerPaid ? 'ชำระแล้ว ✓' : 'ยังไม่ชำระ'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Primary Pill Action Button: บันทึกการชำระเงิน */}
                <button
                  type="button"
                  onClick={() => openBillModal(bill, 'pay')}
                  className="w-full py-3.5 px-5 rounded-full bg-[#111622] hover:bg-slate-800 active:scale-[0.99] text-white font-extrabold text-sm flex items-center justify-center gap-2.5 shadow-md transition cursor-pointer"
                >
                  <Wallet className="w-4 h-4" />
                  <span>บันทึกการชำระเงิน</span>
                </button>

                {/* Bottom Links: ดูรายละเอียด | แก้ไข · ลบ */}
                <div className="flex items-center justify-between pt-1 text-xs font-semibold text-slate-500">
                  <button
                    type="button"
                    onClick={() => openBillModal(bill, 'detail')}
                    className="hover:text-slate-900 transition cursor-pointer"
                  >
                    ดูรายละเอียด
                    {(payment.ownerSlipUrl || payment.partnerSlipUrl) && (
                      <span className="ml-1 text-emerald-600 font-bold">(มีสลิป)</span>
                    )}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openBillModal(bill, 'edit')}
                      className="hover:text-slate-900 transition cursor-pointer"
                    >
                      แก้ไข
                    </button>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={() => onDeleteBill(bill.id)}
                      className="hover:text-rose-600 transition cursor-pointer"
                    >
                      ลบ
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. สรุปการใช้งาน Card (Matches Image 3) */}
      <div className="bg-white rounded-[28px] p-5 sm:p-6 shadow-sm border border-slate-200/70 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">สรุปการใช้งาน</h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              ติดตามยอดชำระของแต่ละเดือน
            </p>
          </div>
          <PieChart className="w-5 h-5 text-slate-400" />
        </div>

        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 font-medium">รายการทั้งหมด</span>
            <span className="font-extrabold text-slate-900">{activeBills.length} บิล</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 font-medium">ชำระแล้ว</span>
            <span className="font-extrabold text-slate-900">{fullyPaidBillsCount} บิล</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 font-medium">รอชำระ</span>
            <span className="font-extrabold text-slate-900">
              {Math.max(0, activeBills.length - fullyPaidBillsCount)} บิล
            </span>
          </div>
        </div>
      </div>

      {/* 6. Bottom Centered Pill Button: + เพิ่มรายการค่าใช้จ่าย (Matches Image 3) */}
      <div className="pt-2 flex justify-center">
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="px-8 py-4 rounded-full bg-white hover:bg-blue-50 text-blue-600 font-extrabold text-base shadow-md border border-slate-200/80 inline-flex items-center gap-2 transition cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span>เพิ่มรายการค่าใช้จ่าย</span>
        </button>
      </div>

      {/* ================= MODAL 1: บันทึกการชำระเงิน / แก้ไข / ดูรายละเอียด ================= */}
      {activePaymentBill && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setActivePaymentBill(null)}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const { bill, mode } = activePaymentBill;
              const payment = getBillPaymentState(bill);
              const ownerInfo = PERSON_INFO[bill.owner];
              const partnerId: PersonId = bill.owner === 'pee' ? 'nurse' : 'pee';
              const partnerInfo = PERSON_INFO[partnerId];

              return (
                <>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="text-lg font-extrabold text-slate-900">
                        {mode === 'pay'
                          ? 'บันทึกการชำระเงิน'
                          : mode === 'edit'
                          ? 'แก้ไขยอดประจำเดือน'
                          : 'รายละเอียดบิลรายเดือน'}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {bill.title} · {monthFullLabel} {yearBELabel}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActivePaymentBill(null)}
                      className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {mode === 'detail' ? (
                    <div className="space-y-3 text-sm">
                      <div className="p-4 rounded-2xl bg-slate-50 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-500">หมวดหมู่:</span>
                          <span className="font-bold text-slate-900">{bill.category}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">ระยะเวลาสัญญา:</span>
                          <span className="font-bold text-slate-900">
                            {formatThaiYearMonth(bill.startMonth)} ถึง{' '}
                            {formatThaiYearMonth(bill.endMonth)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">ยอดขั้นต่ำที่ตั้งไว้:</span>
                          <span className="font-bold text-slate-900">
                            ฿{formatCurrency(bill.minAmount)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">ยอดเรียกเก็บเดือนนี้:</span>
                          <span className="font-extrabold text-slate-900">
                            ฿{formatCurrency(payment.actualTotalAmount)}
                          </span>
                        </div>
                      </div>

                      {/* Owner Slip */}
                      <div className="p-4 rounded-2xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">
                            ส่วนของ{ownerInfo.name} (฿{formatCurrency(payment.ownerShareAmount)})
                          </span>
                          <span
                            className={`text-xs font-extrabold ${
                              payment.ownerPaid ? 'text-emerald-600' : 'text-amber-600'
                            }`}
                          >
                            {payment.ownerPaid ? 'ชำระแล้ว ✓' : 'ยังไม่ชำระ'}
                          </span>
                        </div>
                        {payment.ownerPaidAt && (
                          <p className="text-xs text-slate-400">เวลา: {payment.ownerPaidAt}</p>
                        )}
                        {payment.ownerSlipUrl && (
                          <button
                            type="button"
                            onClick={() => setPreviewSlipUrl(payment.ownerSlipUrl!)}
                            className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl cursor-pointer"
                          >
                            <ImageIcon className="w-3.5 h-3.5" /> เปิดดูสลิปของ{ownerInfo.name}
                          </button>
                        )}
                      </div>

                      {/* Partner Slip */}
                      {bill.splitWithPartner && (
                        <div className="p-4 rounded-2xl border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">
                              ส่วนของ{partnerInfo.name} (฿
                              {formatCurrency(payment.partnerShareAmount)})
                            </span>
                            <span
                              className={`text-xs font-extrabold ${
                                payment.partnerPaid ? 'text-emerald-600' : 'text-amber-600'
                              }`}
                            >
                              {payment.partnerPaid ? 'ชำระแล้ว ✓' : 'ยังไม่ชำระ'}
                            </span>
                          </div>
                          {payment.partnerPaidAt && (
                            <p className="text-xs text-slate-400">
                              เวลา: {payment.partnerPaidAt}
                            </p>
                          )}
                          {payment.partnerSlipUrl && (
                            <button
                              type="button"
                              onClick={() => setPreviewSlipUrl(payment.partnerSlipUrl!)}
                              className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl cursor-pointer"
                            >
                              <ImageIcon className="w-3.5 h-3.5" /> เปิดดูสลิปของ
                              {partnerInfo.name}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* If shared bill and mode === 'pay', choose whose share is being paid */}
                      {mode === 'pay' && bill.splitWithPartner && (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            เลือกส่วนที่ต้องการบันทึกการชำระเงิน
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setPayRole('owner');
                                setPaySlipUrl(payment.ownerSlipUrl || '');
                              }}
                              className={`py-2.5 px-3 rounded-2xl border text-xs font-bold cursor-pointer ${
                                payRole === 'owner'
                                  ? 'bg-[#182238] text-white border-[#182238]'
                                  : 'bg-slate-50 text-slate-700 border-slate-200'
                              }`}
                            >
                              ส่วนของ{ownerInfo.name} (฿
                              {formatCurrency(payment.ownerShareAmount)})
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPayRole('partner');
                                setPaySlipUrl(payment.partnerSlipUrl || '');
                              }}
                              className={`py-2.5 px-3 rounded-2xl border text-xs font-bold cursor-pointer ${
                                payRole === 'partner'
                                  ? 'bg-[#182238] text-white border-[#182238]'
                                  : 'bg-slate-50 text-slate-700 border-slate-200'
                              }`}
                            >
                              ส่วนของ{partnerInfo.name} (฿
                              {formatCurrency(payment.partnerShareAmount)})
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Amount Input (can adjust if this month's bill differs from minimum) */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          ยอดบิลเดือนนี้ (บาท)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={payAmountInput}
                          onChange={(e) => {
                            setPayAmountInput(e.target.value);
                            const v = parseFloat(e.target.value);
                            if (!isNaN(v) && bill.splitWithPartner) {
                              setPayPartnerAmountInput(String(v / 2));
                            }
                          }}
                          className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xl font-extrabold text-slate-900 outline-none"
                        />
                      </div>

                      {bill.splitWithPartner && (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            ยอดส่วนของ{partnerInfo.name} (บาท)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={payPartnerAmountInput}
                            onChange={(e) => setPayPartnerAmountInput(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-base font-bold text-slate-900 outline-none"
                          />
                        </div>
                      )}

                      {/* Slip Attachment (in pay mode) */}
                      {mode === 'pay' && (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            แนบสลิปโอนเงิน (ถ้ามี)
                          </label>
                          <div className="flex items-center gap-2">
                            <label className="flex-1 py-3 px-4 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center gap-2 border border-blue-200 cursor-pointer">
                              <Upload className="w-4 h-4" />
                              {isUploadingSlip
                                ? 'กำลังอัปโหลดรูปสลิป...'
                                : paySlipUrl
                                ? 'แนบสลิปเรียบร้อย ✓ (กดเพื่อเปลี่ยน)'
                                : 'อัปโหลดรูปสลิปโอนเงิน'}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  setIsUploadingSlip(true);
                                  try {
                                    const dataUrl = await compressSlipImage(file);
                                    setPaySlipUrl(dataUrl);
                                  } finally {
                                    setIsUploadingSlip(false);
                                  }
                                }}
                              />
                            </label>
                            {paySlipUrl && (
                              <button
                                type="button"
                                onClick={() => setPreviewSlipUrl(paySlipUrl)}
                                className="px-3 py-3 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold cursor-pointer"
                              >
                                ดูสลิป
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="pt-2 space-y-2">
                        <button
                          type="button"
                          disabled={isSavingPayment || isUploadingSlip}
                          onClick={() => handleConfirmRecordPayment(true)}
                          className="w-full py-3.5 px-5 rounded-full bg-[#111622] hover:bg-slate-800 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          {mode === 'edit'
                            ? 'บันทึกการแก้ไขยอด'
                            : 'ยืนยันบันทึกการชำระเงินเรียบร้อย'}
                        </button>

                        {mode === 'pay' &&
                          ((payRole === 'owner' && payment.ownerPaid) ||
                            (payRole === 'partner' && payment.partnerPaid)) && (
                            <button
                              type="button"
                              disabled={isSavingPayment}
                              onClick={() => handleConfirmRecordPayment(false)}
                              className="w-full py-2.5 px-4 rounded-full bg-rose-50 text-rose-600 font-bold text-xs cursor-pointer"
                            >
                              เปลี่ยนสถานะกลับเป็น &ldquo;ยังไม่ชำระ&rdquo;
                            </button>
                          )}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ================= MODAL 2: เพิ่มรายการค่าใช้จ่ายรายเดือน ================= */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setIsAddModalOpen(false)}
        >
          <form
            onSubmit={handleCreateBill}
            className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  + เพิ่มรายการค่าใช้จ่ายรายเดือน
                </h3>
                <p className="text-xs text-slate-500">
                  กำหนดหมวดหมู่ ยอดต่อเดือน และช่วงเดือนเริ่มต้น-สิ้นสุด (พ.ศ.)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1. ของใคร */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                ส่วนของใคร
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
                          ? 'bg-[#182238] text-white border-[#182238]'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <span>{p.avatar}</span>
                      <span>ส่วนของ{p.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. ชื่อรายการ */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ชื่อรายการ *
              </label>
              <input
                type="text"
                required
                placeholder="เช่น ค่ารถ CLICK160, ค่าห้องคอนโด, ค่าไฟ"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 outline-none"
              />
            </div>

            {/* 3. หมวดหมู่รายเดือน (มี ค่ารถ, ไม่มี น้ำมัน) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                หมวดหมู่
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {MONTHLY_BILL_CATEGORIES.map((cat) => {
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-2xl border text-[11px] font-bold transition cursor-pointer ${
                        isSelected
                          ? 'bg-[#182238] text-white border-[#182238]'
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

            {/* 4. ยอดต่อเดือน */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ยอดที่ต้องชำระต่อเดือน (บาท) *
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                required
                placeholder="เช่น 3000"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xl font-extrabold text-slate-900 outline-none"
              />
            </div>

            {/* 5. ตั้งแต่เดือน ถึง ครบกำหนดเดือน (พ.ศ.) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  เริ่มตั้งแต่เดือน (พ.ศ.) *
                </label>
                <ThaiMonthPicker value={startMonth} onChange={setStartMonth} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ครบกำหนดถึงเดือน (พ.ศ.) *
                </label>
                <ThaiMonthPicker value={endMonth} onChange={setEndMonth} />
              </div>
            </div>

            {/* 6. แชร์กับอีกฝ่ายไหม */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-slate-700" />
                  <span className="text-xs font-extrabold text-slate-900">
                    แชร์และเรียกเก็บกับอีกฝ่ายด้วยไหม?
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={splitWithPartner}
                  onChange={(e) => setSplitWithPartner(e.target.checked)}
                  className="w-5 h-5 accent-[#182238] rounded cursor-pointer"
                />
              </div>

              {splitWithPartner && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 block">
                      ส่วนของ{PERSON_INFO[owner].name}
                    </span>
                    <span className="text-sm font-extrabold text-slate-900">
                      ฿{formatCurrency(ownerShareNum)}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <label className="text-[10px] font-bold text-blue-700 block">
                      ส่วนของ{PERSON_INFO[owner === 'pee' ? 'nurse' : 'pee'].name}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder={String(numericMinAmount / 2 || 1500)}
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
              className="w-full py-3.5 px-5 rounded-full bg-[#111622] hover:bg-slate-800 text-white font-extrabold text-sm shadow-lg flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-5 h-5" />
              {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกรายการค่าใช้จ่าย'}
            </button>
          </form>
        </div>
      )}

      {/* Slip Viewer Modal */}
      {previewSlipUrl && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewSlipUrl(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-4 shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-extrabold text-slate-900">
                หลักฐานสลิปการชำระเงิน
              </span>
              <button
                type="button"
                onClick={() => setPreviewSlipUrl(null)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={previewSlipUrl}
              alt="Payment Slip"
              className="max-h-[70vh] w-full object-contain rounded-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
