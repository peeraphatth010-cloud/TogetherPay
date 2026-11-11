import React, { useEffect, useState } from 'react';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
} from 'firebase/firestore';
import {
  Users,
  User,
  CheckSquare,
  BarChart3,
  Heart,
  HandCoins,
  Sparkles,
} from 'lucide-react';
import { db } from './firebase';
import {
  MonthlyBill,
  MonthlyBillPayment,
  PersonalExpense,
  SettlementRecord,
  SharedExpense,
  THAI_MONTHS,
} from './types';
import { computeDashboardAnalytics } from './utils/calculations';
import { getSavedGeminiApiKey, saveGeminiApiKey } from './utils/aiAdvisor';
import { ModuleSharedExpenses } from './components/ModuleSharedExpenses';
import { ModulePersonalExpenses } from './components/ModulePersonalExpenses';
import { ModuleMonthlyBills } from './components/ModuleMonthlyBills';
import { ModuleDashboard } from './components/ModuleDashboard';
import { SettleUpModal, AiAdvisorModal } from './components/Modals';

function cleanFirestoreData<T extends Record<string, unknown>>(obj: T): T {
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      cleaned[k] = v;
    }
  }
  return cleaned as T;
}

export function App() {
  const [activeModule, setActiveModule] = useState<
    'shared' | 'personal' | 'monthly' | 'dashboard'
  >('shared');

  const [sharedExpenses, setSharedExpenses] = useState<SharedExpense[]>([]);
  const [personalExpenses, setPersonalExpenses] = useState<PersonalExpense[]>([]);
  const [monthlyBills, setMonthlyBills] = useState<MonthlyBill[]>([]);
  const [monthlyPayments, setMonthlyPayments] = useState<MonthlyBillPayment[]>([]);
  const [settlements, setSettlements] = useState<SettlementRecord[]>([]);
  const [geminiApiKey, setGeminiApiKey] = useState<string>(getSavedGeminiApiKey);

  const [isSettleModalOpen, setIsSettleModalOpen] = useState<boolean>(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const handleSelectModule = (mod: 'shared' | 'personal' | 'monthly' | 'dashboard') => {
    setActiveModule(mod);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Real-time listeners on Firestore collections
  useEffect(() => {
    const unsubShared = onSnapshot(
      collection(db, 'shared_expenses'),
      (snap) => {
        setSyncError(null);
        const list: SharedExpense[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as Omit<SharedExpense, 'id'>) });
        });
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setSharedExpenses(list);
      },
      (err) => {
        console.error('Firestore shared_expenses error:', err);
        setSyncError(err.message);
      }
    );

    const unsubPersonal = onSnapshot(
      collection(db, 'personal_expenses'),
      (snap) => {
        const list: PersonalExpense[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as Omit<PersonalExpense, 'id'>) });
        });
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setPersonalExpenses(list);
      },
      (err) => console.error('Firestore personal_expenses error:', err)
    );

    const unsubBills = onSnapshot(
      collection(db, 'monthly_bills'),
      (snap) => {
        const list: MonthlyBill[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as Omit<MonthlyBill, 'id'>) });
        });
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setMonthlyBills(list);
      },
      (err) => console.error('Firestore monthly_bills error:', err)
    );

    const unsubPayments = onSnapshot(
      collection(db, 'monthly_bill_payments'),
      (snap) => {
        const list: MonthlyBillPayment[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as Omit<MonthlyBillPayment, 'id'>) });
        });
        setMonthlyPayments(list);
      },
      (err) => console.error('Firestore monthly_bill_payments error:', err)
    );

    const unsubSettlements = onSnapshot(
      collection(db, 'settlements'),
      (snap) => {
        const list: SettlementRecord[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as Omit<SettlementRecord, 'id'>) });
        });
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setSettlements(list);
      },
      (err) => console.error('Firestore settlements error:', err)
    );

    const unsubSettings = onSnapshot(
      doc(db, 'app_settings', 'gemini_config'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as { apiKey?: string };
          if (data.apiKey && !getSavedGeminiApiKey()) {
            saveGeminiApiKey(data.apiKey);
            setGeminiApiKey(data.apiKey);
          }
        }
      },
      () => {
        // ignore if settings doc doesn't exist yet
      }
    );

    return () => {
      unsubShared();
      unsubPersonal();
      unsubBills();
      unsubPayments();
      unsubSettlements();
      unsubSettings();
    };
  }, []);

  // Handlers
  const handleAddSharedExpense = async (
    data: Omit<SharedExpense, 'id' | 'createdAt'>
  ) => {
    const payload = cleanFirestoreData({
      ...data,
      createdAt: Date.now(),
    });
    await addDoc(collection(db, 'shared_expenses'), payload);
  };

  const handleDeleteSharedExpense = async (id: string) => {
    await deleteDoc(doc(db, 'shared_expenses', id));
  };

  const handleAddPersonalExpense = async (
    data: Omit<PersonalExpense, 'id' | 'createdAt'>
  ) => {
    const payload = cleanFirestoreData({
      ...data,
      createdAt: Date.now(),
    });
    await addDoc(collection(db, 'personal_expenses'), payload);
  };

  const handleDeletePersonalExpense = async (id: string) => {
    await deleteDoc(doc(db, 'personal_expenses', id));
  };

  const handleAddMonthlyBill = async (
    data: Omit<MonthlyBill, 'id' | 'createdAt'>
  ) => {
    const payload = cleanFirestoreData({
      ...data,
      createdAt: Date.now(),
    });
    await addDoc(collection(db, 'monthly_bills'), payload);
  };

  const handleDeleteMonthlyBill = async (id: string) => {
    await deleteDoc(doc(db, 'monthly_bills', id));
  };

  const handleUpsertMonthlyPayment = async (
    payment: Omit<MonthlyBillPayment, 'id' | 'updatedAt'>
  ) => {
    const docId = `${payment.billId}_${payment.yearMonth}`;
    const payload = cleanFirestoreData({
      ...payment,
      updatedAt: Date.now(),
    });
    await setDoc(doc(db, 'monthly_bill_payments', docId), payload);
  };

  const handleAddSettlement = async (
    data: Omit<SettlementRecord, 'id' | 'createdAt'>
  ) => {
    const payload = cleanFirestoreData({
      ...data,
      createdAt: Date.now(),
    });
    await addDoc(collection(db, 'settlements'), payload);
  };

  const handleDeleteSettlement = async (id: string) => {
    await deleteDoc(doc(db, 'settlements', id));
  };

  const handleSaveApiKey = async (newKey: string, syncToCloud: boolean) => {
    saveGeminiApiKey(newKey);
    setGeminiApiKey(newKey);
    if (syncToCloud) {
      await setDoc(doc(db, 'app_settings', 'gemini_config'), {
        apiKey: newKey,
        updatedAt: Date.now(),
      });
    }
  };

  // Current month analytics
  const currentMonthAnalytics = computeDashboardAnalytics({
    sharedExpenses,
    personalExpenses,
    monthlyBills,
    monthlyPayments,
    settlements,
    selectedMonth: currentMonth,
    selectedYear: currentYear,
    isAllTime: false,
  });

  const navItems: {
    id: 'shared' | 'personal' | 'monthly' | 'dashboard';
    label: string;
    shortLabel: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'shared',
      label: 'ร่วมกัน',
      shortLabel: 'ร่วมกัน',
      icon: <Users className="w-4 h-4" />,
    },
    {
      id: 'personal',
      label: 'ส่วนตัว',
      shortLabel: 'ส่วนตัว',
      icon: <User className="w-4 h-4" />,
    },
    {
      id: 'monthly',
      label: 'รายเดือน',
      shortLabel: 'รายเดือน',
      icon: <CheckSquare className="w-4 h-4" />,
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      shortLabel: 'สรุปยอด',
      icon: <BarChart3 className="w-4 h-4" />,
    },
  ];

  const currentPeriodLabel = `เดือน${
    THAI_MONTHS.find((m) => m.value === currentMonth)?.label
  } ${currentYear + 543}`;

  return (
    <div className="min-h-screen pb-24 md:pb-14">
      {/* Compact Sticky Top Header (Mobile-First) */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/85 border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2">
          {/* Brand Logo */}
          <div
            onClick={() => handleSelectModule('shared')}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-sm">
              <Heart className="w-4 h-4 sm:w-5 sm:h-5 fill-amber-300 text-amber-300" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 leading-none">
                Together<span className="text-blue-600">Pay</span>
              </h1>
              <span className="text-[10px] font-bold text-slate-500">
                เนิร์ส & พี • Live Sync
              </span>
            </div>
          </div>

          {/* Desktop Navigation Pills */}
          <nav className="hidden md:flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            {navItems.map((item) => {
              const active = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectModule(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs lg:text-sm font-extrabold transition-all cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Quick Action Buttons in Top Right: เคลียร์เงิน & AI API Key */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setIsSettleModalOpen(true)}
              className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
            >
              <HandCoins className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>เคลียร์เงิน</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAiModalOpen(true)}
              className="px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center gap-1 shadow-2xs transition cursor-pointer"
              title="ตั้งค่า AI API Key และวิเคราะห์ค่าใช้จ่าย"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>AI</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container — Directly shows the selected module without Hero clutter */}
      <main className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        {syncError && (
          <div className="mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-medium">
            ⚠️ สถานะฐานข้อมูล: {syncError}
          </div>
        )}

        {activeModule === 'shared' && (
          <ModuleSharedExpenses
            expenses={sharedExpenses}
            settlements={settlements}
            coupleSummary={currentMonthAnalytics.coupleSummary}
            onAddExpense={handleAddSharedExpense}
            onDeleteExpense={handleDeleteSharedExpense}
            onOpenSettleModal={() => setIsSettleModalOpen(true)}
          />
        )}

        {activeModule === 'personal' && (
          <ModulePersonalExpenses
            expenses={personalExpenses}
            onAddExpense={handleAddPersonalExpense}
            onDeleteExpense={handleDeletePersonalExpense}
          />
        )}

        {activeModule === 'monthly' && (
          <ModuleMonthlyBills
            bills={monthlyBills}
            payments={monthlyPayments}
            onAddBill={handleAddMonthlyBill}
            onDeleteBill={handleDeleteMonthlyBill}
            onUpsertPayment={handleUpsertMonthlyPayment}
          />
        )}

        {activeModule === 'dashboard' && (
          <ModuleDashboard
            sharedExpenses={sharedExpenses}
            personalExpenses={personalExpenses}
            monthlyBills={monthlyBills}
            monthlyPayments={monthlyPayments}
            settlements={settlements}
            hasApiKey={Boolean(geminiApiKey)}
            onOpenSettleModal={() => setIsSettleModalOpen(true)}
            onOpenAiModal={() => setIsAiModalOpen(true)}
          />
        )}
      </main>

      {/* Fixed Mobile Bottom Navigation Bar (Thumb-Friendly Native App Feel) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 px-2 py-1.5 shadow-[0_-8px_25px_-8px_rgba(15,23,42,0.1)]">
        <div className="grid grid-cols-4 gap-1 max-w-md mx-auto">
          {navItems.map((item) => {
            const active = activeModule === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectModule(item.id)}
                className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-amber-300 font-extrabold shadow-xs'
                    : 'text-slate-500 font-bold hover:text-slate-900'
                }`}
              >
                {item.icon}
                <span className="text-[11px] mt-0.5 leading-tight">
                  {item.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Settle Up Modal (เคลียร์ค่าใช้จ่ายระหว่างกัน) */}
      <SettleUpModal
        isOpen={isSettleModalOpen}
        onClose={() => setIsSettleModalOpen(false)}
        coupleSummary={currentMonthAnalytics.coupleSummary}
        settlements={settlements}
        defaultMonth={currentMonth}
        defaultYear={currentYear}
        onAddSettlement={handleAddSettlement}
        onDeleteSettlement={handleDeleteSettlement}
      />

      {/* AI Financial Advisor & Gemini API Key Modal */}
      <AiAdvisorModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        apiKey={geminiApiKey}
        onSaveApiKey={handleSaveApiKey}
        periodLabel={currentPeriodLabel}
        coupleSummary={currentMonthAnalytics.coupleSummary}
        peeMetrics={currentMonthAnalytics.peeMetrics}
        nurseMetrics={currentMonthAnalytics.nurseMetrics}
      />
    </div>
  );
}

export default App;
