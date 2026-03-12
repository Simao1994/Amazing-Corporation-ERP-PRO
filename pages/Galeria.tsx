
import React, { useState, useRef, useEffect } from 'react';
// Added MapPin to the imports from lucide-react
import { Camera, Save, User, Building2, Upload, Sparkles, X, Edit, ShieldCheck, Globe, CheckCircle2, MapPin, RefreshCw, Play } from 'lucide-react';
import Input from '../components/ui/Input';
import { AmazingStorage, STORAGE_KEYS } from '../utils/storage';
import { supabase, safeQuery } from '../src/lib/supabase';
import { CorporateSettings, EmpresaAfiliada } from '../types';
import { formatError } from '../src/lib/utils';

const GaleriaPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ceo' | 'empresas' | 'multimedia'>('ceo');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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
  const [galeriaItems, setGaleriaItems] = useState<any[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const companyFileInputRef = useRef<HTMLInputElement>(null);
  const multimediaFileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  const fetchGaleriaData = async () => {
    setLoading(true);
    try {
      // Fetch Corporate Info from config_sistema (key-value store)
      const { data: corpData, error: corpError } = await safeQuery(() =>
        supabase.from('config_sistema').select('*')
      );

      if (!corpError && corpData && corpData.length > 0) {
        const info: any = {};
        const relevantKeys = ['ceo_nome', 'ceo_mensagem', 'ceo_foto_url', 'fundacao_ano', 'sede_principal'];
        corpData.forEach((item: any) => {
          if (relevantKeys.includes(item.chave)) {
            info[item.chave] = item.valor;
          }
        });
        // Only update if we received at least one relevant key
        if (Object.keys(info).length > 0) {
          setCorpInfo(prev => ({ ...prev, ...info }));
        }
      } else if (corpError) {
        console.error('[Galeria] Erro ao carregar config_sistema:', corpError);
      }

      // Fetch Empresas
      const { data: empData } = await safeQuery(() =>
        supabase.from('empresas').select('*').order('nome')
      );
      setEmpresas(empData || []);

      // Fetch Galeria Multimédia
      const { data: galData } = await safeQuery(() =>
        supabase.from('galeria').select('*').order('created_at', { ascending: false })
      );
      setGaleriaItems(galData || []);

    } catch (error) {
      console.error('Error fetching gallery data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGaleriaData();
  }, []);

  // Helper for uploading files to Supabase Storage
  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('blog-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('blog-media')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (err) {
      console.error('Upload error:', err);
      return null;
    }
  };

  // Multimedia Handlers
  const handleAddMultimedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const isVideo = file.type.startsWith('video/');
      const folder = isVideo ? 'videos' : 'galeria';
      const publicUrl = await uploadFile(file, folder);

      if (!publicUrl) throw new Error('Falha no upload');

      const { data, error } = await supabase
        .from('galeria')
        .insert([{
          titulo: file.name,
          url: publicUrl,
          tipo: isVideo ? 'video' : 'imagem',
          categoria: 'Geral'
        }])
        .select();

      if (error) throw error;
      setGaleriaItems([data[0], ...galeriaItems]);
      AmazingStorage.logAction('Add Media', 'Galeria', `Novo item adicionado: ${file.name}`);
    } catch (err) {
      alert('Erro ao carregar ficheiro');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteMedia = async (id: string) => {
    if (!confirm('Tem a certeza que deseja eliminar este item da galeria?')) return;

    try {
      const { error } = await supabase.from('galeria').delete().eq('id', id);
      if (error) throw error;
      setGaleriaItems(prev => prev.filter(item => item.id !== id));
      AmazingStorage.logAction('Delete Media', 'Galeria', `Item removido da galeria.`);
    } catch (err) {
      alert(formatError(err));
    }
  };

  // Handler para Foto do CEO
  const handleCeoPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        const publicUrl = await uploadFile(file, 'ceo');
        if (!publicUrl) throw new Error('Falha no upload');

        const { error } = await supabase
          .from('config_sistema')
          .upsert({ chave: 'ceo_foto_url', valor: publicUrl }, { onConflict: 'chave' });

        if (error) throw error;

        setCorpInfo(prev => ({ ...prev, ceo_foto_url: publicUrl }));
        AmazingStorage.logAction('Upload Foto', 'Institucional', 'Foto do CEO actualizada via Storage.');
      } catch (err) {
        alert('Erro ao guardar foto do CEO. Verifique a ligação.');
      } finally {
        setIsUploading(false);
      }
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
      setIsUploading(true);
      try {
        const publicUrl = await uploadFile(file, 'empresas');
        if (!publicUrl) throw new Error('Falha no upload');

        const { error } = await supabase
          .from('empresas')
          .update({ foto_url: publicUrl })
          .eq('id', selectedCompanyId);

        if (error) throw error;

        setEmpresas(prev => prev.map(emp => emp.id === selectedCompanyId ? { ...emp, foto_url: publicUrl } : emp));
        AmazingStorage.logAction('Upload Foto', 'Empresas', `Foto da subsidiária actualizada via Storage.`);
      } catch (err) {
        alert('Erro ao guardar foto da empresa');
      } finally {
        setIsUploading(false);
      }
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
      const { error } = await safeQuery(() =>
        supabase.from('config_sistema').upsert(updates, { onConflict: 'chave' })
      );
      if (error) throw error;

      setCorpInfo(prev => ({
        ...prev,
        ceo_nome: updates[0].valor,
        ceo_mensagem: updates[1].valor,
        fundacao_ano: updates[2].valor,
        sede_principal: updates[3].valor
      }));

      AmazingStorage.logAction('Actualização CEO', 'Institucional', `Perfil do CEO persistido no config_sistema.`);

      setIsSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      alert(formatError(err));
      setIsSaving(false);
    }
  };

  // O carregamento agora é não-bloqueante

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

        <div className="flex gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-sky-100 overflow-x-auto no-scrollbar max-w-full">
          <button
            onClick={() => setActiveTab('ceo')}
            className={`whitespace-nowrap px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === 'ceo' ? 'bg-zinc-900 text-white shadow-lg' : 'text-zinc-400 hover:bg-zinc-50'}`}
          >
            <User size={16} /> Liderança
          </button>
          <button
            onClick={() => setActiveTab('empresas')}
            className={`whitespace-nowrap px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === 'empresas' ? 'bg-zinc-900 text-white shadow-lg' : 'text-zinc-400 hover:bg-zinc-50'}`}
          >
            <Building2 size={16} /> Subsidiárias
          </button>
          <button
            onClick={() => setActiveTab('multimedia')}
            className={`whitespace-nowrap px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === 'multimedia' ? 'bg-zinc-900 text-white shadow-lg' : 'text-zinc-400 hover:bg-zinc-50'}`}
          >
            <Camera size={16} /> Multimédia
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

      {activeTab === 'ceo' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-8 rounded-[3rem] border border-sky-100 shadow-sm text-center relative overflow-hidden group">
              <div
                className="w-full aspect-square rounded-[2rem] bg-zinc-50 border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center text-zinc-400 relative overflow-hidden mb-6 cursor-pointer hover:border-yellow-500 transition-all"
                onClick={() => fileInputRef.current?.click()}
              >
                <img src={corpInfo.ceo_foto_url} className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ${isUploading ? 'opacity-50 blur-sm' : ''}`} alt="CEO" />
                <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${isUploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                  <div className="flex flex-col items-center gap-2">
                    {isUploading ? (
                      <RefreshCw className="w-10 h-10 text-white animate-spin" />
                    ) : (
                      <Camera size={40} className="text-white" />
                    )}
                    <span className="text-white text-[10px] font-black uppercase">{isUploading ? 'A carregar...' : 'Alterar Foto'}</span>
                  </div>
                </div>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleCeoPhotoChange} />
              <h3 className="text-2xl font-black text-zinc-900">{corpInfo.ceo_nome}</h3>
              <p className="text-[10px] font-black text-yellow-600 uppercase tracking-widest mt-1">Presidência Amazing Corp</p>
            </div>
          </div>

          <div className="lg:col-span-2">
            <form key={corpInfo.ceo_nome + corpInfo.fundacao_ano} onSubmit={handleSaveCeo} className="bg-white p-10 rounded-[3rem] border border-sky-100 shadow-sm space-y-8 h-full">
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
                  <Input name="fundacao_ano" label="Ano de Fundação" defaultValue={corpInfo.fundacao_ano} />
                  <Input name="sede_principal" label="Sede Principal" defaultValue={corpInfo.sede_principal} />
                </div>
                <div className="space-y-2">
                  <label className="block text-[11px] font-black text-zinc-700 uppercase tracking-[0.2em] mb-1">Mensagem do Líder ao Mercado</label>
                  <textarea
                    name="ceo_mensagem"
                    defaultValue={corpInfo.ceo_mensagem}
                    required
                    className="w-full p-6 bg-zinc-50 border border-zinc-200 rounded-[2rem] h-48 outline-none focus:ring-4 focus:ring-yellow-500/10 focus:border-yellow-500 font-medium text-zinc-700 italic transition-all"
                  />
                </div>
              </div>

              <div className="pt-6">
                <button type="submit" disabled={isSaving} className="w-full py-5 bg-zinc-900 text-white font-black rounded-2xl uppercase text-[11px] tracking-[0.3em] flex items-center justify-center gap-3">
                  {isSaving ? <RefreshCw className="animate-spin" /> : <Save size={18} />} ACTUALIZAR PERFIL CORPORATIVO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'empresas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <input type="file" ref={companyFileInputRef} className="hidden" accept="image/*" onChange={handleCompanyPhotoChange} />
          {loading && empresas.length === 0 ? (
            <div className="col-span-full py-20 text-center space-y-4">
              <RefreshCw className="mx-auto w-10 h-10 text-yellow-500 animate-spin" />
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest animate-pulse">A carregar o portfólio...</p>
            </div>
          ) : empresas.map(emp => (
            <div key={emp.id} className="bg-white rounded-[2.5rem] overflow-hidden border border-sky-100 shadow-sm group hover:shadow-2xl transition-all cursor-pointer" onClick={() => handleCompanyPhotoClick(emp.id)}>
              <div className="h-56 relative overflow-hidden">
                <img src={emp.foto_url || ''} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 to-transparent"></div>
                <div className="absolute bottom-4 left-6">
                  <h4 className="text-white font-black text-xl">{emp.nome}</h4>
                  <span className="text-yellow-500 text-[9px] font-black uppercase tracking-widest">{emp.setor}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'multimedia' && (
        <div className="space-y-8">
          <div className="bg-zinc-900 p-8 md:p-12 rounded-[3.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
            <Sparkles className="absolute top-4 right-4 text-yellow-500 opacity-20" size={100} />
            <div className="space-y-4 relative z-10">
              <h2 className="text-4xl font-black tracking-tight">Galeria Multimédia Pública</h2>
              <p className="text-zinc-400 font-medium max-w-xl">Publique momentos, vídeos de expansão e fotos de alta resolução para o público angolano. (Recomendado: 10 a 20 itens).</p>
            </div>

            <button
              onClick={() => multimediaFileInputRef.current?.click()}
              disabled={isUploading}
              className="px-8 py-5 bg-yellow-500 text-zinc-900 font-black rounded-2xl uppercase text-xs tracking-widest hover:bg-yellow-400 transition-all flex items-center gap-3 whitespace-nowrap shadow-xl"
            >
              {isUploading ? <RefreshCw className="animate-spin" /> : <Upload size={20} />}
              Adicionar Media
            </button>
            <input
              type="file"
              ref={multimediaFileInputRef}
              className="hidden"
              accept="image/*,video/*"
              onChange={handleAddMultimedia}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {loading && galeriaItems.length === 0 ? (
              <div className="col-span-full py-20 text-center space-y-4">
                <RefreshCw className="mx-auto w-10 h-10 text-yellow-500 animate-spin" />
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest animate-pulse">A expandir a galeria comercial...</p>
              </div>
            ) : galeriaItems.map(item => (
              <div key={item.id} className="bg-white rounded-3xl overflow-hidden border border-zinc-100 group shadow-sm hover:shadow-xl transition-all relative">
                <div className="aspect-video relative overflow-hidden bg-zinc-100">
                  {item.tipo === 'video' ? (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                      <Play className="text-white opacity-50" size={40} />
                    </div>
                  ) : (
                    <img src={item.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={item.titulo} />
                  )}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDeleteMedia(item.id)}
                      className="p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 shadow-lg"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="absolute bottom-2 left-2 px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[8px] font-black text-white uppercase tracking-widest">
                    {item.tipo}
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-xs font-bold text-zinc-900 truncate">{item.titulo}</p>
                </div>
              </div>
            ))}

            {galeriaItems.length === 0 && (
              <div className="col-span-full py-20 text-center space-y-4 bg-zinc-50 rounded-[3rem] border-2 border-dashed border-zinc-200">
                <Camera size={48} className="mx-auto text-zinc-300" />
                <p className="text-zinc-400 font-bold uppercase tracking-widest text-[10px]">A galeria está vazia. Comece a publicar.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GaleriaPage;
