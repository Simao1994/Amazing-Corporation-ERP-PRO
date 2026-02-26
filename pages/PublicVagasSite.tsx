import React, { useState, useEffect } from 'react';
import { supabase } from '../src/lib/supabase';
import { RhVaga } from '../types';
import { Briefcase, MapPin, Clock, Search, ExternalLink, ChevronRight, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';

const PublicVagasSite: React.FC = () => {
  const [vagas, setVagas] = useState<RhVaga[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchVagas();
  }, []);

  const fetchVagas = async () => {
    setLoading(true);
    // RLS Público ativado no Supabase (policy só traz status='ativa')
    const { data, error } = await supabase
        .from('rh_vagas')
        .select('*')
        .eq('status', 'ativa')
        .order('data_publicacao', { ascending: false });
        
    if (!error && data) {
      // Filtrar no frontend as vagas cuja data_encerramento já passou
      const vagasValidas = (data as any[]).filter(v => {
        if (!v.data_encerramento) return true;
        const dataFim = new Date(v.data_encerramento);
        dataFim.setHours(23, 59, 59, 999);
        return dataFim.getTime() >= new Date().getTime();
      });
      setVagas(vagasValidas);
    }
    setLoading(false);
  };

  const filteredVagas = vagas.filter(v => 
      v.titulo.toLowerCase().includes(searchTerm.toLowerCase()) || 
      v.localizacao?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-50 font-sans flex flex-col">
      {/* HEADER PÚBLICO */}
      <header className="bg-zinc-900 border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="w-40 brightness-0 invert opacity-90"><Logo /></div>
             <div className="h-6 w-px bg-white/20 hidden md:block"></div>
             <span className="text-zinc-400 font-black tracking-widest uppercase text-xs hidden md:block">Portal de Carreiras</span>
          </div>
          <a href="/" className="text-zinc-400 hover:text-white font-bold text-sm transition-colors flex items-center gap-2">
            Voltar ao Site <ExternalLink size={16} />
          </a>
        </div>
      </header>

      {/* HERO SECTION */}
      <div className="bg-zinc-900 text-white pt-20 pb-32 relative overflow-hidden">
         <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
         <div className="absolute bottom-0 left-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
         
         <div className="max-w-6xl mx-auto px-6 relative z-10 text-center">
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 leading-tight">
               Junte-se à <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">Amazing</span> Team
            </h1>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto font-medium mb-12 leading-relaxed">
               Faça parte de um ecossistema corporativo de excelência. Procure pelas nossas oportunidades abertas e envie a sua candidatura hoje mesmo.
            </p>
            
            {/* SEARCH BAR E CONSULTA */}
            <div className="max-w-2xl mx-auto flex flex-col items-center gap-6">
                <div className="w-full relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-sky-500 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative bg-white rounded-2xl flex items-center p-2 shadow-2xl">
                        <Search className="text-zinc-400 ml-4 flex-shrink-0" size={24} />
                        <input 
                            type="text" 
                            placeholder="Pesquisar por cargo ou localização..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-transparent border-none text-zinc-900 font-bold p-4 focus:ring-0 outline-none placeholder:text-zinc-400 placeholder:font-medium"
                        />
                        <button className="bg-zinc-900 hover:bg-zinc-800 text-white px-8 py-4 rounded-xl font-bold transition-colors whitespace-nowrap">
                            Procurar
                        </button>
                    </div>
                </div>

                <button 
                    onClick={() => navigate('/carreiras/estado')} 
                    className="flex items-center gap-3 text-yellow-400 font-bold hover:text-yellow-300 transition-colors bg-white/5 py-3 px-6 rounded-xl border border-white/10 hover:border-yellow-400/30 backdrop-blur-sm"
                >
                    <Clock size={20} />
                    Já me candidatei: Consultar Estado
                </button>
            </div>
         </div>
      </div>

      {/* LISTAGEM DE VAGAS */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 -mt-16 relative z-20 mb-20">
          <div className="bg-white rounded-3xl p-8 md:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-zinc-100">
             
             <div className="flex justify-between items-center mb-10 border-b border-zinc-100 pb-6">
                <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Oportunidades Disponíveis</h2>
                <span className="bg-sky-100 text-sky-800 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2">
                    <Briefcase size={16} /> {filteredVagas.length} Vagas
                </span>
             </div>

             {loading ? (
                 <div className="py-20 text-center">
                     <div className="w-12 h-12 border-4 border-zinc-200 border-t-yellow-500 rounded-full animate-spin mx-auto mb-4"></div>
                     <p className="text-zinc-500 font-medium">A carregar oportunidades...</p>
                 </div>
             ) : filteredVagas.length === 0 ? (
                 <div className="py-20 text-center flex flex-col items-center">
                     <div className="w-24 h-24 bg-zinc-50 rounded-full flex items-center justify-center mb-6">
                         <Search size={40} className="text-zinc-300" />
                     </div>
                     <h3 className="text-xl font-bold text-zinc-900 mb-2">Nenhuma vaga encontrada</h3>
                     <p className="text-zinc-500">Tente ajustar a sua pesquisa ou volte mais tarde.</p>
                 </div>
             ) : (
                 <div className="grid gap-6">
                     {filteredVagas.map((vaga) => (
                         <div 
                             key={vaga.id} 
                             onClick={() => navigate(`/carreiras/${vaga.id}`)}
                             className="group flex flex-col md:flex-row md:items-center justify-between p-6 md:p-8 rounded-2xl border border-zinc-100 bg-white hover:border-yellow-400 hover:shadow-xl hover:shadow-yellow-500/10 cursor-pointer transition-all duration-300"
                         >
                             <div className="flex-1">
                                 <h3 className="text-xl font-black text-zinc-900 mb-4 group-hover:text-yellow-600 transition-colors">
                                     {vaga.titulo}
                                 </h3>
                                 <div className="flex flex-wrap gap-x-6 gap-y-3">
                                     <span className="flex items-center gap-2 text-sm text-zinc-500 font-medium bg-zinc-50 px-3 py-1.5 rounded-lg border border-zinc-200/50">
                                         <MapPin size={16} className="text-sky-500" /> {vaga.localizacao || 'Luanda, Angola'}
                                     </span>
                                     <span className="flex items-center gap-2 text-sm text-zinc-500 font-medium bg-zinc-50 px-3 py-1.5 rounded-lg border border-zinc-200/50">
                                         <Clock size={16} className="text-green-500" /> {vaga.tipo_contrato || 'Tempo Inteiro'}
                                     </span>
                                     <span className="flex items-center gap-2 text-sm text-zinc-500 font-medium bg-zinc-50 px-3 py-1.5 rounded-lg border border-zinc-200/50">
                                         <Building2 size={16} className="text-purple-500" /> {vaga.nivel_experiencia || 'Júnior / Pleno'}
                                     </span>

                                     {(vaga as any).data_encerramento && (
                                         <span className="flex items-center gap-2 text-sm text-zinc-500 font-medium bg-zinc-50 px-3 py-1.5 rounded-lg border border-zinc-200/50">
                                             <Clock size={16} className="text-red-400" /> Fim a: {new Date((vaga as any).data_encerramento).toLocaleDateString()}
                                         </span>
                                     )}
                                 </div>
                             </div>
                             
                             <div className="mt-6 md:mt-0 flex items-center justify-end">
                                 <div className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center group-hover:bg-yellow-400 group-hover:text-yellow-950 transition-colors">
                                     <ChevronRight size={24} />
                                 </div>
                             </div>
                         </div>
                     ))}
                 </div>
             )}
          </div>
      </main>

      {/* FOOTER */}
      <footer className="bg-zinc-950 text-zinc-400 py-12 text-center mt-auto">
          <div className="max-w-6xl mx-auto px-6">
              <div className="w-32 mx-auto brightness-0 invert opacity-50 mb-6"><Logo /></div>
              <p className="text-sm font-medium">© {new Date().getFullYear()} Amazing Corporation. Todos os direitos reservados.</p>
          </div>
      </footer>
    </div>
  );
};

export default PublicVagasSite;
