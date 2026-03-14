
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Building2, Plus, Search, Edit, Trash2, MapPin, User, Calendar,
  X, Save, Layers, Sparkles, Globe, ShieldCheck, Camera,
  History, Flag, Clock, ArrowRight, RefreshCw
} from 'lucide-react';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { EmpresaAfiliada, MarcoHistorico } from '../types';
import { supabase } from '../src/lib/supabase';
import { useAuth } from '../src/contexts/AuthContext';
import { formatError, withTimeout } from '../src/lib/utils';

const EmpresasPage: React.FC = () => {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState<EmpresaAfiliada | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [historicoLocal, setHistoricoLocal] = useState<MarcoHistorico[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fileObject, setFileObject] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [empresas, setEmpresas] = useState<EmpresaAfiliada[]>([]);

  const fetchEmpresas = async () => {
    setLoading(true);
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('fetchEmpresas: Timeout de 8s atingido. Forçando interrupção do loading.');
        setLoading(false);
      }
    }, 8000);

    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('tenant_id', user?.tenant_id)
        .order('nome', { ascending: true });

      if (error) throw error;
      setEmpresas(data || []);
    } catch (err) {
      console.error('Erro ao carregar empresas:', err);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmpresas();
  }, []);

  const filtered = useMemo(() =>
    empresas.filter(e =>
      e.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.setor?.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [searchTerm, empresas]
  );

  const handleOpenModal = (item?: EmpresaAfiliada) => {
    if (item) {
      setEditingItem(item);
      setPhotoPreview(item.foto_url || null);
      setHistoricoLocal(item.historico || []);
    } else {
      setEditingItem(null);
      setPhotoPreview(null);
      setHistoricoLocal([]);
    }
    setShowModal(true);
  };

  const handleAddMilestone = () => {
    const data = prompt("Data do evento (AAAA-MM-DD):", new Date().toISOString().split('T')[0]);
    const evento = prompt("Descrição do marco histórico:");
    if (data && evento) {
      setHistoricoLocal([...historicoLocal, { id: Math.random().toString(36).substr(2, 9), data, evento }]);
    }
  };

  const handleRemoveMilestone = (id: string) => {
    setHistoricoLocal(historicoLocal.filter(h => h.id !== id));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("O logótipo é demasiado grande. Máximo 5MB.");
        return;
      }
      setFileObject(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const isEditing = !!editingItem;

    try {
      const operation = async () => {
        let finalPhotoUrl = photoPreview || editingItem?.foto_url;

        // Upload Real se houver novo arquivo
        if (fileObject) {
          const fileExt = fileObject.name.split('.').pop();
          const filePath = `empresas/${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('archive-files')
            .upload(filePath, fileObject);

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from('archive-files')
            .getPublicUrl(filePath);

          finalPhotoUrl = urlData.publicUrl;
        }

        const dataPayload = {
          nome: formData.get('nome') as string,
          nif: formData.get('nif') as string,
          setor: formData.get('setor') as string,
          localizacao: formData.get('localizacao') as string,
          responsavel: formData.get('responsavel') as string,
          website: formData.get('website') as string,
          tipo_parceria: formData.get('tipo_parceria') as any || 'Operacional',
          foto_url: finalPhotoUrl,
          historico: historicoLocal,
          regime_agt: formData.get('regime_agt') as any,
          taxa_iva: Number(formData.get('taxa_iva')) || 0,
          taxa_ii: Number(formData.get('taxa_ii')) || 0,
          retencao_fonte: formData.get('retencao_fonte') === 'Sim',
          tenant_id: user?.tenant_id,
          updated_at: new Date().toISOString()
        };

        if (isEditing) {
          const { error } = await supabase
            .from('empresas')
            .update(dataPayload)
            .eq('id', editingItem.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('empresas')
            .insert([dataPayload]);
          if (error) throw error;
        }

        await fetchEmpresas();
        setShowModal(false);
        setFileObject(null);
      };

      await withTimeout(operation(), 15000, 'A guardar dados da empresa...');
    } catch (err) {
      console.error('Erro ao salvar empresa:', err);
      alert(formatError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, nome: string) => {
    if (confirm(`Remover "${nome}" permanentemente da estrutura do grupo?`)) {
      try {
        const { error } = await supabase
          .from('empresas')
          .delete()
          .eq('id', id);
        if (error) throw error;
        await fetchEmpresas();
      } catch (err) {
        console.error('Erro ao eliminar empresa:', err);
        alert('Não foi possível remover a unidade.');
      }
    }
  };


  // O carregamento agora é não-bloqueante

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-sky-200">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="text-yellow-500" size={14} />
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em]">Corporate Portfolio</span>
          </div>
          <h1 className="text-4xl font-black text-zinc-900 tracking-tight uppercase">Unidades do Grupo</h1>
          <p className="text-zinc-500 font-medium mt-1">Gestão consolidada das subsidiárias e seu histórico de crescimento.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-8 py-4 bg-zinc-900 text-white rounded-2xl flex items-center gap-3 font-black shadow-xl hover:bg-zinc-800 transition-all active:scale-95"
        >
          <Plus size={20} /> REGISTAR UNIDADE
        </button>
      </div>

      <div className="bg-white p-2 rounded-[2rem] shadow-sm border border-sky-100 flex items-center group focus-within:ring-4 focus-within:ring-yellow-500/10 transition-all">
        <Input
          placeholder="Pesquisar por nome ou ramo de transporte/actividade..."
          icon={<Search size={20} className="text-zinc-400 group-focus-within:text-yellow-500 transition-colors" />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent border-none py-4 text-lg font-semibold"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {loading && empresas.length === 0 ? (
          <div className="col-span-full py-20 text-center space-y-4">
            <RefreshCw className="mx-auto w-10 h-10 text-yellow-500 animate-spin" />
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest animate-pulse">A sintonizar unidades...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white/40 rounded-[3rem] border-2 border-dashed border-sky-100">
            <Building2 size={64} className="mx-auto text-sky-100 mb-4" />
            <p className="text-zinc-400 font-bold italic text-lg">{searchTerm ? 'Nenhuma unidade corresponde à pesquisa.' : 'O portfolio do grupo está vazio.'}</p>
          </div>
        ) : filtered.map(emp => (
          <div key={emp.id} className="bg-white rounded-[3rem] border border-sky-100 shadow-sm hover:shadow-2xl transition-all group flex flex-col overflow-hidden">
            <div className="h-48 relative overflow-hidden">
              <img src={emp.foto_url || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800'}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt={emp.nome} />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 via-zinc-900/20 to-transparent"></div>
              <div className="absolute top-6 right-6 flex gap-2">
                <button onClick={() => handleOpenModal(emp)} className="p-3 bg-white/20 backdrop-blur-md text-white hover:bg-yellow-500 rounded-2xl transition-all"><Edit size={16} /></button>
                <button onClick={() => handleDelete(emp.id, emp.nome)} className="p-3 bg-white/20 backdrop-blur-md text-white hover:bg-red-500 rounded-2xl transition-all"><Trash2 size={16} /></button>
              </div>
              <div className="absolute bottom-6 left-8">
                <span className="px-3 py-1 bg-yellow-500 text-zinc-900 text-[9px] font-black uppercase tracking-widest rounded-lg mb-2 inline-block">
                  {emp.setor}
                </span>
                <h4 className="text-3xl font-black text-white">{emp.nome}</h4>
              </div>
            </div>

            <div className="p-10 space-y-8 flex-1">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Localização</p>
                  <div className="flex items-center gap-2 font-bold text-zinc-700">
                    <MapPin size={14} className="text-yellow-500" /> {emp.localizacao}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">NIF Corporativo</p>
                  <div className="flex items-center gap-2 font-bold text-zinc-700">
                    <ShieldCheck size={14} className="text-yellow-500" /> {emp.nif}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4 border-b border-zinc-100 pb-2">
                  <h5 className="text-[10px] font-black text-zinc-900 uppercase tracking-[0.3em] flex items-center gap-2">
                    <History size={14} className="text-yellow-500" /> Marcos Históricos
                  </h5>
                  <span className="text-[10px] font-bold text-zinc-400">{emp.historico?.length || 0} Eventos</span>
                </div>
                <div className="space-y-4 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {emp.historico && emp.historico.length > 0 ? emp.historico.sort((a: any, b: any) => b.data.localeCompare(a.data)).map((h: any) => (
                    <div key={h.id} className="flex gap-4 group/h">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-yellow-500 mt-1"></div>
                        <div className="w-px h-full bg-zinc-100"></div>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-zinc-400">{new Date(h.data).toLocaleDateString()}</p>
                        <p className="text-xs font-medium text-zinc-600 leading-relaxed">{h.evento}</p>
                      </div>
                    </div>
                  )) : (
                    <p className="text-xs text-zinc-400 italic">Sem registos históricos ainda.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="px-10 py-6 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-200 overflow-hidden border-2 border-white shadow-sm">
                  <img src={`https://ui-avatars.com/api/?name=${emp.responsavel}&background=random`} />
                </div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{emp.responsavel}</p>
              </div>
              {emp.website && (
                <a href={`https://${emp.website}`} target="_blank" className="flex items-center gap-1 text-[10px] font-black text-sky-600 uppercase hover:underline">
                  <Globe size={12} /> Site Oficial
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col md:flex-row">

            {/* Sidebar de Marcos no Modal */}
            <div className="md:w-1/3 bg-zinc-900 p-10 text-white flex flex-col">
              <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                <History className="text-yellow-500" /> Histórico
              </h3>
              <div className="flex-1 space-y-6 overflow-y-auto mb-6 pr-2 custom-scrollbar">
                {historicoLocal.map(h => (
                  <div key={h.id} className="relative pl-6 border-l border-white/10 py-1 group/h">
                    <div className="absolute -left-[5px] top-2 w-2 h-2 rounded-full bg-yellow-500"></div>
                    <button
                      onClick={() => handleRemoveMilestone(h.id)}
                      className="absolute right-0 top-0 opacity-0 group-hover/h:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
                    >
                      <X size={14} />
                    </button>
                    <p className="text-[10px] font-black text-zinc-500 uppercase">{h.data}</p>
                    <p className="text-xs text-zinc-300 font-medium leading-relaxed">{h.evento}</p>
                  </div>
                ))}
                {historicoLocal.length === 0 && (
                  <p className="text-zinc-500 text-xs italic">Nenhum marco adicionado para esta unidade.</p>
                )}
              </div>
              <button
                type="button"
                onClick={handleAddMilestone}
                className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-yellow-500 hover:text-zinc-900 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={16} /> Adicionar Marco
              </button>
            </div>

            {/* Formulário Principal */}
            <div className="md:w-2/3 bg-white">
              <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                <h2 className="text-2xl font-black text-zinc-900 flex items-center gap-3">
                  <Building2 className="text-yellow-500" />
                  {editingItem ? 'Actualizar Unidade' : 'Registar Nova Subsidiária'}
                </h2>
                <button onClick={() => setShowModal(false)} className="p-3 hover:bg-zinc-200 rounded-full transition-all"><X size={24} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-10 space-y-6 overflow-y-auto max-h-[70vh]">
                <div className="flex justify-center mb-6">
                  <div className="w-full h-40 rounded-3xl bg-zinc-50 border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center text-zinc-400 overflow-hidden cursor-pointer hover:border-yellow-500 transition-all relative group"
                    onClick={() => fileInputRef.current?.click()}>
                    {photoPreview ? <img src={photoPreview} className="w-full h-full object-cover" /> : (
                      <div className="flex flex-col items-center">
                        <Camera size={40} />
                        <span className="text-[10px] font-black uppercase mt-2">Capa da Empresa</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <span className="text-white text-[10px] font-black uppercase">Alterar Foto</span>
                    </div>
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>

                <Input name="nome" label="Designação Social" defaultValue={editingItem?.nome} required placeholder="Amazing Express S.A." />

                <div className="grid grid-cols-2 gap-6">
                  <Input name="nif" label="NIF Corporativo" defaultValue={editingItem?.nif} required placeholder="5000..." />
                  <Select name="setor" label="Sector de Actuação Principal" defaultValue={editingItem?.setor} options={[
                    { value: 'Transportes (Motorizadas e Automóvel)', label: 'Transportes (Motorizadas e Automóvel)' },
                    { value: 'Agronegócio Sustentável', label: 'Agronegócio Sustentável' },
                    { value: 'Finanças & Activos', label: 'Finanças & Activos' },
                    { value: 'Mobiliária & Design', label: 'Mobiliária & Design' },
                    { value: 'Imobiliário & Gestão', label: 'Imobiliário & Gestão' }
                  ]} />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <Input name="localizacao" label="Província Sede" defaultValue={editingItem?.localizacao} required />
                  <Select name="tipo_parceria" label="Natureza" defaultValue={editingItem?.tipo_parceria} options={[
                    { value: 'Subsidiária', label: 'Subsidiária / Propriedade' },
                    { value: 'Estratégico', label: 'Parceria Estratégica' },
                    { value: 'Operacional', label: 'Unidade Operacional' }
                  ]} />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <Input name="responsavel" label="Responsável de Unidade" defaultValue={editingItem?.responsavel} required />
                  <Input name="website" label="Portal Digital" defaultValue={editingItem?.website} placeholder="www.amazing.ao" />
                </div>

                <div className="pt-6 border-t border-zinc-100 mt-6">
                  <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <ShieldCheck size={16} className="text-yellow-500" /> Configuração Fiscal (AGT Angola)
                  </h3>
                  <div className="grid grid-cols-2 gap-6">
                    <Select name="regime_agt" label="Regime de IVA" defaultValue={editingItem?.regime_agt || 'Simplificado'} options={[
                      { value: 'Geral', label: 'Regime Geral' },
                      { value: 'Simplificado', label: 'Regime Simplificado (7%)' },
                      { value: 'Exclusão', label: 'Regime de Exclusão' },
                      { value: 'Isento', label: 'Isento' }
                    ]} />
                    <Input name="taxa_iva" label="Taxa Personalizada IVA (%)" type="number" defaultValue={editingItem?.taxa_iva || 14} />
                  </div>
                  <div className="grid grid-cols-2 gap-6 mt-4">
                    <Input name="taxa_ii" label="Taxa Imposto Industrial (%)" type="number" defaultValue={editingItem?.taxa_ii || 25} />
                    <Select name="retencao_fonte" label="Sujeito a Retenção na Fonte?" defaultValue={editingItem?.retencao_fonte ? 'Sim' : 'Não'} options={[
                      { value: 'Sim', label: 'Sim' },
                      { value: 'Não', label: 'Não' }
                    ]} />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-5 bg-zinc-900 text-white font-black rounded-2xl uppercase text-[11px] tracking-widest flex items-center justify-center gap-3 shadow-xl hover:bg-zinc-800 transition-all disabled:opacity-70"
                  >
                    {saving ? <RefreshCw size={20} className="animate-spin" /> : <Save size={20} />}
                    {saving ? 'GUARDANDO...' : (editingItem ? 'GUARDAR ACTUALIZAÇÃO' : 'EFECTIVAR REGISTO')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default EmpresasPage;
