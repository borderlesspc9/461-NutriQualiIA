import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchSpreadsheetById } from '@/lib/supabaseService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const typeLabels: Record<string, string> = {
  'cold-lunch': 'Cadeia Fria: Almoço',
  'breakfast': 'Café da Manhã',
  'defrosting': 'Descongelamento',
};

const Finalized = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [sheet, setSheet] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchSpreadsheetById(id).then(data => {
      setSheet(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const handleDownloadPDF = () => {
    if (!sheet) return;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFontSize(16); doc.setFont('helvetica', 'bold');
    doc.text(`NutriQuali IA - ${typeLabels[sheet.sheet_type] || sheet.sheet_type}`, 14, 15);
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.text(`Unidade: ${sheet.units?.name || ''}`, 14, 23);
    doc.text(`Responsável: ${sheet.responsible}`, 14, 28);
    doc.text(`Data: ${sheet.sheet_date}`, 14, 33);
    doc.text(`ID: ${sheet.id.slice(0, 8)}`, 200, 23);

    const items = sheet.items as any[];
    if (sheet.sheet_type === 'cold-lunch') {
      const head = [['Preparação', 'Amostra', 'Hora Início', 'Temp. Início', 'Hora Final', 'Temp. Final']];
      const body = items.map(item => [item.name, item.sample ? 'Sim' : '-', item.startTime || '-', item.startTemp || '-', item.endTime || '-', item.endTemp || '-']);
      autoTable(doc, { startY: 40, head, body, theme: 'grid', headStyles: { fillColor: [0, 166, 153], textColor: 255, fontSize: 9 }, bodyStyles: { fontSize: 9 } });
    } else {
      autoTable(doc, { startY: 40, head: [['Dados da planilha (JSON)']], body: [[JSON.stringify(items, null, 2).slice(0, 500)]], theme: 'grid' });
    }

    doc.save(`planilha_${sheet.id.slice(0, 8)}_${sheet.sheet_date}.pdf`);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-card"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-card px-4">
      <div className="animate-fade-in text-center max-w-sm">
        <div className="w-20 h-20 bg-success rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl text-success-foreground">✓</span>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">Planilha Verificada com Sucesso!</h1>
        <p className="text-sm text-muted-foreground mb-8">O registro foi validado e enviado para o sistema da unidade.</p>

        <button onClick={() => navigate('/dashboard')}
          className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm mb-3">
          Ir para o Dashboard
        </button>
        <button onClick={handleDownloadPDF}
          className="w-full border border-border text-foreground py-3 rounded-xl font-semibold text-sm">
          Visualizar PDF
        </button>

        <p className="text-xs text-muted-foreground mt-8">ID do Registro: #{id?.slice(0, 8)}</p>
      </div>
    </div>
  );
};

export default Finalized;
