import { useState } from 'react';
import { NonConformity } from '@/lib/ncEngine';

interface Props {
  nc: NonConformity;
  onResolve: (ncId: string, action: string) => void;
  onClose: () => void;
}

const NCDialog = ({ nc, onResolve, onClose }: Props) => {
  const [action, setAction] = useState(nc.correctiveAction || '');
  const [editing, setEditing] = useState(false);

  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-card rounded-2xl p-6 max-w-sm w-full animate-fade-in shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-4">
          <span className="text-4xl">⚠️</span>
          <h2 className="text-xl font-bold text-foreground mt-2">Não Conformidade Detectada</h2>
        </div>

        <div className="flex flex-col items-center mb-4">
          <span className="text-3xl">🌡️</span>
          <p className="text-sm text-foreground text-center mt-2">{nc.message}</p>
          <span className="mt-2 inline-block bg-destructive/10 text-destructive text-[10px] font-bold px-3 py-1 rounded-full uppercase">
            ⓘ Alerta crítico de segurança
          </span>
        </div>

        {nc.correctiveAction && (
          <div className="mb-4">
            <p className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">Ação corretiva sugerida</p>
            {editing ? (
              <textarea
                value={action}
                onChange={e => setAction(e.target.value)}
                className="w-full border border-border rounded-lg p-2 text-sm text-foreground bg-card resize-none"
                rows={3}
              />
            ) : (
              <div className="border border-border rounded-lg p-3 text-sm text-foreground bg-muted/30">
                {action}
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <button
            onClick={() => onResolve(nc.id, action)}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm"
          >
            Registrar Ação Corretiva
          </button>
          <button
            onClick={() => setEditing(!editing)}
            className="w-full border border-border text-foreground py-3 rounded-xl font-semibold text-sm"
          >
            {editing ? 'Concluir Edição' : 'Editar'}
          </button>
          <button onClick={onClose} className="w-full text-muted-foreground text-sm py-2">
            Ignorar
          </button>
        </div>
      </div>
    </div>
  );
};

export default NCDialog;
