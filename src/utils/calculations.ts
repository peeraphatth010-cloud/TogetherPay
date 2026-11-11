import {
  ExpenseCategory,
  MonthlyBill,
  MonthlyBillPayment,
  PersonId,
  PersonalExpense,
  SharedExpense,
  CATEGORIES,
} from '../types';

export interface SplitBreakdown {
  peePaid: number;
  nursePaid: number;
  peeResponsible: number;
  nurseResponsible: number;
  peeAdvancedForNurse: number; // ยอดที่พีออกแทนเนิร์สในรายการนี้
  nurseAdvancedForPee: number; // ยอดที่เนิร์สออกแทนพีในรายการนี้
}

/**
 * คำนวณสัดส่วนของค่าใช้จ่ายร่วมกัน 1 รายการ
 */
export function calculateSharedItemBreakdown(item: SharedExpense): SplitBreakdown {
  const amount = Number(item.amount) || 0;
  const peePaid = item.payer === 'pee' ? amount : 0;
  const nursePaid = item.payer === 'nurse' ? amount : 0;

  let peeResponsible = 0;
  let nurseResponsible = 0;

  if (item.splitType === 'split_2') {
    peeResponsible = amount / 2;
    nurseResponsible = amount / 2;
  } else if (item.splitType === 'nurse_only') {
    nurseResponsible = amount;
    peeResponsible = 0;
  } else if (item.splitType === 'pee_only') {
    peeResponsible = amount;
    nurseResponsible = 0;
  }

  // ยอดที่พีออกแทนเนิร์ส = ถ้าพีเป็นคนจ่าย เนิร์สรับผิดชอบเท่าไหร่ พีก็ออกแทนเนิร์สเท่านั้น
  const peeAdvancedForNurse = item.payer === 'pee' ? nurseResponsible : 0;
  // ยอดที่เนิร์สออกแทนพี = ถ้าเนิร์สเป็นคนจ่าย พีรับผิดชอบเท่าไหร่ เนิร์สก็ออกแทนพีเท่านั้น
  const nurseAdvancedForPee = item.payer === 'nurse' ? peeResponsible : 0;

  return {
    peePaid,
    nursePaid,
    peeResponsible,
    nurseResponsible,
    peeAdvancedForNurse,
    nurseAdvancedForPee,
  };
}

/**
 * ตรวจสอบว่าบิลรายเดือนอยู่ในช่วงเดือน-ปีที่เลือกหรือไม่ (YYYY-MM)
 */
export function isBillActiveInYearMonth(bill: MonthlyBill, yearMonth: string): boolean {
  if (!bill.startMonth || !bill.endMonth) return true;
  return yearMonth >= bill.startMonth && yearMonth <= bill.endMonth;
}

export function formatYearMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

export interface PersonDashboardMetrics {
  person: PersonId;
  personalTotal: number;
  sharedResponsibleTotal: number;
  advancedForPartner: number; // ยอดที่ออกแทนอีกฝ่าย (จากรายการร่วมกัน + บิลรายเดือนที่จ่ายแล้วแต่คู่ยังไม่จ่ายคืน)
  owesToPartner: number; // ยอดที่ต้องจ่ายให้อีกฝ่าย
  monthlyBillsTotal: number; // ยอดบิลรายเดือนที่ตัวเองรับผิดชอบในงวดนี้
  monthlyBillsPaidCount: number;
  monthlyBillsTotalCount: number;
  categoryTotals: {
    category: ExpenseCategory;
    amount: number;
    percentage: number;
    color: string;
    emoji: string;
  }[];
}

export interface CoupleSettlementSummary {
  totalSharedExpense: number; // ยอดค่าใช้จ่ายร่วมทั้งหมด (รวมบิลรายเดือนที่แชร์กัน)
  peePaidTotal: number; // ยอดที่พีจ่ายออกไปในส่วนร่วมกัน
  nursePaidTotal: number; // ยอดที่เนิร์สจ่ายออกไปในส่วนร่วมกัน
  peeResponsibleTotal: number; // ยอดที่พีต้องรับผิดชอบจริง
  nurseResponsibleTotal: number; // ยอดที่เนิร์สต้องรับผิดชอบจริง
  peeAdvancedForNurseTotal: number; // พีออกแทนเนิร์สสะสม
  nurseAdvancedForPeeTotal: number; // เนิร์สออกแทนพีสะสม
  netDirection: 'nurse_pays_pee' | 'pee_pays_nurse' | 'settled';
  netAmount: number;
  categoryProportions: {
    category: ExpenseCategory;
    amount: number;
    percentage: number;
    color: string;
    emoji: string;
  }[];
}

