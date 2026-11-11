export type PersonId = 'nurse' | 'pee';

export type ExpenseCategory =
  | 'น้ำมัน'
  | 'อาหาร'
  | 'ที่พัก'
  | 'ช้อปปิ้ง'
  | 'ท่องเที่ยว';

export type SplitType = 'split_2' | 'nurse_only' | 'pee_only';

export interface SharedExpense {
  id: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  payer: PersonId;
  splitType: SplitType;
  date: string; // YYYY-MM-DD
  month: number; // 1-12
  year: number; // YYYY
  locationName?: string;
  locationLat?: number;
  locationLng?: number;
  createdAt: number;
}

export interface PersonalExpense {
  id: string;
  owner: PersonId;
  title: string;
  amount: number;
  category: ExpenseCategory;
  date: string; // YYYY-MM-DD
  month: number; // 1-12
  year: number; // YYYY
  createdAt: number;
}

export interface MonthlyBill {
  id: string;
  owner: PersonId; // คนตั้งบิลหลัก
  title: string;
  minAmount: number; // ยอดขั้นต่ำต่อเดือน
  category: ExpenseCategory;
  startMonth: string; // YYYY-MM
  endMonth: string; // YYYY-MM
  splitWithPartner: boolean; // เรียกเก็บ/หารกับอีกฝ่ายไหม
  ownerShareDefault: number;
  partnerShareDefault: number;
  createdAt: number;
}

export interface MonthlyBillPayment {
  id: string; // `${billId}_${yearMonth}`
  billId: string;
  yearMonth: string; // YYYY-MM
  month: number;
  year: number;
  actualTotalAmount: number;
  ownerShareAmount: number;
  partnerShareAmount: number;
  ownerPaid: boolean;
  ownerPaidAt?: string;
  ownerSlipUrl?: string;
  partnerPaid: boolean;
  partnerPaidAt?: string;
  partnerSlipUrl?: string;
  updatedAt: number;
}

export interface SettlementRecord {
  id: string;
  fromPerson: PersonId; // คนโอนคืน (เช่น nurse)
  toPerson: PersonId; // คนรับเงินคืน (เช่น pee)
  amount: number;
  date: string; // YYYY-MM-DD
  month: number;
  year: number;
  note?: string;
  slipUrl?: string;
  createdAt: number;
}

export const CATEGORIES: {
  id: ExpenseCategory;
  label: string;
  emoji: string;
  color: string;
  bgLight: string;
  textDark: string;
  border: string;
}[] = [
  {
    id: 'อาหาร',
    label: 'อาหาร',
    emoji: '🍽️',
    color: '#F59E0B',
    bgLight: 'bg-amber-50',
    textDark: 'text-amber-700',
    border: 'border-amber-200',
  },
  {
    id: 'น้ำมัน',
    label: 'น้ำมัน',
    emoji: '⛽',
    color: '#2563EB',
    bgLight: 'bg-blue-50',
    textDark: 'text-blue-700',
    border: 'border-blue-200',
  },
  {
    id: 'ที่พัก',
    label: 'ที่พัก',
    emoji: '🏠',
    color: '#8B5CF6',
    bgLight: 'bg-violet-50',
    textDark: 'text-violet-700',
    border: 'border-violet-200',
  },
  {
    id: 'ช้อปปิ้ง',
    label: 'ช้อปปิ้ง',
    emoji: '🛍️',
    color: '#EC4899',
    bgLight: 'bg-pink-50',
    textDark: 'text-pink-700',
    border: 'border-pink-200',
  },
  {
    id: 'ท่องเที่ยว',
    label: 'ท่องเที่ยว',
    emoji: '✈️',
    color: '#10B981',
    bgLight: 'bg-emerald-50',
    textDark: 'text-emerald-700',
    border: 'border-emerald-200',
  },
];

export const PERSON_INFO: Record<
  PersonId,
  {
    id: PersonId;
    name: string;
    fullLabel: string;
    avatar: string;
    badgeBg: string;
    badgeText: string;
    accentColor: string;
  }
> = {
  nurse: {
    id: 'nurse',
    name: 'เนิร์ส',
    fullLabel: 'เนิร์ส (Nurse)',
    avatar: '👩‍💼',
    badgeBg: 'bg-rose-50 border-rose-200',
    badgeText: 'text-rose-700',
    accentColor: '#F43F5E',
  },
  pee: {
    id: 'pee',
    name: 'พี',
    fullLabel: 'พี (Pee)',
    avatar: '👨‍💻',
    badgeBg: 'bg-blue-50 border-blue-200',
    badgeText: 'text-blue-700',
    accentColor: '#2563EB',
  },
};

export const THAI_MONTHS = [
  { value: 1, label: 'มกราคม', short: 'ม.ค.' },
  { value: 2, label: 'กุมภาพันธ์', short: 'ก.พ.' },
  { value: 3, label: 'มีนาคม', short: 'มี.ค.' },
  { value: 4, label: 'เมษายน', short: 'เม.ย.' },
  { value: 5, label: 'พฤษภาคม', short: 'พ.ค.' },
  { value: 6, label: 'มิถุนายน', short: 'มิ.ย.' },
  { value: 7, label: 'กรกฎาคม', short: 'ก.ค.' },
  { value: 8, label: 'สิงหาคม', short: 'ส.ค.' },
  { value: 9, label: 'กันยายน', short: 'ก.ย.' },
  { value: 10, label: 'ตุลาคม', short: 'ต.ค.' },
  { value: 11, label: 'พฤศจิกายน', short: 'พ.ย.' },
  { value: 12, label: 'ธันวาคม', short: 'ธ.ค.' },
];
