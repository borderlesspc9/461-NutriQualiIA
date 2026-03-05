import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BreakfastItem, BreakfastNC, getDefaultBreakfastItems, detectBreakfastNCs } from '@/lib/breakfastEngine';
import { saveSpreadsheetToSupabase, fetchUnits } from '@/lib/supabaseService';
import { syncToCloud } from '@/lib/storage';
import { useAuth } from '@/hooks/useAuth';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AlertTriangle } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const COLUMN_GROUPS = [
  { label: 'Término da Preparação', fields: ['prepTime', 'prepTemp'] as const },
  { label: 'Manutenção em Forno/Estufa', fields: ['ovenTime', 'ovenTemp'] as const },
  { label: 'Início da Distribuição', fields: ['distStartTime', 'distStartTemp'] as const },
  { label: 'Término da Distribuição', fields: ['distEndTime', 'distEndTemp'] as const },
];

const FIELD_LABELS: Record<string, string> = {
  prepTime: 'Hora (Término da Preparação)', prepTemp: 'T°C (Término da Preparação)',
  ovenTime: 'Hora (Manutenção Forno/Estufa)', ovenTemp: 'T°C (Manutenção Forno/Estufa)',
  distStartTime: 'Hora (Início da Distribuição)', distStartTemp: 'T°C (Início da Distribuição)',
  distEndTime: 'Hora (Término da Distribuição)', distEndTemp: 'T°C (Término da Distribuição)',
};

interface TemperatureSheetProps {
  title: string;
  sheetType: string;
}

