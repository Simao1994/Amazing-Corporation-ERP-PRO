
import React, { useState, useMemo, useEffect } from 'react';
import { Handshake, Plus, Search, Edit, Trash2, Mail, Phone, Tag, Building2, ShieldCheck, X, FileCheck, AlertCircle, RefreshCw, Star, MapPin, Landmark } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { Fornecedor } from '../types';
import { AmazingStorage, STORAGE_KEYS } from '../utils/storage';
import { supabase } from '../src/lib/supabase';
import { useAuth } from '../src/contexts/AuthContext';

const FornecedoresPage: React.FC = () => {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState<Fornecedor | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFornecedores = async () => {
    try {
      const { data, error } = await supabase
        .from('sys_fornecedores')
        .select('*')
        .eq('tenant_id', user?.tenant_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFornecedores(data || []);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFornecedores();
  }, []);

  const filtered = useMemo(() =>
    fornecedores.filter(f =>
      f.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.nif.includes(searchTerm) ||
      f.categoria.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [searchTerm, fornecedores]
  );

  const validate = (data: Partial<Fornecedor>) => {
    const newErrors: Record<string, string> = {};
    if (!data.nome?.trim()) newErrors.nome = "Razão social é obrigatória.";
    if (!data.nif?.trim() || data.nif.length < 9) newErrors.nif = "NIF inválido.";
    if (!data.email?.includes('@')) newErrors.email = "Email corporativo inválido.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const isEditing = !!editingItem;

    const data: Fornecedor = {
      id: isEditing ? editingItem!.id : '',
      nome: formData.get('nome') as string,
      nif: formData.get('nif') as string,
      contato: formData.get('contato') as string,
      email: formData.get('email') as string,
      categoria: formData.get('categoria') as string,
      status: (formData.get('status') as any) || 'ativo',
      iban: formData.get('iban') as string,
      banco: formData.get('banco') as string,
      telefone: formData.get('telefone') as string,
      morada: formData.get('morada') as string,
      avaliacao: Number(formData.get('avaliacao')) || 0
    };

    if (!validate(data)) return;
    saveToCloud(data, isEditing);
  };

  const saveToCloud = async (data: Fornecedor, isEditing: boolean) => {
    try {
      const dbData = {
        nome: data.nome,
        nif: data.nif,
        contato: data.contato,
        email: data.email,
        categoria: data.categoria,
        status: data.status,
        iban: data.iban,
        banco: data.banco,
        telefone: data.telefone,
        morada: data.morada,
        avaliacao: data.avaliacao,
        tenant_id: user?.tenant_id
      };

      if (isEditing) {
        const { error } = await supabase
          .from('sys_fornecedores')
          .update(dbData)
          .eq('id', data.id);
        if (error) throw error;
        setFornecedores(fornecedores.map(f => f.id === data.id ? data : f));
        AmazingStorage.logAction('Edição', 'Fornecedores', `Fornecedor ${data.nome} atualizado`);
      } else {
        const { data: inserted, error } = await supabase
          .from('sys_fornecedores')
          .insert([dbData])
          .select();
        if (error) throw error;
        if (inserted) setFornecedores([inserted[0], ...fornecedores]);
        AmazingStorage.logAction('Cadastro', 'Fornecedores', `Novo fornecedor registrado: ${data.nome}`);
      }
      setShowModal(false);
      setEditingItem(null);
    } catch (err) {
      console.error('Error saving supplier:', err);
      alert('Erro ao guardar na nuvem');
    }
  };

  const handleDelete = async (id: string, nome: string) => {
    if (confirm(`Remover permanentemente o fornecedor "${nome}" do sistema?`)) {
      try {
        const { error } = await supabase
          .from('sys_fornecedores')
          .delete()
          .eq('id', id)
          .eq('tenant_id', user?.tenant_id);
        if (error) throw error;
        setFornecedores(fornecedores.filter(f => f.id !== id));
        AmazingStorage.logAction('Remoção', 'Fornecedores', `Fornecedor ${nome} excluído`, 'warning');
      } catch (err) {
        console.error('Error deleting supplier:', err);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="w-12 h-12 text-yellow-600 animate-spin" />
        <p className="text-zinc-500 font-bold animate-pulse uppercase tracking-widest text-xs">Sincronizando com a Nuvem...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-sky-200">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-[10px] font-black uppercase tracking-widest rounded-full">Estratégico & Contratos</span>
          </div>
          <h1 className="text-4xl font-black text-zinc-900 tracking-tight uppercase">Base de Parceiros</h1>
          <p className="text-zinc-500 font-medium mt-1">Gestão de {fornecedores.length} parceiros e fornecedores operacionais.</p>
        </div>
        <button
          onClick={() => { setEditingItem(null); setErrors({}); setShowModal(true); }}
          className="px-8 py-4 bg-zinc-900 text-white rounded-2xl flex items-center gap-3 font-black shadow-xl hover:bg-zinc-800 transition-all active:scale-95 uppercase text-[10px] tracking-widest"
        >
          <Plus size={20} /> Cadastrar Parceiro
        </button>
      </div>

      <div className="bg-white p-2 rounded-[2rem] shadow-sm border border-sky-100 flex items-center">
        <Input
          placeholder="Pesquisar por razão social, NIF ou ramo de actividade..."
          icon={<Search size={20} className="text-zinc-400" />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent border-none py-4 text-lg font-semibold"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.length > 0 ? filtered.map(f => (
          <div key={f.id} className="bg-white rounded-[2.5rem] p-8 border border-sky-100 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform">
              <Handshake size={120} />
            </div>

            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-colors shadow-inner ${f.status === 'ativo' ? 'bg-zinc-100 text-zinc-900 group-hover:bg-yellow-500 group-hover:text-white' : 'bg-red-50 text-red-400'}`}>
                <Handshake size={32} />
              </div>
              <div className="flex gap-1 relative z-10">
                <button onClick={() => { setEditingItem(f); setErrors({}); setShowModal(true); }} className="p-3 text-zinc-300 hover:text-yellow-600 transition-colors"><Edit size={16} /></button>
                <button onClick={() => handleDelete(f.id, f.nome)} className="p-3 text-zinc-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
              </div>
            </div>

            <h3 className="text-xl font-black text-zinc-900 mb-1 group-hover:text-yellow-600 transition-colors">{f.nome}</h3>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">NIF: {f.nif}</span>
              <span className={`w-2 h-2 rounded - full ${f.status === 'ativo' ? 'bg-green-500' : 'bg-red-500'} `}></span>
              <div className="flex ml-auto">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} size={10} className={`${(f.avaliacao || 0) >= star ? 'text-yellow-500 fill-yellow-500' : 'text-zinc-200'} `} />
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-zinc-50 relative z-10">
              <div className="flex items-center gap-3 text-xs font-bold text-zinc-600">
                <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600"><Mail size={14} /></div>
                {f.email}
              </div>
              <div className="flex items-center gap-3 text-xs font-bold text-zinc-600">
                <div className="w-8 h-8 rounded-lg bg-yellow-50 flex items-center justify-center text-yellow-600"><Phone size={14} /></div>
                {f.contato}
              </div>
              <div className="pt-2">
                <span className="px-4 py-1.5 bg-zinc-900 text-white text-[9px] font-black uppercase rounded-xl tracking-[0.2em]">{f.categoria}</span>
              </div>
            </div>
          </div>
        )) : (
          <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-sky-100">
            <Handshake size={48} className="mx-auto text-sky-100 mb-4" />
            <p className="text-zinc-400 font-bold italic">Nenhum parceiro encontrado na base de dados.</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
              <h2 className="text-2xl font-black text-zinc-900 flex items-center gap-3">
                {editingItem ? <Edit className="text-yellow-500" /> : <Plus className="text-yellow-500" />}
                {editingItem ? 'Actualizar Parceiro' : 'Novo Parceiro'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-3 hover:bg-zinc-200 rounded-full transition-all text-zinc-400"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-10 space-y-6">
              <Input name="nome" label="Razão Social / Nome Fantasia" defaultValue={editingItem?.nome} error={errors.nome} required />
              <div className="grid grid-cols-2 gap-6">
                <Input name="nif" label="NIF" defaultValue={editingItem?.nif} error={errors.nif} required placeholder="000000000" />
                <Select name="categoria" label="Ramo de Actividade" defaultValue={editingItem?.categoria || 'Serviços'} options={[
                  { value: 'Logística', label: 'Logística' },
                  { value: 'Combustíveis', label: 'Combustíveis' },
                  { value: 'Tecnologia', label: 'Tecnologia' },
                  { value: 'Peças', label: 'Peças & Oficina' },
                  { value: 'Serviços', label: 'Serviços Gerais' }
                ]} />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <Input name="email" label="Email Corporativo" type="email" defaultValue={editingItem?.email} error={errors.email} required placeholder="comercial@empresa.com" />
                <Input name="contato" label="Telemóvel de Contacto" defaultValue={editingItem?.contato} required placeholder="+244 ..." />
              </div>
              <div className="pt-4 flex flex-col gap-4">
                <div className="p-6 bg-zinc-50 rounded-3xl border border-zinc-100 space-y-4">
                  <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <Landmark size={14} className="text-yellow-600" /> Detalhes Financeiros & Localização
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Input name="banco" label="Banco" defaultValue={editingItem?.banco} placeholder="Ex: BFA, BAI" />
                    <Input name="iban" label="IBAN" defaultValue={editingItem?.iban} placeholder="AO06..." />
                  </div>
                  <Input name="morada" label="Endereço Físico / Sede" defaultValue={editingItem?.morada} placeholder="Ex: Morro Bento, Estrada 21" />
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-zinc-400 uppercase tracking-widest">Avaliação de Performance</label>
                    <div className="flex gap-1">
                      <select name="avaliacao" defaultValue={editingItem?.avaliacao || 5} className="bg-transparent border-none font-black text-yellow-600 outline-none">
                        {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v} Estrelas</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <Select name="status" label="Status do Contrato" defaultValue={editingItem?.status || 'ativo'} options={[
                  { value: 'ativo', label: 'Activo / Homologado' },
                  { value: 'inativo', label: 'Inactivo / Suspenso' }
                ]} />
                <button type="submit" className="w-full py-5 bg-zinc-900 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-xl shadow-zinc-900/10 hover:bg-zinc-800 transition-all flex items-center justify-center gap-2">
                  <FileCheck size={18} /> {editingItem ? 'SALVAR ALTERAÇÕES' : 'CONFIRMAR PARCERIA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FornecedoresPage;
