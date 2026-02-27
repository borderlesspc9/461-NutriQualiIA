import { SpreadsheetData } from './ncEngine';

const STORAGE_KEY = 'nutriquali_data';

export interface AppData {
  spreadsheets: SpreadsheetData[];
  currentUser: string;
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { spreadsheets: [], currentUser: '' };
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function saveSpreadsheet(sheet: SpreadsheetData): void {
  const data = loadData();
  const idx = data.spreadsheets.findIndex((s) => s.id === sheet.id);
  if (idx >= 0) {
    data.spreadsheets[idx] = sheet;
  } else {
    data.spreadsheets.push(sheet);
  }
  saveData(data);
}

export function getSpreadsheet(id: string): SpreadsheetData | null {
  const data = loadData();
  return data.spreadsheets.find((s) => s.id === id) || null;
}

export function clearSpreadsheet(id: string): void {
  const data = loadData();
  data.spreadsheets = data.spreadsheets.filter((s) => s.id !== id);
  saveData(data);
}

export function getDashboardStats(): { conformity: number; records: number; justified: number; unjustified: number } {
  const data = loadData();
  const sheets = data.spreadsheets;
  const records = sheets.length;
  let totalDataPoints = 0;
  let totalNCs = 0;
  let resolvedNCs = 0;

  sheets.forEach((s) => {
    // Each item has 4 data fields (startTime, startTemp, endTime, endTemp)
    totalDataPoints += s.items.length * 4;
    s.nonConformities.forEach((nc) => {
      totalNCs++;
      if (nc.resolved) resolvedNCs++;
    });
  });

  const unjustified = totalNCs - resolvedNCs;
  const conformity = totalDataPoints > 0
    ? Math.round(((totalDataPoints - totalNCs) / totalDataPoints) * 1000) / 10
    : 100;

  return { conformity, records, justified: resolvedNCs, unjustified };
}

export interface ConformityHistory {
  date: string;
  conformity: number;
}

const HISTORY_KEY = 'nutriquali_conformity_history';

export function saveConformitySnapshot(): void {
  const stats = getDashboardStats();
  const today = new Date().toISOString().slice(0, 10);
  const history = getConformityHistory();
  const existing = history.findIndex((h) => h.date === today);
  if (existing >= 0) {
    history[existing].conformity = stats.conformity;
  } else {
    history.push({ date: today, conformity: stats.conformity });
  }
  // Keep last 30 days
  const trimmed = history.slice(-30);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
}

export function getConformityHistory(): ConformityHistory[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

const CLOUD_ENDPOINT = 'https://bfoegwfivcpqxnabfxya.supabase.co/functions/v1/receive-spreadsheet';

export async function syncToCloud(sheet: SpreadsheetData, sheetType: string, insertedNCs?: Array<{ id: string; food_item_name: string; field: string }>): Promise<void> {
  try {
    // Only send NCs that were NOT resolved (no corrective action applied).
    // Resolved NCs = conformities, so they don't count.
    // Also exclude blank/blank_name field alerts.
    const unresolvedNCs = sheet.nonConformities
      .filter((nc: any) => {
        if (nc.field === 'blank' || nc.field === 'blank_name') return false;
        return !nc.resolved;
      })
      .map((nc: any) => {
        // Match with inserted NC to get the source_nc_id
        const matched = insertedNCs?.find(
          (ins) => ins.food_item_name === (nc.foodItemName || '') && ins.field === nc.field
        );
        return {
          source_nc_id: matched?.id || null,
          food_item_name: nc.foodItemName || '',
          field: nc.field,
          value: nc.value || '',
          message: nc.message,
          corrective_action: nc.correctiveAction || null,
          applied_action: null,
          resolved: false,
        };
      });

    // Send all NCs (including resolved) as reference in a separate field
    const allNCs = sheet.nonConformities
      .filter((nc: any) => nc.field !== 'blank' && nc.field !== 'blank_name')
      .map((nc: any) => {
        const matched = insertedNCs?.find(
          (ins) => ins.food_item_name === (nc.foodItemName || nc.itemName || '') && ins.field === nc.field
        );
        return {
          source_nc_id: matched?.id || null,
          food_item_name: nc.foodItemName || nc.itemName || '',
          field: nc.field,
          value: nc.value || '',
          message: nc.message,
          corrective_action: nc.correctiveAction || null,
          applied_action: nc.appliedAction || null,
          resolved: nc.resolved ?? false,
        };
      });

    const response = await fetch(CLOUD_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sheet_type: sheetType,
        responsible: sheet.responsible,
        role_title: sheet.role,
        sheet_date: sheet.date,
        unit_name: sheet.unit,
        user_id: sheet.responsible,
        items: sheet.items,
        non_conformities: unresolvedNCs,
        all_non_conformities: allNCs,
      }),
    });

    if (!response.ok) {
      console.error('syncToCloud failed:', response.status, await response.text());
      return;
    }

    console.log('syncToCloud: planilha sincronizada com sucesso');
  } catch (error) {
    console.error('syncToCloud error:', error);
  }
}
