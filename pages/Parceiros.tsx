
import React, { useState, useMemo, useEffect } from 'react';
import { Handshake, Plus, Search, Edit, Trash2, Mail, Phone, Tag, Building2, ShieldCheck, X, FileCheck, Star, RefreshCw } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { Fornecedor as Parceiro } from '../types';
import { AmazingStorage, STORAGE_KEYS } from '../utils/storage';
import { supabase } from '../src/lib/supabase';

const ParceirosPage: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState<Parceiro | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchParceiros = async () => {
    try {
      const { data, error } = await supabase
        .from('sys_parceiros')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setParceiros(data || []);
    } catch (err) {
      console.error('Error fetching partners:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchParceiros();
  }, []);

  const filtered = useMemo(() =>
    parceiros.filter(p =>
      p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.nif.includes(searchTerm) ||
      p.categoria.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [searchTerm, parceiros]
  );

  const validate = (data: Partial<Parceiro>) => {
    const newErrors: Record<string, string> = {};
    if (!data.nome?.trim()) newErrors.nome = "Nome do parceiro é obrigatório.";
    if (!data.nif?.trim()) newErrors.nif = "NIF é obrigatório.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const isEditing = !!editingItem;

    const data: Parceiro = {
      id: isEditing ? editingItem!.id : '',
      nome: formData.get('nome') as string,
      nif: formData.get('nif') as string,
      contato: formData.get('contato') as string,
      email: formData.get('email') as string,
      categoria: formData.get('categoria') as string,
      status: (formData.get('status') as any) || 'ativo'
    };

    if (!validate(data)) return;
    saveToCloud(data, isEditing);
  };

  const saveToCloud = async (data: Parceiro, isEditing: boolean) => {
    try {
      const dbData = {
        nome: data.nome,
        nif: data.nif,
        contato: data.contato,
        email: data.email,
        categoria: data.categoria,
        status: data.status
      };

      if (isEditing) {
        const { error } = await supabase
          .from('sys_parceiros')
          .update(dbData)
          .eq('id', data.id);
        if (error) throw error;
        setParceiros(parceiros.map(p => p.id === data.id ? data : p));
        AmazingStorage.logAction('Edição', 'Parceiros', `Parceiro estratégico ${data.nome} atualizado`);
      } else {
        const { data: inserted, error } = await supabase
          .from('sys_parceiros')
          .insert([dbData])
          .select();
        if (error) throw error;
        if (inserted) setParceiros([inserted[0], ...parceiros]);
        AmazingStorage.logAction('Cadastro', 'Parceiros', `Novo parceiro estratégico: ${data.nome}`);
      }
      setShowModal(false);
      setEditingItem(null);
    } catch (err) {
      console.error('Error saving partner:', err);
      alert('Erro ao guardar na nuvem');
    }
  };

  const handleDelete = async (id: string, nome: string) => {
    if (confirm(`Remover permanentemente o parceiro estratégico "${nome}"?`)) {
      try {
        const { error } = await supabase
          .from('sys_parceiros')
          .delete()
          .eq('id', id);
        if (error) throw error;
        setParceiros(parceiros.filter(p => p.id !== id));
        AmazingStorage.logAction('Remoção', 'Parceiros', `Parceiro ${nome} excluído`, 'warning');
      } catch (err) {
        console.error('Error deleting partner:', err);
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
            <Star className="text-yellow-500" size={14} />
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em]">Alianças Estratégicas</span>
          </div>
          <h1 className="text-4xl font-black text-zinc-900 tracking-tight uppercase">Gestão de Parceiros</h1>
          <p className="text-zinc-500 font-medium mt-1">Acordos de cooperação e parcerias institucionais da Amazing Corp.</p>
        </div>
        <button
          onClick={() => { setEditingItem(null); setErrors({}); setShowModal(true); }}
          className="px-8 py-4 bg-zinc-900 text-white rounded-2xl flex items-center gap-3 font-black shadow-xl hover:bg-zinc-800 transition-all active:scale-95 uppercase text-[10px] tracking-widest"
        >
          <Plus size={20} /> Firmar Parceria
        </button>
      </div>

      <div className="bg-white p-2 rounded-[2rem] shadow-sm border border-sky-100 flex items-center">
        <Input
          placeholder="Pesquisar por nome do parceiro ou sector..."
          icon={<Search size={20} className="text-zinc-400" />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent border-none py-4 text-lg font-semibold"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.length > 0 ? filtered.map(p => (
          <div key={p.id} className="bg-white rounded-[2.5rem] p-8 border border-sky-100 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform">
              <Handshake size={120} />
            </div>

            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-colors shadow-inner ${p.status === 'ativo' ? 'bg-yellow-50 text-yellow-600 group-hover:bg-zinc-900 group-hover:text-white' : 'bg-zinc-50 text-zinc-300'}`}>
                <Handshake size={32} />
              </div>
              <div className="flex gap-1 relative z-10">
                <button onClick={() => { setEditingItem(p); setErrors({}); setShowModal(true); }} className="p-3 text-zinc-300 hover:text-yellow-600 transition-colors"><Edit size={16} /></button>
                <button onClick={() => handleDelete(p.id, p.nome)} className="p-3 text-zinc-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
              </div>
            </div>

            <h3 className="text-xl font-black text-zinc-900 mb-1 group-hover:text-yellow-600 transition-colors">{p.nome}</h3>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">BI/NIF: {p.nif}</span>
            </div>

            <div className="space-y-4 pt-6 border-t border-zinc-50 relative z-10">
              <div className="flex items-center gap-3 text-xs font-bold text-zinc-600">
                <Mail size={14} className="text-sky-600" /> {p.email}
              </div>
              <div className="flex items-center gap-3 text-xs font-bold text-zinc-600">
                <Phone size={14} className="text-yellow-600" /> {p.contato}
              </div>
              <div className="pt-2">
                <span className="px-4 py-1.5 bg-zinc-900 text-white text-[9px] font-black uppercase rounded-xl tracking-[0.2em]">{p.categoria}</span>
              </div>
            </div>
          </div>
        )) : (
          <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-sky-100">
            <Handshake size={48} className="mx-auto text-sky-100 mb-4" />
            <p className="text-zinc-400 font-bold italic">Nenhum parceiro estratégico registado.</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
              <h2 className="text-2xl font-black text-zinc-900 flex items-center gap-3">
                <Handshake className="text-yellow-500" />
                {editingItem ? 'Actualizar Parceria' : 'Nova Aliança'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-3 hover:bg-zinc-200 rounded-full transition-all text-zinc-400"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-10 space-y-6">
              <Input name="nome" label="Nome da Entidade / Parceiro" defaultValue={editingItem?.nome} error={errors.nome} required />
              <div className="grid grid-cols-2 gap-6">
                <Input name="nif" label="Identificação (NIF/BI)" defaultValue={editingItem?.nif} error={errors.nif} required />
                <Select name="categoria" label="Tipo de Acordo" defaultValue={editingItem?.categoria || 'Estratégico'} options={[
                  { value: 'Estratégico', label: 'Estratégico' },
                  { value: 'Operacional', label: 'Operacional' },
                  { value: 'Comercial', label: 'Comercial' },
                  { value: 'Governamental', label: 'Governamental' }
                ]} />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <Input name="email" label="Email de Contacto" type="email" defaultValue={editingItem?.email} required />
                <Input name="contato" label="Telemóvel" defaultValue={editingItem?.contato} required />
              </div>
              <div className="pt-4 flex flex-col gap-4">
                <Select name="status" label="Estado da Parceria" defaultValue={editingItem?.status || 'ativo'} options={[
                  { value: 'ativo', label: 'Vigente' },
                  { value: 'inativo', label: 'Suspenso / Encerrado' }
                ]} />
                <button type="submit" className="w-full py-5 bg-zinc-900 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-xl shadow-zinc-900/10 hover:bg-zinc-800 transition-all flex items-center justify-center gap-2">
                  <FileCheck size={18} /> {editingItem ? 'SALVAR ALTERAÇÕES' : 'EFECTIVAR ACORDO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParceirosPage;
