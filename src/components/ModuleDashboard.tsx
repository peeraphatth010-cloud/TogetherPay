import React, { useState } from 'react';
import {
  BarChart3,
  PieChart,
  Calendar,
  Filter,
  Globe,
  ArrowRightLeft,
  History,
  CheckCircle2,
  MapPin,
  Sparkles,
  HandCoins,
  KeyRound,
  Wallet,
} from 'lucide-react';
import {
  ALL_CATEGORIES,
  MonthlyBill,
  MonthlyBillPayment,
  PERSON_INFO,
  PersonId,
  PersonalExpense,
  SettlementRecord,
  SharedExpense,
  THAI_MONTHS,
} from '../types';
import {
  calculateSharedItemBreakdown,
  computeDashboardAnalytics,
  formatCurrency,
  formatYearMonth,
  isBillActiveInYearMonth,
} from '../utils/calculations';
import { formatThaiDate, formatThaiYearMonth } from './ThaiDateInput';

interface ModuleDashboardProps {
  sharedExpenses: SharedExpense[];
  personalExpenses: PersonalExpense[];
  monthlyBills: MonthlyBill[];
  monthlyPayments: MonthlyBillPayment[];
  settlements: SettlementRecord[];
  hasApiKey: boolean;
  onOpenSettleModal: () => void;
  onOpenAiModal: () => void;
}

