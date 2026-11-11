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
  ArrowUpRight,
} from 'lucide-react';
import {
  CATEGORIES,
  MonthlyBill,
  MonthlyBillPayment,
  PERSON_INFO,
  PersonId,
  PersonalExpense,
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

interface ModuleDashboardProps {
  sharedExpenses: SharedExpense[];
  personalExpenses: PersonalExpense[];
  monthlyBills: MonthlyBill[];
  monthlyPayments: MonthlyBillPayment[];
}

export const ModuleDashboard: React.FC<ModuleDashboardProps> = ({
  sharedExpenses,
  personalExpenses,
  monthlyBills,
  monthlyPayments,
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

  // Helper to render SVG Donut Chart + Legend
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
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* SVG Donut */}
        <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
          <svg className="w-40 h-40 -rotate-90" viewBox="0 0 148 148">
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

        {/* Category Bars */}
        <div className="flex-1 w-full space-y-3">
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

  // Render Individual Tab (ของพี or ของเนิร์ส)
  const renderPersonTab = (personId: PersonId) => {
    const metrics = personId === 'pee' ? analytics.peeMetrics : analytics.nurseMetrics;
    const partnerId: PersonId = personId === 'pee' ? 'nurse' : 'pee';
    const personInfo = PERSON_INFO[personId];
    const partnerInfo = PERSON_INFO[partnerId];

    // History items for this person in the selected scope
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

    // Active monthly bills for this person in selected month
    const ym = formatYearMonth(selectedYear, selectedMonth);
    const personMonthlyList = monthlyBills.filter(
      (b) =>
        isBillActiveInYearMonth(b, ym) &&
        (b.owner === personId || b.splitWithPartner)
    );

    return (
      <div className="space-y-6">
        {/* 4 Key Metric Cards in Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. ยอดค่าใช้จ่ายส่วนตัว */}
          <div className="bento-card p-5 border-t-4 border-t-slate-900">
            <p className="text-xs font-bold text-slate-500">
              1. ยอดค่าใช้จ่ายส่วนตัว ({personInfo.name})
            </p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1.5">
              ฿{formatCurrency(metrics.personalTotal)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              รวมส่วนที่รับผิดชอบในรายการร่วมอีก ฿
              {formatCurrency(metrics.sharedResponsibleTotal)}
            </p>
          </div>

          {/* 2. ยอดที่ออกแทนอีกฝ่าย */}
          <div className="bento-card p-5 border-t-4 border-t-emerald-500">
            <p className="text-xs font-bold text-emerald-700">
              2. ยอดที่{personInfo.name}ออกแทน{partnerInfo.name}
            </p>
            <p className="text-2xl font-extrabold text-emerald-700 mt-1.5">
              ฿{formatCurrency(metrics.advancedForPartner)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              รอรับโอนคืนจาก{partnerInfo.name}
            </p>
          </div>

          {/* 3. ยอดที่ต้องจ่ายให้อีกฝ่าย */}
          <div className="bento-card p-5 border-t-4 border-t-rose-500">
            <p className="text-xs font-bold text-rose-600">
              3. ยอดที่{personInfo.name}ต้องจ่ายให้{partnerInfo.name}
            </p>
            <p className="text-2xl font-extrabold text-rose-600 mt-1.5">
              ฿{formatCurrency(metrics.owesToPartner)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              ยอดที่{partnerInfo.name}ออกให้ก่อน
            </p>
          </div>

          {/* 4. ค่าใช้จ่ายรายเดือน */}
          <div className="bento-card p-5 border-t-4 border-t-blue-600">
            <p className="text-xs font-bold text-blue-700">
              4. ค่าใช้จ่ายรายเดือน ({personInfo.name})
            </p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1.5">
              ฿{formatCurrency(metrics.monthlyBillsTotal)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              จ่ายแล้ว {metrics.monthlyBillsPaidCount}/{metrics.monthlyBillsTotalCount} รายการ
            </p>
          </div>
        </div>

        {/* Asymmetric 2-Column Row: Category Chart + Monthly Bills Detail */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* กราฟค่าใช้จ่ายแยกตามหมวด (7 cols) */}
          <div className="lg:col-span-7 bento-card p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-blue-600" />
                  กราฟค่าใช้จ่ายแยกตามหมวดของ{personInfo.name}
                </h3>
                <p className="text-xs text-slate-500">
                  รวมค่าใช้จ่ายส่วนตัว + ส่วนที่รับผิดชอบจริง ({periodLabel})
                </p>
              </div>
            </div>
            {renderCategoryDonut(metrics.categoryTotals, totalCategorySum)}
          </div>

          {/* รายละเอียดค่าใช้จ่ายรายเดือนของคนนี้ (5 cols) */}
          <div className="lg:col-span-5 bento-card p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                รายการบิลรายเดือนของ{personInfo.name}
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                สถานะประจำงวด {ym}
              </p>

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
                        className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between"
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
        </div>

        {/* ประวัติค่าใช้จ่ายย้อนหลัง */}
        <div className="bento-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                ประวัติค่าใช้จ่ายย้อนหลังของ{personInfo.name} ({periodLabel})
              </h3>
              <p className="text-xs text-slate-500">
                รวมรายการส่วนตัวและรายการร่วมกันที่เกี่ยวข้องกับ{personInfo.name}
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
              {combinedHistory.length} รายการ
            </span>
          </div>

          {combinedHistory.length === 0 ? (
            <div className="text-center py-10 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500">
              ยังไม่มีประวัติค่าใช้จ่ายในช่วงเวลานี้
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {combinedHistory.map((h) => {
                const catObj =
                  CATEGORIES.find((c) => c.id === h.category) || CATEGORIES[0];
                return (
                  <div
                    key={h.id}
                    className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-2xl ${catObj.bgLight} ${catObj.textDark} flex items-center justify-center text-lg shrink-0`}
                      >
                        {catObj.emoji}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{h.title}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              h.type === 'ส่วนตัว'
                                ? 'bg-slate-200 text-slate-700'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {h.type}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          📅 {h.date} • {h.detail}
                        </p>
                        {h.locationName && (
                          <p className="text-[11px] text-blue-600 inline-flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" /> {h.locationName}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-extrabold text-slate-900">
                        ฿{formatCurrency(h.amount)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render Tab 3: ร่วมกัน (Couple Shared Overview)
  const renderSharedTab = () => {
    const { coupleSummary, monthlyComparison } = analytics;
    const maxMonthVal = Math.max(
      1000,
      ...monthlyComparison.map((m) =>
        Math.max(m.sharedTotal, m.peeTotal, m.nurseTotal)
      )
    );

    return (
      <div className="space-y-6">
        {/* Top Row: 4 Shared Summary Cards + Net Settlement Feature Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bento-card p-5">
            <p className="text-xs font-bold text-slate-500">1. ยอดค่าใช้จ่ายร่วมทั้งหมด</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1.5">
              ฿{formatCurrency(coupleSummary.totalSharedExpense)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">{periodLabel}</p>
          </div>

          <div className="bento-card p-5 border-t-4 border-t-blue-600">
            <p className="text-xs font-bold text-blue-700">2. ยอดที่พีจ่ายออกไป</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1.5">
              ฿{formatCurrency(coupleSummary.peePaidTotal)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              รับผิดชอบจริง ฿{formatCurrency(coupleSummary.peeResponsibleTotal)}
            </p>
          </div>

          <div className="bento-card p-5 border-t-4 border-t-rose-500">
            <p className="text-xs font-bold text-rose-700">3. ยอดที่เนิร์สจ่ายออกไป</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1.5">
              ฿{formatCurrency(coupleSummary.nursePaidTotal)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              รับผิดชอบจริง ฿{formatCurrency(coupleSummary.nurseResponsibleTotal)}
            </p>
          </div>

          <div className="bento-card p-5 border-t-4 border-t-amber-400">
            <p className="text-xs font-bold text-amber-800">
              4. ยอดที่แต่ละคนต้องรับผิดชอบจริง
            </p>
            <div className="mt-1.5 flex items-baseline justify-between">
              <span className="text-xs font-bold text-blue-700">👨‍💻 พี:</span>
              <span className="text-base font-extrabold text-slate-900">
                ฿{formatCurrency(coupleSummary.peeResponsibleTotal)}
              </span>
            </div>
            <div className="mt-0.5 flex items-baseline justify-between">
              <span className="text-xs font-bold text-rose-600">👩‍💼 เนิร์ส:</span>
              <span className="text-base font-extrabold text-slate-900">
                ฿{formatCurrency(coupleSummary.nurseResponsibleTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Prominent Sun-Yellow + Electric Royal Blue Settlement Banner */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* 5. สรุปว่าใครต้องโอนคืนใคร */}
          <div className="lg:col-span-7 bento-yellow-card p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-amber-300 text-xs font-bold">
                <ArrowRightLeft className="w-3.5 h-3.5" />
                สรุปว่าใครต้องโอนคืนใคร ({periodLabel})
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-3">
                {coupleSummary.netDirection === 'settled' ? (
                  'ยอดสมดุลกันพอดี ไม่ต้องโอนคืน 🎉'
                ) : coupleSummary.netDirection === 'nurse_pays_pee' ? (
                  <>
                    👩‍💼 เนิร์ส โอนคืนให้ 👨‍💻 พี = ฿{formatCurrency(coupleSummary.netAmount)}
                  </>
                ) : (
                  <>
                    👨‍💻 พี โอนคืนให้ 👩‍💼 เนิร์ส = ฿{formatCurrency(coupleSummary.netAmount)}
                  </>
                )}
              </h3>
              <p className="text-xs font-semibold text-slate-800/80 mt-1.5">
                คำนวณจาก: พีออกแทนเนิร์ส (฿
                {formatCurrency(coupleSummary.peeAdvancedForNurseTotal)}) หักลบ เนิร์สออกแทนพี (฿
                {formatCurrency(coupleSummary.nurseAdvancedForPeeTotal)})
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-slate-900 text-amber-300 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>

          {/* Electric Royal Blue Card */}
          <div className="lg:col-span-5 bento-royal-card p-6 text-white flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-300" />
                Couple Balance Breakdown
              </span>
            </div>
            <div className="my-3 grid grid-cols-2 gap-3">
              <div className="bg-white/10 rounded-2xl p-3 border border-white/15">
                <span className="text-[11px] text-blue-100 block">พีออกให้เนิร์สสะสม</span>
                <span className="text-lg font-extrabold text-white">
                  ฿{formatCurrency(coupleSummary.peeAdvancedForNurseTotal)}
                </span>
              </div>
              <div className="bg-white/10 rounded-2xl p-3 border border-white/15">
                <span className="text-[11px] text-blue-100 block">เนิร์สออกให้พีสะสม</span>
                <span className="text-lg font-extrabold text-white">
                  ฿{formatCurrency(coupleSummary.nurseAdvancedForPeeTotal)}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-blue-100">
              ระบบคำนวณรวมทั้งรายการใช้จ่ายร่วมกัน และบิลรายเดือนที่ตั้งแชร์กันอัตโนมัติ
            </p>
          </div>
        </div>

        {/* Charts Row: 6. กราฟเปรียบเทียบค่าใช้จ่ายรายเดือน + 7. สัดส่วนค่าใช้จ่ายแยกตามหมวด */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 6. กราฟเปรียบเทียบค่าใช้จ่ายรายเดือน */}
          <div className="lg:col-span-7 bento-card p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  กราฟเปรียบเทียบค่าใช้จ่ายรายเดือน (ปี พ.ศ. {selectedYear + 543})
                </h3>
                <p className="text-xs text-slate-500">
                  เปรียบเทียบยอดใช้จ่ายรายเดือนของ พี vs เนิร์ส vs ยอดร่วมกัน
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

            <div className="grid grid-cols-12 gap-2 items-end h-52 pt-6 px-1 border-b border-slate-200">
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
                    className={`flex flex-col items-center h-full justify-end cursor-pointer group rounded-xl p-1 transition ${
                      isSelectedM ? 'bg-blue-50/90 ring-1 ring-blue-200' : 'hover:bg-slate-50'
                    }`}
                    title={`${m.label}: ร่วมกัน ฿${formatCurrency(
                      m.sharedTotal
                    )} | พี ฿${formatCurrency(m.peeTotal)} | เนิร์ส ฿${formatCurrency(
                      m.nurseTotal
                    )}`}
                  >
                    <div className="w-full flex items-end justify-center gap-0.5 h-36">
                      <div
                        className="w-2 rounded-t-full bg-blue-600 transition-all duration-500"
                        style={{ height: `${Math.max(m.peeTotal > 0 ? 6 : 2, peeH)}%` }}
                      />
                      <div
                        className="w-2 rounded-t-full bg-rose-500 transition-all duration-500"
                        style={{ height: `${Math.max(m.nurseTotal > 0 ? 6 : 2, nurseH)}%` }}
                      />
                      <div
                        className="w-2 rounded-t-full bg-amber-400 transition-all duration-500"
                        style={{ height: `${Math.max(m.sharedTotal > 0 ? 6 : 2, sharedH)}%` }}
                      />
                    </div>
                    <span
                      className={`text-[10px] mt-2 font-bold ${
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

          {/* 7. สัดส่วนค่าใช้จ่ายแยกตามหมวด (5 cols) */}
          <div className="lg:col-span-5 bento-card p-6">
            <div className="mb-5">
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
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
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Filter Bar: เลือกเดือน, เลือกปี, ปุ่มดูภาพรวมทั้งหมด + 3 Tabs */}
      <div className="bento-card p-5 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">
              โมดูล 4 : Dashboard สรุปภาพรวมทางการเงิน
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              วิเคราะห์ค่าใช้จ่ายของพี ของเนิร์ส และค่าใช้จ่ายร่วมกันแบบละเอียด
            </p>
          </div>

          {/* Filters: เลือกเดือน / เลือกปี / ปุ่มดูภาพรวมทั้งหมด */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div
              className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl border transition ${
                isAllTime
                  ? 'bg-slate-100/60 border-slate-200 opacity-60'
                  : 'bg-blue-50 border-blue-200'
              }`}
            >
              <Filter className="w-4 h-4 text-blue-600" />
              <select
                value={selectedMonth}
                onChange={(e) => {
                  setIsAllTime(false);
                  setSelectedMonth(Number(e.target.value));
                }}
                className="bg-transparent text-xs sm:text-sm font-bold text-slate-800 outline-none cursor-pointer"
              >
                {THAI_MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    เดือน{m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-2 rounded-2xl border border-slate-200">
              <Calendar className="w-4 h-4 text-blue-600" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-xs sm:text-sm font-bold text-slate-800 outline-none cursor-pointer"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    พ.ศ. {y + 543} ({y})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setIsAllTime((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs sm:text-sm font-extrabold border transition cursor-pointer ${
                isAllTime
                  ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Globe className="w-4 h-4" />
              {isAllTime ? 'กำลังดูภาพรวมทั้งหมด ✓' : 'ดูภาพรวมทั้งหมด'}
            </button>
          </div>
        </div>

        {/* 3 Tabs Selector: 1. ของพี | 2. ของเนิร์ส | 3. ร่วมกัน */}
        <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setActiveTab('pee')}
            className={`py-3 px-4 rounded-2xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'pee'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <span>👨‍💻</span>
            <span>1. ของพี</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('nurse')}
            className={`py-3 px-4 rounded-2xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'nurse'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <span>👩‍💼</span>
            <span>2. ของเนิร์ส</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('shared')}
            className={`py-3 px-4 rounded-2xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'shared'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/25'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <span>💑</span>
            <span>3. ร่วมกัน</span>
          </button>
        </div>
      </div>

      {/* Render Selected Tab Content */}
      {activeTab === 'pee' && renderPersonTab('pee')}
      {activeTab === 'nurse' && renderPersonTab('nurse')}
      {activeTab === 'shared' && renderSharedTab()}
    </div>
  );
};
