
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../src/lib/supabase';
import { Wallet, FileText, Plus, Search, TrendingUp, PieChart, Download, X, Trash2, Edit, Save, Tag, Filter } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { formatAOA } from '../constants';
import { NotaFiscal } from '../types';
import { AmazingStorage, STORAGE_KEYS } from '../utils/storage';

const CATEGORIAS_FINANCEIRAS = [
  { value: 'Combustível', label: 'Combustível', color: 'bg-orange-100 text-orange-700' },
  { value: 'Manutenção', label: 'Manutenção de Frota', color: 'bg-blue-100 text-blue-700' },
  { value: 'Salários', label: 'Salários e Encargos', color: 'bg-purple-100 text-purple-700' },
  { value: 'Impostos', label: 'Impostos e Taxas', color: 'bg-red-100 text-red-700' },
  { value: 'Logística', label: 'Logística e Operações', color: 'bg-green-100 text-green-700' },
  { value: 'Administrativo', label: 'Despesas Administrativas', color: 'bg-zinc-100 text-zinc-700' },
  { value: 'Outros', label: 'Outros Lançamentos', color: 'bg-slate-100 text-slate-700' },
];

const FinancePage: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<NotaFiscal | null>(null);
  const [valorInput, setValorInput] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');

  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fin_notas')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data) {
        const mapped = data.map((n: any) => ({
          ...n,
          id: n.short_id
        }));
        setNotas(mapped as unknown as NotaFiscal[]);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotas();
  }, []);


  const totalReceita = useMemo(() => notas.reduce((acc, n) => acc + n.valor_total, 0), [notas]);
  const totalIVA = totalReceita * 0.14;

  const filteredNotas = useMemo(() => {
    return notas.filter(n => {
      const matchesSearch = n.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.fornecedor.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'Todas' || n.categoria === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, categoryFilter, notas]);

  const handleOpenModal = (item?: NotaFiscal) => {
    setEditingItem(item || null);
    setValorInput(item ? item.valor_total : 0);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const valor = Number(formData.get('valor'));
    const isEditing = !!editingItem;
    const generatedId = isEditing ? editingItem!.id : Math.random().toString(36).substr(2, 9);

    const dbData = {
      short_id: generatedId,
      numero: formData.get('numero') as string,
      fornecedor: formData.get('fornecedor') as string,
      data_emissao: formData.get('data') as string,
      valor_total: valor,
      impostos: valor * 0.14,
      categoria: formData.get('categoria') as string,
      status: 'Liquidada'
    };

    try {
      const { error } = await supabase.from('fin_notas').upsert([dbData], { onConflict: 'short_id' });
      if (error) throw error;

      fetchNotas();
      setShowModal(false);
      setEditingItem(null);
      AmazingStorage.logAction(
        isEditing ? 'Edição Financeira' : 'Lançamento Fiscal',
        'Contabilidade',
        `Nota ${dbData.numero} ${isEditing ? 'atualizada' : 'inserida em ' + dbData.categoria}`
      );
    } catch (error) {
      alert('Erro ao salvar nota fiscal');
    }
  };

  const handleDelete = async (id: string, num: string) => {
    if (confirm(`Excluir a nota fiscal ${num} permanentemente?`)) {
      try {
        const { error } = await supabase.from('fin_notas').delete().eq('short_id', id);
        if (error) throw error;
        fetchNotas();
        AmazingStorage.logAction('Eliminação Fiscal', 'Contabilidade', `Nota ${num} removida`, 'warning');
      } catch (error) {
        alert('Erro ao remover nota fiscal');
      }
    }
  };

  const getCategoryColor = (catName: string) => {
    return CATEGORIAS_FINANCEIRAS.find(c => c.value === catName)?.color || 'bg-zinc-100 text-zinc-700';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-sky-200">
        <div>
          <h1 className="text-4xl font-black text-zinc-900 tracking-tight uppercase">Gestão Financeira</h1>
          <p className="text-zinc-500 font-medium mt-1">Contabilidade integrada e faturamento da Amazing Corp.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => window.print()} className="px-6 py-4 rounded-2xl font-bold border-sky-200">
            <Download size={18} className="mr-2" /> Relatório Semanal
          </Button>
          <button
            onClick={() => handleOpenModal()}
            className="px-8 py-4 bg-zinc-900 text-white font-black rounded-2xl shadow-xl shadow-zinc-900/10 hover:bg-zinc-800 transition-all active:scale-95 flex items-center gap-2 uppercase text-[10px] tracking-widest"
          >
            <Plus size={18} /> Lançar Nota Fiscal
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-sky-100 shadow-sm group hover:border-yellow-500 transition-all duration-500">
          <div className="flex items-center justify-between mb-4">
            <span className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em]">Despesa Bruta</span>
            <div className="p-3 bg-green-50 text-green-600 rounded-2xl"><TrendingUp size={20} /></div>
          </div>
          <p className="text-4xl font-black text-zinc-900">{formatAOA(totalReceita)}</p>
          <p className="text-xs text-zinc-400 font-bold mt-2">Acumulado do período fiscal</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-sky-100 shadow-sm group hover:border-sky-500 transition-all duration-500">
          <div className="flex items-center justify-between mb-4">
            <span className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em]">Provisão de IVA (14%)</span>
            <div className="p-3 bg-sky-50 text-sky-600 rounded-2xl"><PieChart size={20} /></div>
          </div>
          <p className="text-4xl font-black text-zinc-900">{formatAOA(totalIVA)}</p>
          <p className="text-xs text-zinc-400 font-bold mt-2">Cálculo automático de impostos</p>
        </div>

        <div className="bg-zinc-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <FileText size={100} />
          </div>
          <span className="text-yellow-500 text-[10px] font-black uppercase tracking-[0.3em] block mb-4">Eficiência de Lançamento</span>
          <p className="text-5xl font-black">{notas.length}</p>
          <p className="text-xs text-zinc-400 font-bold mt-2">Documentos processados</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center print:hidden">
        <div className="flex-1 bg-white p-2 rounded-[1.5rem] shadow-sm border border-sky-100 w-full">
          <Input
            placeholder="Pesquisar por número da nota ou fornecedor..."
            icon={<Search size={20} className="text-zinc-400" />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none py-4 text-lg font-semibold"
          />
        </div>
        <div className="w-full md:w-64 bg-white p-2 rounded-[1.5rem] shadow-sm border border-sky-100">
          <Select
            options={[{ value: 'Todas', label: 'Todas as Categorias' }, ...CATEGORIAS_FINANCEIRAS]}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border-none py-4 font-bold text-zinc-600"
          />
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-sky-100 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-zinc-50/50 border-b border-zinc-100 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              <th className="px-8 py-6">Nº Documento / Fornecedor</th>
              <th className="px-8 py-6">Categoria</th>
              <th className="px-8 py-6 text-center">Data Emissão</th>
              <th className="px-8 py-6 text-right">Valor Bruto</th>
              <th className="px-8 py-6 text-right print:hidden">Gestão</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {filteredNotas.length > 0 ? filteredNotas.map((n) => (
              <tr key={n.id} className="hover:bg-zinc-50/30 transition-all group">
                <td className="px-8 py-5">
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-zinc-900">{n.numero}</span>
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{n.fornecedor}</span>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 w-fit ${getCategoryColor(n.categoria)}`}>
                    <Tag size={12} />
                    {n.categoria}
                  </span>
                </td>
                <td className="px-8 py-5 text-sm font-bold text-zinc-600 text-center">{n.data_emissao}</td>
                <td className="px-8 py-5 text-sm font-black text-zinc-900 text-right">{formatAOA(n.valor_total)}</td>
                <td className="px-8 py-5 text-right flex justify-end gap-2 print:hidden">
                  <button onClick={() => handleOpenModal(n)} className="p-3 text-zinc-300 hover:text-yellow-600 hover:bg-yellow-50 rounded-xl transition-all"><Edit size={16} /></button>
                  <button onClick={() => handleDelete(n.id, n.numero)} className="p-3 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={16} /></button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={5} className="px-8 py-20 text-center">
                <FileText size={48} className="mx-auto text-sky-100 mb-4" />
                <p className="text-zinc-400 font-bold italic">Nenhum lançamento fiscal encontrado nos filtros atuais.</p>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
              <h2 className="text-2xl font-black text-zinc-900 flex items-center gap-3">
                {editingItem ? <Edit className="text-yellow-500" /> : <FileText className="text-yellow-500" />}
                {editingItem ? 'Actualizar Nota' : 'Novo Lançamento'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-3 hover:bg-zinc-200 rounded-full transition-all"><X size={24} className="text-zinc-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-10 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <Input name="numero" label="Número da Nota" defaultValue={editingItem?.numero} required placeholder="Ex: NF-2024-001" />
                <Select name="categoria" label="Classificação de Gasto" defaultValue={editingItem?.categoria || 'Outros'} options={CATEGORIAS_FINANCEIRAS} />
              </div>

              <Input name="fornecedor" label="Fornecedor / Entidade" defaultValue={editingItem?.fornecedor} required placeholder="Ex: Sonangol EP" />

              <div className="grid grid-cols-2 gap-6">
                <Input name="data" label="Data de Emissão" type="date" defaultValue={editingItem?.data_emissao || new Date().toISOString().split('T')[0]} required />
                <Input
                  name="valor"
                  label="Valor Bruto (AOA)"
                  type="number"
                  value={valorInput}
                  onChange={(e) => setValorInput(Number(e.target.value))}
                  required
                  step="0.01"
                />
              </div>

              <div className="bg-zinc-900 p-6 rounded-[2rem] border-l-8 border-yellow-500 shadow-2xl shadow-zinc-900/10">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">IVA Calculado (14%):</span>
                  <span className="text-xl font-black text-white">{formatAOA(valorInput * 0.14)}</span>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 text-[10px] font-black uppercase tracking-widest text-zinc-400">Cancelar</button>
                <button type="submit" className="px-10 py-4 bg-zinc-900 text-white font-black rounded-2xl hover:bg-zinc-800 transition-all uppercase text-[10px] tracking-widest flex items-center gap-2">
                  {editingItem ? <Save size={18} /> : <Plus size={18} />}
                  Confirmar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancePage;