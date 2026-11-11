import React from 'react';
import {
  ArrowUpRight,
  Sparkles,
  HeartHandshake,
  Wallet,
  TrendingUp,
  CheckCircle2,
  MapPin,
} from 'lucide-react';
import { CoupleSettlementSummary, formatCurrency } from '../utils/calculations';
import { THAI_MONTHS } from '../types';

interface BentoHeroProps {
  coupleSummary: CoupleSettlementSummary;
  activeModule: 'shared' | 'personal' | 'monthly' | 'dashboard';
  onSelectModule: (mod: 'shared' | 'personal' | 'monthly' | 'dashboard') => void;
  currentMonth: number;
  currentYear: number;
  totalItemsCount: number;
}

export const BentoHero: React.FC<BentoHeroProps> = ({
  coupleSummary,
  activeModule,
  onSelectModule,
  currentMonth,
  currentYear,
  totalItemsCount,
}) => {
  const monthLabel = THAI_MONTHS.find((m) => m.value === currentMonth)?.label || '';
  const topCategory =
    [...coupleSummary.categoryProportions].sort((a, b) => b.amount - a.amount)[0] || null;

  return (
    <section className="mb-8">
      {/* Asymmetric 2-Column Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Column (7 cols): Prominent Sun-Yellow Feature Card + Quick Stats */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* Prominent Sun-Yellow Feature Card */}
          <div className="bento-yellow-card p-6 sm:p-8 relative overflow-hidden flex flex-col justify-between min-h-[240px]">
            {/* Decorative Subtle Circles */}
            <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-white/25 blur-xl pointer-events-none" />
            <div className="absolute right-16 -bottom-12 w-36 h-36 rounded-full bg-amber-500/20 blur-lg pointer-events-none" />

            <div className="flex items-start justify-between gap-4 relative z-10">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-slate-900/10 text-slate-900 text-xs font-bold tracking-wide uppercase backdrop-blur-xs">
                  <HeartHandshake className="w-3.5 h-3.5" />
                  TogetherPay • คู่รัก เนิร์ส & พี
                </span>
                <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  {coupleSummary.netDirection === 'settled' ? (
                    <>เคลียร์ยอดเรียบร้อย ไม่มียอดค้างกัน 🎉</>
                  ) : coupleSummary.netDirection === 'nurse_pays_pee' ? (
                    <>
                      เนิร์ส ต้องโอนคืนให้ พี{' '}
                      <span className="underline decoration-slate-900/40 decoration-2 underline-offset-4">
                        ฿{formatCurrency(coupleSummary.netAmount)}
                      </span>
                    </>
                  ) : (
                    <>
                      พี ต้องโอนคืนให้ เนิร์ส{' '}
                      <span className="underline decoration-slate-900/40 decoration-2 underline-offset-4">
                        ฿{formatCurrency(coupleSummary.netAmount)}
                      </span>
                    </>
                  )}
                </h2>
                <p className="mt-1.5 text-sm font-medium text-slate-800/80">
                  สรุปสถานะหักลบกลบหนี้ประจำเดือน {monthLabel} {currentYear + 543} • บันทึกแล้ว{' '}
                  {totalItemsCount} รายการ
                </p>
              </div>

              {/* Circular Action Button with Arrow Icon */}
              <button
                onClick={() => onSelectModule('dashboard')}
                title="เปิดดู Dashboard สรุปล่าสุด"
                className="w-12 h-12 shrink-0 rounded-full bg-slate-900 text-amber-300 hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-lg cursor-pointer"
              >
                <ArrowUpRight className="w-5 h-5" />
              </button>
            </div>

            {/* Bottom Pills inside Sun-Yellow Card */}
            <div className="mt-6 pt-4 border-t border-slate-900/10 grid grid-cols-3 gap-3 relative z-10">
              <div className="bg-white/65 backdrop-blur-md rounded-2xl p-3 border border-white/60">
                <p className="text-[11px] font-semibold text-slate-600">ยอดใช้จ่ายร่วมทั้งหมด</p>
                <p className="text-base sm:text-lg font-extrabold text-slate-900 mt-0.5">
                  ฿{formatCurrency(coupleSummary.totalSharedExpense)}
                </p>
              </div>
              <div className="bg-white/65 backdrop-blur-md rounded-2xl p-3 border border-white/60">
                <p className="text-[11px] font-semibold text-slate-600">👨‍💻 พีออกแทนเนิร์ส</p>
                <p className="text-base sm:text-lg font-extrabold text-blue-800 mt-0.5">
                  ฿{formatCurrency(coupleSummary.peeAdvancedForNurseTotal)}
                </p>
              </div>
              <div className="bg-white/65 backdrop-blur-md rounded-2xl p-3 border border-white/60">
                <p className="text-[11px] font-semibold text-slate-600">👩‍💼 เนิร์สออกแทนพี</p>
                <p className="text-base sm:text-lg font-extrabold text-rose-700 mt-0.5">
                  ฿{formatCurrency(coupleSummary.nurseAdvancedForPeeTotal)}
                </p>
              </div>
            </div>
          </div>

          {/* Sub-Bento Row: 2 Pure White Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Pure White Card 1: Quick Action to Shared Expense + GPS */}
            <div className="bento-card p-5 flex items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                  <MapPin className="w-3.5 h-3.5" />
                  GPS Location Ready
                </div>
                <h3 className="mt-2 font-bold text-slate-900 text-base">
                  หารค่าข้าว / ทริปด้วยกัน
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  พีรับผิดชอบจริง ฿{formatCurrency(coupleSummary.peeResponsibleTotal)} • เนิร์ส ฿
                  {formatCurrency(coupleSummary.nurseResponsibleTotal)}
                </p>
              </div>
              <button
                onClick={() => onSelectModule('shared')}
                className="w-11 h-11 shrink-0 rounded-full bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white transition-all flex items-center justify-center shadow-xs cursor-pointer"
                title="ไปที่บันทึกค่าใช้จ่าย (ร่วมกัน)"
              >
                <ArrowUpRight className="w-5 h-5" />
              </button>
            </div>

            {/* Pure White Card 2: Monthly Bills Quick Check */}
            <div className="bento-card p-5 flex items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Checklist & แนบสลิป
                </div>
                <h3 className="mt-2 font-bold text-slate-900 text-base">
                  บิลเรียกเก็บรายเดือน
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  แชร์ค่าห้อง ค่าน้ำ ค่าไฟ พร้อมแนบสลิปโอนเงิน
                </p>
              </div>
              <button
                onClick={() => onSelectModule('monthly')}
                className="w-11 h-11 shrink-0 rounded-full bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white transition-all flex items-center justify-center shadow-xs cursor-pointer"
                title="ไปที่ค่าใช้จ่ายเรียกเก็บรายเดือน"
              >
                <ArrowUpRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): 3D Floating Isometric Illustration Center Card + Electric Royal Blue AI Card */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* 3D Floating Isometric Illustration Centerpiece Card */}
          <div className="bento-ice-card p-5 relative overflow-hidden flex items-center justify-between gap-4 min-h-[175px]">
            <div className="z-10 max-w-[55%]">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-white/90 px-3 py-1 rounded-full shadow-2xs">
                <Wallet className="w-3 h-3 text-blue-600" />
                Smart Couple Wallet
              </span>
              <h3 className="mt-2.5 text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">
                บันทึกง่าย แยกกระเป๋าชัด ไม่สับสนเรื่องเงิน
              </h3>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                ซิงค์ข้อมูลเรียลไทม์ผ่าน Cloud Firestore พร้อมคำนวณยอดโอนคืนอัตโนมัติ
              </p>
            </div>

            <div className="w-36 h-36 sm:w-40 sm:h-40 shrink-0 relative flex items-center justify-center">
              <img
                src="/hero-isometric.jpg"
                alt="TogetherPay 3D Isometric Illustration"
                className="w-full h-full object-contain rounded-2xl animate-float-slow mix-blend-multiply"
              />
            </div>
          </div>

          {/* Electric Royal Blue Gradient AI Insight Card */}
          <div className="bento-royal-card p-6 text-white relative overflow-hidden flex-1 flex flex-col justify-between">
            <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full bg-blue-400/20 blur-2xl pointer-events-none" />

            <div className="flex items-start justify-between gap-3 relative z-10">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-amber-300">
                  <Sparkles className="w-4 h-4" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-200">
                    AI Couple Financial Insight
                  </p>
                  <h4 className="text-base font-bold text-white">
                    วิเคราะห์สัดส่วนการใช้จ่ายอัจฉริยะ
                  </h4>
                </div>
              </div>

              <button
                onClick={() =>
                  onSelectModule(activeModule === 'dashboard' ? 'personal' : 'dashboard')
                }
                className="w-10 h-10 shrink-0 rounded-full bg-white/15 hover:bg-white text-white hover:text-blue-700 transition-all flex items-center justify-center cursor-pointer"
                title="ดูการวิเคราะห์ใน Dashboard"
              >
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15 relative z-10">
              {topCategory && topCategory.amount > 0 ? (
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-blue-100">หมวดที่ใช้จ่ายร่วมกันสูงสุดเดือนนี้</p>
                    <p className="text-sm font-bold text-white mt-0.5">
                      {topCategory.emoji} หมวด{topCategory.category} • ฿
                      {formatCurrency(topCategory.amount)} ({topCategory.percentage}%)
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-bold bg-amber-400 text-slate-950 px-2.5 py-1 rounded-full">
                    <TrendingUp className="w-3.5 h-3.5" />
                    {topCategory.percentage}%
                  </span>
                </div>
              ) : (
                <p className="text-xs text-blue-100 leading-relaxed">
                  💡 เริ่มต้นบันทึกรายการอาหาร น้ำมัน ที่พัก ช้อปปิ้ง หรือท่องเที่ยว เพื่อดูสรุปสัดส่วนและคำแนะนำทางการเงินของเนิร์สและพีแบบเรียลไทม์
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