export function computeDashboardAnalytics(params: {
  sharedExpenses: SharedExpense[];
  personalExpenses: PersonalExpense[];
  monthlyBills: MonthlyBill[];
  monthlyPayments: MonthlyBillPayment[];
  selectedMonth: number;
  selectedYear: number;
  isAllTime: boolean;
}): {
  peeMetrics: PersonDashboardMetrics;
  nurseMetrics: PersonDashboardMetrics;
  coupleSummary: CoupleSettlementSummary;
  monthlyComparison: {
    month: number;
    label: string;
    peeTotal: number;
    nurseTotal: number;
    sharedTotal: number;
  }[];
} {
  const {
    sharedExpenses,
    personalExpenses,
    monthlyBills,
    monthlyPayments,
    selectedMonth,
    selectedYear,
    isAllTime,
  } = params;

  // 1. Filter shared & personal expenses by month/year or all-time
  const filteredShared = isAllTime
    ? sharedExpenses
    : sharedExpenses.filter((e) => e.month === selectedMonth && e.year === selectedYear);

  const filteredPersonal = isAllTime
    ? personalExpenses
    : personalExpenses.filter((e) => e.month === selectedMonth && e.year === selectedYear);

  // 2. Shared calculations
  let totalSharedExpense = 0;
  let peePaidTotal = 0;
  let nursePaidTotal = 0;
  let peeResponsibleTotal = 0;
  let nurseResponsibleTotal = 0;
  let peeAdvancedForNurseTotal = 0;
  let nurseAdvancedForPeeTotal = 0;

  const sharedByCategory: Record<ExpenseCategory, number> = {
    อาหาร: 0,
    น้ำมัน: 0,
    ที่พัก: 0,
    ช้อปปิ้ง: 0,
    ท่องเที่ยว: 0,
  };

  const peeCategoryMap: Record<ExpenseCategory, number> = {
    อาหาร: 0,
    น้ำมัน: 0,
    ที่พัก: 0,
    ช้อปปิ้ง: 0,
    ท่องเที่ยว: 0,
  };

  const nurseCategoryMap: Record<ExpenseCategory, number> = {
    อาหาร: 0,
    น้ำมัน: 0,
    ที่พัก: 0,
    ช้อปปิ้ง: 0,
    ท่องเที่ยว: 0,
  };

  for (const item of filteredShared) {
    const b = calculateSharedItemBreakdown(item);
    totalSharedExpense += Number(item.amount) || 0;
    peePaidTotal += b.peePaid;
    nursePaidTotal += b.nursePaid;
    peeResponsibleTotal += b.peeResponsible;
    nurseResponsibleTotal += b.nurseResponsible;
    peeAdvancedForNurseTotal += b.peeAdvancedForNurse;
    nurseAdvancedForPeeTotal += b.nurseAdvancedForPee;

    if (sharedByCategory[item.category] !== undefined) {
      sharedByCategory[item.category] += Number(item.amount) || 0;
    }
    if (peeCategoryMap[item.category] !== undefined) {
      peeCategoryMap[item.category] += b.peeResponsible;
    }
    if (nurseCategoryMap[item.category] !== undefined) {
      nurseCategoryMap[item.category] += b.nurseResponsible;
    }
  }

  // 3. Personal expenses
  let peePersonalTotal = 0;
  let nursePersonalTotal = 0;

  for (const item of filteredPersonal) {
    const amt = Number(item.amount) || 0;
    if (item.owner === 'pee') {
      peePersonalTotal += amt;
      if (peeCategoryMap[item.category] !== undefined) {
        peeCategoryMap[item.category] += amt;
      }
    } else {
      nursePersonalTotal += amt;
      if (nurseCategoryMap[item.category] !== undefined) {
        nurseCategoryMap[item.category] += amt;
      }
    }
  }

  // 4. Monthly bills in selected scope
  const targetYearMonths: string[] = [];
  if (isAllTime) {
    // Collect distinct yearMonths from payments + current yearMonth
    const ymSet = new Set<string>();
    ymSet.add(formatYearMonth(selectedYear, selectedMonth));
    monthlyPayments.forEach((p) => ymSet.add(p.yearMonth));
    targetYearMonths.push(...Array.from(ymSet));
  } else {
    targetYearMonths.push(formatYearMonth(selectedYear, selectedMonth));
  }

  let peeMonthlyBillsTotal = 0;
  let peeMonthlyPaidCount = 0;
  let peeMonthlyTotalCount = 0;

  let nurseMonthlyBillsTotal = 0;
  let nurseMonthlyPaidCount = 0;
  let nurseMonthlyTotalCount = 0;

  for (const ym of targetYearMonths) {
    for (const bill of monthlyBills) {
      if (!isBillActiveInYearMonth(bill, ym)) continue;
      const payment = monthlyPayments.find((p) => p.billId === bill.id && p.yearMonth === ym);

      const totalBillAmt = payment ? payment.actualTotalAmount : bill.minAmount;
      const ownerShare = payment
        ? payment.ownerShareAmount
        : bill.splitWithPartner
        ? bill.ownerShareDefault
        : bill.minAmount;
      const partnerShare = payment
        ? payment.partnerShareAmount
        : bill.splitWithPartner
        ? bill.partnerShareDefault
        : 0;

      const ownerPaid = payment ? payment.ownerPaid : false;
      const partnerPaid = payment ? payment.partnerPaid : false;
      const cat: ExpenseCategory = bill.category || 'ที่พัก';

      if (bill.owner === 'pee') {
        peeMonthlyTotalCount += 1;
        if (ownerPaid) peeMonthlyPaidCount += 1;
        peeMonthlyBillsTotal += ownerShare;
        if (peeCategoryMap[cat] !== undefined) peeCategoryMap[cat] += ownerShare;

        if (bill.splitWithPartner && partnerShare > 0) {
          nurseMonthlyTotalCount += 1;
          if (partnerPaid) nurseMonthlyPaidCount += 1;
          nurseMonthlyBillsTotal += partnerShare;
          if (nurseCategoryMap[cat] !== undefined) nurseCategoryMap[cat] += partnerShare;

          // Include shared monthly bill in shared summary
          totalSharedExpense += totalBillAmt;
          peeResponsibleTotal += ownerShare;
          nurseResponsibleTotal += partnerShare;
          if (sharedByCategory[cat] !== undefined) sharedByCategory[cat] += totalBillAmt;

          // If Pee paid the bill and Nurse hasn't paid her share yet, Pee advanced for Nurse
          if (ownerPaid && !partnerPaid) {
            peePaidTotal += totalBillAmt;
            peeAdvancedForNurseTotal += partnerShare;
          } else if (ownerPaid && partnerPaid) {
            peePaidTotal += ownerShare;
            nursePaidTotal += partnerShare;
          }
        }
      } else {
        // Owner is Nurse
        nurseMonthlyTotalCount += 1;
        if (ownerPaid) nurseMonthlyPaidCount += 1;
        nurseMonthlyBillsTotal += ownerShare;
        if (nurseCategoryMap[cat] !== undefined) nurseCategoryMap[cat] += ownerShare;

        if (bill.splitWithPartner && partnerShare > 0) {
          peeMonthlyTotalCount += 1;
          if (partnerPaid) peeMonthlyPaidCount += 1;
          peeMonthlyBillsTotal += partnerShare;
          if (peeCategoryMap[cat] !== undefined) peeCategoryMap[cat] += partnerShare;

          totalSharedExpense += totalBillAmt;
          nurseResponsibleTotal += ownerShare;
          peeResponsibleTotal += partnerShare;
          if (sharedByCategory[cat] !== undefined) sharedByCategory[cat] += totalBillAmt;

          if (ownerPaid && !partnerPaid) {
            nursePaidTotal += totalBillAmt;
            nurseAdvancedForPeeTotal += partnerShare;
          } else if (ownerPaid && partnerPaid) {
            nursePaidTotal += ownerShare;
            peePaidTotal += partnerShare;
          }
        }
      }
    }
  }

  // Net settlement between Pee and Nurse
  // Pee advanced for Nurse vs Nurse advanced for Pee
  const netDiff = peeAdvancedForNurseTotal - nurseAdvancedForPeeTotal;
  let netDirection: 'nurse_pays_pee' | 'pee_pays_nurse' | 'settled' = 'settled';
  let netAmount = 0;

  if (netDiff > 0.01) {
    netDirection = 'nurse_pays_pee';
    netAmount = netDiff;
  } else if (netDiff < -0.01) {
    netDirection = 'pee_pays_nurse';
    netAmount = Math.abs(netDiff);
  }

  const buildCategoryArray = (map: Record<ExpenseCategory, number>) => {
    const sum = Object.values(map).reduce((a, b) => a + b, 0);
    return CATEGORIES.map((c) => {
      const amount = map[c.id] || 0;
      return {
        category: c.id,
        amount,
        percentage: sum > 0 ? Math.round((amount / sum) * 100) : 0,
        color: c.color,
        emoji: c.emoji,
      };
    });
  };

  // Monthly comparison across 12 months of selectedYear
  const monthNames = [
    'ม.ค.',
    'ก.พ.',
    'มี.ค.',
    'เม.ย.',
    'พ.ค.',
    'มิ.ย.',
    'ก.ค.',
    'ส.ค.',
    'ก.ย.',
    'ต.ค.',
    'พ.ย.',
    'ธ.ค.',
  ];

  const monthlyComparison = monthNames.map((label, idx) => {
    const m = idx + 1;
    const mShared = sharedExpenses.filter((e) => e.year === selectedYear && e.month === m);
    const mPersonal = personalExpenses.filter((e) => e.year === selectedYear && e.month === m);

    let sharedSum = 0;
    let peeSum = 0;
    let nurseSum = 0;

    for (const s of mShared) {
      const b = calculateSharedItemBreakdown(s);
      sharedSum += Number(s.amount) || 0;
      peeSum += b.peeResponsible;
      nurseSum += b.nurseResponsible;
    }
    for (const p of mPersonal) {
      if (p.owner === 'pee') peeSum += Number(p.amount) || 0;
      else nurseSum += Number(p.amount) || 0;
    }

    return {
      month: m,
      label,
      peeTotal: peeSum,
      nurseTotal: nurseSum,
      sharedTotal: sharedSum,
    };
  });

  return {
    peeMetrics: {
      person: 'pee',
      personalTotal: peePersonalTotal,
      sharedResponsibleTotal: peeResponsibleTotal,
      advancedForPartner: peeAdvancedForNurseTotal,
      owesToPartner: nurseAdvancedForPeeTotal,
      monthlyBillsTotal: peeMonthlyBillsTotal,
      monthlyBillsPaidCount: peeMonthlyPaidCount,
      monthlyBillsTotalCount: peeMonthlyTotalCount,
      categoryTotals: buildCategoryArray(peeCategoryMap),
    },
    nurseMetrics: {
      person: 'nurse',
      personalTotal: nursePersonalTotal,
      sharedResponsibleTotal: nurseResponsibleTotal,
      advancedForPartner: nurseAdvancedForPeeTotal,
      owesToPartner: peeAdvancedForNurseTotal,
      monthlyBillsTotal: nurseMonthlyBillsTotal,
      monthlyBillsPaidCount: nurseMonthlyPaidCount,
      monthlyBillsTotalCount: nurseMonthlyTotalCount,
      categoryTotals: buildCategoryArray(nurseCategoryMap),
    },
    coupleSummary: {
      totalSharedExpense,
      peePaidTotal,
      nursePaidTotal,
      peeResponsibleTotal,
      nurseResponsibleTotal,
      peeAdvancedForNurseTotal,
      nurseAdvancedForPeeTotal,
      netDirection,
      netAmount,
      categoryProportions: buildCategoryArray(sharedByCategory),
    },
    monthlyComparison,
  };
}

/**
 * บีบอัดรูปสลิปโอนเงินให้เป็น Base64 Data URL ขนาดเล็ก (~60-120KB) เพื่อบันทึกลง Firestore ได้รวดเร็ว
 */
export function compressSlipImage(file: File, maxWidth = 720, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
