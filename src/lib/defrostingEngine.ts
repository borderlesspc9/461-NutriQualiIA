// Non-conformity detection engine for defrosting temperature control (RDC 216)

export interface DefrostingItem {
  id: string;
  name: string; // food name
  monitorings: DefrostingMonitoring[];
}

export interface DefrostingMonitoring {
  date: string;   // YYYY-MM-DD
  time: string;   // HH:mm
  temp: string;   // temperature value
}

export interface DefrostingNC {
  id: string;
  itemId: string;
  itemName: string;
  monitoringIndex: number; // which monitoring column (0-4)
  field: 'temp' | 'time_gap' | 'not_prepared' | 'blank';
  value: string;
  message: string;
  correctiveAction: string | null;
  resolved: boolean;
  appliedAction: string | null;
}

const MAX_TEMP = 5; // °C
const MAX_HOURS = 72;
const MAX_MONITORING_GAP_HOURS = 12;

function isNA(val: string): boolean {
  const v = val.trim().toLowerCase();
  return v === 'na' || v === 'n.a' || v === 'n.a.' || v === '-';
}

function parseDateTime(date: string, time: string): Date | null {
  if (!date || !time) return null;
  const d = new Date(`${date}T${time}:00`);
  return isNaN(d.getTime()) ? null : d;
}

function hoursBetween(a: Date, b: Date): number {
  return Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60);
}

