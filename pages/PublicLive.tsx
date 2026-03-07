import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../src/lib/supabase';
import { 
    Video, Play, MessageSquare, Users, Eye, AlertCircle, Share2, ArrowLeft, Calendar
} from 'lucide-react';
import Button from '../components/ui/Button';

interface LiveStream {
    id: string;
    empresa_id: string;
    titulo: string;
    descricao: string;
    plataforma: 'youtube' | 'vimeo' | 'facebook' | 'custom';
    link_live: string;
    status: 'agendada' | 'ao_vivo' | 'encerrada';
    data_inicio: string | null;
}

const PublicLive: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const [live, setLive] = useState<LiveStream | null>(null);
    const [tenantInfo, setTenantInfo] = useState<{nome: string, logo?: string} | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (slug) fetchPublicLive(slug);
    }, [slug]);

    const fetchPublicLive = async (tenantSlug: string) => {
        setLoading(true);
        setErrorMsg('');
        try {
            // 1. Get Tenant ID from Slug
            const { data: tenantData, error: tenantErr } = await supabase
                .from('saas_tenants')
                .select('id, nome, config')
                .eq('slug', tenantSlug)
                .single();
            
            if (tenantErr || !tenantData) throw new Error("Empresa não encontrada ou link inválido.");
            
            setTenantInfo({ 
                nome: tenantData.nome, 
                logo: tenantData.config?.logo_url 
            });

            // 2. Fetch the most relevant Live (Ao vivo primeiro, depois as agendadas mais recentes)
            const { data: livesData, error: livesErr } = await supabase
                .from('lives')
                .select('*')
                .eq('empresa_id', tenantData.id)
                .in('status', ['ao_vivo', 'agendada', 'encerrada'])
                .order('status', { ascending: false }) // 'ao_vivo' usually comes first if ordered right, but let's just pick the main one.
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (livesErr) throw livesErr;

            if (livesData) {
                setLive(livesData);
            } else {
                setErrorMsg("Não há transmissões disponíveis para esta instituição neste momento.");
            }

        } catch (err: any) {
            console.error("Erro PublicLive:", err);
            setErrorMsg(err.message || 'Erro ao carregar a transmissão.');
        } finally {
            setLoading(false);
        }
    };

    // Helper para extrair o Embed URL baseado na Plataforma
    const getEmbedUrl = (url: string, platform: string) => {
        if (!url) return '';
        try {
            if (platform === 'youtube') {
                // Suporta youtu.be/ID ou youtube.com/watch?v=ID ou embed puro
                if (url.includes('embed')) return url;
                let videoId = '';
                if (url.includes('youtu.be/')) {
                    videoId = url.split('youtu.be/')[1].split('?')[0];
                } else if (url.includes('v=')) {
                    videoId = url.split('v=')[1].split('&')[0];
                }
                return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0` : url;
            }
            if (platform === 'vimeo') {
                if (url.includes('player.vimeo')) return url;
                const vimeoId = url.split('/').pop();
                return `https://player.vimeo.com/video/${vimeoId}?autoplay=1`;
            }
            // Retorna direto se não for conhecido (pode ser iframe raw ou custom)
            return url;
        } catch (e) {
            return url;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6">
                <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin shadow-[0_0_30px_rgba(239,68,68,0.5)]"></div>
                <p className="text-white mt-6 font-bold tracking-widest uppercase text-xs animate-pulse">Sintonizando Satélite corporativo...</p>
            </div>
        );
    }

    if (errorMsg || !live) {
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-zinc-900/50 p-12 rounded-[3rem] border border-white/10 max-w-lg backdrop-blur-xl">
                    <Video size={64} className="mx-auto text-zinc-600 mb-6" />
                    <h1 className="text-2xl font-black text-white mb-4 uppercase tracking-tight">Transmissão Offline</h1>
                    <p className="text-zinc-400 mb-8">{errorMsg || "Nenhum evento a decorrer no momento."}</p>
                    <Link to="/">
                        <Button className="bg-white text-black hover:bg-zinc-200">Voltar à Página Principal</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const embedUrl = getEmbedUrl(live.link_live, live.plataforma);

    return (
        <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-red-500 selection:text-white">
            {/* Minimal Header */}
            <header className="fixed top-0 w-full z-50 bg-gradient-to-b from-zinc-950 to-transparent p-6 flex justify-between items-center pointer-events-none">
                <div className="pointer-events-auto flex items-center gap-4">
                    <Link to="/" className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/20 transition-all text-white">
                        <ArrowLeft size={18} />
                    </Link>
                    {tenantInfo?.logo ? (
                        <img src={tenantInfo.logo} alt={tenantInfo.nome} className="h-8 max-w-[120px] object-contain filter drop-shadow-lg" />
                    ) : (
                        <h2 className="text-lg font-black uppercase tracking-widest text-zinc-300 drop-shadow-md">{tenantInfo?.nome || 'Portal de Eventos'}</h2>
                    )}
                </div>
                
                <div className="pointer-events-auto">
                    <button className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/20 transition-all text-white" title="Partilhar Evento" onClick={() => {navigator.clipboard.writeText(window.location.href); (window as any).notify?.('Link copiado!');}}>
                        <Share2 size={16} />
                    </button>
                </div>
            </header>

            <main className="pt-24 pb-20 px-4 md:px-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Lado Esquerdo: Player Principal */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Video Container Aspect Ratio 16:9 */}
                    <div className="relative w-full rounded-2xl md:rounded-[2rem] overflow-hidden bg-black shadow-2xl shadow-red-500/10 ring-1 ring-white/10 aspect-video group">
                        
                        {live.status === 'ao_vivo' ? (
                            <iframe 
                                src={embedUrl}
                                className="absolute inset-0 w-full h-full border-0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowFullScreen
                            ></iframe>
                        ) : live.status === 'agendada' ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 bg-opacity-90 bg-[url('https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center bg-blend-overlay">
                                <Calendar size={64} className="text-zinc-500 mb-6 drop-shadow-2xl" />
                                <h2 className="text-3xl font-black text-white text-center px-4 max-w-lg mb-4 drop-shadow-xl leading-tight">A Transmissão Começará em Breve</h2>
                                <p className="text-zinc-400 font-medium">Aguarde o início do evento institucional.</p>
                                <div className="mt-8 px-6 py-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-xs font-bold uppercase tracking-widest flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
                                    Standby
                                </div>
                            </div>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 bg-opacity-90">
                                <Video size={48} className="text-zinc-600 mb-4" />
                                <h2 className="text-2xl font-black text-white">Transmissão Encerrada</h2>
                                <p className="text-zinc-500 mt-2">Obrigado por nos acompanhar.</p>
                            </div>
                        )}

                        {/* Badges Flutuantes (Inside Video Frame for Ao Vivo) */}
                        {live.status === 'ao_vivo' && (
                            <div className="absolute top-4 left-4 z-10 flex gap-2 opacity-100 transition-opacity duration-300 pointer-events-none">
                                <div className="px-3 py-1.5 bg-red-600 backdrop-blur-md rounded-lg flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white shadow-lg pointer-events-auto">
                                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></div>
                                    Ao Vivo
                                </div>
                                <div className="px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-lg flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white shadow-lg pointer-events-auto">
                                    <Eye size={12} /> {(Math.floor(Math.random() * 50) + 120)} Assistindo
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Meta do Evento */}
                    <div className="bg-zinc-900 p-6 md:p-8 rounded-[2rem] border border-white/5 space-y-4">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <div>
                                <h1 className="text-2xl md:text-3xl font-black text-white leading-tight">{live.titulo}</h1>
                                <p className="text-zinc-400 font-medium mt-2 max-w-3xl leading-relaxed">
                                    {live.descricao || 'Bem-vindo ao nosso evento institucional. Fique connosco para novidades exclusivas.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Lado Direito: Chat / Interacção Fake (Simulação visual para Premium Feel) */}
                <div className="bg-zinc-900 border border-white/5 rounded-[2rem] flex flex-col h-[600px] lg:h-auto overflow-hidden relative">
                    <div className="p-5 border-b border-white/10 bg-zinc-950/50 backdrop-blur-xl flex items-center gap-3">
                        <MessageSquare className="text-red-500" size={20} />
                        <h3 className="font-black text-white uppercase tracking-wider text-sm">Live Chat</h3>
                    </div>
                    
                    <div className="flex-1 p-5 overflow-y-auto space-y-4 feature-scroll">
                        {/* Fake Messages to give context */}
                        <div className="bg-white/5 p-3 rounded-xl border border-white/5 inline-block text-sm">
                            <span className="font-bold text-red-500 text-xs">Sistema</span>
                            <p className="text-zinc-300">O chat não está disponível temporariamente em eventos institucionais para garantir a estabilidade da plataforma.</p>
                        </div>
                    </div>

                    <div className="p-4 bg-zinc-950/80 backdrop-blur-xl border-t border-white/10">
                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-2">
                            <input 
                                type="text" 
                                placeholder="Chat desativado neste evento." 
                                disabled
                                className="w-full bg-transparent outline-none px-3 text-sm text-zinc-500 cursor-not-allowed"
                            />
                            <button disabled className="p-2 bg-white/5 rounded-lg text-zinc-500 cursor-not-allowed">
                                <MessageSquare size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PublicLive;