export const ModuleDashboard: React.FC<ModuleDashboardProps> = ({
  sharedExpenses,
  personalExpenses,
  monthlyBills,
  monthlyPayments,
  settlements,
  hasApiKey,
  onOpenSettleModal,
  onOpenAiModal,
}) => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [activeTab, setActiveTab] = useState<'pee' | 'nurse' | 'shared'>('shared');
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [isAllTime, setIsAllTime] = useState<boolean>(false);

  const analytics = computeDashboardAnalytics({
    sharedExpenses,
    personalExpenses,
    monthlyBills,
    monthlyPayments,
    settlements,
    selectedMonth,
    selectedYear,
    isAllTime,
  });

  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i);
  const periodLabel = isAllTime
    ? 'ภาพรวมทั้งหมด (ทุกเดือน)'
    : `เดือน${THAI_MONTHS.find((m) => m.value === selectedMonth)?.label} ${
        selectedYear + 543
      }`;

  const renderCategoryDonut = (
    items: {
      category: string;
      amount: number;
      percentage: number;
      color: string;
      emoji: string;
    }[],
    totalSum: number
  ) => {
    const radius = 58;
    const circumference = 2 * Math.PI * radius;
    let cumulativePercent = 0;

    return (
      <div className="flex flex-col sm:flex-row items-center gap-5">
        <div className="relative w-36 h-36 sm:w-40 sm:h-40 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 148 148">
            <circle
              cx="74"
              cy="74"
              r={radius}
              fill="transparent"
              stroke="#F1F5F9"
              strokeWidth="18"
            />
            {totalSum > 0 &&
              items.map((item) => {
                if (item.amount <= 0) return null;
                const pct = item.amount / totalSum;
                const strokeDasharray = `${pct * circumference} ${circumference}`;
                const strokeDashoffset = -cumulativePercent * circumference;
                cumulativePercent += pct;
                return (
                  <circle
                    key={item.category}
                    cx="74"
                    cy="74"
                    r={radius}
                    fill="transparent"
                    stroke={item.color}
                    strokeWidth="18"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="butt"
                  />
                );
              })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">รวมทั้งสิ้น</span>
            <span className="text-sm font-extrabold text-slate-900">
              ฿{formatCurrency(totalSum)}
            </span>
          </div>
        </div>

        <div className="flex-1 w-full space-y-2.5">
          {items.map((cat) => (
            <div key={cat.category} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span>{cat.emoji}</span>
                  <span>{cat.category}</span>
                </span>
                <span className="font-extrabold text-slate-900">
                  ฿{formatCurrency(cat.amount)}{' '}
                  <span className="text-slate-400 font-semibold">({cat.percentage}%)</span>
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(cat.amount > 0 ? 4 : 0, cat.percentage)}%`,
                    backgroundColor: cat.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Tab 1 (ของพี) or Tab 2 (ของเนิร์ส)
  const renderPersonTab = (personId: PersonId) => {
    const metrics = personId === 'pee' ? analytics.peeMetrics : analytics.nurseMetrics;
    const partnerId: PersonId = personId === 'pee' ? 'nurse' : 'pee';
    const personInfo = PERSON_INFO[personId];
    const partnerInfo = PERSON_INFO[partnerId];

    const scopedPersonal = (
      isAllTime
        ? personalExpenses
        : personalExpenses.filter(
            (e) => e.month === selectedMonth && e.year === selectedYear
          )
    ).filter((e) => e.owner === personId);

    const scopedShared = (
      isAllTime
        ? sharedExpenses
        : sharedExpenses.filter(
            (e) => e.month === selectedMonth && e.year === selectedYear
          )
    ).filter((e) => {
      const b = calculateSharedItemBreakdown(e);
      return (
        e.payer === personId ||
        (personId === 'pee' ? b.peeResponsible > 0 : b.nurseResponsible > 0)
      );
    });

    const combinedHistory = [
      ...scopedPersonal.map((p) => ({
        id: `p_${p.id}`,
        title: p.title,
        amount: p.amount,
        category: p.category,
        date: p.date,
        type: 'ส่วนตัว' as const,
        detail: `กระเป๋าส่วนตัวของ${personInfo.name}`,
        locationName: undefined as string | undefined,
      })),
      ...scopedShared.map((s) => {
        const b = calculateSharedItemBreakdown(s);
        const myResp = personId === 'pee' ? b.peeResponsible : b.nurseResponsible;
        return {
          id: `s_${s.id}`,
          title: s.title,
          amount: myResp,
          category: s.category,
          date: s.date,
          type: 'ร่วมกัน' as const,
          detail: `${PERSON_INFO[s.payer].name}ออกเงินรวม ฿${formatCurrency(s.amount)}`,
          locationName: s.locationName,
        };
      }),
    ].sort((a, b) => (a.date < b.date ? 1 : -1));

    const totalCategorySum = metrics.categoryTotals.reduce((a, b) => a + b.amount, 0);
    const ym = formatYearMonth(selectedYear, selectedMonth);
    const personMonthlyList = monthlyBills.filter(
      (b) =>
        isBillActiveInYearMonth(b, ym) &&
        (b.owner === personId || b.splitWithPartner)
    );

    return (
      <div className="space-y-5">
        {/* 4 Key Metric Cards (2x2 on Mobile!) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bento-card p-4 sm:p-5 border-t-4 border-t-slate-900">
            <p className="text-[11px] sm:text-xs font-bold text-slate-500">
              1. ยอดส่วนตัว ({personInfo.name})
            </p>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
              ฿{formatCurrency(metrics.personalTotal)}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              รับผิดชอบร่วม ฿{formatCurrency(metrics.sharedResponsibleTotal)}
            </p>
          </div>

          <div className="bento-card p-4 sm:p-5 border-t-4 border-t-emerald-500">
            <p className="text-[11px] sm:text-xs font-bold text-emerald-700">
              2. {personInfo.name}ออกแทน{partnerInfo.name}
            </p>
            <p className="text-xl sm:text-2xl font-extrabold text-emerald-700 mt-1">
              ฿{formatCurrency(metrics.advancedForPartner)}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              รอรับคืนจาก{partnerInfo.name}
            </p>
          </div>

          <div className="bento-card p-4 sm:p-5 border-t-4 border-t-rose-500">
            <p className="text-[11px] sm:text-xs font-bold text-rose-600">
              3. {personInfo.name}ต้องจ่ายให้{partnerInfo.name}
            </p>
            <p className="text-xl sm:text-2xl font-extrabold text-rose-600 mt-1">
              ฿{formatCurrency(metrics.owesToPartner)}
            </p>
            <button
              type="button"
              onClick={onOpenSettleModal}
              className="mt-1 inline-flex items-center gap-1 text-[10px] font-extrabold text-blue-600 hover:underline cursor-pointer"
            >
              <HandCoins className="w-3 h-3" /> กดเคลียร์ยอด
            </button>
          </div>

          <div className="bento-card p-4 sm:p-5 border-t-4 border-t-blue-600">
            <p className="text-[11px] sm:text-xs font-bold text-blue-700">
              4. ค่าใช้จ่ายรายเดือน
            </p>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
              ฿{formatCurrency(metrics.monthlyBillsTotal)}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              จ่ายแล้ว {metrics.monthlyBillsPaidCount}/{metrics.monthlyBillsTotalCount} บิล
            </p>
          </div>
        </div>

        {/* Category Chart + Monthly Bills */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 bento-card p-5 sm:p-6">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2 mb-1">
              <PieChart className="w-5 h-5 text-blue-600" />
              กราฟค่าใช้จ่ายแยกตามหมวดของ{personInfo.name}
            </h3>
            <p className="text-xs text-slate-500 mb-4">{periodLabel}</p>
            {renderCategoryDonut(metrics.categoryTotals, totalCategorySum)}
          </div>

          <div className="lg:col-span-5 bento-card p-5 sm:p-6">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              บิลรายเดือนของ{personInfo.name}
            </h3>
            <p className="text-xs text-slate-500 mb-4">งวด {formatThaiYearMonth(ym)}</p>

            {personMonthlyList.length === 0 ? (
              <div className="py-8 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500">
                ไม่มีบิลรายเดือนในงวดนี้
              </div>
            ) : (
              <div className="space-y-2.5">
                {personMonthlyList.map((bill) => {
                  const payment = monthlyPayments.find(
                    (p) => p.billId === bill.id && p.yearMonth === ym
                  );
                  const isOwner = bill.owner === personId;
                  const myShare = payment
                    ? isOwner
                      ? payment.ownerShareAmount
                      : payment.partnerShareAmount
                    : isOwner
                    ? bill.splitWithPartner
                      ? bill.ownerShareDefault
                      : bill.minAmount
                    : bill.partnerShareDefault;
                  const isPaid = payment
                    ? isOwner
                      ? payment.ownerPaid
                      : payment.partnerPaid
                    : false;

                  return (
                    <div
                      key={bill.id}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-900">{bill.title}</p>
                        <p className="text-[11px] text-slate-500">
                          {isOwner ? 'เจ้าของบิลหลัก' : `แชร์กับ${PERSON_INFO[bill.owner].name}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-extrabold text-slate-900">
                          ฿{formatCurrency(myShare)}
                        </p>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isPaid ? 'จ่ายแล้ว' : 'รอชำระ'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* History */}
        <div className="bento-card p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                ประวัติค่าใช้จ่ายย้อนหลังของ{personInfo.name}
              </h3>
              <p className="text-xs text-slate-500">{periodLabel}</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
              {combinedHistory.length} รายการ
            </span>
          </div>

          {combinedHistory.length === 0 ? (
            <div className="text-center py-8 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500">
              ยังไม่มีประวัติค่าใช้จ่ายในช่วงเวลานี้
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {combinedHistory.map((h) => {
                const catObj =
                  ALL_CATEGORIES.find((c) => c.id === h.category) || ALL_CATEGORIES[0];
                return (
                  <div
                    key={h.id}
                    className="p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/80 flex items-center justify-between gap-2.5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-2xl ${catObj.bgLight} ${catObj.textDark} flex items-center justify-center text-base shrink-0`}
                      >
                        {catObj.emoji}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 text-sm truncate">
                            {h.title}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                              h.type === 'ส่วนตัว'
                                ? 'bg-slate-200 text-slate-700'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {h.type}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          📅 {formatThaiDate(h.date)} • {h.detail}
                        </p>
                        {h.locationName && (
                          <p className="text-[11px] text-blue-600 inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {h.locationName}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-sm sm:text-base font-extrabold text-slate-900 shrink-0">
                      ฿{formatCurrency(h.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Tab 3: ร่วมกัน (Couple Shared Overview + Settle Up + AI Insight + 3D Illustration)
  const renderSharedTab = () => {
    const { coupleSummary, monthlyComparison } = analytics;
    const maxMonthVal = Math.max(
      1000,
      ...monthlyComparison.map((m) =>
        Math.max(m.sharedTotal, m.peeTotal, m.nurseTotal)
      )
    );

    return (
      <div className="space-y-5">
        {/* 5. Prominent Sun-Yellow Settlement Card + Electric Royal Blue AI Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
          {/* Sun-Yellow Feature Card: สรุปว่าใครต้องโอนคืนใคร + ปุ่มเคลียร์เงิน */}
          <div className="lg:col-span-7 bento-yellow-card p-5 sm:p-6 flex flex-col justify-between gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-amber-300 text-xs font-bold">
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  สรุปว่าใครต้องโอนคืนใคร ({periodLabel})
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-3 leading-tight">
                  {coupleSummary.netDirection === 'settled' ? (
                    'เคลียร์ยอดเรียบร้อย ไม่มียอดค้างกัน 🎉'
                  ) : coupleSummary.netDirection === 'nurse_pays_pee' ? (
                    <>
                      👩‍💼 เนิร์ส ต้องโอนคืนให้ 👨‍💻 พี{' '}
                      <span className="underline">
                        ฿{formatCurrency(coupleSummary.netAmount)}
                      </span>
                    </>
                  ) : (
                    <>
                      👨‍💻 พี ต้องโอนคืนให้ 👩‍💼 เนิร์ส{' '}
                      <span className="underline">
                        ฿{formatCurrency(coupleSummary.netAmount)}
                      </span>
                    </>
                  )}
                </h3>
                <p className="text-xs font-semibold text-slate-800/80 mt-1.5">
                  พีออกให้เนิร์สคงเหลือ ฿{formatCurrency(coupleSummary.peeAdvancedForNurseTotal)}{' '}
                  • เนิร์สออกให้พีคงเหลือ ฿
                  {formatCurrency(coupleSummary.nurseAdvancedForPeeTotal)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-900/10">
              <div className="text-xs font-bold text-slate-800">
                {(coupleSummary.nurseSettledToPeeTotal > 0 ||
                  coupleSummary.peeSettledToNurseTotal > 0) && (
                  <span>
                    ✅ โอนเคลียร์กันแล้วรวม ฿
                    {formatCurrency(
                      coupleSummary.nurseSettledToPeeTotal +
                        coupleSummary.peeSettledToNurseTotal
                    )}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={onOpenSettleModal}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-amber-300 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
              >
                <HandCoins className="w-4 h-4" />
                💸 กดเคลียร์เงินคืนให้กัน / ดูประวัติเคลียร์ยอด
              </button>
            </div>
          </div>

          {/* Electric Royal Blue Gradient AI Card with API Key Settings Button */}
          <div className="lg:col-span-5 bento-royal-card p-5 sm:p-6 text-white flex flex-col justify-between gap-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center text-amber-300 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </span>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200 block">
                    Gemini AI Financial Advisor
                  </span>
                  <h4 className="text-base sm:text-lg font-extrabold text-white">
                    AI วิเคราะห์การใช้จ่ายคู่รัก
                  </h4>
                </div>
              </div>
              <span
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
                  hasApiKey
                    ? 'bg-emerald-400/20 text-emerald-200 border border-emerald-400/40'
                    : 'bg-amber-400 text-slate-950'
                }`}
              >
                {hasApiKey ? 'เชื่อมต่อ Key แล้ว' : 'ยังไม่ได้ใส่ Key'}
              </span>
            </div>

            <p className="text-xs text-blue-100 leading-relaxed">
              ให้ AI ช่วยสรุปสัดส่วนค่าอาหาร น้ำมัน ที่พัก ช้อปปิ้ง และแนะนำการบริหารงบของเนิร์สและพีแบบเข้าใจง่าย
            </p>

            <button
              type="button"
              onClick={onOpenAiModal}
              className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-blue-50 text-blue-900 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
            >
              <KeyRound className="w-4 h-4 text-blue-600" />
              {hasApiKey
                ? '✨ เปิด AI วิเคราะห์รายจ่าย / แก้ไข API Key'
                : '🔑 ใส่ Gemini API Key และเริ่มวิเคราะห์ด้วย AI'}
            </button>
          </div>
        </div>

        {/* 4 Shared Summary Cards (2x2 on Mobile) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bento-card p-4 sm:p-5">
            <p className="text-[11px] sm:text-xs font-bold text-slate-500">
              1. ยอดใช้จ่ายร่วมทั้งหมด
            </p>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
              ฿{formatCurrency(coupleSummary.totalSharedExpense)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">{periodLabel}</p>
          </div>

          <div className="bento-card p-4 sm:p-5 border-t-4 border-t-blue-600">
            <p className="text-[11px] sm:text-xs font-bold text-blue-700">2. ยอดที่พีจ่าย</p>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
              ฿{formatCurrency(coupleSummary.peePaidTotal)}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              รับผิดชอบจริง ฿{formatCurrency(coupleSummary.peeResponsibleTotal)}
            </p>
          </div>

          <div className="bento-card p-4 sm:p-5 border-t-4 border-t-rose-500">
            <p className="text-[11px] sm:text-xs font-bold text-rose-700">3. ยอดที่เนิร์สจ่าย</p>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
              ฿{formatCurrency(coupleSummary.nursePaidTotal)}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              รับผิดชอบจริง ฿{formatCurrency(coupleSummary.nurseResponsibleTotal)}
            </p>
          </div>

          <div className="bento-card p-4 sm:p-5 border-t-4 border-t-amber-400">
            <p className="text-[11px] sm:text-xs font-bold text-amber-800">
              4. รับผิดชอบจริงแต่ละคน
            </p>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xs font-bold text-blue-700">👨‍💻 พี:</span>
              <span className="text-sm sm:text-base font-extrabold text-slate-900">
                ฿{formatCurrency(coupleSummary.peeResponsibleTotal)}
              </span>
            </div>
            <div className="mt-0.5 flex items-baseline justify-between">
              <span className="text-xs font-bold text-rose-600">👩‍💼 เนิร์ส:</span>
              <span className="text-sm sm:text-base font-extrabold text-slate-900">
                ฿{formatCurrency(coupleSummary.nurseResponsibleTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* 6. กราฟเปรียบเทียบค่าใช้จ่ายรายเดือน */}
          <div className="lg:col-span-7 bento-card p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  กราฟเปรียบเทียบรายเดือน (พ.ศ. {selectedYear + 543})
                </h3>
                <p className="text-xs text-slate-500">
                  เปรียบเทียบยอดของ พี vs เนิร์ส vs ร่วมกัน
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-bold">
                <span className="inline-flex items-center gap-1 text-blue-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> พี
                </span>
                <span className="inline-flex items-center gap-1 text-rose-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> เนิร์ส
                </span>
                <span className="inline-flex items-center gap-1 text-amber-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> ร่วมกัน
                </span>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-1 sm:gap-2 items-end h-48 pt-4 px-1 border-b border-slate-200">
              {monthlyComparison.map((m) => {
                const peeH = Math.round((m.peeTotal / maxMonthVal) * 100);
                const nurseH = Math.round((m.nurseTotal / maxMonthVal) * 100);
                const sharedH = Math.round((m.sharedTotal / maxMonthVal) * 100);
                const isSelectedM = !isAllTime && m.month === selectedMonth;

                return (
                  <div
                    key={m.month}
                    onClick={() => {
                      setIsAllTime(false);
                      setSelectedMonth(m.month);
                    }}
                    className={`flex flex-col items-center h-full justify-end cursor-pointer rounded-xl p-0.5 sm:p-1 transition ${
                      isSelectedM ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-full flex items-end justify-center gap-0.5 h-32">
                      <div
                        className="w-1.5 sm:w-2 rounded-t-full bg-blue-600"
                        style={{ height: `${Math.max(m.peeTotal > 0 ? 6 : 2, peeH)}%` }}
                      />
                      <div
                        className="w-1.5 sm:w-2 rounded-t-full bg-rose-500"
                        style={{ height: `${Math.max(m.nurseTotal > 0 ? 6 : 2, nurseH)}%` }}
                      />
                      <div
                        className="w-1.5 sm:w-2 rounded-t-full bg-amber-400"
                        style={{ height: `${Math.max(m.sharedTotal > 0 ? 6 : 2, sharedH)}%` }}
                      />
                    </div>
                    <span
                      className={`text-[9px] sm:text-[10px] mt-1.5 font-bold ${
                        isSelectedM ? 'text-blue-700' : 'text-slate-500'
                      }`}
                    >
                      {m.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 7. สัดส่วนค่าใช้จ่ายแยกตามหมวด */}
          <div className="lg:col-span-5 bento-card p-5 sm:p-6">
            <div className="mb-4">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-blue-600" />
                สัดส่วนค่าใช้จ่ายร่วมแยกตามหมวด
              </h3>
              <p className="text-xs text-slate-500">{periodLabel}</p>
            </div>
            {renderCategoryDonut(
              coupleSummary.categoryProportions,
              coupleSummary.totalSharedExpense
            )}
          </div>
        </div>

        {/* 3D Isometric Bento Showcase Card at bottom of Dashboard */}
        <div className="bento-ice-card p-5 flex items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-white px-3 py-1 rounded-full">
              <Wallet className="w-3 h-3 text-blue-600" />
              TogetherPay Couple Wallet
            </span>
            <h4 className="text-base sm:text-lg font-extrabold text-slate-900 mt-2">
              ซิงค์ข้อมูลเรียลไทม์ระหว่าง เนิร์ส & พี
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              ข้อมูลทุกหมวดหมู่และประวัติการเคลียร์เงินถูกจัดเก็บอย่างปลอดภัยบน Cloud Firestore
            </p>
          </div>
          <img
            src="/hero-isometric.jpg"
            alt="TogetherPay 3D"
            className="w-24 h-24 sm:w-28 sm:h-28 object-contain rounded-2xl mix-blend-multiply shrink-0"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Top Filter Bar + 3 Tabs */}
      <div className="bento-card p-4 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
              Dashboard สรุปภาพรวม
            </h2>
            <p className="text-xs text-slate-500">
              เลือกดูแยกของพี ของเนิร์ส หรือภาพรวมร่วมกัน
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
                isAllTime
                  ? 'bg-slate-100 border-slate-200 opacity-60'
                  : 'bg-blue-50 border-blue-200'
              }`}
            >
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              <select
                value={selectedMonth}
                onChange={(e) => {
                  setIsAllTime(false);
                  setSelectedMonth(Number(e.target.value));
                }}
                className="bg-transparent text-xs font-extrabold text-slate-800 outline-none cursor-pointer"
              >
                {THAI_MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    เดือน{m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-xs font-extrabold text-slate-800 outline-none cursor-pointer"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    พ.ศ. {y + 543}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setIsAllTime((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold border transition cursor-pointer ${
                isAllTime
                  ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              {isAllTime ? 'ภาพรวมทั้งหมด ✓' : 'ดูภาพรวมทั้งหมด'}
            </button>
          </div>
        </div>

        {/* 3 Tabs Selector */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setActiveTab('pee')}
            className={`py-2.5 px-2 rounded-2xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'pee'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            <span>👨‍💻</span>
            <span>1. ของพี</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('nurse')}
            className={`py-2.5 px-2 rounded-2xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'nurse'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            <span>👩‍💼</span>
            <span>2. ของเนิร์ส</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('shared')}
            className={`py-2.5 px-2 rounded-2xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'shared'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            <span>💑</span>
            <span>3. ร่วมกัน</span>
          </button>
        </div>
      </div>

      {activeTab === 'pee' && renderPersonTab('pee')}
      {activeTab === 'nurse' && renderPersonTab('nurse')}
      {activeTab === 'shared' && renderSharedTab()}
    </div>
  );
};