export function detectDefrostingNCs(items: DefrostingItem[]): DefrostingNC[] {
  const ncs: DefrostingNC[] = [];
  let ncId = 0;

  items.forEach((item) => {
    if (!item.name.trim()) return; // skip empty food rows

    // Check blanks: only flag empty fields when at least one field in the same monitoring is filled
    item.monitorings.forEach((mon, idx) => {
      const dateVal = mon.date?.trim() || '';
      const timeVal = mon.time?.trim() || '';
      const tempVal = mon.temp?.trim() || '';

      const anyFilled = dateVal || timeVal || tempVal;
      if (!anyFilled) return; // entirely empty monitoring = no NC

      if (!dateVal && !isNA(dateVal)) {
        ncs.push({
          id: `nc-${++ncId}`, itemId: item.id, itemName: item.name, monitoringIndex: idx,
          field: 'blank', value: '', message: `Campo "Data" em branco no ${idx + 1}° monitoramento para ${item.name}`,
          correctiveAction: null, resolved: false, appliedAction: null,
        });
      }
      if (!timeVal && !isNA(timeVal)) {
        ncs.push({
          id: `nc-${++ncId}`, itemId: item.id, itemName: item.name, monitoringIndex: idx,
          field: 'blank', value: '', message: `Campo "Hora" em branco no ${idx + 1}° monitoramento para ${item.name}`,
          correctiveAction: null, resolved: false, appliedAction: null,
        });
      }
      if (!tempVal && !isNA(tempVal)) {
        ncs.push({
          id: `nc-${++ncId}`, itemId: item.id, itemName: item.name, monitoringIndex: idx,
          field: 'blank', value: '', message: `Campo "T°C" em branco no ${idx + 1}° monitoramento para ${item.name}`,
          correctiveAction: null, resolved: false, appliedAction: null,
        });
      }
    });

    // Temperature checks
    let reachedTarget = false; // reached 5°C
    let reachedTargetIndex = -1;
    const validMonitorings: Array<{ idx: number; date: Date; temp: number }> = [];

    item.monitorings.forEach((mon, idx) => {
      const tempVal = mon.temp?.trim() || '';
      if (!tempVal || isNA(tempVal)) return;
      const temp = parseFloat(tempVal);
      if (isNaN(temp)) return;

      const dt = parseDateTime(mon.date, mon.time);

      // Rule 1: Temperature > 5°C
      if (temp > MAX_TEMP) {
        ncs.push({
          id: `nc-${++ncId}`, itemId: item.id, itemName: item.name, monitoringIndex: idx,
          field: 'temp', value: tempVal,
          message: `Temperatura ${temp}°C acima do limite (${MAX_TEMP}°C) no ${idx + 1}° monitoramento para ${item.name}`,
          correctiveAction: `Não conformidade: alimento fora da temperatura segura (${temp}°C > ${MAX_TEMP}°C). Ação corretiva: Descartar alimento conforme RDC 216.`,
          resolved: false, appliedAction: null,
        });
      }

      // Track if reached 5°C
      if (temp >= MAX_TEMP && !reachedTarget) {
        reachedTarget = true;
        reachedTargetIndex = idx;
      }

      if (dt) {
        validMonitorings.push({ idx, date: dt, temp });
      }
    });

    // Rule: Time > 72 hours from first to last monitoring
    if (validMonitorings.length >= 2) {
      const first = validMonitorings[0];
      const last = validMonitorings[validMonitorings.length - 1];
      const totalHours = hoursBetween(first.date, last.date);
      if (totalHours > MAX_HOURS) {
        ncs.push({
          id: `nc-${++ncId}`, itemId: item.id, itemName: item.name, monitoringIndex: last.idx,
          field: 'time_gap', value: `${Math.round(totalHours)}h`,
          message: `Tempo de descongelamento superior a ${MAX_HOURS}h (${Math.round(totalHours)}h) para ${item.name}`,
          correctiveAction: `Não conformidade: permanência prolongada sob descongelamento (${Math.round(totalHours)}h > ${MAX_HOURS}h). Ação corretiva: Descartar alimento conforme RDC 216.`,
          resolved: false, appliedAction: null,
        });
      }

      // Rule: Monitoring gap > 12 hours
      for (let i = 1; i < validMonitorings.length; i++) {
        const gap = hoursBetween(validMonitorings[i - 1].date, validMonitorings[i].date);
        if (gap > MAX_MONITORING_GAP_HOURS) {
          ncs.push({
            id: `nc-${++ncId}`, itemId: item.id, itemName: item.name, monitoringIndex: validMonitorings[i].idx,
            field: 'time_gap', value: `${Math.round(gap)}h`,
            message: `Intervalo de monitoramento superior a ${MAX_MONITORING_GAP_HOURS}h (${Math.round(gap)}h) entre ${i}° e ${i + 1}° monitoramento para ${item.name}`,
            correctiveAction: null, // No corrective action for this
            resolved: false, appliedAction: null,
          });
        }
      }
    }

    // Rule: Food reached 5°C before 72h and was not prepared (next monitoring has data that isn't NA/-)
    if (reachedTarget && reachedTargetIndex < item.monitorings.length - 1) {
      for (let i = reachedTargetIndex + 1; i < item.monitorings.length; i++) {
        const nextMon = item.monitorings[i];
        const nextTemp = nextMon.temp?.trim() || '';
        const nextDate = nextMon.date?.trim() || '';
        const nextTime = nextMon.time?.trim() || '';
        const hasData = (nextTemp && !isNA(nextTemp)) || (nextDate && !isNA(nextDate)) || (nextTime && !isNA(nextTime));
        if (hasData) {
          ncs.push({
            id: `nc-${++ncId}`, itemId: item.id, itemName: item.name, monitoringIndex: i,
            field: 'not_prepared', value: nextTemp,
            message: `Alimento ${item.name} atingiu ${MAX_TEMP}°C e não foi encaminhado para preparo (monitoramento ${i + 1} preenchido)`,
            correctiveAction: `Não conformidade: alimento permaneceu armazenado após atingir ${MAX_TEMP}°C. Ação corretiva: Encaminhar imediatamente para preparo térmico conforme RDC 216.`,
            resolved: false, appliedAction: null,
          });
          break; // Only flag once
        }
      }
    }
  });

  return ncs;
}

export function getDefaultDefrostingItems(): DefrostingItem[] {
  const items: DefrostingItem[] = [];
  for (let i = 1; i <= 8; i++) {
    items.push({
      id: String(i),
      name: '',
      monitorings: Array.from({ length: 5 }, () => ({ date: '', time: '', temp: '' })),
    });
  }
  return items;
}
