import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  User as UserIcon,
  Truck,
  Sprout,
  Home,
  Mail,
  MapPin,
  Facebook,
  Instagram,
  Linkedin,
  Star,
  Send,
  ShieldCheck,
  Building2,
  Phone,
  Briefcase,
  Globe,
  PieChart,
  Target,
  Gamepad2,
  Rocket,
  CheckCircle2,
  Play,
  Zap,
  Scale,
  History,
  X,
  Clock,
  RefreshCw,
  Navigation,
  FileText,
  Lock,
  AlertTriangle,
  BarChart3,
  LogIn,
  LayoutDashboard,
  Newspaper,
  Eye,
  Calendar,
  Maximize2,
  Video,
  Image as ImageIcon,
  Sparkles,
  User as UserMini,
  ChevronRight,
  UploadCloud,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import Input from '../components/ui/Input';
import { AmazingStorage, STORAGE_KEYS } from '../utils/storage';
import { CorporateSettings, Solicitacao, User, BlogPost, RhVaga } from '../types';
import { supabase } from '../src/lib/supabase';

// Formulário extraído para a página PublicCandidaturaEspontanea

const PublicNewsGrid: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchPublicPosts = async () => {
      try {
        const { data, error } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('is_publico', true)
          .order('data_publicacao', { ascending: false })
          .limit(6);

        if (error) throw error;
        setPosts(data as any);
      } catch (err) {
        console.error('Erro ao buscar notícias publicas:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPublicPosts();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-[400px] bg-zinc-100 rounded-[3rem] animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {posts.map(post => (
          <div
            key={post.id}
            className="group bg-white rounded-[3.5rem] overflow-hidden border border-zinc-100 shadow-sm hover:shadow-2xl transition-all duration-500 cursor-pointer"
            onClick={() => setSelectedPost(post)}
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-zinc-900">
              {post.video_url ? (() => {
                const url = post.video_url as string;
                const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
                if (ytMatch) {
                  return (
                    <iframe
                      src={`https://www.youtube.com/embed/${ytMatch[1]}?rel=0&mute=1`}
                      className="w-full h-full pointer-events-none"
                      title={post.titulo}
                    />
                  );
                } else if (vimeoMatch) {
                  return (
                    <iframe
                      src={`https://player.vimeo.com/video/${vimeoMatch[1]}?muted=1`}
                      className="w-full h-full pointer-events-none"
                      title={post.titulo}
                    />
                  );
                } else {
                  return (
                    <video
                      src={url}
                      muted
                      className="w-full h-full object-cover"
                      preload="metadata"
                      poster={post.imagem_url || undefined}
                    />
                  );
                }
              })() : (
                <img
                  src={post.imagem_url || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800'}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  alt={post.titulo}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800';
                  }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-8">
                <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center text-zinc-900 shadow-xl translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                  {post.video_url ? <Play size={24} fill="currentColor" /> : <Eye size={24} />}
                </div>
              </div>
              <div className="absolute top-6 left-6 flex gap-2">
                <span className="px-3 py-1 bg-yellow-500 text-zinc-900 text-[9px] font-black uppercase tracking-widest rounded-lg shadow-lg">
                  {post.categoria}
                </span>
                {post.video_url && (
                  <span className="px-3 py-1 bg-zinc-900/60 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-lg flex items-center gap-1">
                    <Play size={8} fill="currentColor" /> Vídeo
                  </span>
                )}
              </div>
            </div>

            <div className="p-10 space-y-6">
              <div className="flex items-center gap-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                <span className="flex items-center gap-1"><Calendar size={12} className="text-yellow-500" /> {new Date(post.data).toLocaleDateString()}</span>
                <span className="w-1 h-1 bg-zinc-200 rounded-full"></span>
                <span className="flex items-center gap-1"><UserMini size={12} className="text-yellow-500" /> {post.autor_name || post.autor}</span>
              </div>

              <h3 className="text-2xl font-black text-zinc-900 leading-tight group-hover:text-yellow-600 transition-colors line-clamp-2 uppercase tracking-tight">
                {post.titulo}
              </h3>

              <p className="text-zinc-500 font-medium line-clamp-3 leading-relaxed">
                {post.conteudo}
              </p>

              <div className="pt-4 flex items-center gap-2 text-yellow-600 font-black text-[10px] uppercase tracking-widest group-hover:gap-4 transition-all">
                {post.video_url ? 'Ver Vídeo' : 'Ler Artigo Completo'} <ArrowRight size={16} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedPost && (() => {
        const vUrl = selectedPost.video_url as string | undefined;
        const ytMatch = vUrl?.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        const vimeoMatch = vUrl?.match(/vimeo\.com\/(\d+)/);

        return (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-12 bg-zinc-950/95 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-5xl h-full max-h-[90vh] rounded-[4rem] shadow-3xl overflow-hidden relative flex flex-col animate-in zoom-in-95 duration-500">
              <button
                onClick={() => setSelectedPost(null)}
                className="absolute top-8 right-8 p-4 bg-zinc-100 hover:bg-zinc-200 rounded-full transition-all text-zinc-500 z-10 hover:rotate-90"
              >
                <X size={24} />
              </button>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {/* Player de Vídeo Inteligente */}
                {vUrl ? (
                  <div className="aspect-video w-full bg-black">
                    {ytMatch ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={selectedPost.titulo}
                      />
                    ) : vimeoMatch ? (
                      <iframe
                        src={`https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`}
                        className="w-full h-full"
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                        title={selectedPost.titulo}
                      />
                    ) : (
                      <video
                        src={vUrl}
                        controls
                        autoPlay
                        className="w-full h-full object-contain"
                        poster={selectedPost.imagem_url || undefined}
                      />
                    )}
                  </div>
                ) : (
                  <div className="h-[400px] w-full overflow-hidden cursor-zoom-in">
                    <img
                      src={selectedPost.imagem_url}
                      className="w-full h-full object-cover"
                      alt={selectedPost.titulo}
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingImage(selectedPost.imagem_url);
                      }}
                    />
                  </div>
                )}

                <div className="p-12 md:p-20 space-y-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 text-[12px] font-black text-yellow-600 uppercase tracking-[0.4em]">
                      <span>{selectedPost.categoria}</span>
                      <span className="w-1.5 h-1.5 bg-zinc-200 rounded-full"></span>
                      <span className="text-zinc-400">{new Date(selectedPost.data).toLocaleDateString()}</span>
                    </div>
                    <h2 className="text-4xl md:text-6xl font-black text-zinc-900 tracking-tighter uppercase leading-none">
                      {selectedPost.titulo}
                    </h2>
                    <div className="flex items-center gap-3 pt-4">
                      <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400">
                        <UserMini size={20} />
                      </div>
                      <p className="text-sm font-black text-zinc-900 uppercase tracking-widest">{selectedPost.autor_name || selectedPost.autor}</p>
                    </div>
                  </div>

                  <div className="prose prose-zinc max-w-none">
                    <p className="text-xl text-zinc-600 leading-relaxed font-medium whitespace-pre-line">
                      {selectedPost.conteudo}
                    </p>
                  </div>

                  {/* Galeria se existir */}
                  {selectedPost.galeria_urls && selectedPost.galeria_urls.length > 0 && (
                    <div className="pt-12 space-y-6">
                      <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.5em]">Galeria do Momento</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {selectedPost.galeria_urls.map((url, i) => (
                          <div
                            key={i}
                            className="aspect-square rounded-[2rem] overflow-hidden border border-zinc-100 shadow-sm hover:shadow-xl transition-all cursor-zoom-in"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingImage(url);
                            }}
                          >
                            <img src={url} className="w-full h-full object-cover hover:scale-110 transition-all duration-700" alt="Gallery item" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-10 border-t border-zinc-100 bg-zinc-50 flex justify-between items-center shrink-0">
                <Logo className="h-10" />
                <button
                  onClick={() => setSelectedPost(null)}
                  className="px-10 py-4 bg-zinc-900 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest hover:bg-yellow-500 hover:text-zinc-900 transition-all shadow-xl"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* LIGHTBOX PARA IMAGENS */}
      {viewingImage && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-zinc-950/98 backdrop-blur-2xl p-4 animate-in fade-in duration-300"
          onClick={() => setViewingImage(null)}
        >
          <div className="absolute top-10 right-10 flex gap-4">
            <a
              href={viewingImage}
              download="amazing-photo.jpg"
              target="_blank"
              onClick={(e) => e.stopPropagation()}
              className="text-white/50 hover:text-white transition-all bg-white/10 p-5 rounded-full border border-white/10 flex items-center gap-2"
              title="Baixar Foto"
            >
              <Download size={24} />
            </a>
            <button
              className="text-white/50 hover:text-white transition-all bg-white/10 p-5 rounded-full border border-white/10 hover:rotate-90"
              onClick={() => setViewingImage(null)}
            >
              <X size={32} />
            </button>
          </div>
          <img
            src={viewingImage}
            className="max-w-full max-h-[90vh] rounded-[3rem] shadow-3xl animate-in zoom-in-95 duration-500 object-contain border-4 border-white/5 cursor-zoom-out"
            alt="Lightbox"
          />
        </div>
      )}
    </>
  );
};

