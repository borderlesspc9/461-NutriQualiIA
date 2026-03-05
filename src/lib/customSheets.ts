/**
 * Planilhas personalizadas: armazenadas no Supabase (tabela custom_sheets).
 * Fallback para localStorage se a tabela não existir ou em caso de erro.
 */

import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'nutriqualia_custom_sheets';

export interface CustomSheet {
  id: string;
  name: string;
  createdAt: string;
  userId?: string;
}

// ---------- localStorage fallback ----------
function safeParse<T>(json: string, fallback: T): T {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}

function getFromStorage(userId?: string): CustomSheet[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  const all = safeParse(raw ?? '[]', []);
  if (!userId) return all;
  return all.filter((s) => !s.userId || s.userId === userId);
}

function saveToStorage(sheets: CustomSheet[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sheets));
}

// ---------- Supabase ----------
function rowToCustomSheet(row: { id: string; user_id: string; name: string; created_at: string }): CustomSheet {
  return {
    id: row.id,
    name: row.name ?? '',
    createdAt: row.created_at ?? new Date().toISOString(),
    userId: row.user_id,
  };
}

/**
 * Lista planilhas personalizadas do usuário.
 * Usa Supabase (tabela custom_sheets); em caso de erro usa localStorage.
 */
export async function getCustomSheets(userId: string): Promise<CustomSheet[]> {
  try {
    const { data, error } = await supabase
      .from('custom_sheets')
      .select('id, user_id, name, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (data && Array.isArray(data)) {
      return data.map(rowToCustomSheet);
    }
  } catch {
    // fallback localStorage
  }
  return getFromStorage(userId);
}

/**
 * Cria uma nova planilha personalizada.
 * Usa Supabase; em caso de erro salva no localStorage.
 */
export async function addCustomSheet(userId: string, name: string): Promise<CustomSheet> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Nome é obrigatório');

  try {
    const { data, error } = await supabase
      .from('custom_sheets')
      .insert({ user_id: userId, name: trimmed })
      .select('id, user_id, name, created_at')
      .single();

    if (error) throw error;
    if (data) return rowToCustomSheet(data);
  } catch {
    // fallback localStorage
  }

  const id = crypto.randomUUID();
  const newSheet: CustomSheet = { id, name: trimmed, createdAt: new Date().toISOString(), userId };
  const sheets = getFromStorage();
  sheets.push(newSheet);
  saveToStorage(sheets);
  return newSheet;
}

/**
 * Busca uma planilha personalizada por id.
 */
export async function getCustomSheetById(id: string, userId?: string): Promise<CustomSheet | null> {
  try {
    const { data, error } = await supabase
      .from('custom_sheets')
      .select('id, user_id, name, created_at')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (data) {
      const sheet = rowToCustomSheet(data);
      if (userId != null && sheet.userId !== userId) return null;
      return sheet;
    }
  } catch {
    // fallback localStorage
  }
  const list = getFromStorage(userId);
  return list.find((s) => s.id === id) ?? null;
}

/**
 * Remove uma planilha personalizada.
 */
export async function removeCustomSheet(id: string, userId?: string): Promise<void> {
  try {
    let query = supabase.from('custom_sheets').delete().eq('id', id);
    if (userId) query = query.eq('user_id', userId);
    const { error } = await query;
    if (error) throw error;
    return;
  } catch {
    // fallback localStorage
  }
  const all = getFromStorage();
  const sheet = all.find((s) => s.id === id);
  if (userId != null && sheet?.userId !== userId) return;
  saveToStorage(all.filter((s) => s.id !== id));
}

/** Indica se o Supabase está sendo usado para planilhas personalizadas (tabela existe e responde). */
export async function isSupabaseCustomSheetsAvailable(): Promise<boolean> {
  try {
    const { error } = await supabase.from('custom_sheets').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}
