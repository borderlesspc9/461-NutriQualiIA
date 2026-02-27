import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, CheckCircle2, Clock, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const typeLabels: Record<string, string> = {
  'cold-lunch': 'Cadeia Fria: Almoço',
  'breakfast': 'Controle de Temperatura: Café da Manhã',
  'defrosting': 'Controle de Temperatura: Descongelamento',
  'dinner': 'Cadeia Fria: Jantar',
  'supper': 'Cadeia Fria: Ceia',
  'snack': 'Cadeia Fria: Lanche',
};

interface NCRecord {
  id: string;
  food_item_name: string;
  field: string;
  value: string;
  message: string;
  corrective_action: string | null;
  applied_action: string | null;
  resolved: boolean;
  validation_status: 'pending' | 'validated' | 'discarded';
  created_at: string;
  spreadsheet_id: string;
  unit_id: string;
  spreadsheets?: { sheet_type: string; sheet_date: string; responsible: string } | null;
  units?: { name: string } | null;
}

const AnaliseNCs = () => {
  const navigate = useNavigate();
  const [ncs, setNcs] = useState<NCRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'resolved' | 'pending'>('all');

  const loadNCs = async () => {
    try {
      const { data, error } = await supabase
        .from('non_conformities')
        .select('*, spreadsheets(sheet_type, sheet_date, responsible), units(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNcs((data as any[]) || []);
    } catch (err) {
      console.error('Error loading NCs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNCs();

    const channel = supabase
      .channel('ncs-analysis-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'non_conformities' }, () => loadNCs())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Exclude discarded NCs from all views
  const activeNcs = ncs.filter(nc => (nc as any).validation_status !== 'discarded');

  const filtered = activeNcs.filter((nc) => {
    if (filter === 'resolved') return (nc as any).validation_status === 'validated';
    if (filter === 'pending') return (nc as any).validation_status === 'pending';
    return true;
  });

  const pendingCount = activeNcs.filter(nc => (nc as any).validation_status === 'pending').length;
  const resolvedCount = activeNcs.filter(nc => (nc as any).validation_status === 'validated').length;

  return (
    <div className="min-h-screen bg-card">
      <header className="bg-primary px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/dashboard')} className="text-primary-foreground"><ArrowLeft size={20} /></button>
        <h1 className="text-primary-foreground font-bold text-base">Análise das Não Conformidades</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 animate-fade-in">
        <p className="text-sm text-muted-foreground mb-4">Registro de todas as não conformidades validadas e pendentes.</p>

        {/* Summary badges */}
        <div className="flex gap-2 mb-5 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
          >
            Todas ({activeNcs.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filter === 'pending' ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground'}`}
          >
            Pendentes ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filter === 'resolved' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
          >
            Validadas ({resolvedCount})
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertTriangle size={48} className="text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma não conformidade encontrada.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((nc) => (
              <NCCard key={nc.id} nc={nc} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

function NCCard({ nc }: { nc: NCRecord }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(nc.created_at);
  const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const sheetLabel = nc.spreadsheets ? (typeLabels[nc.spreadsheets.sheet_type] || nc.spreadsheets.sheet_type) : '—';
  const unitName = nc.units?.name || '—';
  const hasComment = !!nc.applied_action;

  return (
    <div
      className={`bg-background rounded-xl border border-border p-4 transition-shadow ${hasComment ? 'cursor-pointer hover:shadow-md' : ''}`}
      onClick={() => hasComment && setExpanded(!expanded)}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${(nc as any).validation_status === 'validated' ? 'bg-primary/10' : 'bg-destructive/10'}`}>
          {(nc as any).validation_status === 'validated'
            ? <CheckCircle2 size={20} className="text-primary" />
            : <AlertTriangle size={20} className="text-destructive" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground truncate">
              {nc.food_item_name} — <span className="text-primary">{unitName}</span>
            </p>
            <div className="flex items-center gap-1.5 shrink-0">
              {hasComment && <MessageSquare size={12} className="text-muted-foreground" />}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${(nc as any).validation_status === 'validated' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                {(nc as any).validation_status === 'validated' ? 'Validada' : 'Pendente'}
              </span>
            </div>
          </div>

          <p className="text-xs text-destructive font-medium mt-1">{nc.message}</p>

          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
            <Clock size={12} />
            <span>{dateStr}, {timeStr}</span>
            <span>·</span>
            <span>{sheetLabel}</span>
          </div>
        </div>
      </div>

      {expanded && nc.applied_action && (
        <div className="mt-3 pt-3 border-t border-border animate-fade-in">
          <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">Parecer do Verificador</p>
          <p className="text-sm text-foreground bg-muted/30 rounded-lg p-3">{nc.applied_action}</p>
        </div>
      )}
    </div>
  );
}

export default AnaliseNCs;