// --- MULTIMEDIA GALLERY COMPONENT ---
const PublicMediaGallery: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<any | null>(null);

  useEffect(() => {
    const fetchMedia = async () => {
      try {
        const { data, error } = await supabase
          .from('galeria')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;
        setItems(data || []);
      } catch (err) {
        console.error('Erro ao buscar galeria:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMedia();
  }, []);

  if (loading) return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
      {[1, 2, 4, 5, 6, 7, 8].map(i => (
        <div key={i} className="aspect-square bg-zinc-100 rounded-3xl" />
      ))}
    </div>
  );

  if (items.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {items.map((item, idx) => (
          <div
            key={item.id}
            onClick={() => setSelectedMedia(item)}
            className={`group relative overflow-hidden rounded-[2.5rem] bg-zinc-100 cursor-pointer transition-all duration-700 hover:shadow-2xl hover:-translate-y-2 ${idx % 7 === 0 ? 'md:col-span-2 md:row-span-2 aspect-square' : 'aspect-square'}`}
          >
            {item.tipo === 'video' ? (
              <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                <Play className="text-white/40 group-hover:scale-125 transition-transform duration-500" size={60} />
              </div>
            ) : (
              <img
                src={item.url}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                alt={item.titulo}
              />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-8">
              <span className="text-yellow-500 font-black text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2">
                {item.tipo === 'video' ? <Video size={12} /> : <ImageIcon size={12} />}
                {item.tipo}
              </span>
              <h4 className="text-white font-black text-xl leading-tight uppercase">{item.titulo || 'Momento Amazing'}</h4>
            </div>

            <div className="absolute top-6 right-6 p-3 bg-white/20 backdrop-blur-md rounded-2xl text-white opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 duration-500">
              <Maximize2 size={20} />
            </div>
          </div>
        ))}
      </div>

      {selectedMedia && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-zinc-950/98 backdrop-blur-2xl animate-in fade-in duration-500">
          <button
            onClick={() => setSelectedMedia(null)}
            className="absolute top-10 right-10 p-5 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all border border-white/10 z-[100]"
          >
            <X size={32} />
          </button>

          <div className="w-full max-w-6xl aspect-video bg-black rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500 relative">
            {selectedMedia.tipo === 'video' ? (
              <video
                src={selectedMedia.url}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            ) : (
              <img
                src={selectedMedia.url}
                className="w-full h-full object-contain"
                alt={selectedMedia.titulo}
              />
            )}

            <div className="absolute bottom-0 inset-x-0 p-12 bg-gradient-to-t from-black/80 to-transparent">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-yellow-500 font-black text-[10px] uppercase tracking-[0.4em]">
                  <Sparkles size={14} /> Galeria Corporativa
                </div>
                <h3 className="text-4xl font-black text-white uppercase tracking-tight leading-none">{selectedMedia.titulo}</h3>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// --- PUBLIC VAGAS GRID COMPONENT ---
const PublicVagasGrid: React.FC = () => {
  const [vagas, setVagas] = useState<RhVaga[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPublicVagas = async () => {
      try {
        const { data, error } = await supabase
          .from('rh_vagas')
          .select('*')
          .eq('status', 'ativa')
          .order('data_publicacao', { ascending: false });

        if (error) throw error;

        // Filtrar no frontend as vagas cuja data_encerramento já passou
        const vagasValidas = (data as any[]).filter(v => {
          if (!v.data_encerramento) return true;
          const dataFim = new Date(v.data_encerramento);
          dataFim.setHours(23, 59, 59, 999);
          return dataFim.getTime() >= new Date().getTime();
        }).slice(0, 3); // Limit to top 3 after filtering

        setVagas(vagasValidas);
      } catch (err) {
        console.error('Erro ao buscar vagas publicas:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPublicVagas();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 w-full max-w-6xl mx-auto">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-64 bg-zinc-800/30 rounded-3xl animate-pulse"></div>
        ))}
      </div>
    );
  }

  if (vagas.length === 0) {
    return (
      <div className="mt-16 w-full max-w-6xl mx-auto p-12 rounded-[2.5rem] bg-zinc-800/20 border border-zinc-700/30 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-6 text-zinc-500">
          <Sparkles size={32} />
        </div>
        <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tight">Estamos a preparar novas oportunidades</h3>
        <p className="text-zinc-500 font-medium">Fique atento! Novas vagas corporativas serão publicadas em breve.</p>
        <div className="mt-8">
          <Link to="/candidatura-espontanea" className="text-yellow-500 font-black text-[10px] uppercase tracking-[0.3em] hover:text-yellow-400 transition-colors flex items-center justify-center gap-2">
            Enviar Candidatura Espontânea <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-16 w-full max-w-6xl mx-auto relative z-20 animate-in fade-in slide-in-from-bottom-6 duration-700">
      {vagas.map((vaga, idx) => (
        <div
          key={vaga.id}
          onClick={() => navigate(`/carreiras/${vaga.id}`)}
          style={{ animationDelay: `${idx * 100}ms` }}
          className="bg-zinc-800/40 backdrop-blur-md border border-zinc-700/50 p-8 rounded-[2rem] hover:bg-zinc-800 hover:border-yellow-500/50 hover:shadow-2xl hover:shadow-yellow-500/10 transition-all cursor-pointer group text-left flex flex-col justify-between animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500"
        >
          <div>
            <div className="flex justify-between items-start mb-6">
              <span className="bg-yellow-500/10 text-yellow-500 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">{vaga.tipo_contrato}</span>
              {(vaga as any).data_encerramento && (
                <span className="text-zinc-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"><Clock size={12} className="text-red-400" /> Fim: {new Date((vaga as any).data_encerramento).toLocaleDateString()}</span>
              )}
            </div>
            <h3 className="text-xl font-black text-white group-hover:text-yellow-400 mb-6 leading-tight line-clamp-2">{vaga.titulo}</h3>
            <div className="flex flex-col gap-3 text-xs font-bold text-zinc-400">
              <span className="flex items-center gap-3"><MapPin size={16} className="text-sky-400" /> {vaga.localizacao}</span>
              <span className="flex items-center gap-3"><Building2 size={16} className="text-purple-400" /> {vaga.nivel_experiencia}</span>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-zinc-700/50 flex justify-between items-center group-hover:border-yellow-500/30">
            <span className="text-[10px] font-black text-yellow-600 uppercase tracking-widest group-hover:text-yellow-500 transition-colors">Ver Detalhes</span>
            <ChevronRight size={18} className="text-yellow-600 group-hover:text-yellow-500 group-hover:translate-x-1 transition-all" />
          </div>
        </div>
      ))}
    </div>
  );
};

const SECTOR_HISTORIES = {
  express: {
    title: "Amazing Express",
    color: "bg-yellow-500",
    icon: <Truck />,
    milestones: [
      { year: "2018", event: "Fundação em Benguela, iniciando operações especializadas em transporte motorizado para entregas urbanas ultra-rápidas." },
      { year: "2021", event: "Expansão estratégica para o segmento de veículos automóveis, otimizando a logística de carga média e distribuição corporativa." },
      { year: "2024", event: "Digitalização total da frota com sistemas avançados de telemetria para motorizadas e automóveis em todo o território nacional." },
      { year: "2026", event: "Consolidação como a maior operadora multimodal de Angola, com eficiência comprovada em veículos de duas e quatro rodas." }
    ]
  },
  agro: {
    title: "Amazing Agro",
    color: "bg-green-600",
    icon: <Sprout />,
    milestones: [
      { year: "Missão", event: "Slogan: 'Cultivando oportunidades, colhendo progresso'. Foco total no apoio a agricultores com poucos recursos através de inclusão financeira." },
      { year: "Suporte", event: "Implementation de acompanhamento agrícola rigoroso, orientação técnica especializada e financiamento estratégico para pequenos produtores." },
      { year: "Serviços", event: "Excelência em Produção Sustentável, Apoio ao Camponês, Desenvolvimento Rural e garantia da Segurança Alimentar em Angola." },
      { year: "Impacto", event: "Trajectória consolidada na transformação da agricultura familiar em agronegócio produtivo, colhendo progresso para as comunidades rurais." }
    ]
  },
  imobiliario: {
    title: "Amazing Imobiliário",
    color: "bg-indigo-600",
    icon: <Building2 />,
    milestones: [
      { year: "Missão", event: "Somos especialistas em soluções imobiliárias completas, dedicados a oferecer qualidade, confiança e excelência em cada serviço prestado em Angola." },
      { year: "Atuação", event: "Operamos com rigor na reabilitação de imóveis, arrendamento residencial, aluguer diário e gestão imobiliária, garantindo conforto e valorização patrimonial." },
      { year: "Serviços", event: "Portfolio completo em reabilitação e remodelação de imóveis, arrendamento de residências, casas para aluguer diário e manutenção técnica preventiva." },
      { year: "Foco", event: "Consultoria imobiliária estratégica focada na satisfação total dos nossos clientes e na geração de valor sustentável para o mercado nacional." }
    ]
  },
  contabil: {
    title: "Amazing ContábilExpert",
    color: "bg-sky-600",
    icon: <Scale />,
    milestones: [
      { year: "Objeto", event: "Prestação de serviço técnico profissional de contabilidade, em total conformidade com a legislação vigente, normas contábeis e fiscais aplicáveis em Angola." },
      { year: "Contab.", event: "Contabilidade Geral: Recolha e análise documental; Classificação, organização e lançamento de documentos; Elaboração de balancetes e preparação das demonstrações financeiras." },
      { year: "Folha", event: "Folha de Pagamento: Processamento integral de salários e cálculo rigoroso de encargos sociais e impostos (IRT/INSS), de acordo com os recibos de pagamento emitidos." },
      { year: "Fiscal", event: "Obrigações Fiscais: Apuração de impostos, taxas e contribuições; Elaboração de mapas de amortizações e fluxo de caixa; Submissão de declarações e acompanhamento de prazos legais." },
      { year: "Consult.", event: "Consultoria Contábil: Esclarecimento de dúvidas técnicas, orientação fiscal básica e apoio especializado em fiscalizações quando solicitado pelo cliente." }
    ]
  },
  arena: {
    title: "Arena Gamer",
    color: "bg-indigo-600",
    icon: <Gamepad2 />,
    milestones: [
      { year: "2026", event: "Fundação da Arena Gamer com foco em entretenimento digital de alta fidelidade." },
      { year: "2026", event: "Inauguração do primeiro hub premium em Benguela equipado com tecnologia de ponta." },
      { year: "2026", event: "Lançamento da plataforma Amazing Championship para competições nacionais de eSports." }
    ]
  }
};

const LEGAL_DOCS = {
  privacy: {
    title: "Política de Privacidade",
    icon: <Lock className="text-green-500" />,
    content: `
      1. Recolha de Dados
      A Amazing Corporation recolhe dados pessoais (nome, contacto, dados profissionais) apenas para fins de prestação de serviço e recrutamento. Garantimos a confidencialidade total.

      2. Uso da Informação
      Os dados são utilizados para processamento de candidaturas, gestão de contratos e comunicação corporativa. Não partilhamos dados com terceiros sem consentimento explícito.

      3. Segurança
      Implementamos protocolos de encriptação e segurança física para proteger os seus dados contra acesso não autorizado.

      4. Direitos do Titular
      Qualquer utilizador pode solicitar a consulta, retificação ou eliminação dos seus dados através do nosso canal de suporte.
    `
  },
  terms: {
    title: "Termos de Serviço",
    icon: <FileText className="text-yellow-500" />,
    content: `
      1. Aceitação
      Ao utilizar os serviços da Amazing Corporation, o cliente concorda com os presentes termos.

      2. Serviços
      A empresa compromete-se a prestar serviços de logística, consultoria e gestão com o máximo rigor e qualidade.

      3. Pagamentos
      Os termos de pagamento são definidos contratualmente caso a caso. Atrasos podem incorrer em juros de mora legais.

      4. Propriedade Intelectual
      Todo o conteúdo deste site e materiais da marca são propriedade exclusiva da Amazing Corporation S.A.
    `
  },
  whistleblower: {
    title: "Canal de Denúncias",
    icon: <AlertTriangle className="text-red-500" />,
    content: `
      A Amazing Corporation mantém um compromisso inabalável com a ética e integridade.

      Este canal serve para reportar:
      - Fraude ou Corrupção;
      - Assédio ou Discriminação;
      - Má conduta profissional;
      - Violações de segurança.

      Garantimos o anonimato e a não-retaliação.
      
      Email directo: compliance@amazing.ao
      Linha Ética: +244 929 882 067
    `
  },
  financial: {
    title: "Relatórios Financeiros",
    icon: <BarChart3 className="text-sky-500" />,
    content: `
      Comprometidos com a transparência, disponibilizamos os resumos dos nossos exercícios fiscais para parceiros e investidores.

      Exercício 2025:
      - Crescimento Líquido: +18%
      - Expansão de Frota: +45 Unidades
      - Investimento Social: 12M AOA

      Para aceder aos relatórios detalhados auditados, por favor contacte a nossa Direcção Financeira ou aceda à área de investidores.
    `
  }
};

const CorporateHome: React.FC = () => {
  const [successMsg, setSuccessMsg] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<keyof typeof SECTOR_HISTORIES | null>(null);
  const [selectedLegalDoc, setSelectedLegalDoc] = useState<keyof typeof LEGAL_DOCS | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Parallelize all public data fetching
    const fetchAllData = async () => {
      // Don't await them serially, let them run in background
      setLoading(false); // Unblock UI immediately
    };
    fetchAllData();
  }, []);

  // Get current user to determine button state
  const currentUser = AmazingStorage.get<User | null>(STORAGE_KEYS.USER, null);

  // Form State for Tickets
  const [contactForm, setContactForm] = useState({
    nome: '',
    email: '',
    assunto: 'Contacto Geral',
    mensagem: ''
  });

  // State for CEO/Corporate Info
  const [corpInfo, setCorpInfo] = useState<CorporateSettings>({
    ceo_nome: 'Euclides Cadastro Nvula',
    ceo_mensagem: 'Liderando Angola rumo a uma nova era de logística eficiente e agronegócio sustentável.',
    ceo_foto_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=800',
    fundacao_ano: '2018',
    sede_principal: 'Benguela, Angola'
  });

  useEffect(() => {
    const fetchCorpInfo = async () => {
      try {
        const { data, error } = await supabase.from('config_sistema').select('*');
        if (error) throw error;

        if (data && data.length > 0) {
          const info: any = { ...corpInfo };
          const relevantKeys = ['ceo_nome', 'ceo_mensagem', 'ceo_foto_url', 'fundacao_ano', 'sede_principal'];
          data.forEach((item: any) => {
            if (relevantKeys.includes(item.chave)) {
              info[item.chave] = item.valor;
            }
          });
          setCorpInfo(info);
          // Sync to local storage for quick access elsewhere if needed
          AmazingStorage.save(STORAGE_KEYS.CORPORATE_INFO, info);
        }
      } catch (err) {
        console.error('Erro ao buscar info corporativa:', err);
      }
    };

    fetchCorpInfo();
  }, []);

  const scrollIntoView = (id: string) => {
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmitContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);

    try {
      const { error } = await supabase
        .from('solicitacoes')
        .insert([{
          nome: contactForm.nome,
          email: contactForm.email,
          assunto: contactForm.assunto,
          mensagem: contactForm.mensagem,
          status: 'pendente'
        }]);

      if (error) throw error;

      // Log de acção
      AmazingStorage.logAction('Contacto', 'Website', `Nova mensagem recebida de ${contactForm.nome}`);

      setSuccessMsg('Mensagem enviada com sucesso! O nosso suporte técnico responderá em breve.');
      setContactForm({ nome: '', email: '', assunto: 'Contacto Geral', mensagem: '' });

      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      alert('Ocorreu um erro ao enviar a mensagem. Por favor, tente novamente.');
    } finally {
      setIsSending(false);
    }
  };

  // Newsletter Logic
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [newsletterMsg, setNewsletterMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleNewsletterSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;

    setIsSubscribing(true);
    setNewsletterMsg(null);

    try {
      const { error } = await supabase
        .from('newsletter_subscribers')
        .insert([{ email: newsletterEmail }]);

      if (error) {
        if (error.code === '23505') {
          throw new Error('Este e-mail já está subscrito na nossa newsletter.');
        }
        throw error;
      }

      setNewsletterMsg({ type: 'success', text: 'Subscrição realizada com sucesso!' });
      setNewsletterEmail('');

      AmazingStorage.logAction('Newsletter', 'Website', `Novo subscritor: ${newsletterEmail}`);
    } catch (err: any) {
      console.error('Erro na newsletter:', err);
      setNewsletterMsg({
        type: 'error',
        text: err.message || 'Ocorreu um erro. Tente novamente.'
      });
    } finally {
      setIsSubscribing(false);
      setTimeout(() => setNewsletterMsg(null), 5000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-12 h-12 text-yellow-500 animate-spin" />
        <p className="text-zinc-500 font-bold animate-pulse uppercase tracking-widest text-[10px]">Iniciando Experiência Amazing...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans text-zinc-900 scroll-smooth selection:bg-yellow-500 selection:text-zinc-900 overflow-x-hidden">
      {/* NAVIGATION BAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/95 backdrop-blur-md border-b border-white/5 px-6 md:px-12 py-5 flex items-center justify-between shadow-2xl">
        <Logo className="h-16 md:h-20 cursor-pointer" onClick={() => scrollIntoView('inicio')} />
        <div className="hidden lg:flex items-center gap-10 text-[12px] font-black uppercase tracking-widest text-white">
          <button onClick={() => scrollIntoView('inicio')} className="hover:text-yellow-500 transition-colors">INÍCIO</button>
          <button onClick={() => scrollIntoView('sectores')} className="hover:text-yellow-500 transition-colors">SECTORES</button>
          <button onClick={() => scrollIntoView('noticias')} className="hover:text-yellow-500 transition-colors">NOTÍCIAS</button>
          <Link to="/arena" className="flex items-center gap-3 text-indigo-400 hover:text-indigo-300 transition-all bg-white/5 px-6 py-3 rounded-full border border-white/10">
            <Gamepad2 size={18} /> Arena Gamer
          </Link>
          <Link to="/carreiras" className="hover:text-yellow-500 transition-colors">VER TODAS AS VAGAS</Link>
          <Link to="/candidatura-espontanea" className="hover:text-yellow-500 transition-colors">CANDIDATURA ESPONTÂNEA</Link>
          <button onClick={() => scrollIntoView('contactos')} className="hover:text-yellow-500 transition-colors">CONTACTOS</button>
        </div>
        <Link to="/dashboard" className={`px-6 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${currentUser ? 'bg-white text-zinc-900 hover:bg-zinc-200' : 'bg-white/10 text-zinc-400 hover:bg-white/20'}`}>
          {currentUser ? (
            <>
              <LayoutDashboard size={16} /> Meu Dashboard
            </>
          ) : (
            <>
              <Lock size={16} /> Área Reservada
            </>
          )}
        </Link>
      </nav>

      {/* HERO SECTION - 100% WIDTH & HEIGHT */}
      <section id="inicio" className="relative h-screen w-full flex items-center pt-32 lg:pt-40 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=2070" className="w-full h-full object-cover scale-110 animate-slow-zoom" alt="Amazing Corporation Holding" />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent"></div>
        </div>
        <div className="relative z-10 w-full px-8 md:px-20 lg:px-32 flex flex-col items-start gap-12 animate-in fade-in slide-in-from-bottom-10 duration-1000">
          <div className="flex flex-col items-start gap-6 max-w-5xl">
            <button
              onClick={() => scrollIntoView('sectores')}
              className="inline-flex items-center gap-2 bg-yellow-500 text-zinc-900 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:bg-yellow-400 transition-all active:scale-95 shadow-2xl shadow-yellow-500/20"
            >
              <Zap size={14} /> Soluções Multissectoriais Angolanas
            </button>
            <div className="space-y-4">
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter leading-[0.9] drop-shadow-2xl">
                Impulsionando <br /><span className="text-yellow-500">Angola</span> ao Futuro.
              </h1>
              <div className="h-1.5 w-32 bg-yellow-500 rounded-full"></div>
            </div>
            <p className="text-zinc-300 text-xl md:text-2xl font-medium max-w-3xl leading-relaxed mt-4 drop-shadow-lg">
              Do transporte logístico à inovação digital, a Amazing Corporation lidera o mercado com eficiência, ética e tecnologia através das suas 5 unidades estratégicas.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 pt-4">
            <button onClick={() => scrollIntoView('sectores')} className="w-full sm:w-auto px-12 py-6 bg-yellow-500 text-zinc-900 font-black rounded-2xl hover:bg-yellow-400 transition-all flex items-center justify-center gap-4 shadow-2xl text-xs uppercase tracking-widest group">
              Explorar Sectores <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
            </button>
            <Link to="/arena" className="w-full sm:w-auto px-12 py-6 bg-white/10 backdrop-blur-md border border-white/20 text-white font-black rounded-2xl hover:bg-white/20 transition-all flex items-center justify-center gap-4 text-xs uppercase tracking-widest">
              Conhecer Arena <Gamepad2 size={20} />
            </Link>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10 hidden md:flex flex-col items-center gap-4 text-white/40">
          <span className="text-[10px] font-black uppercase tracking-[0.5em] rotate-180 [writing-mode:vertical-lr]">Scroll</span>
          <div className="w-[1px] h-16 bg-gradient-to-b from-yellow-500 to-transparent"></div>
        </div>
      </section>

      {/* SECTORES SECTION - EXPANSIVE GRID */}
      <section id="sectores" className="min-h-screen py-32 px-8 md:px-20 lg:px-32 bg-zinc-50 flex flex-col justify-center">
        <div className="w-full">
          <div className="text-center space-y-4 mb-24">
            <span className="text-yellow-600 text-[18px] font-black uppercase tracking-[0.6em]">Pilar Estratégico</span>
            <h2 className="text-5xl md:text-7xl font-black text-zinc-900 tracking-tighter uppercase leading-tight">Ecossistema de Soluções <span className="text-yellow-500">Amazing</span></h2>
            <p className="text-zinc-500 max-w-5xl mx-auto font-medium text-lg md:text-xl leading-relaxed">
              Exploramos o potencial máximo do mercado nacional, integrando logística de ponta, agronegócio sustentável, gestão imobiliária, consultoria contábil e entretenimento digital.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
            {/* Express */}
            <div className="bg-white p-10 rounded-[3rem] border border-zinc-100 shadow-sm hover:shadow-2xl transition-all group flex flex-col justify-between h-full min-h-[400px]">
              <div>
                <div className="w-16 h-16 bg-yellow-500 rounded-3xl flex items-center justify-center text-zinc-900 mb-8 group-hover:scale-110 transition-transform">
                  <Truck size={32} />
                </div>
                <h3 className="text-2xl font-black mb-4">Amazing Express</h3>
                <p className="text-zinc-500 font-medium leading-relaxed mb-8">Líder em logística de última milha com operation integrada em transportes motorizados e automóveis.</p>
              </div>
              <button onClick={() => setSelectedHistory('express')} className="flex items-center gap-2 text-[10px] font-black uppercase text-yellow-600 hover:text-yellow-700 transition-colors">
                Ver Histórico <History size={14} />
              </button>
            </div>

            {/* Agro */}
            <div className="bg-white p-10 rounded-[3rem] border border-zinc-100 shadow-sm hover:shadow-2xl transition-all group flex flex-col justify-between h-full min-h-[400px]">
              <div>
                <div className="w-16 h-16 bg-green-600 rounded-3xl flex items-center justify-center text-white mb-8 group-hover:scale-110 transition-transform">
                  <Sprout size={32} />
                </div>
                <h3 className="text-2xl font-black mb-4">Amazing Agro</h3>
                <p className="text-zinc-500 font-medium leading-relaxed mb-8">Fomento agrícola e produção sustentável. Cultivando oportunidades e colhendo progresso com o agricultor nacional.</p>
              </div>
              <button onClick={() => setSelectedHistory('agro')} className="flex items-center gap-2 text-[10px] font-black uppercase text-green-600 hover:text-green-700 transition-colors">
                Ver Histórico <History size={14} />
              </button>
            </div>

            {/* Imobiliário */}
            <div className="bg-white p-10 rounded-[3rem] border border-zinc-100 shadow-sm hover:shadow-2xl transition-all group flex flex-col justify-between h-full min-h-[400px]">
              <div>
                <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-white mb-8 group-hover:scale-110 transition-transform">
                  <Building2 size={32} />
                </div>
                <h3 className="text-2xl font-black mb-4">Amazing Imobiliário</h3>
                <p className="text-zinc-500 font-medium leading-relaxed mb-8">Soluções completas em reabilitação, arrendamento e gestão. Valorizando activos com excelência e confiança.</p>
              </div>
              <button onClick={() => setSelectedHistory('imobiliario')} className="flex items-center gap-2 text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-700 transition-colors">
                Ver Histórico <History size={14} />
              </button>
            </div>

            {/* ContábilExpert */}
            <div className="bg-white p-10 rounded-[3rem] border border-zinc-100 shadow-sm hover:shadow-2xl transition-all group flex flex-col justify-between h-full min-h-[400px]">
              <div>
                <div className="w-16 h-16 bg-sky-600 rounded-3xl flex items-center justify-center text-white mb-8 group-hover:scale-110 transition-transform">
                  <Scale size={32} />
                </div>
                <h3 className="text-2xl font-black mb-4">Amazing ContábilExpert</h3>
                <p className="text-zinc-500 font-medium leading-relaxed mb-8">Consultoria técnica profissional e gestão fiscal de alto nível em conformidade com as normas vigentes.</p>
              </div>
              <button onClick={() => setSelectedHistory('contabil')} className="flex items-center gap-2 text-[10px] font-black uppercase text-sky-600 hover:text-sky-700 transition-colors">
                Ver Histórico <History size={14} />
              </button>
            </div>

            {/* Arena Gamer */}
            <div className="bg-white p-10 rounded-[3rem] border border-zinc-100 shadow-sm hover:shadow-2xl transition-all group flex flex-col justify-between h-full min-h-[400px]">
              <div>
                <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-white mb-8 group-hover:scale-110 transition-transform">
                  <Gamepad2 size={32} />
                </div>
                <h3 className="text-2xl font-black mb-4">Arena Gamer</h3>
                <p className="text-zinc-500 font-medium leading-relaxed mb-8">O maior hub de eSports e entretenimento digital de Angola. Experiência imersiva e tecnologia de ponta para gamers.</p>
              </div>
              <button onClick={() => setSelectedHistory('arena')} className="flex items-center gap-2 text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-700 transition-colors">
                Ver Histórico <History size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CEO MESSAGE - 100% WIDTH */}
      <section className="min-h-screen py-32 px-8 md:px-20 lg:px-32 bg-white flex items-center">
        <div className="w-full flex flex-col md:flex-row items-center gap-20">
          <div className="md:w-1/3 relative">
            <div className="absolute -inset-4 bg-yellow-500 rounded-[3rem] rotate-3"></div>
            <img src={corpInfo.ceo_foto_url} className="relative z-10 w-full rounded-[3rem] shadow-2xl grayscale hover:grayscale-0 transition-all duration-700" alt="CEO" />
          </div>
          <div className="md:w-2/3 space-y-8">
            <div className="p-10 md:p-20 bg-zinc-50 rounded-[4rem] relative shadow-inner">
              <Star className="absolute top-8 left-8 text-yellow-500 opacity-20" size={80} />
              <div className="font-['Times_New_Roman',_Times,_serif] text-justify relative z-10">
                <p className="text-xl md:text-2xl font-bold text-zinc-800 mb-4">
                  A minha filosofia é seguinte:
                </p>
                <p className="text-lg md:text-xl font-medium text-zinc-700 italic leading-relaxed">
                  "Se um dia eu me encontrar no deserto com apenas um bidão de água, darei a ti para saciar a tua sede. Porque em mim carrego a certeza de que seguirei vivo, mas em ti não tenho garantias. E se puder escolher, prefiro ser a razão da tua salvação do que testemunhar a tua queda..."
                </p>
                <p className="text-lg md:text-xl font-medium text-zinc-700 font-bold mt-4 text-right">
                  By: Euclides Nvula - CEO
                </p>
              </div>
              <div className="mt-12 pt-12 border-t border-zinc-200">
                <p className="text-3xl font-black text-zinc-900">{corpInfo.ceo_nome}</p>
                <p className="text-[12px] font-black text-yellow-600 uppercase tracking-[0.4em] mt-2">CEO/Fundador da Amazing Corporation, Lda</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MULTIMEDIA GALLERY - PUBLIC VIEW */}
      <section id="galeria" className="py-32 px-8 md:px-20 lg:px-32 bg-white">
        <div className="w-full">
          <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-20 animate-in fade-in duration-700">
            <div className="space-y-4">
              <span className="text-yellow-600 text-[14px] font-black uppercase tracking-[0.6em]">Portfolio de Actividades</span>
              <h2 className="text-5xl md:text-7xl font-black text-zinc-900 tracking-tighter uppercase leading-tight">Visão & <br /><span className="text-yellow-500">Momentos Reais</span></h2>
            </div>
            <p className="text-zinc-500 max-w-xl font-medium text-lg leading-relaxed mb-4">
              Explore a nossa trajetória através de imagens e vídeos que capturam a essência da nossa expansão, operações no terreno e compromisso com Angola.
            </p>
          </div>

          <PublicMediaGallery />
        </div>
      </section>

      {/* BLOG / NEWS SECTION - PUBLIC FEED */}
      <section id="noticias" className="min-h-screen py-32 px-8 md:px-20 lg:px-32 bg-zinc-50">
        <div className="w-full">
          <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-20">
            <div className="space-y-4">
              <span className="text-yellow-600 text-[14px] font-black uppercase tracking-[0.6em]">Actualidade Amazing</span>
              <h2 className="text-5xl md:text-7xl font-black text-zinc-900 tracking-tighter uppercase leading-tight">Momentos & <br /><span className="text-yellow-500">Notícias Recentes</span></h2>
            </div>
            <p className="text-zinc-500 max-w-xl font-medium text-lg leading-relaxed mb-4">
              Acompanhe o crescimento do nosso grupo, eventos corporativos e os momentos que marcam o nosso dia-a-dia em Angola.
            </p>
          </div>

          <PublicNewsGrid />
        </div>
      </section>

      {/* CARREIRAS / RECRUTAMENTO SECTION - 100% WIDTH */}
      <section id="carreiras" className="min-h-[70vh] py-32 px-8 md:px-20 lg:px-32 bg-zinc-900 text-white relative overflow-hidden flex flex-col items-center">
        <div className="absolute top-0 right-0 p-20 opacity-5">
          <Briefcase size={500} />
        </div>
        <div className="w-full text-center space-y-8 relative z-10 max-w-5xl mx-auto">
          <div className="inline-flex items-center justify-center p-4 bg-yellow-500/10 rounded-full mb-4">
            <Briefcase size={32} className="text-yellow-500" />
          </div>
          <h2 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter">Faça Parte da Nossa <br /><span className="text-yellow-500">História de Sucesso.</span></h2>
          <p className="text-zinc-400 text-xl md:text-2xl leading-relaxed font-medium">
            Estamos sempre em busca de talentos excepcionais para as nossas divisões corporativas. A sua carreira começa aqui connosco.
          </p>
          <div className="pt-6">
            <Link to="/carreiras" className="px-12 py-6 bg-yellow-500 text-zinc-900 font-black rounded-2xl hover:bg-yellow-400 transition-all shadow-xl text-xs uppercase tracking-widest inline-flex items-center gap-4">
              Ver Todas as Vagas <ArrowRight size={20} />
            </Link>
          </div>
        </div>

        <div className="w-full mt-20 animate-in fade-in duration-1000 relative z-10">
          <div className="text-center space-y-2 mb-4">
            <span className="text-yellow-500 text-[10px] font-black uppercase tracking-[0.5em]">Join Our Team</span>
            <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight">Oportunidades Disponíveis</h2>
          </div>
          <PublicVagasGrid />
        </div>

        <div className="w-full mt-24 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link to="/candidatura-espontanea" className="group col-span-1 md:col-span-2 lg:col-span-3 bg-zinc-800 p-8 rounded-3xl border border-white/10 hover:border-yellow-500/50 transition-all flex flex-col md:flex-row items-center justify-between gap-6 cursor-pointer">
              <div className="space-y-2 text-center md:text-left">
                <h3 className="text-2xl font-black text-white uppercase tracking-tight flex items-center justify-center md:justify-start gap-3">
                  <UploadCloud className="text-yellow-500" size={28} /> Candidatura Espontânea
                </h3>
                <p className="text-zinc-400 font-medium max-w-2xl">Não encontra a vaga ideal? Deixe o seu currículo na nossa base de talentos. Analisaremos o seu perfil para funções corporativas que venham a surgir.</p>
              </div>
              <div className="bg-yellow-500 text-zinc-900 px-8 py-4 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-3 shadow-xl group-hover:bg-yellow-400 transition-colors whitespace-nowrap">
                Enviar CV <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* CONTACTS & MAP - 100% WIDTH */}
      <section id="contactos" className="min-h-screen py-32 px-8 md:px-20 lg:px-32 bg-white flex items-center">
        <div className="w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
            <div className="space-y-12">
              <div className="space-y-4">
                <h2 className="text-5xl font-black text-zinc-900 tracking-tight">Entre em Contacto</h2>
                <p className="text-zinc-500 text-lg font-medium">Nossa equipa de atendimento corporativo está pronta para responder às suas questões.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-8">
                <div className="flex items-center gap-6">
                  <div className="p-4 bg-zinc-100 rounded-2xl text-yellow-600"><MapPin size={24} /></div>
                  <div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Sede Central</p>
                    <p className="font-bold text-zinc-800">Benguela, Bairro Massangarala, Angola</p>
                    <a
                      href="https://www.google.com/maps/search/?api=1&query=Massangarala+Benguela+Angola"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-yellow-600 hover:text-yellow-700 mt-1 transition-colors"
                    >
                      <Navigation size={12} /> Ver no GPS
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="p-4 bg-zinc-100 rounded-2xl text-yellow-600"><Phone size={24} /></div>
                  <div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Atendimento 24/7</p>
                    <p className="font-bold text-zinc-800">+244 929 882 067</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="p-4 bg-zinc-100 rounded-2xl text-yellow-600"><Mail size={24} /></div>
                  <div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">E-mail Corporativo</p>
                    <p className="font-bold text-zinc-800">geral@amazing.ao</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmitContact} className="space-y-6 pt-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    placeholder="Seu Nome"
                    required
                    className="bg-zinc-50 border-zinc-200 py-4"
                    value={contactForm.nome}
                    onChange={e => setContactForm({ ...contactForm, nome: e.target.value })}
                  />
                  <Input
                    placeholder="E-mail"
                    type="email"
                    required
                    className="bg-zinc-50 border-zinc-200 py-4"
                    value={contactForm.email}
                    onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                  />
                </div>
                <textarea
                  placeholder="Como podemos ajudar?"
                  required
                  className="w-full p-6 bg-zinc-50 border border-zinc-200 rounded-2xl h-40 outline-none focus:ring-4 focus:ring-yellow-500/10 transition-all font-medium"
                  value={contactForm.mensagem}
                  onChange={e => setContactForm({ ...contactForm, mensagem: e.target.value })}
                />
                <button type="submit" disabled={isSending} className="px-12 py-5 bg-zinc-900 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest hover:bg-zinc-800 transition-all flex items-center gap-3 disabled:opacity-50">
                  {isSending ? <RefreshCw className="animate-spin" /> : <Send size={18} />}
                  {isSending ? 'Enviando...' : 'Enviar Mensagem'}
                </button>
                {successMsg && <p className="text-green-600 font-bold text-sm animate-in fade-in">{successMsg}</p>}
              </form>
            </div>

            <div className="relative">
              <div className="bg-zinc-100 rounded-[4rem] h-full min-h-[600px] overflow-hidden shadow-2xl border-8 border-white">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3895.5037!2d13.405!3d-12.583!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1bb3035f55555555%3A0x5555555555555555!2sMassangarala%2C%20Benguela!5e0!3m2!1spt-PT!2sao!4v1710000000000"
                  className="w-full h-full grayscale opacity-80"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER - 100% WIDTH */}
      <footer className="bg-[#0f1115] pt-32 pb-16 px-8 md:px-20 lg:px-32 text-white">
        <div className="w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-20 pb-20 border-b border-white/5">
            <div className="space-y-8">
              <Logo className="h-20 md:h-24 brightness-110 contrast-125 saturate-150" />
              <p className="text-zinc-500 font-medium leading-relaxed">Excelência operativa e inovação constante para transformar o mercado angolano em todos os sectores.</p>
              <div className="flex gap-4">
                <a href="https://facebook.com/amazingcorporation.ao" target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 rounded-xl hover:bg-yellow-500 hover:text-zinc-900 transition-all cursor-pointer">
                  <Facebook size={18} />
                </a>
                <a href="https://instagram.com/amazingcorporation.ao" target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 rounded-xl hover:bg-yellow-500 hover:text-zinc-900 transition-all cursor-pointer">
                  <Instagram size={18} />
                </a>
                <a href="https://linkedin.com/company/amazing-corporation" target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 rounded-xl hover:bg-yellow-500 hover:text-zinc-900 transition-all cursor-pointer">
                  <Linkedin size={18} />
                </a>
              </div>
            </div>

            <div className="space-y-6">
              <h4 className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.4em]">Navegação</h4>
              <ul className="space-y-4 text-zinc-400 font-bold text-sm">
                <li><button onClick={() => scrollIntoView('inicio')} className="hover:text-white transition-colors">Início Corporativo</button></li>
                <li><button onClick={() => scrollIntoView('sectores')} className="hover:text-white transition-colors">Sectores de Actuação</button></li>
                <li><Link to="/arena" className="hover:text-indigo-400 transition-colors">Arena Gamer</Link></li>
                <li><Link to="/candidatura" className="hover:text-white transition-colors">Carreiras / Candidaturas</Link></li>
              </ul>
            </div>

            <div className="space-y-6">
              <h4 className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">Legal & Suporte</h4>
              <div className="space-y-4 text-zinc-400 font-bold text-sm">
                <button onClick={() => setSelectedLegalDoc('privacy')} className="hover:text-white transition-colors text-left w-full">Política de Privacidade</button>
                <button onClick={() => setSelectedLegalDoc('terms')} className="hover:text-white transition-colors text-left w-full">Termos de Serviço</button>
                <button onClick={() => setSelectedLegalDoc('whistleblower')} className="hover:text-white transition-colors text-left w-full">Canal de Denúncias</button>
                <button onClick={() => setSelectedLegalDoc('financial')} className="hover:text-white transition-colors text-left w-full">Relatórios Financeiros</button>
              </div>
            </div>

            <div className="space-y-6">
              <h4 className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.4em]">Subscrever News</h4>
              <p className="text-zinc-500 text-xs font-medium">Receba as últimas notícias sobre expansão e investimentos do grupo.</p>
              <form onSubmit={handleNewsletterSubscribe} className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="email"
                    required
                    placeholder="E-mail"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs w-full focus:border-yellow-500 outline-none transition-all"
                  />
                  <button
                    type="submit"
                    disabled={isSubscribing}
                    title="Subscrever Newsletter"
                    className="p-3 bg-yellow-500 text-zinc-900 rounded-xl hover:bg-yellow-400 transition-all disabled:opacity-50 flex items-center justify-center"
                  >
                    {isSubscribing ? <RefreshCw className="animate-spin w-4 h-4" /> : <Send size={18} />}
                  </button>
                </div>
                {newsletterMsg && (
                  <p className={`text-xs font-bold ${newsletterMsg.type === 'success' ? 'text-green-500' : 'text-red-500'} animate-in fade-in slide-in-from-top-1`}>
                    {newsletterMsg.text}
                  </p>
                )}
              </form>
            </div>
          </div>

          <div className="pt-16 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex flex-col gap-1 font-['Times_New_Roman',_Times,_serif]">
              <p className="text-[12px] text-zinc-600">Sistema Desenvolvido Pelo Engenheiro Simão Puca, Email: simaopambo94@gamil, Contacto: +244 945 035 089</p>
              <p className="text-[12px] font-bold text-zinc-600">© 2026 Grupo Amazing Corporation, todos os direitos reservados.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">System Operational • v4.2.0</span>
            </div>
          </div>
        </div>
      </footer>

      {/* HISTORIC MODAL */}
      {selectedHistory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-zinc-950/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-3xl overflow-hidden relative animate-in zoom-in-95 duration-500">
            <button
              onClick={() => setSelectedHistory(null)}
              className="absolute top-8 right-8 p-3 bg-zinc-100 hover:bg-zinc-200 rounded-full transition-all text-zinc-500 hover:rotate-90"
            >
              <X size={20} />
            </button>

            <div className={`p-12 text-white ${SECTOR_HISTORIES[selectedHistory].color}`}>
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-white/20 rounded-2xl">
                  {React.cloneElement(SECTOR_HISTORIES[selectedHistory].icon as React.ReactElement, { size: 32 })}
                </div>
                <h3 className="text-3xl font-black uppercase tracking-tight">{SECTOR_HISTORIES[selectedHistory].title}</h3>
              </div>
              <p className="text-white/80 font-bold text-xs uppercase tracking-widest">Trajetória Institucional & Marcos de Sucesso</p>
            </div>

            <div className="p-12 space-y-8 overflow-y-auto max-h-[60vh] custom-scrollbar">
              {SECTOR_HISTORIES[selectedHistory].milestones.map((m, i) => (
                <div key={i} className="flex gap-8 group">
                  <div className="flex flex-col items-center">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xs shadow-lg transition-transform group-hover:scale-110 ${SECTOR_HISTORIES[selectedHistory].color} text-white`}>
                      {m.year}
                    </div>
                    {i !== SECTOR_HISTORIES[selectedHistory].milestones.length - 1 && (
                      <div className="w-1 flex-1 bg-zinc-100 my-2 rounded-full"></div>
                    )}
                  </div>
                  <div className="pt-2 flex-1 pb-4">
                    <p className="text-2xl font-bold text-zinc-900 leading-tight mb-2">Pilar Estratégico</p>
                    <p className="text-zinc-500 font-medium leading-relaxed">{m.event}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-8 border-t border-zinc-100 bg-zinc-50 flex justify-center">
              <div className="flex items-center gap-2 text-zinc-400">
                <ShieldCheck size={16} />
                <span className="text-[9px] font-black uppercase tracking-widest">Registo Oficial Amazing Corporation</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LEGAL & SUPPORT MODAL */}
      {selectedLegalDoc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-zinc-950/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-3xl overflow-hidden relative animate-in zoom-in-95 duration-500 flex flex-col max-h-[85vh]">
            <button
              onClick={() => setSelectedLegalDoc(null)}
              className="absolute top-8 right-8 p-3 bg-zinc-100 hover:bg-zinc-200 rounded-full transition-all text-zinc-500 hover:rotate-90 z-10"
            >
              <X size={20} />
            </button>

            <div className="bg-zinc-900 p-10 text-white shrink-0">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-white/10 rounded-2xl">
                  {LEGAL_DOCS[selectedLegalDoc].icon}
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tight">{LEGAL_DOCS[selectedLegalDoc].title}</h3>
              </div>
              <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest pl-16">Documento Oficial • v2026</p>
            </div>

            <div className="p-10 overflow-y-auto custom-scrollbar">
              <div className="prose prose-zinc max-w-none text-zinc-600 font-medium text-sm leading-relaxed whitespace-pre-line">
                {LEGAL_DOCS[selectedLegalDoc].content}
              </div>
            </div>

            <div className="p-6 border-t border-zinc-100 bg-zinc-50 flex justify-between items-center shrink-0">
              <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck size={14} className="text-green-500" /> Validado por Compliance
              </span>
              <button onClick={() => setSelectedLegalDoc(null)} className="px-6 py-2 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-yellow-500 hover:text-zinc-900 transition-all">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REFRESH ANIMATION STYLE */}
      <style>{`
        @keyframes swing {
          0% { transform: rotate(0deg); }
          25% { transform: rotate(10deg); }
          75% { transform: rotate(-10deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes slow-zoom {
          0% { transform: scale(1); }
          100% { transform: scale(1.1); }
        }
        .animate-slow-zoom {
          animation: slow-zoom 20s ease-out forwards;
        }
        .animate-swing {
          animation: swing 2s ease-in-out infinite;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f4f4f5;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d4d4d8;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default CorporateHome;