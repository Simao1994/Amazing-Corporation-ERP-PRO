
import React from 'react';
import { X, Download, Trash2, Heart, Info, Tag, Plus } from 'lucide-react';
import { supabase } from '../../src/lib/supabase';

interface PreviewProps {
    item: any;
    user: any;
    albuns: any[];
    onClose: () => void;
    onDelete: (id: string) => void;
    onToggleFavorite: (id: string) => void;
    onUpdate: (id: string, updates: any) => void;
}

export const ModalPreviewMidia: React.FC<PreviewProps> = ({ item, user, albuns, onClose, onDelete, onToggleFavorite, onUpdate }) => {
    const [tags, setTags] = React.useState<any[]>([]);
    const [loadingTags, setLoadingTags] = React.useState(false);

    React.useEffect(() => {
        if (item?.id) fetchTags();
    }, [item?.id]);

    const fetchTags = async () => {
        setLoadingTags(true);
        try {
            const { data } = await supabase
                .from('galeria_arquivo_tags')
                .select('galeria_tags(*)')
                .eq('arquivo_id', item.id);
            setTags(data?.map(t => t.galeria_tags) || []);
        } finally {
            setLoadingTags(false);
        }
    };

    const handleAddTag = async () => {
        const tagNome = prompt("Nome da tag:");
        if (!tagNome) return;

        try {
            // Check or create tag
            let { data: tagData } = await supabase.from('galeria_tags').select().eq('nome', tagNome).single();
            if (!tagData) {
                const { data } = await supabase.from('galeria_tags').insert({ nome: tagNome }).select().single();
                tagData = data;
            }

            if (tagData) {
                await supabase.from('galeria_arquivo_tags').insert({
                    arquivo_id: item.id,
                    tag_id: tagData.id
                });
                fetchTags();
            }
        } catch (err) {
            console.error(err);
        }
    };

    if (!item) return null;

    const handleDownload = async () => {
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
            alert("Erro ao descarregar!");
        }
    };

    const handleRename = () => {
        const novoNome = prompt("Novo nome para o arquivo:", item.nome);
        if (novoNome && novoNome !== item.nome) {
            onUpdate(item.id, { nome: novoNome });
        }
    };

    const togglePrivacidade = () => {
        onUpdate(item.id, { privacidade: item.privacidade === 'public' ? 'private' : 'public' });
    };

    const handleMove = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onUpdate(item.id, { album_id: e.target.value || null });
    };

    const canEdit = user?.role === 'admin' || user?.role?.includes('editor') || user?.id === item.usuario_id;

    return (
        <div className="fixed inset-0 bg-zinc-900/95 backdrop-blur-xl z-[200] flex animate-in fade-in duration-300">
            {/* Sidebar for Details */}
            <div className="w-96 bg-white h-full hidden lg:flex flex-col border-r border-zinc-100 shadow-2xl animate-in slide-in-from-left duration-500">
                <div className="p-8 border-b border-zinc-50 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black text-zinc-900 uppercase">Detalhes</h2>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em]">{item.tipo} • {item.formato}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-50 rounded-xl transition-all">
                        <X size={20} className="text-zinc-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Nome do Arquivo</label>
                            {canEdit && (
                                <button onClick={handleRename} className="text-[10px] text-sky-500 font-bold hover:underline">Editar</button>
                            )}
                        </div>
                        <p className="text-lg font-bold text-zinc-800 break-all">{item.nome}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Tamanho</label>
                            <p className="text-sm font-bold text-zinc-600">{(item.tamanho / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Enviado em</label>
                            <p className="text-sm font-bold text-zinc-600">{new Date(item.criado_em).toLocaleDateString()}</p>
                        </div>
                    </div>

                    <div className="space-y-4 pt-6 border-t border-zinc-50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-zinc-900 text-yellow-500 flex items-center justify-center font-bold">
                                {item.usuario_nome?.charAt(0) || 'A'}
                            </div>
                            <div>
                                <p className="text-xs font-bold text-zinc-900">{item.usuario_nome || 'Admin Amazing'}</p>
                                <p className="text-[9px] text-zinc-400 font-bold uppercase">Autor do Upload</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Privacidade</label>
                            {canEdit && (
                                <button onClick={togglePrivacidade} className="text-[10px] text-sky-500 font-bold hover:underline">Alterar</button>
                            )}
                        </div>
                        <div className="flex items-center gap-2 px-4 py-3 bg-zinc-50 rounded-2xl text-xs font-bold text-zinc-600 border border-zinc-100">
                            <Info size={14} className="text-sky-400" />
                            {item.privacidade === 'public' ? 'Acessível a todos' : 'Apenas equipa autorizada'}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Mover para Álbum</label>
                        <select
                            value={item.album_id || ''}
                            disabled={!canEdit}
                            onChange={handleMove}
                            className="w-full bg-zinc-50 border border-zinc-100 p-3 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer focus:ring-2 ring-sky-100 disabled:opacity-50"
                        >
                            <option value="">Nenhum Álbum</option>
                            {albuns.map(a => (
                                <option key={a.id} value={a.id}>{a.nome}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Tags e Categorias</label>
                            {canEdit && (
                                <button onClick={handleAddTag} className="p-1 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-all">
                                    <Plus size={14} className="text-zinc-600" />
                                </button>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {tags.length > 0 ? (
                                tags.map((t, idx) => (
                                    <span key={idx} className="px-3 py-1.5 bg-yellow-100 text-[10px] font-bold text-yellow-700 rounded-xl flex items-center gap-1 border border-yellow-200">
                                        <Tag size={10} /> {t.nome}
                                    </span>
                                ))
                            ) : (
                                <p className="text-[10px] text-zinc-400 italic font-medium">Sem tags definidas.</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-8 bg-zinc-50 grid grid-cols-2 gap-4">
                    <button
                        onClick={() => onToggleFavorite(item.id)}
                        className={`flex items-center justify-center gap-2 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${item.favorito ? 'bg-yellow-500 text-zinc-900 shadow-lg' : 'bg-white text-zinc-600 border border-zinc-200'
                            }`}
                    >
                        <Heart size={14} fill={item.favorito ? "currentColor" : "none"} /> Favoritar
                    </button>
                    <button
                        onClick={handleDownload}
                        className="flex items-center justify-center gap-2 py-4 bg-zinc-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl"
                    >
                        <Download size={14} /> Download
                    </button>
                    {canEdit && (
                        <button
                            onClick={() => { if (confirm('Excluir este arquivo?')) { onDelete(item.id); onClose(); } }}
                            className="col-span-2 flex items-center justify-center gap-2 py-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all border border-red-100"
                        >
                            <Trash2 size={14} /> Eliminar Permanente
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 relative flex flex-col">
                <div className="absolute top-8 right-8 z-10 flex gap-4">
                    <button onClick={onClose} className="p-3 bg-white/10 backdrop-blur-md rounded-2xl text-white hover:bg-white/20">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 flex items-center justify-center p-8 lg:p-12 overflow-hidden">
                    {item.tipo === 'video' ? (
                        <video
                            controls
                            autoPlay
                            className="max-w-full max-h-full rounded-[2.5rem] shadow-2xl ring-1 ring-white/10"
                            src={item.url}
                        />
                    ) : (
                        <img
                            src={item.url}
                            alt={item.nome}
                            className="max-w-full max-h-full object-contain rounded-[2.5rem] shadow-2xl ring-1 ring-white/10 animate-in zoom-in-50 duration-500"
                        />
                    )}
                </div>

                {/* Mobile Actions Overlay */}
                <div className="lg:hidden p-8 bg-black/60 backdrop-blur-xl border-t border-white/10">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-white font-bold">{item.nome}</h3>
                        <div className="flex gap-2">
                            <button onClick={() => onToggleFavorite(item.id)} className={`p-2 rounded-lg ${item.favorito ? 'text-yellow-500' : 'text-zinc-400'}`}>
                                <Heart size={20} fill={item.favorito ? "currentColor" : "none"} />
                            </button>
                            <button onClick={handleDownload} className="text-zinc-400 hover:text-white"><Download size={20} /></button>
                        </div>
                    </div>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">{(item.tamanho / (1024 * 1024)).toFixed(2)} MB • {item.tipo}</p>
                </div>
            </div>
        </div>
    );
};