const TemperatureSheet = ({ title, sheetType }: TemperatureSheetProps) => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const userName = profile?.full_name || 'colaborador';

  
  const [unitId, setUnitId] = useState('');
  const [units, setUnits] = useState<Array<{ id: string; name: string }>>([]);
  const [responsible, setResponsible] = useState(userName);
  const [sheetDate, setSheetDate] = useState('');
  const [items, setItems] = useState<BreakfastItem[]>(getDefaultBreakfastItems());
  const [nonConformities, setNonConformities] = useState<BreakfastNC[]>([]);
  const [identified, setIdentified] = useState(false);
  const [correctiveText, setCorrectiveText] = useState('');
  const [showNCDialog, setShowNCDialog] = useState<BreakfastNC | null>(null);
  const [ncAction, setNcAction] = useState('');
  const [editingAction, setEditingAction] = useState(false);
  const [showFinalizeAlert, setShowFinalizeAlert] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUnits().then(data => {
      setUnits(data || []);
      if (data && data.length > 0) setUnitId(data[0].id);
    });
  }, []);

  const updateItem = useCallback((id: string, field: keyof BreakfastItem, value: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  }, []);

  const handleIdentifyNCs = () => {
    const ncs = detectBreakfastNCs(items);
    const mergedNCs = ncs.map(nc => {
      const ex = nonConformities.find(e => e.itemId === nc.itemId && e.field === nc.field && e.resolved);
      return ex ? { ...nc, resolved: true, appliedAction: ex.appliedAction } : nc;
    });
    setNonConformities(mergedNCs);
    setIdentified(true);
  };

  const handleResolveNC = (ncId: string, action: string) => {
    setNonConformities(prev => prev.map(nc => nc.id === ncId ? { ...nc, resolved: true, appliedAction: action } : nc));
    setShowNCDialog(null);
  };

  const handleFinalize = () => setShowFinalizeAlert(true);

  const confirmFinalize = async () => {
    if (!identified) handleIdentifyNCs();
    if (!user || !unitId) return;
    setSaving(true);
    try {
      const ncsForSave = nonConformities.map(nc => ({
        foodItemName: nc.itemName, field: nc.field, value: nc.value,
        message: nc.message, correctiveAction: nc.correctiveAction,
        resolved: nc.resolved, appliedAction: nc.appliedAction,
      }));
      const sheet = await saveSpreadsheetToSupabase({
        userId: user.id, unitId, sheetType,
        responsible, roleTitle: profile?.role_title || 'Chef de Cozinha',
        sheetDate: sheetDate || new Date().toISOString().slice(0, 10), items,
        nonConformities: ncsForSave,
      });
      const unitName = units.find(u => u.id === unitId)?.name || '';
      await syncToCloud({
        id: sheet.id, unit: unitName, responsible, role: profile?.role_title || 'Chef de Cozinha',
        date: sheetDate || new Date().toISOString().slice(0, 10), items: items as any,
        nonConformities: ncsForSave as any, finalized: true,
      }, sheetType, sheet.insertedNCs);

      setItems(getDefaultBreakfastItems()); setNonConformities([]); setIdentified(false);
      navigate('/finalized/' + sheet.id);
    } catch (err) { console.error(err); } finally { setSaving(false); }
  };

  const isBlankNCField = (itemId: string, fieldLabel: string) => {
    if (!identified) return false;
    return nonConformities.some(n => n.itemId === itemId && n.field === 'blank' && n.message.includes(`"${fieldLabel}"`));
  };

  const getTempNC = (itemId: string, field: BreakfastNC['field']) => {
    if (!identified) return null;
    return nonConformities.find(n => n.itemId === itemId && n.field === field) || null;
  };

  const getTempStatus = (itemId: string, field: BreakfastNC['field']): 'normal' | 'nc' | 'resolved' => {
    if (!identified) return 'normal';
    const nc = nonConformities.find(n => n.itemId === itemId && n.field === field);
    if (!nc) return 'normal';
    return nc.resolved ? 'resolved' : 'nc';
  };

  const correctiveTexts = nonConformities.filter(nc => nc.correctiveAction && nc.resolved).map(nc => `${nc.itemName}: ${nc.appliedAction}`);

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFontSize(14); doc.setFont('helvetica', 'bold');
    doc.text(`Controle de Temperatura - ${title}`, 14, 15);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text(`Responsável: ${responsible}`, 14, 22); doc.text(`Data: ${sheetDate}`, 14, 27);
    const head = [['Preparação', ...COLUMN_GROUPS.flatMap(g => [`${g.label} - Hora`, `${g.label} - T°C`])]];
    const body = items.filter(i => i.name.trim()).map(item => [item.name, item.prepTime || '-', item.prepTemp || '-', item.ovenTime || '-', item.ovenTemp || '-', item.distStartTime || '-', item.distStartTemp || '-', item.distEndTime || '-', item.distEndTemp || '-']);
    autoTable(doc, { startY: 37, head, body, theme: 'grid', headStyles: { fillColor: [0, 166, 153], textColor: 255, fontSize: 6 }, bodyStyles: { fontSize: 7 }, styles: { cellPadding: 1.5 } });
    const slug = title.toLowerCase().replace(/\s+/g, '_').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    doc.save(`${slug}_${sheetDate || 'sem-data'}.pdf`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/dashboard')} className="text-foreground font-bold">←</button>
          <span className="text-primary font-bold text-sm">NutriQuali IA</span>
          <span className="text-muted-foreground mx-1">|</span>
          <span className="font-bold text-sm text-foreground">CONTROLE DE TEMPERATURA</span>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={sheetDate} onChange={e => setSheetDate(e.target.value)}
            className="text-xs border border-border rounded px-2 py-1 bg-background text-foreground" />
          <button onClick={exportPDF} className="text-xs text-muted-foreground flex items-center gap-1 border border-border rounded px-2 py-1">📥 EXPORTAR</button>
        </div>
      </header>

      <main className="max-w-[1100px] mx-auto px-2 py-4 animate-fade-in">
        <div className="grid grid-cols-2 gap-3 mb-4 border border-border rounded-lg p-3 bg-card">
          <div>
            <label className="text-[10px] text-muted-foreground font-semibold uppercase">Unidade:</label>
            <select value={unitId} onChange={e => setUnitId(e.target.value)}
              className="w-full text-xs border border-border rounded px-2 py-1.5 bg-background text-foreground mt-0.5">
              {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground font-semibold uppercase">Responsável:</label>
            <input type="text" value={responsible} onChange={e => setResponsible(e.target.value)}
              className="w-full text-xs border border-border rounded px-2 py-1.5 bg-background text-foreground mt-0.5" />
          </div>
        </div>

        <div className="overflow-x-auto border border-border rounded-lg bg-card">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-primary text-primary-foreground">
                <th rowSpan={2} className="p-2 text-left font-bold border-r border-primary-foreground/20 min-w-[120px]">Preparação</th>
                {COLUMN_GROUPS.map((g, i) => (
                  <th key={i} colSpan={2} className="p-1.5 text-center font-bold text-[10px] border-r border-primary-foreground/20 last:border-r-0 whitespace-nowrap">{g.label}</th>
                ))}
              </tr>
              <tr className="bg-primary/80 text-primary-foreground">
                {COLUMN_GROUPS.map((_, i) => (
                  <SubHeaders key={i} />
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-t border-border">
                  <td className="p-1.5 border-r border-border">
                    <input type="text" value={item.name} onChange={e => updateItem(item.id, 'name', e.target.value)}
                      placeholder="Digite aqui..."
                      className="w-full text-xs bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50" />
                  </td>
                  {COLUMN_GROUPS.map((g, gIdx) => {
                    const timeField = g.fields[0];
                    const tempField = g.fields[1];
                    const timeLabel = FIELD_LABELS[timeField];
                    const tempLabel = FIELD_LABELS[tempField];
                    const blankTime = isBlankNCField(item.id, timeLabel);
                    const blankTemp = isBlankNCField(item.id, tempLabel);
                    const tempNcField = tempField as BreakfastNC['field'];
                    const tempStatus = getTempStatus(item.id, tempNcField);
                    const tempNc = getTempNC(item.id, tempNcField);
                    const timeClass = blankTime ? 'border-destructive bg-destructive/5' : 'border-border';
                    const tempClass = tempStatus === 'nc' ? 'border-destructive bg-destructive/5 text-destructive font-bold cursor-pointer' :
                      tempStatus === 'resolved' ? 'border-nc-resolved bg-nc-resolved/5 text-nc-resolved font-bold' :
                      blankTemp ? 'border-destructive bg-destructive/5 text-foreground' : 'border-border text-foreground';

                    return (
                      <CellPair key={gIdx} timeValue={item[timeField] as string} tempValue={item[tempField] as string}
                        onTimeChange={v => updateItem(item.id, timeField, v)} onTempChange={v => updateItem(item.id, tempField, v)}
                        timeClass={timeClass} tempClass={tempClass} tempStatus={tempStatus}
                        onTempClick={() => { if (tempNc && !tempNc.resolved) { setShowNCDialog(tempNc); setNcAction(tempNc.correctiveAction || ''); setEditingAction(false); } }} />
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 bg-card border border-border rounded-lg p-3">
          <p className="text-xs font-bold text-foreground mb-2">Ação Corretiva:</p>
          {correctiveTexts.length > 0 && (
            <div className="space-y-1 mb-2">{correctiveTexts.map((t, i) => <p key={i} className="text-xs text-nc-resolved">{t}</p>)}</div>
          )}
          <textarea value={correctiveText} onChange={e => setCorrectiveText(e.target.value)} placeholder="Digite aqui qualquer ação corretiva tomada..."
            className="w-full text-sm border border-border rounded-lg p-2 bg-background text-foreground resize-none min-h-[60px] placeholder:text-muted-foreground" />
        </div>

        <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">ⓘ Preencha todos os campos obrigatórios para finalizar o monitoramento.</p>

        <div className="flex flex-col sm:flex-row gap-3 mt-4 pb-6">
          <button
            type="button"
            onClick={handleIdentifyNCs}
            className="flex-1 min-h-[52px] py-3.5 px-4 rounded-2xl border-2 border-destructive bg-destructive/10 text-destructive font-semibold text-sm flex items-center justify-center gap-2.5 shadow-sm active:scale-[0.98] transition-transform touch-manipulation"
          >
            <AlertTriangle className="shrink-0 size-5" strokeWidth={2.5} />
            <span className="text-center leading-tight">Identificar não conformidade</span>
          </button>
          <button
            type="button"
            onClick={handleFinalize}
            disabled={saving}
            className="flex-1 min-h-[52px] py-3.5 px-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-transform touch-manipulation disabled:opacity-50 disabled:active:scale-100"
          >
            {saving ? 'Enviando...' : '✓ Finalizar'}
          </button>
        </div>
      </main>

      {showNCDialog && (
        <div className="fixed inset-0 z-50 bg-foreground/40 flex items-center justify-center px-4" onClick={() => setShowNCDialog(null)}>
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full animate-fade-in shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <span className="text-4xl">⚠️</span>
              <h2 className="text-xl font-bold text-foreground mt-2">Não Conformidade Detectada</h2>
            </div>
            <div className="flex flex-col items-center mb-4">
              <span className="text-3xl">🌡️</span>
              <p className="text-sm text-foreground text-center mt-2">{showNCDialog.message}</p>
              <span className="mt-2 inline-block bg-destructive/10 text-destructive text-[10px] font-bold px-3 py-1 rounded-full uppercase">ⓘ Alerta crítico</span>
            </div>
            {showNCDialog.correctiveAction && (
              <div className="mb-4">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">Ação corretiva sugerida</p>
                {editingAction ? (
                  <textarea value={ncAction} onChange={e => setNcAction(e.target.value)}
                    className="w-full border border-border rounded-lg p-2 text-sm text-foreground bg-card resize-none" rows={3} />
                ) : (
                  <div className="border border-border rounded-lg p-3 text-sm text-foreground bg-muted/30">{ncAction}</div>
                )}
              </div>
            )}
            <div className="space-y-2">
              {showNCDialog.correctiveAction && (
                <>
                  <button onClick={() => handleResolveNC(showNCDialog.id, ncAction)}
                    className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm">Registrar Ação Corretiva</button>
                  <button onClick={() => setEditingAction(!editingAction)}
                    className="w-full border border-border text-foreground py-3 rounded-xl font-semibold text-sm">
                    {editingAction ? 'Concluir Edição' : 'Editar'}
                  </button>
                </>
              )}
              <button onClick={() => setShowNCDialog(null)} className="w-full text-muted-foreground text-sm py-2">
                {showNCDialog.correctiveAction ? 'Ignorar' : 'Fechar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={showFinalizeAlert} onOpenChange={setShowFinalizeAlert}>
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Finalizar planilha?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">A planilha será enviada para análise e não poderá ser editada.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmFinalize} className="rounded-xl bg-primary text-primary-foreground">Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

function SubHeaders() {
  return (
    <>
      <th className="p-1 text-center font-semibold text-[9px] border-r border-primary-foreground/20">HORA</th>
      <th className="p-1 text-center font-semibold text-[9px] border-r border-primary-foreground/20 last:border-r-0">T°C</th>
    </>
  );
}

function CellPair({ timeValue, tempValue, onTimeChange, onTempChange, timeClass, tempClass, tempStatus, onTempClick }: any) {
  return (
    <>
      <td className="p-1 text-center border-r border-border">
        <input type="time" value={timeValue} onChange={(e: any) => onTimeChange(e.target.value)}
          className={`w-16 text-center border rounded px-1 py-1 text-[11px] ${timeClass}`} />
      </td>
      <td className="p-1 text-center border-r border-border">
        <div className="inline-flex items-center gap-0.5">
          <input type="text" inputMode="decimal" value={tempValue}
            onChange={(e: any) => {
              const v = e.target.value;
              if (v === '' || /^-?\d*\.?\d*$/.test(v) || /^[nN]\.?[aA]\.?$/.test(v)) onTempChange(v);
            }}
            className={`w-14 text-center border rounded px-1 py-1 text-[11px] ${tempClass}`}
            onClick={tempStatus === 'nc' ? onTempClick : undefined} />
          {tempStatus === 'nc' && <span className="text-destructive text-xs cursor-pointer" onClick={onTempClick}>⚠</span>}
          {tempStatus === 'resolved' && <span className="text-nc-resolved text-xs">✓</span>}
        </div>
      </td>
    </>
  );
}

export default TemperatureSheet;
