
import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, Upload, RefreshCw, LayoutGrid, List, Database, HardDrive } from 'lucide-react';
import { supabase } from '../src/lib/supabase';
import { AmazingStorage } from '../utils/storage';
import { User } from '../types';

// Components
import GradeGaleria from '../components/Gallery/GradeGaleria';
import ListaGaleria from '../components/Gallery/ListaGaleria';
import UploaderMidia from '../components/Gallery/UploaderMidia';
import GestorAlbuns from '../components/Gallery/GestorAlbuns';
import FiltroGaleria from '../components/Gallery/FiltroGaleria';
import { ModalPreviewMidia } from '../components/Gallery/ModalPreviewMidia';

interface DashboardGalleryProps {
    user: User | null;
}

const DashboardGallery: React.FC<DashboardGalleryProps> = ({ user: initialUser }) => {
    // State
    const [items, setItems] = useState<any[]>([]);
    const [albuns, setAlbuns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeAlbum, setActiveAlbum] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [tipo, setTipo] = useState('all');
    const [sort, setSort] = useState('date-desc');

    // UI State
    const [showUploader, setShowUploader] = useState(false);
    const [previewItem, setPreviewItem] = useState<any | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const [user, setUser] = useState<User | null>(initialUser);

    useEffect(() => {
        if (initialUser) {
            setUser(initialUser);
        } else {
            const fetchUser = async () => {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
                    if (profile) {
                        setUser({
                            id: profile.id,
                            email: profile.email,
                            nome: profile.nome,
                            role: profile.role
                        });
                    }
                }
            };
            fetchUser();
        }
    }, [initialUser]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Albums
            const { data: albumsData, error: albumsError } = await supabase.from('galeria_albuns').select('*, galeria_arquivos(count)').order('nome');
            if (albumsError) throw albumsError;
            setAlbuns(albumsData?.map(a => ({ ...a, count: a.galeria_arquivos?.[0]?.count || 0 })) || []);

            // Fetch Files
            let query = supabase.from('galeria_arquivos').select('*');

            if (activeAlbum) query = query.eq('album_id', activeAlbum);
            if (tipo !== 'all') query = query.eq('tipo', tipo);

            // Privacy Filter - Refined
            const isAdmin = user?.role === 'admin' || user?.role?.includes('editor') || user?.role?.includes('director');
            if (!isAdmin && user) {
                query = query.or(`privacidade.eq.public,usuario_id.eq.${user.id}`);
            }

            const { data: filesData, error: filesError } = await query;
            if (filesError) throw filesError;

            // Sorting & Search
            let processed = filesData || [];
            if (search) {
                processed = processed.filter(f => f.nome.toLowerCase().includes(search.toLowerCase()));
            }

            processed = [...processed].sort((a, b) => {
                switch (sort) {
                    case 'date-desc': return new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime();
                    case 'date-asc': return new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime();
                    case 'name-asc': return a.nome.localeCompare(b.nome);
                    case 'name-desc': return b.nome.localeCompare(a.nome);
                    case 'size-desc': return b.tamanho - a.tamanho;
                    case 'size-asc': return a.tamanho - b.tamanho;
                    default: return 0;
                }
            });

            setItems(processed);
        } catch (err) {
            console.error("Error fetching gallery data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchData();
    }, [activeAlbum, tipo, search, sort, user]);

    // Statistics calculated from full items list (if available) or DB
    const stats = useMemo(() => {
        const totalSize = items.reduce((acc, curr) => acc + (curr.tamanho || 0), 0);
        return {
            count: items.length,
            size: (totalSize / (1024 * 1024)).toFixed(1) // MB
        };
    }, [items]);

    const handleUpload = async (files: File[]) => {
        for (const file of files) {
            try {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
                const filePath = `gallery/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('blog-media')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('blog-media')
                    .getPublicUrl(filePath);

                const { error: dbError } = await supabase.from('galeria_arquivos').insert({
                    nome: file.name,
                    tipo: file.type.startsWith('image/') ? 'image' : 'video',
                    formato: fileExt,
                    tamanho: file.size,
                    caminho: filePath,
                    url: publicUrl,
                    album_id: activeAlbum,
                    usuario_id: user?.id,
                    privacidade: 'private'
                });

                if (dbError) throw dbError;

            } catch (err: any) {
                console.error("Upload error for file:", file.name, err);
                alert(`Erro ao carregar ${file.name}: ${err.message}`);
            }
        }
        fetchData();
        AmazingStorage.logAction('Upload Mídia', 'Galeria', `${files.length} novos ficheiros adicionados.`);
    };

    const handleDelete = async (id: string) => {
        try {
            const itemToDelete = items.find(i => i.id === id);
            if (itemToDelete) {
                if (itemToDelete.caminho) {
                    await supabase.storage.from('blog-media').remove([itemToDelete.caminho]);
                }
                const { error } = await supabase.from('galeria_arquivos').delete().eq('id', id);
                if (error) throw error;

                setItems(items.filter(i => i.id !== id));
                AmazingStorage.logAction('Eliminar Mídia', 'Galeria', `Arquivo ${itemToDelete.nome} removido.`);
            }
        } catch (err: any) {
            alert(`Erro ao eliminar ficheiro: ${err.message}`);
        }
    };

    const handleToggleFavorite = async (id: string) => {
        const item = items.find(i => i.id === id);
        if (!item) return;

        try {
            const { error } = await supabase
                .from('galeria_arquivos')
                .update({ favorito: !item.favorito })
                .eq('id', id);

            if (error) throw error;
            setItems(items.map(i => i.id === id ? { ...i, favorito: !item.favorito } : i));
            if (previewItem?.id === id) setPreviewItem({ ...previewItem, favorito: !item.favorito });
        } catch (err: any) {
            console.error("Error toggling favorite:", err);
        }
    };

    const handleUpdate = async (id: string, updates: any) => {
        try {
            const { error } = await supabase
                .from('galeria_arquivos')
                .update(updates)
                .eq('id', id);

            if (error) throw error;
            setItems(items.map(i => i.id === id ? { ...i, ...updates } : i));
            if (previewItem?.id === id) setPreviewItem({ ...previewItem, ...updates });
            if (updates.album_id) fetchData(); // Refresh if moved album
        } catch (err: any) {
            alert(`Erro ao atualizar: ${err.message}`);
        }
    };

    const handleCreateAlbum = async () => {
        const nome = prompt("Nome do novo álbum:");
        if (!nome) return;

        try {
            const { data, error } = await supabase
                .from('galeria_albuns')
                .insert({
                    nome,
                    usuario_id: user?.id
                })
                .select();

            if (error) {
                console.error("Album creation error:", error);
                throw error;
            }
            if (data && data[0]) {
                setAlbuns([...albuns, { ...data[0], count: 0 }]);
                AmazingStorage.logAction('Criar Álbum', 'Galeria', `Álbum ${nome} criado.`);
            }
        } catch (err: any) {
            console.error("Catch error while creating album:", err);
            alert(`Erro ao criar álbum: ${err.message || 'Erro desconhecido'}`);
        }
    };

    const handleDownload = async (item: any) => {
        try {
            const response = await fetch(item.url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = item.nome;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            alert("Erro no download!");
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            {/* Header Premium */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-sky-200">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="text-yellow-500" size={14} />
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em]">Activos Digitais</span>
                    </div>
                    <h1 className="text-4xl font-black text-zinc-900 tracking-tight uppercase">Galeria Corporativa</h1>
                    <p className="text-zinc-500 font-medium">Gestão avançada de média e património visual do grupo.</p>
                </div>

                <div className="flex gap-3">
                    <div className="flex bg-white border border-sky-100 p-1 rounded-2xl shadow-sm">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-3 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-zinc-900 text-white shadow-lg' : 'text-zinc-400 hover:text-zinc-900'}`}
                        >
                            <LayoutGrid size={20} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-3 rounded-xl transition-all ${viewMode === 'list' ? 'bg-zinc-900 text-white shadow-lg' : 'text-zinc-400 hover:text-zinc-900'}`}
                        >
                            <List size={20} />
                        </button>
                    </div>
                    {(user?.role === 'admin' || user?.role?.includes('editor') || user?.role?.includes('director')) && (
                        <button
                            onClick={() => setShowUploader(true)}
                            className="px-8 py-4 bg-zinc-900 text-white font-black rounded-2xl uppercase text-[11px] tracking-[0.2em] flex items-center gap-3 shadow-xl hover:bg-zinc-800 transition-all active:scale-95"
                        >
                            <Upload size={18} className="text-yellow-500" /> Carregar Mídia
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Sidebar */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-[2rem] border border-sky-100 shadow-sm space-y-6">
                        <div className="flex items-center gap-3 text-zinc-900">
                            <Database size={20} className="text-yellow-500" />
                            <h3 className="text-sm font-black uppercase tracking-widest">Estado da Galeria</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-zinc-50 rounded-2xl">
                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Arquivos</p>
                                <p className="text-xl font-black text-zinc-900">{stats.count}</p>
                            </div>
                            <div className="p-4 bg-zinc-50 rounded-2xl">
                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Tamanho</p>
                                <p className="text-xl font-black text-zinc-900">{stats.size}<span className="text-[10px] ml-1">MB</span></p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-zinc-500">
                            <HardDrive size={14} />
                            <span>Servidor: Supabase Cloud EU</span>
                        </div>
                    </div>

                    <GestorAlbuns
                        albuns={albuns}
                        activeAlbum={activeAlbum}
                        onSelectAlbum={setActiveAlbum}
                        onCreateAlbum={handleCreateAlbum}
                    />
                </div>

                {/* Main Grid Area */}
                <div className="lg:col-span-3 space-y-6">
                    <FiltroGaleria
                        search={search}
                        onSearchChange={setSearch}
                        tipo={tipo}
                        onTipoChange={setTipo}
                        sort={sort}
                        onSortChange={setSort}
                    />

                    <div className="min-h-[500px]">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-40 space-y-4">
                                <RefreshCw className="w-12 h-12 text-yellow-500 animate-spin" />
                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest animate-pulse">Sincronizando Mídia...</p>
                            </div>
                        ) : viewMode === 'grid' ? (
                            <GradeGaleria
                                items={items}
                                loading={loading}
                                onPreview={setPreviewItem}
                                onDelete={handleDelete}
                                onToggleFavorite={handleToggleFavorite}
                                onDownload={handleDownload}
                            />
                        ) : (
                            <ListaGaleria
                                items={items}
                                onPreview={setPreviewItem}
                                onDelete={handleDelete}
                                onToggleFavorite={handleToggleFavorite}
                                onDownload={handleDownload}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showUploader && (
                <UploaderMidia
                    onUpload={handleUpload}
                    onClose={() => setShowUploader(false)}
                />
            )}

            {previewItem && (
                <ModalPreviewMidia
                    item={previewItem}
                    user={user}
                    albuns={albuns}
                    onClose={() => setPreviewItem(null)}
                    onDelete={handleDelete}
                    onToggleFavorite={handleToggleFavorite}
                    onUpdate={handleUpdate}
                />
            )}
        </div>
    );
};

export default DashboardGallery;
