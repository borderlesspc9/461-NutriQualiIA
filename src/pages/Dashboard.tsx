import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus, FolderOpen, ClipboardList, Settings, LogOut, Moon, Sun, X, Plus } from 'lucide-react';
import { fetchDashboardStats, fetchConformityByUnit, fetchNCRankingByType } from '@/lib/supabaseService';
import { getCustomSheets, addCustomSheet, type CustomSheet } from '@/lib/customSheets';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import logoIcon from '@/assets/logo-icon.png';

interface SheetCard {
  title: string;
  type: 'cold' | 'hot';
  status: 'aguardando' | 'ativo' | 'finalizado';
  route: string | null;
  ncs?: number;
  isCreate?: boolean;
  customId?: string;
}

const sheets: SheetCard[] = [
  { title: 'Café da Manhã', type: 'cold', status: 'aguardando', route: '/spreadsheet/breakfast' },
  { title: 'Almoço', type: 'cold', status: 'aguardando', route: '/spreadsheet/cold-lunch' },
  { title: 'Jantar', type: 'cold', status: 'aguardando', route: '/spreadsheet/dinner' },
  { title: 'Ceia', type: 'cold', status: 'aguardando', route: '/spreadsheet/supper' },
  { title: 'Lanches', type: 'cold', status: 'aguardando', route: '/spreadsheet/snacks' },
  { title: 'Descongelamento', type: 'cold', status: 'aguardando', route: '/spreadsheet/defrosting' },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [showAllSheets, setShowAllSheets] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [newSheetName, setNewSheetName] = useState('');
  const [customSheets, setCustomSheets] = useState<CustomSheet[]>([]);
  const [customSheetsLoading, setCustomSheetsLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains('dark'));
  const [stats, setStats] = useState({ conformity: 100, records: 0, justified: 0, unjustified: 0 });
  const [rankingUnits, setRankingUnits] = useState<Array<{ unitName: string; conformity: number; records: number }>>([]);
  const [ncRanking, setNcRanking] = useState<Array<{ label: string; count: number }>>([]);
  
  const [userName, setUserName] = useState(profile?.full_name || 'colaborador');

  useEffect(() => {
    if (profile) setUserName(profile.full_name || 'colaborador');
  }, [profile]);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  // Carregar planilhas personalizadas (Supabase custom_sheets ou localStorage)
  useEffect(() => {
    if (!user?.id) {
      setCustomSheets([]);
      return;
    }
    let cancelled = false;
    setCustomSheetsLoading(true);
    getCustomSheets(user.id)
      .then((list) => { if (!cancelled) setCustomSheets(list); })
      .catch(() => { if (!cancelled) setCustomSheets([]); })
      .finally(() => { if (!cancelled) setCustomSheetsLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id]);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [s, r, ncs] = await Promise.all([
          fetchDashboardStats(),
          fetchConformityByUnit(),
          fetchNCRankingByType(),
        ]);
        setStats(s);
        setRankingUnits(r.filter(u => !['P-03', 'P-04'].includes(u.unitName)));
        setNcRanking(ncs);
      } catch (err) {
        console.error('Error loading dashboard:', err);
      }
    };
    loadData();

    // Realtime subscriptions
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'spreadsheets' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'non_conformities' }, () => loadData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleCreateCustomSheet = async () => {
    const name = newSheetName.trim();
    if (!name || !user?.id) return;
    try {
      const created = await addCustomSheet(user.id, name);
      setCustomSheets(await getCustomSheets(user.id));
      setNewSheetName('');
      setCreateSheetOpen(false);
      navigate(`/spreadsheet/custom/${created.id}`);
    } catch {
      // nome vazio ou erro já tratado
    }
  };

  const chartData = [{ date: 'Hoje', conformidade: stats.conformity }];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setMenuOpen(true)} className="text-foreground text-xl">☰</button>
          <img src={logoIcon} alt="Logo" className="w-12 h-12 object-contain" />
          <span className="font-bold text-foreground text-sm">NutriQuali IA</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Olá, <strong className="text-foreground">{userName}</strong></span>
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold">
            {userName.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 animate-fade-in">
        <h1 className="text-xl font-bold text-foreground">Painel NutriQuali IA</h1>
        <p className="text-sm text-muted-foreground mb-5">Análise técnica de não conformidades (NCs) e segurança alimentar.</p>

        {/* Stats */}
        <h2 className="text-sm font-semibold text-foreground mb-3">Resumo</h2>
        <div className="grid grid-cols-2 gap-2 mb-6 min-w-0 w-full">
          <StatBox label="Conformidade" value={`${stats.conformity}%`} color="text-primary" />
          <StatBox label="Registros" value={String(stats.records)} />
          <StatBox label="Ações corretivas" value={String(stats.justified)} color="text-muted-foreground" />
          <StatBox label="Não conform." value={String(stats.unjustified)} color="text-destructive" />
        </div>

        {/* Sheets grid */}
        <h2 className="text-sm font-semibold text-foreground mb-3">Planilhas Inteligentes</h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setCreateSheetOpen(true)}
            className="bg-card rounded-xl border-2 border-dashed border-border p-3 flex items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors min-h-[80px]"
          >
            <Plus className="size-5 shrink-0" />
            <span className="text-sm font-medium">Criar minha planilha</span>
          </button>
          {(showAllSheets ? sheets : sheets.slice(0, 4)).map((s) => (
            <SheetCardComponent key={s.title} sheet={s} onClick={() => s.route && navigate(s.route)} />
          ))}
          {customSheets.map((s) => (
            <SheetCardComponent
              key={s.id}
              sheet={{ title: s.name, type: 'cold', status: 'aguardando', route: `/spreadsheet/custom/${s.id}` }}
              onClick={() => navigate(`/spreadsheet/custom/${s.id}`)}
            />
          ))}
        </div>
        <button onClick={() => setShowAllSheets(!showAllSheets)}
          className="w-full text-center text-xs text-primary font-medium mt-3 mb-6 hover:underline">
          {showAllSheets ? 'Mostrar menos' : 'Ver todas as planilhas'}
        </button>

        {/* Métricas */}
        <h2 className="text-sm font-semibold text-foreground mb-3">Métricas e Tendências</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {/* Chart */}
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs font-semibold text-foreground mb-3">Evolução da Conformidade</p>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorConf" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                  formatter={(value: number) => [`${value}%`, 'Conformidade']} />
                <Area type="monotone" dataKey="conformidade" stroke="hsl(var(--primary))" fill="url(#colorConf)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Ranking por unidade */}
          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs font-semibold text-foreground mb-3">Ranking de Conformidade</p>
            <div className="space-y-2">
              {rankingUnits.map((u, i) => (
                <div key={u.unitName} className="flex items-center gap-2">
                  <span className={`text-xs font-bold w-5 text-center ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-muted-foreground' : i === 2 ? 'text-amber-700' : 'text-muted-foreground'}`}>
                    {i + 1}º
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground truncate">{u.unitName}</span>
                      <span className={`text-xs font-bold ${i === 0 ? 'text-primary' : 'text-muted-foreground'}`}>{u.conformity}%</span>
                    </div>
                    <div className="w-full h-1 bg-muted rounded-full mt-1">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${u.conformity}%` }} />
                    </div>
                  </div>
                </div>
              ))}
              {rankingUnits.length === 0 && <p className="text-xs text-muted-foreground">Sem dados ainda.</p>}
            </div>
          </div>
        </div>

        {/* NC Ranking by type */}
        {ncRanking.length > 0 && (
          <div className="bg-card rounded-xl border border-border p-4 mb-6">
            <p className="text-xs font-semibold text-foreground mb-3">Top NCs por Tipo de Planilha</p>
            <div className="space-y-2">
              {ncRanking.map((r, i) => (
                <div key={r.label} className="flex items-center justify-between">
                  <span className="text-xs text-foreground">{i + 1}. {r.label}</span>
                  <span className="text-xs font-bold text-destructive">{r.count} NCs</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Dialog criar planilha personalizada */}
      <Dialog open={createSheetOpen} onOpenChange={setCreateSheetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Nova planilha personalizada</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Dê um nome para sua planilha. Ela terá o mesmo formato de monitoramento de temperatura das demais.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <label htmlFor="sheet-name" className="text-sm font-medium text-foreground">
              Nome da planilha
            </label>
            <Input
              id="sheet-name"
              value={newSheetName}
              onChange={(e) => setNewSheetName(e.target.value)}
              placeholder="Ex: Recebimento de mercadorias"
              className="bg-background text-foreground"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateCustomSheet()}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setCreateSheetOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleCreateCustomSheet} disabled={!newSheetName.trim()}>
              Criar e abrir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Side Menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
          <div className="relative w-72 h-full bg-primary flex flex-col animate-fade-in shadow-2xl">
            <div className="flex items-center justify-end px-4 pt-4 pb-2">
              <button onClick={() => setMenuOpen(false)} className="text-primary-foreground"><X size={20} /></button>
            </div>
            <div className="px-4 py-4 border-b border-primary-foreground/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary-foreground/20 rounded-full flex items-center justify-center text-primary-foreground text-lg font-bold">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-primary-foreground font-semibold text-sm">{userName}</p>
                  <p className="text-primary-foreground/70 text-xs">{profile?.role_title || 'Chef de Cozinha'}</p>
                </div>
              </div>
            </div>
            <nav className="flex-1 px-2 py-3 space-y-1">
              <MenuButton icon={<ClipboardList size={18} />} label="Análise das Não Conformidades" onClick={() => { setMenuOpen(false); navigate('/analise-ncs'); }} />
              <MenuButton icon={<ClipboardList size={18} />} label="Cardápios" onClick={() => { setMenuOpen(false); navigate('/cardapios'); }} />
              <MenuButton icon={<FolderOpen size={18} />} label="Documentos de qualidade" onClick={() => { setMenuOpen(false); navigate('/documentos-qualidade'); }} />
              <MenuButton icon={<ClipboardList size={18} />} label="Histórico de planilhas" onClick={() => { setMenuOpen(false); navigate('/historico-planilhas'); }} />
            </nav>
            <div className="px-2 pb-4 space-y-1 border-t border-primary-foreground/20 pt-3">
              <button onClick={() => setDarkMode(!darkMode)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-primary-foreground/90 hover:bg-primary-foreground/10 transition-colors text-sm">
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                <span>{darkMode ? 'Modo claro' : 'Modo noturno'}</span>
              </button>
              <button onClick={() => { setMenuOpen(false); setSettingsOpen(true); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-primary-foreground/90 hover:bg-primary-foreground/10 transition-colors text-sm">
                <Settings size={18} /><span>Configurações</span>
              </button>
              <button onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-primary-foreground/90 hover:bg-primary-foreground/10 transition-colors text-sm">
                <LogOut size={18} /><span>Sair</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSettingsOpen(false)} />
          <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-sm mx-4 animate-fade-in overflow-hidden">
            <div className="bg-primary px-5 py-4 flex items-center justify-between">
              <h2 className="text-primary-foreground font-bold text-base">Configurações</h2>
              <button onClick={() => setSettingsOpen(false)} className="text-primary-foreground"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <p className="text-xs font-semibold text-foreground mb-2">Foto do perfil</p>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-primary/20 rounded-full flex items-center justify-center text-primary text-xl font-bold">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <button className="text-xs text-primary font-medium border border-primary rounded-lg px-3 py-1.5 hover:bg-primary/5 transition-colors">Alterar foto</button>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Nome</label>
                <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Modo noturno</p>
                  <p className="text-xs text-muted-foreground">Ativar tema escuro</p>
                </div>
                <button onClick={() => setDarkMode(!darkMode)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${darkMode ? 'bg-primary' : 'bg-muted'}`}>
                  <div className={`w-5 h-5 bg-card rounded-full absolute top-0.5 transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
            <div className="px-5 pb-5">
              <button onClick={() => setSettingsOpen(false)}
                className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-semibold text-sm">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function MenuButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-primary-foreground/90 hover:bg-primary-foreground/10 transition-colors text-sm">
      {icon}<span>{label}</span>
    </button>
  );
}

function StatBox({ label, value, color, clickable, onClick }: { label: string; value: string; color?: string; clickable?: boolean; onClick?: () => void }) {
  return (
    <div className={`bg-card rounded-xl border border-border p-3 min-w-0 w-full overflow-hidden flex flex-col justify-center ${clickable ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`} onClick={onClick}>
      <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide leading-tight break-words line-clamp-2 min-h-[24px] flex items-center">{label}</p>
      <p className={`text-base sm:text-lg font-bold mt-1 truncate ${color || 'text-foreground'}`}>{value}</p>
    </div>
  );
}

function SheetCardComponent({ sheet, onClick }: { sheet: SheetCard; onClick: () => void }) {
  const icon = sheet.type === 'cold' ? '❄️' : '🔥';
  const statusColors: Record<string, string> = {
    aguardando: 'text-muted-foreground',
    ativo: 'text-warning',
    finalizado: 'text-success',
  };
  return (
    <div className={`bg-card rounded-xl border border-border p-3 overflow-hidden min-w-0 ${sheet.route ? 'cursor-pointer hover:shadow-md transition-shadow' : 'opacity-60'}`} onClick={onClick}>
      <div className="flex items-start gap-2 min-w-0">
        <span className="text-lg shrink-0">{icon}</span>
        <div className="flex-1 min-w-0 overflow-hidden">
          <p className="text-sm font-semibold text-foreground leading-tight break-words line-clamp-2 overflow-hidden" title={sheet.title}>{sheet.title}</p>
          <p className={`text-xs mt-1 capitalize shrink-0 ${statusColors[sheet.status]}`}>{sheet.status}</p>
        </div>
        <span className="text-xs text-primary font-medium shrink-0">Abrir</span>
      </div>
    </div>
  );
}

export default Dashboard;
