
import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Plus,
  Search,
  X,
  Trash2,
  Edit,
  Save,
  ChevronRight,
  ShieldCheck,
  Star,
  Sparkles,
  Info,
  RefreshCw
} from 'lucide-react';
import { Departamento, User } from '../types';
import { supabase } from '../src/lib/supabase';

interface DepartmentsPageProps {
  user: User;
}

const DepartmentsPage: React.FC<DepartmentsPageProps> = ({ user }) => {
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState<Departamento | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);

  const fetchDepartamentos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('departamentos')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;
      setDepartamentos(data || []);
    } catch (err) {
      console.error('Erro ao carregar departamentos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartamentos();
  }, []);

  const filteredItems = useMemo(() => {
    return departamentos.filter(d =>
      d.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, departamentos]);

  const handleOpenModal = (item?: Departamento) => {
    setEditingItem(item || null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const isEditing = !!editingItem;

    const nome = formData.get('nome') as string;
    const descricao = formData.get('descricao') as string;

    if (!nome) {
      setSaving(false);
      return;
    }

    try {
      if (isEditing) {
        const { error } = await supabase
          .from('departamentos')
          .update({ nome, descricao, updated_at: new Date().toISOString() })
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('departamentos')
          .insert([{ nome, descricao }]);
        if (error) throw error;
      }

      await fetchDepartamentos();
      setShowModal(false);
      setEditingItem(null);
    } catch (err) {
      console.error('Erro ao guardar departamento:', err);
      alert('Ocorreu um erro ao guardar os dados.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, nome: string) => {
    if (confirm(`ATENÇÃO: Deseja remover o departamento "${nome}"?`)) {
      try {
        const { error } = await supabase
          .from('departamentos')
          .delete()
          .eq('id', id);
        if (error) throw error;
        await fetchDepartamentos();
      } catch (err) {
        console.error('Erro ao apagar departamento:', err);
        alert('Não foi possível excluir o departamento.');
      }
    }
  };


  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-purple-200/50">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-600 rounded-lg shadow-lg shadow-purple-500/20">
              <Sparkles size={14} className="text-white" />
            </div>
            <span className="text-[10px] font-black text-purple-600 uppercase tracking-[0.4em]">Corporate Excellence</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-black text-zinc-900 tracking-tight leading-none">
            Olá, <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-800 animate-gradient-x">{user?.nome.split(' ')[0]}</span>
          </h1>
          <p className="text-zinc-500 font-medium text-lg italic">
            "Organização é a base de todo crescimento extraordinário."
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="group relative px-10 py-5 bg-[#18181b] text-white font-black rounded-2xl shadow-2xl shadow-purple-900/20 hover:shadow-purple-500/30 transition-all hover:scale-[1.03] active:scale-95 flex items-center gap-4 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative flex items-center gap-3">
            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-500" />
            <span className="uppercase tracking-widest text-xs font-black">Adicionar Departamento</span>
          </div>
        </button>
      </div>

      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-indigo-500 blur-2xl opacity-5 group-focus-within:opacity-10 transition-opacity"></div>
        <div className="relative bg-white/60 backdrop-blur-xl p-3 rounded-[1.5rem] border border-white flex items-center shadow-xl shadow-purple-500/5">
          <div className="p-3 text-purple-600">
            <Search size={24} />
          </div>
          <input
            type="text"
            placeholder="Pesquisar por competência ou unidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent border-none focus:ring-0 text-zinc-800 text-lg font-semibold placeholder:text-zinc-300 placeholder:font-normal"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          <div className="col-span-full py-20 flex flex-col items-center">
            <RefreshCw size={40} className="text-purple-600 animate-spin mb-4" />
            <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs">Carregando estrutura...</p>
          </div>
        ) : filteredItems.map((dept) => (
          <div
            key={dept.id}
            className="group relative bg-white rounded-[2.5rem] p-10 border border-purple-50 shadow-sm hover:shadow-3xl hover:shadow-purple-500/15 transition-all duration-700 hover:-translate-y-2 flex flex-col h-full"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/[0.02] to-indigo-500/[0.02] opacity-0 group-hover:opacity-100 rounded-[2.5rem] transition-opacity"></div>

            <div className="flex items-center justify-between mb-8 relative z-10">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-[1.25rem] flex items-center justify-center text-purple-600 group-hover:from-purple-600 group-hover:to-indigo-700 group-hover:text-white transition-all duration-700 shadow-inner group-hover:shadow-purple-500/40 group-hover:scale-110">
                <Layers size={32} />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenModal(dept)}
                  className="p-3 text-zinc-300 hover:text-purple-600 hover:bg-purple-50 rounded-2xl transition-all"
                  title="Editar Unidade"
                >
                  <Edit size={18} />
                </button>
                <button
                  onClick={() => handleDelete(dept.id, dept.nome)}
                  className="p-3 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                  title="Remover Unidade"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 relative z-10">
              <h3 className="text-2xl font-black text-zinc-900 mb-3 group-hover:text-purple-700 transition-colors leading-tight">{dept.nome}</h3>
              <p className="text-zinc-500 text-base leading-relaxed font-medium line-clamp-3 mb-6">{dept.descricao || 'Sem descrição definida.'}</p>
            </div>

            <div className="pt-8 border-t border-purple-50 flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Operational</span>
              </div>
              <div className="flex items-center gap-1 text-purple-400 font-black text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                Ver Detalhes <ChevronRight size={14} />
              </div>
            </div>
          </div>
        ))}

        {!loading && filteredItems.length === 0 && (
          <div className="col-span-full py-32 flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-purple-50 rounded-full flex items-center justify-center text-purple-200 mb-6">
              <Layers size={48} />
            </div>
            <p className="text-zinc-400 text-xl font-medium">Nenhum departamento registrado nesta categoria.</p>
            <button onClick={() => { setEditingItem(null); setShowModal(true); }} className="mt-4 text-purple-600 font-black uppercase text-xs tracking-widest hover:underline">Comece agora</button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/80 backdrop-blur-md p-4 animate-in fade-in duration-500">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-[0_35px_60px_-15px_rgba(107,33,168,0.3)] overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
            <div className="bg-gradient-to-br from-[#1e1b4b] via-[#4338ca] to-[#6d28d9] p-10 text-white relative">
              <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
                <Layers size={140} className="rotate-12" />
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-8 right-8 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all hover:rotate-90"
              >
                <X size={20} />
              </button>

              <div className="relative space-y-2">
                <div className="flex items-center gap-2">
                  <Star size={16} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-purple-200">System Integration</span>
                </div>
                <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
                  {editingItem ? <Edit className="text-purple-300" /> : <Plus className="text-purple-300" />}
                  {editingItem ? 'Alterar Unidade' : 'Nova Unidade'}
                </h2>
                <p className="text-indigo-100/70 text-sm font-medium">Defina a estrutura e as responsabilidades organizacionais.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-12 space-y-8 bg-white">
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1 px-1">
                  <label className="text-[11px] font-black text-purple-800 uppercase tracking-widest">Nome do Departamento</label>
                  {editingItem && <span className="text-[9px] font-bold text-zinc-400">ID: {editingItem.id}</span>}
                </div>
                <div className="group relative">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-purple-300 group-focus-within:text-purple-600 transition-colors">
                    <Info size={18} />
                  </div>
                  <input
                    name="nome"
                    required
                    autoFocus
                    defaultValue={editingItem?.nome}
                    placeholder="Ex: Inteligência de Mercado"
                    className="w-full pl-14 pr-6 py-5 bg-purple-50/30 border-2 border-purple-100 rounded-2xl text-zinc-900 font-bold text-lg focus:border-purple-600 focus:bg-white focus:ring-8 focus:ring-purple-500/5 transition-all outline-none placeholder:text-zinc-300 placeholder:font-normal"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-purple-800 uppercase tracking-widest px-1">Descrição e Propósito</label>
                <textarea
                  name="descricao"
                  rows={4}
                  required
                  defaultValue={editingItem?.descricao}
                  placeholder="Quais são as metas e competências desta unidade?"
                  className="w-full px-6 py-5 bg-purple-50/30 border-2 border-purple-100 rounded-2xl text-zinc-900 font-medium text-base focus:border-purple-600 focus:bg-white focus:ring-8 focus:ring-purple-500/5 transition-all outline-none resize-none placeholder:text-zinc-300"
                />
              </div>

              <div className="flex items-center gap-6 pt-6">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setShowModal(false)}
                  className="px-8 py-5 text-zinc-400 font-black uppercase text-xs tracking-[0.2em] hover:text-zinc-600 transition-colors disabled:opacity-50"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-5 bg-gradient-to-r from-purple-600 to-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-purple-500/30 hover:shadow-purple-500/50 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 disabled:opacity-70"
                >
                  {saving ? <RefreshCw size={20} className="animate-spin" /> : (editingItem ? <Save size={20} /> : <Plus size={20} />)}
                  <span className="uppercase text-xs tracking-[0.2em]">{saving ? 'Guardando...' : (editingItem ? 'Salvar Alterações' : 'Criar Departamento')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 10s ease infinite;
        }
      `}</style>
    </div>
  );
};

export default DepartmentsPage;