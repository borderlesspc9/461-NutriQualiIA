// Non-conformity detection engine for breakfast temperature control (RDC 216)

export interface BreakfastItem {
  id: string;
  name: string;
  // Término da Preparação
  prepTime: string;
  prepTemp: string;
  // Manutenção em Forno/Estufa
  ovenTime: string;
  ovenTemp: string;
  // Início da Distribuição
  distStartTime: string;
  distStartTemp: string;
  // Término da Distribuição
  distEndTime: string;
  distEndTemp: string;
  // Distribution type for oven/stove rules
  distributionType: 'hot' | 'cold';
}

export interface BreakfastNC {
  id: string;
  itemId: string;
  itemName: string;
  field: 'prepTemp' | 'ovenTemp' | 'distStartTemp' | 'distEndTemp' | 'distTime' | 'blank';
  value: string;
  message: string;
  correctiveAction: string | null;
  resolved: boolean;
  appliedAction: string | null;
}

function isNA(val: string): boolean {
  const v = val.trim().toLowerCase();
  return v === 'na' || v === 'n.a' || v === 'n.a.' || v === '-';
}

function parseTime(time: string): Date | null {
  if (!time) return null;
  const today = new Date().toISOString().slice(0, 10);
  const d = new Date(`${today}T${time}:00`);
  return isNaN(d.getTime()) ? null : d;
}

function hoursBetween(a: Date, b: Date): number {
  return Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60);
}

