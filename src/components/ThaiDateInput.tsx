import React from 'react';
import { THAI_MONTHS } from '../types';

/**
 * แปลง YYYY-MM-DD เป็นรูปแบบ "วันที่ เดือน พ.ศ." เช่น "11 พ.ย. 2569"
 */
export function formatThaiDate(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const yearAD = parseInt(parts[0], 10);
  const monthNum = parseInt(parts[1], 10);
  const dayNum = parseInt(parts[2], 10);
  if (isNaN(yearAD) || isNaN(monthNum) || isNaN(dayNum)) return isoDate;

  const monthObj = THAI_MONTHS.find((m) => m.value === monthNum);
  const monthLabel = monthObj ? monthObj.short : String(monthNum);
  const yearBE = yearAD + 543;

  return `${dayNum} ${monthLabel} ${yearBE}`;
}

/**
 * แปลง YYYY-MM เป็นรูปแบบ "เดือน พ.ศ." เช่น "พ.ย. 2569"
 */
export function formatThaiYearMonth(yearMonth: string): string {
  if (!yearMonth) return '';
  const parts = yearMonth.split('-');
  if (parts.length !== 2) return yearMonth;
  const yearAD = parseInt(parts[0], 10);
  const monthNum = parseInt(parts[1], 10);
  if (isNaN(yearAD) || isNaN(monthNum)) return yearMonth;

  const monthObj = THAI_MONTHS.find((m) => m.value === monthNum);
  const monthLabel = monthObj ? monthObj.short : String(monthNum);
  const yearBE = yearAD + 543;

  return `${monthLabel} ${yearBE}`;
}

interface ThaiDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (newIsoDate: string) => void;
  className?: string;
}

/**
 * ตัวเลือกวันที่เรียง: วันที่ -> เดือน -> ปี พ.ศ. (ไม่มี ค.ศ.)
 */
export const ThaiDatePicker: React.FC<ThaiDatePickerProps> = ({
  value,
  onChange,
  className = '',
}) => {
  const now = new Date();
  const currentYearAD = now.getFullYear();

  const parts = (value || '').split('-');
  const selectedYearAD = parseInt(parts[0], 10) || currentYearAD;
  const selectedMonth = parseInt(parts[1], 10) || now.getMonth() + 1;
  const selectedDay = parseInt(parts[2], 10) || now.getDate();

  // จำนวนวันในเดือนที่เลือก
  const daysInMonth = new Date(selectedYearAD, selectedMonth, 0).getDate();
  const dayOptions = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const yearOptionsAD = Array.from({ length: 7 }, (_, i) => currentYearAD - 2 + i);

  const handleUpdate = (d: number, m: number, yAD: number) => {
    const maxD = new Date(yAD, m, 0).getDate();
    const safeDay = Math.min(d, maxD);
    const iso = `${yAD}-${String(m).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
    onChange(iso);
  };

  return (
    <div className={`grid grid-cols-3 gap-1.5 ${className}`}>
      {/* 1. วันที่ */}
      <select
        value={Math.min(selectedDay, daysInMonth)}
        onChange={(e) =>
          handleUpdate(Number(e.target.value), selectedMonth, selectedYearAD)
        }
        aria-label="เลือกวันที่"
        className="w-full px-2.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white text-xs sm:text-sm font-bold text-slate-900 outline-none cursor-pointer"
      >
        {dayOptions.map((d) => (
          <option key={d} value={d}>
            วันที่ {d}
          </option>
        ))}
      </select>

      {/* 2. เดือน */}
      <select
        value={selectedMonth}
        onChange={(e) =>
          handleUpdate(selectedDay, Number(e.target.value), selectedYearAD)
        }
        aria-label="เลือกเดือน"
        className="w-full px-2.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white text-xs sm:text-sm font-bold text-slate-900 outline-none cursor-pointer"
      >
        {THAI_MONTHS.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>

      {/* 3. ปี พ.ศ. */}
      <select
        value={selectedYearAD}
        onChange={(e) =>
          handleUpdate(selectedDay, selectedMonth, Number(e.target.value))
        }
        aria-label="เลือกปี พ.ศ."
        className="w-full px-2.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white text-xs sm:text-sm font-bold text-slate-900 outline-none cursor-pointer"
      >
        {yearOptionsAD.map((yAD) => (
          <option key={yAD} value={yAD}>
            พ.ศ. {yAD + 543}
          </option>
        ))}
      </select>
    </div>
  );
};

interface ThaiMonthPickerProps {
  value: string; // YYYY-MM
  onChange: (newYearMonth: string) => void;
  className?: string;
}

/**
 * ตัวเลือก เดือน + ปี พ.ศ. (ไม่มี ค.ศ.) สำหรับรอบบิลรายเดือน
 */
export const ThaiMonthPicker: React.FC<ThaiMonthPickerProps> = ({
  value,
  onChange,
  className = '',
}) => {
  const now = new Date();
  const currentYearAD = now.getFullYear();

  const parts = (value || '').split('-');
  const selectedYearAD = parseInt(parts[0], 10) || currentYearAD;
  const selectedMonth = parseInt(parts[1], 10) || now.getMonth() + 1;

  const yearOptionsAD = Array.from({ length: 7 }, (_, i) => currentYearAD - 1 + i);

  const handleUpdate = (m: number, yAD: number) => {
    const ym = `${yAD}-${String(m).padStart(2, '0')}`;
    onChange(ym);
  };

  return (
    <div className={`grid grid-cols-2 gap-1.5 ${className}`}>
      {/* เดือน */}
      <select
        value={selectedMonth}
        onChange={(e) => handleUpdate(Number(e.target.value), selectedYearAD)}
        className="w-full px-2.5 py-2 rounded-2xl bg-slate-50 border border-slate-200 focus:border-emerald-600 focus:bg-white text-xs font-bold text-slate-900 outline-none cursor-pointer"
      >
        {THAI_MONTHS.map((m) => (
          <option key={m.value} value={m.value}>
            {m.short}
          </option>
        ))}
      </select>

      {/* ปี พ.ศ. */}
      <select
        value={selectedYearAD}
        onChange={(e) => handleUpdate(selectedMonth, Number(e.target.value))}
        className="w-full px-2.5 py-2 rounded-2xl bg-slate-50 border border-slate-200 focus:border-emerald-600 focus:bg-white text-xs font-bold text-slate-900 outline-none cursor-pointer"
      >
        {yearOptionsAD.map((yAD) => (
          <option key={yAD} value={yAD}>
            พ.ศ. {yAD + 543}
          </option>
        ))}
      </select>
    </div>
  );
};
