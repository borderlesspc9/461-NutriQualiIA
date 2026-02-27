import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileSpreadsheet, Lock } from 'lucide-react';
import { fetchSpreadsheets } from '@/lib/supabaseService';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog, AlertDialogAction, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const typeLabels: Record<string, string> = {
  'cold-lunch': 'Cadeia Fria: Almoço',
  'breakfast': 'Controle de Temperatura: Café da Manhã',
  'defrosting': 'Descongelamento',
  'dinner': 'Cadeia Fria: Jantar',
  'supper': 'Cadeia Fria: Ceia',
  'snack': 'Cadeia Fria: Lanche',
};

const HistoricoPlanilhas = () => {
  const navigate = useNavigate();
  const [alertOpen, setAlertOpen] = useState(false);
  const [sheets, setSheets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSheets = async () => {
    try {
      const data = await fetchSpreadsheets();
      setSheets(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSheets();

    const channel = supabase
      .channel('sheets-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'spreadsheets' }, () => loadSheets())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="min-h-screen bg-card">
      <header className="bg-primary px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/dashboard')} className="text-primary-foreground"><ArrowLeft size={20} /></button>
        <h1 className="text-primary-foreground font-bold text-base">Histórico de Planilhas</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 animate-fade-in">
        <p className="text-sm text-muted-foreground mb-5">Planilhas finalizadas e enviadas para análise.</p>

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : sheets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileSpreadsheet size={48} className="text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma planilha finalizada ainda.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sheets.map((sheet: any) => (
              <div key={sheet.id} className="bg-background rounded-xl border border-border p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/finalized/${sheet.id}`)}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <FileSpreadsheet size={20} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {typeLabels[sheet.sheet_type] || sheet.sheet_type}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Responsável:</span> {sheet.responsible}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Data:</span> {sheet.sheet_date}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <span className="font-medium text-foreground">Unidade:</span> {sheet.units?.name || '—'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex justify-center mb-2">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center"><Lock size={24} className="text-primary" /></div>
            </div>
            <AlertDialogTitle className="text-center">Funcionalidade bloqueada</AlertDialogTitle>
            <AlertDialogDescription className="text-center">Funcionalidade restrita à responsáveis técnicos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction onClick={() => setAlertOpen(false)}>Entendido</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default HistoricoPlanilhas;