export function detectBreakfastNCs(items: BreakfastItem[]): BreakfastNC[] {
  const ncs: BreakfastNC[] = [];
  let ncId = 0;

  items.forEach((item) => {
    if (!item.name.trim()) return;

    // ========== BLANK FIELD CHECKS ==========
    const fields: Array<{ key: keyof BreakfastItem; label: string; ncField: BreakfastNC['field'] }> = [
      { key: 'prepTime', label: 'Hora (Término da Preparação)', ncField: 'blank' },
      { key: 'prepTemp', label: 'T°C (Término da Preparação)', ncField: 'blank' },
      { key: 'ovenTime', label: 'Hora (Manutenção Forno/Estufa)', ncField: 'blank' },
      { key: 'ovenTemp', label: 'T°C (Manutenção Forno/Estufa)', ncField: 'blank' },
      { key: 'distStartTime', label: 'Hora (Início da Distribuição)', ncField: 'blank' },
      { key: 'distStartTemp', label: 'T°C (Início da Distribuição)', ncField: 'blank' },
      { key: 'distEndTime', label: 'Hora (Término da Distribuição)', ncField: 'blank' },
      { key: 'distEndTemp', label: 'T°C (Término da Distribuição)', ncField: 'blank' },
    ];

    // Group fields by column pair (time+temp per section)
    const groups = [
      ['prepTime', 'prepTemp'],
      ['ovenTime', 'ovenTemp'],
      ['distStartTime', 'distStartTemp'],
      ['distEndTime', 'distEndTemp'],
    ];

    groups.forEach(group => {
      const values = group.map(k => {
        const v = (item[k as keyof BreakfastItem] as string)?.toString().trim() || '';
        return v;
      });
      const anyFilled = values.some(v => v && !isNA(v));
      if (!anyFilled) return; // entirely empty group = skip

      group.forEach(k => {
        const v = (item[k as keyof BreakfastItem] as string)?.toString().trim() || '';
        if (!v && !isNA(v)) {
          const fieldDef = fields.find(f => f.key === k);
          if (fieldDef) {
            ncs.push({
              id: `nc-${++ncId}`, itemId: item.id, itemName: item.name,
              field: 'blank', value: '',
              message: `Campo "${fieldDef.label}" em branco para ${item.name}`,
              correctiveAction: null, resolved: false, appliedAction: null,
            });
          }
        }
      });
    });

    // Also check: if ALL fields have something or NA, no blank NC. 
    // If any field is filled and others in the ENTIRE row aren't NA or filled, flag them.
    // The universal rule: if any field is blank, all others must be NA
    const allFieldKeys = fields.map(f => f.key);
    const allValues = allFieldKeys.map(k => (item[k as keyof BreakfastItem] as string)?.toString().trim() || '');
    const anyFilledGlobal = allValues.some(v => v && !isNA(v));
    if (anyFilledGlobal) {
      // Check fields not already caught by group logic
      // Actually the group logic above handles pairs. For the universal rule:
      // if a field is empty AND not caught by group (i.e., its pair is also empty), 
      // but another group has data, we need to check if the empty field should be NA.
      allFieldKeys.forEach((k, idx) => {
        const v = allValues[idx];
        if (!v) {
          // Check if this field was already flagged by group logic
          const alreadyFlagged = ncs.some(n => n.itemId === item.id && n.field === 'blank' && n.message.includes(fields[idx].label));
          if (!alreadyFlagged) {
            // The group was entirely empty but other groups have data → should be NA
            ncs.push({
              id: `nc-${++ncId}`, itemId: item.id, itemName: item.name,
              field: 'blank', value: '',
              message: `Campo "${fields[idx].label}" em branco para ${item.name} (deveria conter NA)`,
              correctiveAction: null, resolved: false, appliedAction: null,
            });
          }
        }
      });
    }

    // ========== TEMPERATURE CHECKS ==========

    // 1. Término da Preparação: must be >= 70°C
    const prepTempVal = item.prepTemp?.trim();
    if (prepTempVal && !isNA(prepTempVal)) {
      const temp = parseFloat(prepTempVal);
      if (!isNaN(temp) && temp < 70) {
        ncs.push({
          id: `nc-${++ncId}`, itemId: item.id, itemName: item.name,
          field: 'prepTemp', value: prepTempVal,
          message: `Temperatura de preparo ${temp}°C abaixo de 70°C para ${item.name}`,
          correctiveAction: `Não conformidade: temperatura de preparo (${temp}°C) inferior a 70°C. Ação corretiva: Reaquecer até atingir temperatura segura (≥70°C), conforme RDC 216.`,
          resolved: false, appliedAction: null,
        });
      }
    }

    // 2. Manutenção em Forno/Estufa
    const ovenTempVal = item.ovenTemp?.trim();
    if (ovenTempVal && !isNA(ovenTempVal)) {
      const temp = parseFloat(ovenTempVal);
      if (!isNaN(temp)) {
        if (item.distributionType === 'hot' && temp < 60) {
          ncs.push({
            id: `nc-${++ncId}`, itemId: item.id, itemName: item.name,
            field: 'ovenTemp', value: ovenTempVal,
            message: `Manutenção em forno/estufa: ${temp}°C < 60°C (preparação quente) para ${item.name}`,
            correctiveAction: `Não conformidade: preparação quente em manutenção a ${temp}°C (<60°C). Ação corretiva: Realizar reaquecimento até 70°C por 5 minutos (uma única vez), conforme RDC 216.`,
            resolved: false, appliedAction: null,
          });
        }
        if (item.distributionType === 'cold' && temp > 10) {
          ncs.push({
            id: `nc-${++ncId}`, itemId: item.id, itemName: item.name,
            field: 'ovenTemp', value: ovenTempVal,
            message: `Manutenção em forno/estufa: ${temp}°C > 10°C (preparação fria) para ${item.name}`,
            correctiveAction: `Não conformidade: preparação fria em manutenção a ${temp}°C (>10°C). Ação corretiva: Retornar imediatamente à refrigeração adequada e avaliar tempo de exposição, conforme RDC 216.`,
            resolved: false, appliedAction: null,
          });
        }
      }
    }

    // 3. Distribuição - temperature checks
    const checkDistTemp = (field: 'distStartTemp' | 'distEndTemp', label: string) => {
      const val = item[field]?.trim();
      if (!val || isNA(val)) return;
      const temp = parseFloat(val);
      if (isNaN(temp)) return;

      if (item.distributionType === 'hot' && temp < 60) {
        ncs.push({
          id: `nc-${++ncId}`, itemId: item.id, itemName: item.name,
          field, value: val,
          message: `${label}: ${temp}°C < 60°C (alimento quente) para ${item.name}`,
          correctiveAction: `Não conformidade: alimento quente a ${temp}°C (<60°C) na distribuição. Ação corretiva: Realizar reaquecimento até 70°C por 5 minutos (uma única vez), conforme RDC 216.`,
          resolved: false, appliedAction: null,
        });
      }
      if (item.distributionType === 'cold' && temp > 10) {
        ncs.push({
          id: `nc-${++ncId}`, itemId: item.id, itemName: item.name,
          field, value: val,
          message: `${label}: ${temp}°C > 10°C (alimento frio) para ${item.name}`,
          correctiveAction: `Não conformidade: alimento frio a ${temp}°C (>10°C) na distribuição. Ação corretiva: Retornar imediatamente à refrigeração adequada e avaliar tempo de exposição, conforme RDC 216.`,
          resolved: false, appliedAction: null,
        });
      }
    };

    checkDistTemp('distStartTemp', 'Início da Distribuição');
    checkDistTemp('distEndTemp', 'Término da Distribuição');

    // 4. Distribution time check (hot: max 6h, cold: max 4h)
    const prepTimeParsed = parseTime(item.prepTime);
    const distEndTimeParsed = parseTime(item.distEndTime);
    if (prepTimeParsed && distEndTimeParsed) {
      const hours = hoursBetween(prepTimeParsed, distEndTimeParsed);
      const maxHours = item.distributionType === 'hot' ? 6 : 4;
      if (hours > maxHours) {
        ncs.push({
          id: `nc-${++ncId}`, itemId: item.id, itemName: item.name,
          field: 'distTime', value: `${Math.round(hours * 10) / 10}h`,
          message: `Tempo de distribuição excedido: ${Math.round(hours * 10) / 10}h > ${maxHours}h (alimento ${item.distributionType === 'hot' ? 'quente' : 'frio'}) para ${item.name}`,
          correctiveAction: `Não conformidade: tempo de distribuição excedido (${Math.round(hours * 10) / 10}h > ${maxHours}h). Ação corretiva: Descartar alimento, conforme RDC 216.`,
          resolved: false, appliedAction: null,
        });
      }
    }
  });

  return ncs;
}

export function getDefaultBreakfastItems(): BreakfastItem[] {
  const items: BreakfastItem[] = [];
  for (let i = 1; i <= 15; i++) {
    items.push({
      id: String(i),
      name: '',
      prepTime: '', prepTemp: '',
      ovenTime: '', ovenTemp: '',
      distStartTime: '', distStartTemp: '',
      distEndTime: '', distEndTemp: '',
      distributionType: 'hot',
    });
  }
  return items;
}
