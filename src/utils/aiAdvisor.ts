import { GoogleGenAI } from '@google/genai';
import {
  CoupleSettlementSummary,
  PersonDashboardMetrics,
  formatCurrency,
} from './calculations';

export const GEMINI_API_KEY_STORAGE_KEY = 'togetherpay_gemini_api_key';

export function getSavedGeminiApiKey(): string {
  try {
    return localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function saveGeminiApiKey(key: string): void {
  try {
    if (key.trim()) {
      localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, key.trim());
    } else {
      localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export async function generateCoupleFinancialAdvice(params: {
  apiKey: string;
  periodLabel: string;
  coupleSummary: CoupleSettlementSummary;
  peeMetrics: PersonDashboardMetrics;
  nurseMetrics: PersonDashboardMetrics;
}): Promise<string> {
  const { apiKey, periodLabel, coupleSummary, peeMetrics, nurseMetrics } = params;
  if (!apiKey.trim()) {
    throw new Error('กรุณาใส่ Gemini API Key ก่อนเริ่มการวิเคราะห์ด้วย AI');
  }

  const ai = new GoogleGenAI({ apiKey: apiKey.trim() });

  const categoryBreakdownText = coupleSummary.categoryProportions
    .filter((c) => c.amount > 0)
    .map((c) => `${c.emoji}${c.category}: ฿${formatCurrency(c.amount)} (${c.percentage}%)`)
    .join(', ');

  const netStatusText =
    coupleSummary.netDirection === 'settled'
      ? 'เคลียร์ยอดกันครบแล้ว ไม่มียอดค้างชำระ'
      : coupleSummary.netDirection === 'nurse_pays_pee'
      ? `เนิร์สต้องโอนคืนให้พี ฿${formatCurrency(coupleSummary.netAmount)}`
      : `พีต้องโอนคืนให้เนิร์ส ฿${formatCurrency(coupleSummary.netAmount)}`;

  const prompt = `คุณคือที่ปรึกษาการเงินประจำคู่รักชื่อ "เนิร์ส" และ "พี" สำหรับแอป TogetherPay
ช่วยสรุปและวิเคราะห์พฤติกรรมการใช้จ่ายของช่วง "${periodLabel}" ให้กระชับ อ่านง่ายบนมือถือ น่ารัก เป็นกันเอง ไม่เกิน 4 ข้อสั้นๆ:

ข้อมูลจริงตอนนี้:
- ยอดใช้จ่ายร่วมกันทั้งหมด: ฿${formatCurrency(coupleSummary.totalSharedExpense)}
- พีรับผิดชอบจริง: ฿${formatCurrency(coupleSummary.peeResponsibleTotal)} (ค่าใช้จ่ายส่วนตัวพี: ฿${formatCurrency(peeMetrics.personalTotal)})
- เนิร์สรับผิดชอบจริง: ฿${formatCurrency(coupleSummary.nurseResponsibleTotal)} (ค่าใช้จ่ายส่วนตัวเนิร์ส: ฿${formatCurrency(nurseMetrics.personalTotal)})
- สัดส่วนหมวดหมู่ที่ใช้ร่วมกัน: ${categoryBreakdownText || 'ยังไม่มีรายการ'}
- สถานะการเคลียร์เงิน: ${netStatusText}`;

  const interaction = await ai.interactions.create({
    model: 'gemini-3.8-flash',
    input: prompt,
  });

  return (
    interaction.output_text ||
    'ไม่สามารถสร้างคำแนะนำได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง'
  );
}
