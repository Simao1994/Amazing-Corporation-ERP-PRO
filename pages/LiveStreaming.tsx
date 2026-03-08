import React, { useState, useEffect } from 'react';
import { supabase } from '../src/lib/supabase';
import { useAuth } from '../src/contexts/AuthContext';
import { 
    Video, Play, Square, Settings, Calendar, 
    ExternalLink, Plus, Trash2, Link as LinkIcon, AlertCircle, Copy, Eye, X
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useTenant } from '../src/components/TenantProvider';

// Local Modal Component
const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                    <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tight">{title}</h2>
                    <button onClick={onClose} className="p-2 text-zinc-400 hover:bg-zinc-200 rounded-full transition-all">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};

interface LiveStream {
    id: string;
    titulo: string;
    descricao: string;
    plataforma: 'youtube' | 'vimeo' | 'facebook' | 'custom';
    link_live: string;
    status: 'agendada' | 'ao_vivo' | 'encerrada';
    data_inicio: string | null;
    data_fim: string | null;
    created_at: string;
}

const LiveStreaming: React.FC = () => {
    const { user } = useAuth();
    const { tenant } = useTenant();
    const [lives, setLives] = useState<LiveStream[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLive, setEditingLive] = useState<LiveStream | null>(null);
    const [formSaving, setFormSaving] = useState(false);

    // Form states
    const [titulo, setTitulo] = useState('');
    const [descricao, setDescricao] = useState('');
    const [plataforma, setPlataforma] = useState<'youtube' | 'vimeo' | 'facebook' | 'custom'>('youtube');
    const [linkLive, setLinkLive] = useState('');
    const [status, setStatus] = useState<'agendada' | 'ao_vivo' | 'encerrada'>('agendada');

    useEffect(() => {
        fetchLives();
    }, [user?.tenant_id]);

    const fetchLives = async () => {
        if (!user?.tenant_id) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('lives')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            setLives(data || []);
        } catch (err: any) {
            console.error("Erro ao carregar lives:", err);
            (window as any).notify?.(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (live?: LiveStream) => {
        if (live) {
            setEditingLive(live);
            setTitulo(live.titulo);
            setDescricao(live.descricao || '');
            setPlataforma(live.plataforma);
            setLinkLive(live.link_live);
            setStatus(live.status);
        } else {
            setEditingLive(null);
            setTitulo('');
            setDescricao('');
            setPlataforma('youtube');
            setLinkLive('');
            setStatus('agendada');
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormSaving(true);
        
        try {
            if (!user?.tenant_id) throw new Error("Tenant ID não encontrado.");

            const liveData = {
                tenant_id: user.tenant_id,
                titulo,
                descricao,
                plataforma,
                link_live: linkLive,
                status
            };

            if (editingLive) {
                // Update
                if (status === 'ao_vivo' && editingLive.status !== 'ao_vivo') {
                    (liveData as any).data_inicio = new Date().toISOString();
                } else if (status === 'encerrada' && editingLive.status !== 'encerrada') {
                    (liveData as any).data_fim = new Date().toISOString();
                }

                const { error } = await supabase
                    .from('lives')
                    .update(liveData)
                    .eq('id', editingLive.id);
                
                if (error) throw error;
                (window as any).notify?.('Transmissão atualizada!', 'success');
            } else {
                // Insert
                if (status === 'ao_vivo') {
                     (liveData as any).data_inicio = new Date().toISOString();
                }
                const { error } = await supabase
                    .from('lives')
                    .insert([liveData]);
                
                if (error) throw error;
                (window as any).notify?.('Nova transmissão criada!', 'success');
            }

            setIsModalOpen(false);
            fetchLives();
        } catch (err: any) {
            console.error('Save error:', err);
            (window as any).notify?.(err.message, 'error');
        } finally {
            setFormSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Pretende mesmo eliminar esta transmissão?")) return;
        try {
            const { error } = await supabase.from('lives').delete().eq('id', id);
            if (error) throw error;
            (window as any).notify?.('Transmissão eliminada.', 'info');
            fetchLives();
        } catch (err: any) {
            (window as any).notify?.(err.message, 'error');
        }
    };

    const getStatusStyle = (s: string) => {
        switch(s) {
            case 'ao_vivo': return 'bg-red-500/10 text-red-500 border-red-500/20';
            case 'agendada': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
            case 'encerrada': return 'bg-zinc-100 text-zinc-500 border-zinc-200';
            default: return 'bg-zinc-100 text-zinc-500 border-zinc-200';
        }
    };

    // Construct the public URL for sharing
    const publicUrl = `${window.location.origin}/#/empresa/${tenant?.slug || 'unknown'}/live`;

    return (
        <div className="space-y-8 pb-24 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-8 rounded-[2rem] shadow-sm border border-zinc-100">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-red-500/10 text-red-500 flex justify-center items-center rounded-2xl">
                         <Video size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-zinc-900 uppercase tracking-tight">Transmissões Ao Vivo</h1>
                        <p className="text-zinc-500 font-medium">Gestão de Canais Institucionais e TV Corporativa</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button 
                        variant="outline" 
                        onClick={() => {
                            if (tenant?.slug) {
                                window.open(publicUrl, '_blank');
                            } else {
                                (window as any).notify?.('Slug da empresa não encontrado.', 'error');
                            }
                        }}
                        className="flex items-center gap-2 border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                    >
                        <Eye size={18} /> Ver Página Pública
                    </Button>
                    <Button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white shadow-xl shadow-red-500/20">
                        <Plus size={18} /> Nova Transmissão
                    </Button>
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex justify-center py-20">
                     <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
                </div>
            ) : lives.length === 0 ? (
                <div className="text-center bg-white p-12 rounded-[2rem] border border-zinc-100 border-dashed">
                    <Video size={48} className="mx-auto text-zinc-300 mb-4" />
                    <h3 className="text-xl font-bold text-zinc-900">Nenhuma Transmissão</h3>
                    <p className="text-zinc-500 max-w-sm mx-auto mt-2 mb-6">Comece agora a transmitir os seus eventos, webinars e comunicações institucionais de forma fácil e segura.</p>
                    <Button onClick={() => handleOpenModal()} className="bg-red-600 hover:bg-red-700 text-white">Criar a Primeira Transmissão</Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {lives.map(live => (
                        <div key={live.id} className="bg-white rounded-[2rem] border border-zinc-100 overflow-hidden shadow-sm hover:shadow-xl transition-all group">
                            <div className="h-32 bg-zinc-900 relative p-6 flex flex-col justify-between">
                                <div className="flex justify-between items-start">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-2 ${getStatusStyle(live.status)}`}>
                                        {live.status === 'ao_vivo' && <div className="w-2 h-2 rounded-full bg-red-500 animate-ping"></div>}
                                        {live.status.replace('_', ' ')}
                                    </span>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleOpenModal(live)} className="text-white hover:text-yellow-400 p-2 bg-white/10 rounded-xl backdrop-blur-md">
                                            <Settings size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(live.id)} className="text-white hover:text-red-400 p-2 bg-white/10 rounded-xl backdrop-blur-md">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                
                                <h3 className="text-white text-lg font-black truncate">{live.titulo}</h3>
                            </div>
                            
                            <div className="p-6 space-y-4">
                                <p className="text-zinc-500 text-sm line-clamp-2 min-h-[40px]">{live.descricao || 'Sem descrição.'}</p>
                                
                                <div className="flex items-center gap-3 text-xs font-bold text-zinc-600 bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                                    <LinkIcon size={14} className="text-sky-500" />
                                    <span className="truncate">{live.plataforma}</span>
                                </div>
                                
                                <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
                                    <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold">
                                        <Calendar size={14} />
                                        <span>Criado a {new Date(live.created_at).toLocaleDateString()}</span>
                                    </div>
                                    {live.status === 'ao_vivo' && (
                                        <a href={publicUrl} target="_blank" className="text-red-600 hover:text-red-700 font-bold text-xs flex items-center gap-1">
                                            Assistir <ExternalLink size={12} />
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de Criação / Edição */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingLive ? "Configurar Transmissão" : "Nova Transmissão"}>
                <form onSubmit={handleSave} className="space-y-6">
                    <div className="bg-sky-50 p-4 rounded-xl border border-sky-100 flex items-start gap-3">
                        <AlertCircle className="text-sky-500 shrink-0 mt-0.5" size={20} />
                        <div className="text-sm text-sky-900">
                            <strong>Dica URL Pública:</strong> Para obter o link `link_live`, copie o Link do Vídeo (ex: YouTube) e cole aqui. Faremos o embed automático!
                            <div className="mt-2 text-xs bg-white/50 p-2 rounded flex items-center justify-between font-mono break-all">
                                {publicUrl}
                                <button type="button" onClick={() => {navigator.clipboard.writeText(publicUrl); (window as any).notify?.('Link copiado!');}} className="text-sky-600 hover:text-sky-800 ml-2">
                                    <Copy size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <Input 
                        label="Título do Evento" 
                        value={titulo} 
                        onChange={(e) => setTitulo(e.target.value)} 
                        required 
                        placeholder="Ex: Cerimónia Anual 2026"
                    />

                    <div>
                        <label className="block text-sm font-bold text-zinc-700 mb-2">Descrição Institucional</label>
                        <textarea 
                            value={descricao}
                            onChange={(e) => setDescricao(e.target.value)}
                            className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-4 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all placeholder:text-zinc-400 min-h-[100px]"
                            placeholder="Descreva o resumo do evento..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-zinc-700 mb-2">Plataforma Base</label>
                            <select 
                                value={plataforma}
                                onChange={(e) => setPlataforma(e.target.value as any)}
                                className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl outline-none focus:border-red-500 font-medium text-zinc-900"
                            >
                                <option value="youtube">YouTube</option>
                                <option value="vimeo">Vimeo</option>
                                <option value="facebook">Facebook Live</option>
                                <option value="custom">Outro (Custom Embed)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-zinc-700 mb-2">Status da Transmissão</label>
                            <select 
                                value={status}
                                onChange={(e) => setStatus(e.target.value as any)}
                                className={`w-full p-4 bg-zinc-50 border rounded-2xl outline-none font-bold ${
                                    status === 'ao_vivo' ? 'text-red-600 border-red-500/50' : 
                                    status === 'agendada' ? 'text-yellow-600 border-yellow-500/50' : 
                                    'text-zinc-500 border-zinc-200'
                                }`}
                            >
                                <option value="agendada">📅 Agendada</option>
                                <option value="ao_vivo">🔴 Em Directo (Ao Vivo)</option>
                                <option value="encerrada">⏹️ Encerrada</option>
                            </select>
                        </div>
                    </div>

                    <Input 
                        label="Link de Transmissão (URL ou ID do Vídeo)" 
                        value={linkLive} 
                        onChange={(e) => setLinkLive(e.target.value)} 
                        required 
                        placeholder="Ex: https://www.youtube.com/watch?v=xxxxxxxxx"
                        icon={<LinkIcon size={20} />}
                    />

                    <div className="pt-6 border-t border-zinc-100 flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button type="submit" isLoading={formSaving} className="bg-zinc-900 hover:bg-black text-white">
                            Guardar Alterações
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default LiveStreaming;
