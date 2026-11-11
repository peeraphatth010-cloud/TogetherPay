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
  Cloud,
  Heart,
  Database,
} from 'lucide-react';
import { db } from './firebase';
import {
  MonthlyBill,
  MonthlyBillPayment,
  PersonalExpense,
  SharedExpense,
} from './types';
import { computeDashboardAnalytics } from './utils/calculations';
import { BentoHero } from './components/BentoHero';
import { ModuleSharedExpenses } from './components/ModuleSharedExpenses';
import { ModulePersonalExpenses } from './components/ModulePersonalExpenses';
import { ModuleMonthlyBills } from './components/ModuleMonthlyBills';
import { ModuleDashboard } from './components/ModuleDashboard';

// Helper to remove undefined keys before sending to Firestore
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
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Real-time listeners on Firestore collections
  useEffect(() => {
    const unsubShared = onSnapshot(
      collection(db, 'shared_expenses'),
      (snap) => {
        setIsConnected(true);
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
      (err) => {
        console.error('Firestore personal_expenses error:', err);
      }
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
      (err) => {
        console.error('Firestore monthly_bills error:', err);
      }
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
      (err) => {
        console.error('Firestore monthly_bill_payments error:', err);
      }
    );

    return () => {
      unsubShared();
      unsubPersonal();
      unsubBills();
      unsubPayments();
    };
  }, []);

  // Handlers for Module 1: Shared Expenses
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

  // Handlers for Module 2: Personal Expenses
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

  // Handlers for Module 3: Monthly Bills & Payments
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

  // Hero analytics for current month
  const currentMonthAnalytics = computeDashboardAnalytics({
    sharedExpenses,
    personalExpenses,
    monthlyBills,
    monthlyPayments,
    selectedMonth: currentMonth,
    selectedYear: currentYear,
    isAllTime: false,
  });

  const navItems: {
    id: 'shared' | 'personal' | 'monthly' | 'dashboard';
    label: string;
    shortLabel: string;
    badge: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'shared',
      label: '1. ร่วมกัน',
      shortLabel: 'ร่วมกัน',
      badge: String(
        sharedExpenses.filter(
          (e) => e.month === currentMonth && e.year === currentYear
        ).length
      ),
      icon: <Users className="w-4 h-4" />,
    },
    {
      id: 'personal',
      label: '2. ค่าใช้จ่ายส่วนตัว',
      shortLabel: 'ส่วนตัว',
      badge: String(
        personalExpenses.filter(
          (e) => e.month === currentMonth && e.year === currentYear
        ).length
      ),
      icon: <User className="w-4 h-4" />,
    },
    {
      id: 'monthly',
      label: '3. เรียกเก็บรายเดือน',
      shortLabel: 'รายเดือน',
      badge: String(monthlyBills.length),
      icon: <CheckSquare className="w-4 h-4" />,
    },
    {
      id: 'dashboard',
      label: '4. Dashboard',
      shortLabel: 'Dashboard',
      badge: 'สรุป',
      icon: <BarChart3 className="w-4 h-4" />,
    },
  ];

  return (
    <div className="min-h-screen pb-16">
      {/* Top Glassmorphic Navigation Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/75 border-b border-white/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <div
            onClick={() => setActiveModule('shared')}
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-600/25">
              <Heart className="w-5 h-5 fill-amber-300 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
                  Together<span className="text-blue-600">Pay</span>
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900">
                  เนิร์ส & พี
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                <Database className="w-3 h-3 text-blue-600" />
                Firebase: togetherpay-5c73f
                {isConnected && (
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                    • <Cloud className="w-3 h-3" /> Live Sync
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Desktop Navigation Pills */}
          <nav className="hidden md:flex items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80">
            {navItems.map((item) => {
              const active = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveModule(item.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs lg:text-sm font-extrabold transition-all cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      active
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-slate-200/80 text-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="md:hidden px-3 pb-3 flex items-center gap-1.5 overflow-x-auto">
          {navItems.map((item) => {
            const active = activeModule === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveModule(item.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white/80 text-slate-600 border border-slate-200/70'
                }`}
              >
                {item.icon}
                <span>{item.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {syncError && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-medium">
            ⚠️ สถานะการเชื่อมต่อฐานข้อมูล: {syncError}
          </div>
        )}

        {/* Bento Grid Hero Showcase */}
        <BentoHero
          coupleSummary={currentMonthAnalytics.coupleSummary}
          activeModule={activeModule}
          onSelectModule={setActiveModule}
          currentMonth={currentMonth}
          currentYear={currentYear}
          totalItemsCount={sharedExpenses.length + personalExpenses.length}
        />

        {/* Active Module Content */}
        {activeModule === 'shared' && (
          <ModuleSharedExpenses
            expenses={sharedExpenses}
            onAddExpense={handleAddSharedExpense}
            onDeleteExpense={handleDeleteSharedExpense}
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
          />
        )}
      </main>
    </div>
  );
}
export default App;
