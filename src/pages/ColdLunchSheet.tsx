import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FoodItem, NonConformity, getDefaultLunchItems, detectNonConformities } from '@/lib/ncEngine';
import { saveSpreadsheetToSupabase, fetchUnits } from '@/lib/supabaseService';
import { syncToCloud } from '@/lib/storage';
import { useAuth } from '@/hooks/useAuth';
import NCDialog from '@/components/NCDialog';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const ColdLunchSheet = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const userName = profile?.full_name || 'colaborador';
  const [unit, setUnit] = useState('');
  const [unitId, setUnitId] = useState('');
  const [units, setUnits] = useState<Array<{ id: string; name: string }>>([]);
  const [responsible] = useState(userName);
  const [role] = useState(profile?.role_title || 'Chef de Cozinha');
  const [date] = useState(new Date().toLocaleDateString('pt-BR'));
  const [items, setItems] = useState<FoodItem[]>(getDefaultLunchItems());
  const [nonConformities, setNonConformities] = useState<NonConformity[]>([]);
  const [showNCDialog, setShowNCDialog] = useState<NonConformity | null>(null);
  const [identified, setIdentified] = useState(false);
  const [showFinalizeAlert, setShowFinalizeAlert] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUnits().then(data => {
      setUnits(data || []);
      if (data && data.length > 0) {
        setUnit(data[0].name);
        setUnitId(data[0].id);
      }
    });
  }, []);

  const updateItem = useCallback((id: string, field: keyof FoodItem, value: string | boolean | null) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  }, []);

  const handleIdentifyNCs = () => {
    const ncs = detectNonConformities(items);
    const mergedNCs = ncs.map(nc => {
      const existing = nonConformities.find(e => e.foodItemId === nc.foodItemId && e.field === nc.field && e.resolved);
      return existing ? { ...nc, resolved: true, appliedAction: existing.appliedAction } : nc;
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
      const sheet = await saveSpreadsheetToSupabase({
        userId: user.id,
        unitId,
        sheetType: 'cold-lunch',
        responsible,
        roleTitle: role,
        sheetDate: new Date().toISOString().slice(0, 10),
        items,
        nonConformities,
      });

      await syncToCloud({
        id: sheet.id, unit, responsible, role, date: new Date().toISOString().slice(0, 10),
        items, nonConformities, finalized: true,
      }, 'cold-lunch', sheet.insertedNCs);

      setItems(getDefaultLunchItems());
      setNonConformities([]);
      setIdentified(false);
      navigate('/finalized/' + sheet.id);
    } catch (err) {
      console.error('Error finalizing:', err);
    } finally {
      setSaving(false);
    }
  };

  const getFieldStatus = (item: FoodItem, field: 'startTemp' | 'endTemp') => {
    if (!identified) return 'normal';
    const nc = nonConformities.find(n => n.foodItemId === item.id && n.field === field);
    if (!nc) return 'normal';
    return nc.resolved ? 'resolved' : 'nc';
  };

  const getBlankStatus = (item: FoodItem, field: 'startTime' | 'endTime' | 'startTemp' | 'endTemp') => {
    if (!identified) return false;
    return nonConformities.some(n => n.foodItemId === item.id && n.field === 'blank' && n.message.includes(fieldLabel(field)));
  };

  const getNameBlankStatus = (item: FoodItem) => {
    if (!identified) return false;
    return nonConformities.some(n => n.foodItemId === item.id && n.field === 'blank_name');
  };

  const fieldLabel = (f: string) => {
    const map: Record<string, string> = {
      startTime: 'Horário início', startTemp: 'Temperatura início',
      endTime: 'Horário após 1h', endTemp: 'Temperatura após 1h',
    };
    return map[f] || f;
  };

  const getNcForField = (itemId: string, field: 'startTemp' | 'endTemp') => {
    return nonConformities.find(n => n.foodItemId === itemId && n.field === field);
  };

  const correctiveTexts = nonConformities.filter(nc => nc.correctiveAction && nc.resolved).map(nc => `${nc.foodItemName}: ${nc.appliedAction}`);
  const unresolvedTempNCs = nonConformities.filter(nc => nc.field !== 'blank' && !nc.resolved);

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFontSize(16); doc.setFont('helvetica', 'bold');
    doc.text('Controle de Cadeia Fria - Almoço', 14, 15);
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.text(`Unidade: ${unit}`, 14, 23); doc.text(`Comissionado: ${responsible}`, 14, 28);
    doc.text(`Responsável: ${role}`, 14, 33); doc.text(`Data: ${date}`, 14, 38);
    const head = [['Preparação', 'Amostra', 'Hora Início', 'Temp. Início (°C)', 'Hora Final', 'Temp. Final (°C)']];
    const body = items.map(item => [item.name, item.sample === true ? 'Sim' : item.sample === false ? 'Não' : '-', item.startTime || '-', item.startTemp || '-', item.endTime || '-', item.endTemp || '-']);
    autoTable(doc, { startY: 44, head, body, theme: 'grid', headStyles: { fillColor: [0, 166, 153], textColor: 255, fontSize: 9 }, bodyStyles: { fontSize: 9 }, styles: { cellPadding: 3 } });
    doc.save(`cadeia_fria_almoco_${date.replace(/\//g, '-')}.pdf`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/dashboard')} className="text-foreground">←</button>
          <span className="font-bold text-sm text-foreground">CONTROLE DE CADEIA FRIA</span>
        </div>
        <button onClick={exportPDF} className="text-xs text-muted-foreground flex items-center gap-1">📤 Exportar PDF</button>
      </header>

      <main className="max-w-3xl mx-auto px-2 py-4 animate-fade-in">
        <div className="grid grid-cols-4 gap-2 mb-4 text-xs">
          <div>
            <p className="text-[10px] text-muted-foreground font-medium uppercase">UNIDADE</p>
            <select value={unitId} onChange={e => { setUnitId(e.target.value); const u = units.find(u => u.id === e.target.value); if (u) setUnit(u.name); }}
              className="w-full text-xs font-semibold text-foreground border border-border rounded px-2 py-1 bg-card mt-0.5">
              {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <Field label="COMISSIONADO" value={responsible} />
          <Field label="RESPONSÁVEL" value={role} />
          <Field label="DATA" value={date} />
        </div>

        <div className="bg-primary text-primary-foreground text-center py-2 rounded-t-lg font-bold text-sm">CADEIA FRIA</div>
        <div className="bg-primary/80 text-primary-foreground text-center py-1 font-semibold text-xs">ALMOÇO</div>

        <div className="overflow-x-auto border border-border rounded-b-lg bg-card">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted text-foreground">
                <th className="p-2 text-left font-semibold w-32">PREPARAÇÕES</th>
                <th className="p-2 text-center font-semibold w-16">AMOSTRA</th>
                <th className="p-2 text-center font-semibold">HORÁRIO<br />INÍCIO DA<br />DISTRIBUIÇÃO</th>
                <th className="p-2 text-center font-semibold">TEMPERATURA<br />INÍCIO DA<br />DISTRIBUIÇÃO</th>
                <th className="p-2 text-center font-semibold">HORÁRIO<br />APÓS 1 HORA DO<br />INÍCIO DA DISTRIBUIÇÃO</th>
                <th className="p-2 text-center font-semibold">TEMPERATURA<br />APÓS 1 HORA DO<br />INÍCIO DA DISTRIBUIÇÃO</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const startStatus = getFieldStatus(item, 'startTemp');
                const endStatus = getFieldStatus(item, 'endTemp');
                const blankStartTime = getBlankStatus(item, 'startTime');
                const blankEndTime = getBlankStatus(item, 'endTime');
                const blankStartTemp = getBlankStatus(item, 'startTemp');
                const blankEndTemp = getBlankStatus(item, 'endTemp');
                const nameBlank = getNameBlankStatus(item);

                return (
                  <tr key={item.id} className="border-t border-border">
                    <td className={`p-2 font-medium leading-tight ${nameBlank ? 'bg-destructive/5' : ''}`}>
                      <span className={`block text-xs ${nameBlank ? 'text-destructive font-bold' : 'text-foreground'}`}>
                        {item.name.split(':')[0]}:{nameBlank && <span className="ml-1 animate-pulse-alert">⚠</span>}
                      </span>
                      <input type="text" placeholder="digite aqui.."
                        value={item.name.includes(':') ? item.name.split(':').slice(1).join(':').trim() : ''}
                        onChange={e => updateItem(item.id, 'name', `${item.name.split(':')[0]}: ${e.target.value}`)}
                        className={`w-full text-xs bg-transparent border-b outline-none py-0.5 placeholder:text-muted-foreground ${nameBlank ? 'border-destructive text-destructive' : 'border-border/50 focus:border-primary text-foreground'}`} />
                    </td>
                    <td className="p-2 text-center">
                      <input type="checkbox" checked={item.sample === true} onChange={e => updateItem(item.id, 'sample', e.target.checked)} className="w-4 h-4 accent-primary" />
                    </td>
                    <td className="p-2 text-center">
                      <input type="time" value={item.startTime} onChange={e => updateItem(item.id, 'startTime', e.target.value)}
                        className={`w-20 text-center border rounded px-1 py-1 text-xs ${blankStartTime ? 'border-destructive bg-destructive/5' : 'border-border'}`} />
                    </td>
                    <td className="p-2 text-center">
                      <TempCell value={item.startTemp} onChange={v => updateItem(item.id, 'startTemp', v)}
                        status={blankStartTemp ? 'nc' : startStatus}
                        onClick={() => { const nc = getNcForField(item.id, 'startTemp'); if (nc && !nc.resolved) setShowNCDialog(nc); }} />
                    </td>
                    <td className="p-2 text-center">
                      <input type="time" value={item.endTime} onChange={e => updateItem(item.id, 'endTime', e.target.value)}
                        className={`w-20 text-center border rounded px-1 py-1 text-xs ${blankEndTime ? 'border-destructive bg-destructive/5' : 'border-border'}`} />
                    </td>
                    <td className="p-2 text-center">
                      <TempCell value={item.endTemp} onChange={v => updateItem(item.id, 'endTemp', v)}
                        status={blankEndTemp ? 'nc' : endStatus}
                        onClick={() => { const nc = getNcForField(item.id, 'endTemp'); if (nc && !nc.resolved) setShowNCDialog(nc); }} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 bg-card border border-border rounded-lg p-3">
          <p className="text-xs font-semibold text-foreground mb-2">AÇÃO CORRETIVA PARA NÃO CONFORMIDADE:</p>
          {correctiveTexts.length > 0 ? (
            <div className="space-y-1">{correctiveTexts.map((t, i) => <p key={i} className="text-xs text-nc-resolved">{t}</p>)}</div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              {identified && unresolvedTempNCs.length > 0 ? `${unresolvedTempNCs.length} não conformidade(s) detectada(s).` : 'Nenhuma ação corretiva registrada.'}
            </p>
          )}
        </div>

        <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">ⓘ Não conformidades são geradas automaticamente.</p>

        <div className="flex gap-3 mt-4 pb-6">
          <button onClick={handleIdentifyNCs} className="flex-1 bg-destructive text-destructive-foreground py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2">
            ⚠ Identificar não conformidade
          </button>
          <button onClick={handleFinalize} disabled={saving}
            className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            {saving ? 'Enviando...' : '✓ FINALIZAR'}
          </button>
        </div>
      </main>

      {showNCDialog && <NCDialog nc={showNCDialog} onResolve={handleResolveNC} onClose={() => setShowNCDialog(null)} />}

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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground font-medium uppercase">{label}</p>
      <p className="text-xs font-semibold text-foreground border border-border rounded px-2 py-1 bg-card mt-0.5">{value}</p>
    </div>
  );
}

function TempCell({ value, onChange, status, onClick }: { value: string; onChange: (v: string) => void; status: string; onClick: () => void }) {
  const baseClass = 'w-16 text-center border rounded px-1 py-1 text-xs';
  const statusClass = status === 'nc' ? 'border-destructive bg-destructive/5 text-destructive font-bold cursor-pointer' :
    status === 'resolved' ? 'border-nc-resolved bg-nc-resolved/5 text-nc-resolved font-bold' : 'border-border text-foreground';
  return (
    <div className="inline-flex items-center gap-1">
      <input type="number" step="0.1" value={value} onChange={e => onChange(e.target.value)}
        className={`${baseClass} ${statusClass}`} onClick={status === 'nc' ? onClick : undefined} />
      {status === 'nc' && <span className="text-destructive text-xs cursor-pointer" onClick={onClick}>⚠</span>}
      {status === 'resolved' && <span className="text-nc-resolved text-xs">✓</span>}
    </div>
  );
}

export default ColdLunchSheet;
