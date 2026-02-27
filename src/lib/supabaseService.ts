import { supabase } from '@/integrations/supabase/client';

// ============ UNITS ============
export async function fetchUnits() {
  const { data, error } = await supabase.from('units').select('*').order('name');
  if (error) throw error;
  const hidden = ['P-03', 'P-04'];
  return (data || []).filter(u => !hidden.includes(u.name));
}

// ============ SPREADSHEETS ============
export async function saveSpreadsheetToSupabase(params: {
  userId: string;
  unitId: string;
  sheetType: string;
  responsible: string;
  roleTitle: string;
  sheetDate: string;
  items: any[];
  nonConformities: any[];
}) {
  // Insert spreadsheet
  const { data: sheet, error: sheetError } = await supabase
    .from('spreadsheets')
    .insert({
      user_id: params.userId,
      unit_id: params.unitId,
      sheet_type: params.sheetType,
      responsible: params.responsible,
      role_title: params.roleTitle,
      sheet_date: params.sheetDate,
      items: params.items,
      finalized: true,
    })
    .select()
    .single();

  if (sheetError) throw sheetError;

  // Insert unresolved NCs (those without corrective action applied)
  const unresolvedNCs = params.nonConformities.filter(
    (nc: any) => nc.correctiveAction && !nc.resolved
  );

  let insertedNCs: any[] = [];

  if (unresolvedNCs.length > 0) {
    const ncRows = unresolvedNCs.map((nc: any) => ({
      spreadsheet_id: sheet.id,
      user_id: params.userId,
      unit_id: params.unitId,
      food_item_name: nc.foodItemName || nc.itemName || '',
      field: nc.field,
      value: nc.value || '',
      message: nc.message,
      corrective_action: nc.correctiveAction,
      resolved: false,
      applied_action: null,
    }));

    const { data: ncData, error: ncError } = await supabase
      .from('non_conformities')
      .insert(ncRows)
      .select('id, food_item_name, field');

    if (ncError) throw ncError;
    insertedNCs = ncData || [];
  }

  return { ...sheet, insertedNCs };
}

export async function fetchSpreadsheets(filters?: { unitId?: string; sheetType?: string }) {
  let query = supabase
    .from('spreadsheets')
    .select('*, units(name)')
    .eq('finalized', true)
    .order('created_at', { ascending: false });

  if (filters?.unitId) query = query.eq('unit_id', filters.unitId);
  if (filters?.sheetType) query = query.eq('sheet_type', filters.sheetType);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function fetchSpreadsheetById(id: string) {
  const { data, error } = await supabase
    .from('spreadsheets')
    .select('*, units(name)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

// ============ NON-CONFORMITIES ============
export async function fetchPendingNCs(unitId?: string) {
  let query = supabase
    .from('non_conformities')
    .select('*, spreadsheets(sheet_type, sheet_date, responsible), units(name)')
    .eq('resolved', false)
    .order('created_at', { ascending: false });

  if (unitId) query = query.eq('unit_id', unitId);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function resolveNC(ncId: string, appliedAction: string) {
  const { error } = await supabase
    .from('non_conformities')
    .update({ resolved: true, applied_action: appliedAction })
    .eq('id', ncId);
  if (error) throw error;
}

// ============ DASHBOARD STATS ============
export async function fetchDashboardStats(unitId?: string) {
  // Fetch all spreadsheets
  let sheetsQuery = supabase.from('spreadsheets').select('id, items, created_at, unit_id').eq('finalized', true);
  if (unitId) sheetsQuery = sheetsQuery.eq('unit_id', unitId);
  const { data: sheets } = await sheetsQuery;

  // Fetch all NCs
  let ncsQuery = supabase.from('non_conformities').select('id, resolved, unit_id');
  if (unitId) ncsQuery = ncsQuery.eq('unit_id', unitId);
  const { data: ncs } = await ncsQuery;

  const totalSheets = sheets?.length || 0;
  const totalNCs = ncs?.length || 0;
  const resolvedNCs = ncs?.filter((nc: any) => nc.resolved).length || 0;
  const unresolvedNCs = totalNCs - resolvedNCs;

  // Calculate conformity based on data points vs NCs
  let totalDataPoints = 0;
  sheets?.forEach((s: any) => {
    const items = s.items as any[];
    totalDataPoints += items.length * 4; // approximate 4 data fields per item
  });

  const conformity = totalDataPoints > 0
    ? Math.round(((totalDataPoints - totalNCs) / totalDataPoints) * 1000) / 10
    : 100;

  return { conformity, records: totalSheets, justified: resolvedNCs, unjustified: unresolvedNCs };
}

export async function fetchConformityByUnit() {
  const { data: units } = await supabase.from('units').select('*').order('name');
  if (!units) return [];

  const results = [];
  for (const unit of units) {
    const stats = await fetchDashboardStats(unit.id);
    results.push({
      unitId: unit.id,
      unitName: unit.name,
      conformity: stats.conformity,
      records: stats.records,
      unjustified: stats.unjustified,
    });
  }

  // Sort by conformity desc
  results.sort((a, b) => b.conformity - a.conformity);
  return results;
}

// NC ranking by sheet type
export async function fetchNCRankingByType() {
  const { data } = await supabase
    .from('non_conformities')
    .select('spreadsheets(sheet_type)');

  if (!data) return [];

  const counts: Record<string, number> = {};
  data.forEach((nc: any) => {
    const type = nc.spreadsheets?.sheet_type || 'unknown';
    counts[type] = (counts[type] || 0) + 1;
  });

  const typeLabels: Record<string, string> = {
    'cold-lunch': 'Almoço',
    'breakfast': 'Café da Manhã',
    'defrosting': 'Descongelamento',
    'dinner': 'Jantar',
    'supper': 'Ceia',
    'snack': 'Lanche',
  };

  return Object.entries(counts)
    .map(([type, count]) => ({ type, label: typeLabels[type] || type, count }))
    .sort((a, b) => b.count - a.count);
}
