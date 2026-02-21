
import React, { useState, useRef, useEffect } from 'react';
// Added MapPin to the imports from lucide-react
import { Camera, Save, User, Building2, Upload, Sparkles, X, Edit, ShieldCheck, Globe, CheckCircle2, MapPin, RefreshCw } from 'lucide-react';
import Input from '../components/ui/Input';
import { AmazingStorage, STORAGE_KEYS } from '../utils/storage';
import { supabase } from '../src/lib/supabase';
import { CorporateSettings, EmpresaAfiliada } from '../types';

const GaleriaPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ceo' | 'empresas'>('ceo');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [loading, setLoading] = useState(true);
  const [corpInfo, setCorpInfo] = useState<CorporateSettings>({
    ceo_nome: 'Dr. João Manuel Amazing',
    ceo_mensagem: 'Liderando Angola rumo a uma nova era de logística eficiente e agronegócio sustentável.',
    ceo_foto_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=800',
    fundacao_ano: '2018',
    sede_principal: 'Benguela, Angola'
  });

  const [empresas, setEmpresas] = useState<EmpresaAfiliada[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const companyFileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  const fetchGaleriaData = async () => {
    setLoading(true);
    try {
      // Fetch Corporate Info
      const { data: corpData, error: corpError } = await supabase.from('galeria').select('*');
      if (corpError) throw corpError;

      if (corpData && corpData.length > 0) {
        const info: any = { ...corpInfo };
        corpData.forEach((item: any) => {
          info[item.chave] = item.valor;
        });
        setCorpInfo(info);
      } else {
        // Initialize with defaults if empty
        const initial = [
          { chave: 'ceo_nome', valor: corpInfo.ceo_nome },
          { chave: 'ceo_mensagem', valor: corpInfo.ceo_mensagem },
          { chave: 'ceo_foto_url', valor: corpInfo.ceo_foto_url },
          { chave: 'fundacao_ano', valor: corpInfo.fundacao_ano },
          { chave: 'sede_principal', valor: corpInfo.sede_principal }
        ];
        await supabase.from('galeria').insert(initial);
      }

      // Fetch Empresas
      const { data: empData, error: empError } = await supabase.from('empresas').select('*');
      if (empError) throw empError;
      setEmpresas(empData || []);

    } catch (error) {
      console.error('Error fetching gallery data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGaleriaData();
  }, []);


  // Handler para Foto do CEO
  const handleCeoPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const photoUrl = reader.result as string;
        try {
          const { error } = await supabase.from('galeria').upsert({ chave: 'ceo_foto_url', valor: photoUrl }, { onConflict: 'chave' });
          if (error) throw error;
          setCorpInfo(prev => ({ ...prev, ceo_foto_url: photoUrl }));
          AmazingStorage.logAction('Upload Foto', 'Institucional', 'Foto do CEO actualizada.');
        } catch (err) {
          alert('Erro ao guardar foto do CEO');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Handler para Fotos das Empresas
  const handleCompanyPhotoClick = (id: string) => {
    setSelectedCompanyId(id);
    companyFileInputRef.current?.click();
  };

  const handleCompanyPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedCompanyId) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const photoUrl = reader.result as string;
        try {
          const { error } = await supabase.from('empresas').update({ foto_url: photoUrl }).eq('id', selectedCompanyId);
          if (error) throw error;
          setEmpresas(prev => prev.map(emp => emp.id === selectedCompanyId ? { ...emp, foto_url: photoUrl } : emp));
          AmazingStorage.logAction('Upload Foto', 'Empresas', `Foto da subsidiária actualizada.`);
        } catch (err) {
          alert('Erro ao guardar foto da empresa');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Salvar Perfil do CEO
  const handleSaveCeo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);

    const formData = new FormData(e.currentTarget);
    const updates = [
      { chave: 'ceo_nome', valor: formData.get('ceo_nome') as string },
      { chave: 'ceo_mensagem', valor: formData.get('ceo_mensagem') as string },
      { chave: 'fundacao_ano', valor: (formData.get('fundacao_ano') as string) || corpInfo.fundacao_ano },
      { chave: 'sede_principal', valor: (formData.get('sede_principal') as string) || corpInfo.sede_principal }
    ];

    try {
      for (const update of updates) {
        await supabase.from('galeria').upsert(update, { onConflict: 'chave' });
      }

      setCorpInfo(prev => ({
        ...prev,
        ceo_nome: updates[0].valor,
        ceo_mensagem: updates[1].valor,
        fundacao_ano: updates[2].valor,
        sede_principal: updates[3].valor
      }));

      AmazingStorage.logAction('Actualização CEO', 'Institucional', `Perfil do CEO persistido no sistema cloud.`);

      setIsSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      alert('Erro ao guardar alterações corporativas');
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="w-12 h-12 text-yellow-500 animate-spin" />
        <p className="text-zinc-500 font-bold animate-pulse uppercase tracking-widest text-xs">Sincronizando com a Nuvem...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-sky-200">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="text-yellow-500" size={14} />
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em]">Activos Corporativos</span>
          </div>
          <h1 className="text-4xl font-black text-zinc-900 tracking-tight uppercase">Galeria & Identidade</h1>
          <p className="text-zinc-500 font-medium mt-1">Gestão centralizada da imagem institucional do grupo.</p>
        </div>

        <div className="flex gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-sky-100">
          <button
            onClick={() => setActiveTab('ceo')}
            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === 'ceo' ? 'bg-zinc-900 text-white shadow-lg' : 'text-zinc-400 hover:bg-zinc-50'}`}
          >
            <User size={16} /> Liderança
          </button>
          <button
            onClick={() => setActiveTab('empresas')}
            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === 'empresas' ? 'bg-zinc-900 text-white shadow-lg' : 'text-zinc-400 hover:bg-zinc-50'}`}
          >
            <Building2 size={16} /> Subsidiárias
          </button>
        </div>
      </div>

      {/* Alerta de Sucesso */}
      {showSuccess && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[110] animate-in slide-in-from-top duration-500">
          <div className="bg-green-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 font-black uppercase text-xs tracking-widest border-2 border-green-400">
            <CheckCircle2 size={24} /> Perfil do CEO Actualizado com Sucesso
          </div>
        </div>
      )}

      {activeTab === 'ceo' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Card Visual do CEO */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-8 rounded-[3rem] border border-sky-100 shadow-sm text-center relative overflow-hidden group">
              <div
                className="w-full aspect-square rounded-[2rem] bg-zinc-50 border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center text-zinc-400 relative overflow-hidden mb-6 cursor-pointer hover:border-yellow-500 transition-all"
                onClick={() => fileInputRef.current?.click()}
              >
                <img src={corpInfo.ceo_foto_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="CEO" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <div className="flex flex-col items-center gap-2">
                    <Camera size={40} className="text-white" />
                    <span className="text-white text-[10px] font-black uppercase">Alterar Foto</span>
                  </div>
                </div>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleCeoPhotoChange} />
              <h3 className="text-2xl font-black text-zinc-900">{corpInfo.ceo_nome}</h3>
              <p className="text-[10px] font-black text-yellow-600 uppercase tracking-widest mt-1">Presidência Amazing Corp</p>
            </div>

            <div className="bg-zinc-900 p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
              <Globe size={80} className="absolute -right-4 -bottom-4 opacity-10" />
              <p className="text-xs font-bold text-zinc-400 mb-2 uppercase tracking-widest">Página Pública</p>
              <p className="text-sm font-medium italic leading-relaxed">
                "As alterações aqui realizadas reflectem-se instantaneamente no portal corporativo público para investidores e clientes."
              </p>
            </div>
          </div>

          {/* Formulário de Edição */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSaveCeo} className="bg-white p-10 rounded-[3rem] border border-sky-100 shadow-sm space-y-8 h-full">
              <div className="flex items-center justify-between border-b border-zinc-50 pb-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-zinc-900 uppercase tracking-tight flex items-center gap-2">
                    <ShieldCheck size={20} className="text-yellow-500" /> Perfil Executivo
                  </h3>
                  <p className="text-zinc-500 text-sm font-medium">Controle as informações de liderança da Amazing Corp.</p>
                </div>
              </div>

              <div className="space-y-6">
                <Input
                  name="ceo_nome"
                  label="Nome Completo do CEO"
                  defaultValue={corpInfo.ceo_nome}
                  placeholder="Ex: Dr. João Manuel"
                  required
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    name="fundacao_ano"
                    label="Ano de Fundação"
                    defaultValue={corpInfo.fundacao_ano}
                    placeholder="Ex: 2018"
                  />
                  <Input
                    name="sede_principal"
                    label="Sede Principal"
                    defaultValue={corpInfo.sede_principal}
                    placeholder="Ex: Benguela, Angola"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-zinc-700 uppercase tracking-[0.2em] mb-1">Mensagem do Líder ao Mercado</label>
                  <textarea
                    name="ceo_mensagem"
                    defaultValue={corpInfo.ceo_mensagem}
                    required
                    className="w-full p-6 bg-zinc-50 border border-zinc-200 rounded-[2rem] h-48 outline-none focus:ring-4 focus:ring-yellow-500/10 focus:border-yellow-500 font-medium text-zinc-700 italic transition-all"
                    placeholder="Escreva a visão e compromisso da presidência..."
                  />
                </div>
              </div>

              <div className="pt-6">
                <button
                  type="submit"
                  disabled={isSaving}
                  className={`w-full py-5 text-white font-black rounded-2xl uppercase text-[11px] tracking-[0.3em] flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 ${isSaving ? 'bg-zinc-400 cursor-not-allowed' : 'bg-zinc-900 hover:bg-zinc-800 shadow-zinc-900/10'}`}
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      A Processar...
                    </>
                  ) : (
                    <>
                      <Save size={18} /> ACTUALIZAR PERFIL CORPORATIVO
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Upload invisível para empresas */}
          <input
            type="file"
            ref={companyFileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleCompanyPhotoChange}
          />

          {empresas.map(emp => (
            <div key={emp.id} className="bg-white rounded-[2.5rem] overflow-hidden border border-sky-100 shadow-sm group hover:shadow-2xl transition-all cursor-pointer"
              onClick={() => handleCompanyPhotoClick(emp.id)}>
              <div className="h-56 relative overflow-hidden">
                <img
                  src={emp.foto_url || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800'}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                  alt={emp.nome}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 to-transparent"></div>

                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                  <div className="bg-white p-4 rounded-2xl shadow-2xl text-zinc-900 flex items-center gap-2 font-black text-[10px] uppercase tracking-widest">
                    <Camera size={16} /> Trocar Foto
                  </div>
                </div>

                <div className="absolute bottom-4 left-6">
                  <h4 className="text-white font-black text-xl">{emp.nome}</h4>
                  <span className="text-yellow-500 text-[9px] font-black uppercase tracking-widest">{emp.setor}</span>
                </div>
              </div>
              <div className="p-6 bg-zinc-50/50 flex items-center justify-between border-t border-zinc-50">
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-zinc-400" />
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{emp.localizacao}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-sky-600 uppercase tracking-widest px-2 py-1 bg-sky-50 rounded-lg">{emp.tipo_parceria}</span>
                  <Edit size={14} className="text-zinc-300 group-hover:text-yellow-600 transition-colors" />
                </div>
              </div>
            </div>
          ))}

          {/* Botão de Adicionar Nova Unidade */}
          <div
            className="bg-zinc-50 rounded-[2.5rem] border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center p-12 text-center group cursor-pointer hover:border-yellow-500 hover:bg-white transition-all"
            onClick={() => window.location.hash = '#/empresas'}
          >
            <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center text-zinc-300 group-hover:text-yellow-500 transition-colors mb-4 border border-zinc-100">
              <Upload size={32} />
            </div>
            <h4 className="text-zinc-900 font-black text-sm uppercase tracking-widest">Adicionar Subsidiária</h4>
            <p className="text-zinc-400 font-bold text-xs mt-2 italic">Crie uma nova frente de negócio no módulo de Parceiros.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GaleriaPage;
