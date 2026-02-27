import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FolderOpen, Plus, X, FileText, Upload, Trash2 } from 'lucide-react';

interface DocFile {
  name: string;
  size: string;
}

interface Folder {
  id: string;
  name: string;
  docs: DocFile[];
}

const Cardapios = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [folders, setFolders] = useState<Folder[]>([
    { id: '1', name: 'Cardápios - 25/02', docs: [] },
    { id: '2', name: 'Cardápios - 20/02', docs: [] },
  ]);

  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const folder: Folder = {
      id: Date.now().toString(),
      name: newFolderName.trim(),
      docs: [],
    };
    setFolders((prev) => [...prev, folder]);
    setNewFolderName('');
    setCreatingFolder(false);
    setOpenFolderId(folder.id);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !openFolderId) return;
    const newDocs: DocFile[] = Array.from(e.target.files).map((f) => ({
      name: f.name,
      size: f.size < 1024 * 1024
        ? `${(f.size / 1024).toFixed(0)} KB`
        : `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
    }));
    setFolders((prev) =>
      prev.map((folder) =>
        folder.id === openFolderId
          ? { ...folder, docs: [...folder.docs, ...newDocs] }
          : folder
      )
    );
    e.target.value = '';
  };

  const handleRemoveDoc = (folderId: string, docIndex: number) => {
    setFolders((prev) =>
      prev.map((folder) =>
        folder.id === folderId
          ? { ...folder, docs: folder.docs.filter((_, i) => i !== docIndex) }
          : folder
      )
    );
  };

  const handleDeleteFolder = (folderId: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== folderId));
    if (openFolderId === folderId) setOpenFolderId(null);
  };

  const openFolder = folders.find((f) => f.id === openFolderId);

  return (
    <div className="min-h-screen bg-card">
      {/* Header */}
      <header className="bg-primary px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/dashboard')} className="text-primary-foreground">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-primary-foreground font-bold text-base">Cardápios</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 animate-fade-in">
        {!openFolderId ? (
          <>
            <p className="text-sm text-muted-foreground mb-5">Gerencie seus cardápios por pasta.</p>

            {/* Folders grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  onClick={() => setOpenFolderId(folder.id)}
                  className="bg-background rounded-xl border border-border p-4 flex flex-col items-center gap-2 cursor-pointer hover:shadow-md transition-shadow group relative"
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                    className="absolute top-2 right-2 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                  <FolderOpen size={36} className="text-primary" />
                  <p className="text-xs font-semibold text-foreground text-center leading-tight">{folder.name}</p>
                  <p className="text-[10px] text-muted-foreground">{folder.docs.length} documento(s)</p>
                </div>
              ))}

              {/* Add folder button */}
              {creatingFolder ? (
                <div className="bg-background rounded-xl border-2 border-dashed border-primary/40 p-4 flex flex-col items-center gap-2">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Nome da pasta"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                    className="w-full text-xs text-center bg-transparent border-b border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary pb-1"
                  />
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={handleCreateFolder}
                      className="text-[10px] bg-primary text-primary-foreground px-3 py-1 rounded-lg font-semibold"
                    >
                      Criar
                    </button>
                    <button
                      onClick={() => { setCreatingFolder(false); setNewFolderName(''); }}
                      className="text-[10px] text-muted-foreground px-2 py-1"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setCreatingFolder(true)}
                  className="bg-background rounded-xl border-2 border-dashed border-border p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50 transition-colors"
                >
                  <Plus size={28} className="text-muted-foreground" />
                  <p className="text-xs text-muted-foreground font-medium">Nova pasta</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Inside folder view */}
            <button
              onClick={() => setOpenFolderId(null)}
              className="flex items-center gap-1 text-sm text-primary font-medium mb-4 hover:underline"
            >
              <ArrowLeft size={16} /> Voltar
            </button>

            <div className="flex items-center gap-2 mb-4">
              <FolderOpen size={22} className="text-primary" />
              <h2 className="text-base font-bold text-foreground">{openFolder?.name}</h2>
            </div>

            {/* Documents list */}
            {openFolder && openFolder.docs.length > 0 ? (
              <div className="space-y-2 mb-4">
                {openFolder.docs.map((doc, i) => (
                  <div key={i} className="flex items-center gap-3 bg-background rounded-lg border border-border px-3 py-2.5">
                    <FileText size={18} className="text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                      <p className="text-[10px] text-muted-foreground">{doc.size}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveDoc(openFolder.id, i)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mb-4">Nenhum documento anexado.</p>
            )}

            {/* Upload button */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors"
            >
              <Upload size={16} />
              Anexar documento
            </button>
          </>
        )}
      </main>
    </div>
  );
};

export default Cardapios;
