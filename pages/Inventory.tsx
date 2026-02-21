
import React, { useState, useEffect, useMemo } from 'react';
import {
  Package, Search, Plus, X, Trash2, Box, Edit, Save, AlertCircle,
  ArrowUpRight, ArrowDownLeft, RefreshCw, FileBarChart, History,
  ArrowRightLeft, AlertTriangle, TrendingUp, Filter, CheckCircle2,
  Calendar, Printer, DollarSign, Tag, Info, ShoppingCart, ListFilter,
  ArrowDownCircle, ArrowUpCircle, Hash
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { formatAOA } from '../constants';
import { InventarioItem, MovimentacaoEstoque } from '../types';
import { AmazingStorage, STORAGE_KEYS } from '../utils/storage';
import { supabase } from '../src/lib/supabase';
import Logo from '../components/Logo';

const InventoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'estoque' | 'relatorios'>('estoque');
  const [showItemModal, setShowItemModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState<InventarioItem | null>(null);
  const [selectedItemForMovement, setSelectedItemForMovement] = useState<InventarioItem | null>(null);

  const [items, setItems] = useState<InventarioItem[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([]);
  const [categorias, setCategorias] = useState<string[]>(['Peças', 'Pneus', 'Fluidos', 'Consumíveis', 'Ferramentas']);
  const [loading, setLoading] = useState(true);

  const fetchInventoryData = async () => {
    setLoading(true);
    try {
      const { data: invData, error: invError } = await supabase.from('inventario').select('*').order('nome');
      if (invError) throw invError;
      let finalItems: InventarioItem[] = [];
      if (invData) {
        finalItems = invData.map((i: any) => ({
          id: i.id,
          nome: i.nome,
          descricao: i.descricao,
          categoria: i.categoria,
          qtd: Number(i.quantidade_atual),
          qtd_minima: Number(i.quantidade_minima),
          preco: Number(i.preco_unitario),
          total: Number(i.quantidade_atual) * Number(i.preco_unitario)
        }));
        setItems(finalItems);
      }

      const { data: movData, error: movError } = await supabase.from('stock_movimentos').select('*').order('created_at', { ascending: false });
      if (movError) throw movError;
      if (movData) {
        setMovimentacoes(movData.map((m: any) => {
          const item = finalItems.find(i => i.id === m.produto_id);
          return {
            id: m.id,
            item_id: m.produto_id,
            item_nome: item?.nome || 'Item Desconhecido',
            tipo: m.tipo as any,
            quantidade: Number(m.quantidade),
            data: m.created_at,
            entidade: m.referencia,
            observacao: m.motivo,
            usuario: 'Admin'
          };
        }));
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      alert('Erro ao carregar inventário. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, []);

  // Form States
  const [itemForm, setItemForm] = useState({ nome: '', descricao: '', categoria: 'Peças', qtd: 0, qtd_minima: 5, preco: 0 });
  const [movementForm, setMovementForm] = useState({ tipo: 'entrada' as any, quantidade: 1, entidade: '', observacao: '' });

  // Report Filters
  const [reportFilters, setReportFilters] = useState({
    type: 'todos',
    period: 'personalizado',
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
    search: ''
  });


  // --- HANDLERS ---
  const handleDeleteItem = async (id: string, nome: string) => {
    if (confirm(`Remover permanentemente o item "${nome}" do inventário?`)) {
      try {
        const { error } = await supabase.from('inventario').delete().eq('id', id);
        if (error) throw error;
        fetchInventoryData();
        AmazingStorage.logAction('Remoção', 'Inventário', `Item ${nome} excluído`, 'warning');
      } catch (error) {
        alert('Erro ao excluir item');
      }
    }
  };

  const handleAddCategory = () => {
    const nova = prompt("Nome da nova categoria:");
    if (nova && !categorias.includes(nova)) setCategorias([...categorias, nova].sort());
  };

  const openItemModal = (item?: InventarioItem) => {
    if (item) {
      setEditingItem(item);
      setItemForm({ nome: item.nome, descricao: item.descricao, categoria: item.categoria, qtd: item.qtd, qtd_minima: item.qtd_minima, preco: item.preco });
    } else {
      setEditingItem(null);
      setItemForm({ nome: '', descricao: '', categoria: categorias[0], qtd: 0, qtd_minima: 2, preco: 0 });
    }
    setShowItemModal(true);
  };

  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dbData = {
      nome: itemForm.nome,
      descricao: itemForm.descricao || '',
      categoria: itemForm.categoria,
      quantidade_atual: Number(itemForm.qtd),
      quantidade_minima: Number(itemForm.qtd_minima),
      preco_unitario: Number(itemForm.preco),
      updated_at: new Date().toISOString()
    };

    try {
      if (editingItem) {
        const { error } = await supabase.from('inventario').update(dbData).eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('inventario').insert([dbData]);
        if (error) throw error;
      }

      fetchInventoryData();
      setShowItemModal(false);
      AmazingStorage.logAction(editingItem ? 'Edição' : 'Cadastro', 'Inventário', `Item ${dbData.nome} ${editingItem ? 'actualizado' : 'registado'}`);
    } catch (error) {
      alert('Erro ao salvar item no inventário');
    }
  };

  const handleMovementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForMovement) return;
    const qtd = Number(movementForm.quantidade);
    let novaQtd = selectedItemForMovement.qtd;
    if (movementForm.tipo === 'entrada') novaQtd += qtd;
    else novaQtd -= qtd;

    const movementData = {
      produto_id: selectedItemForMovement.id,
      tipo: movementForm.tipo,
      quantidade: qtd,
      referencia: movementForm.entidade,
      motivo: movementForm.observacao,
      created_at: new Date().toISOString()
    };

    try {
      // Create movement
      const { error: movError } = await supabase.from('stock_movimentos').insert([movementData]);
      if (movError) throw movError;

      // Update item quantity
      const { error: invError } = await supabase.from('inventario').update({
        quantidade_atual: novaQtd,
        updated_at: new Date().toISOString()
      }).eq('id', selectedItemForMovement.id);
      if (invError) throw invError;

      fetchInventoryData();
      setShowMovementModal(false);
      AmazingStorage.logAction('Movimentação', 'Inventário', `${movementForm.tipo.toUpperCase()} de ${qtd} unidades de ${selectedItemForMovement.nome}`);
    } catch (error) {
      alert('Erro ao processar movimentação de stock');
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(item =>
      item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.categoria?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, items]);

  const reportMovements = useMemo(() => {
    return movimentacoes.filter(m => {
      const d = m.data.split('T')[0];
      return d >= reportFilters.start && d <= reportFilters.end;
    });
  }, [movimentacoes, reportFilters]);

  const totalValue = useMemo(() => items.reduce((acc, curr) => acc + curr.total, 0), [items]);
  const lowStockCount = useMemo(() => items.filter(i => i.qtd <= i.qtd_minima).length, [items]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="w-12 h-12 text-yellow-600 animate-spin" />
        <p className="text-zinc-500 font-bold animate-pulse uppercase tracking-widest text-xs">Sincronizando com a Nuvem...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-sky-200 print:hidden">
        <div>
          <h1 className="text-4xl font-black text-zinc-900 tracking-tight uppercase">Gestão de <span className="text-yellow-600">Stock</span></h1>
          <p className="text-zinc-500 font-medium mt-1">Inventário Amazing Corporation v2026.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('estoque')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === 'estoque' ? 'bg-zinc-900 text-white shadow-lg' : 'bg-white text-zinc-400 hover:bg-zinc-50'}`}><Package size={16} /> Inventário</button>
          <button onClick={() => setActiveTab('relatorios')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeTab === 'relatorios' ? 'bg-zinc-900 text-white shadow-lg' : 'bg-white text-zinc-400 hover:bg-zinc-50'}`}><FileBarChart size={16} /> Relatórios</button>
        </div>
      </div>

      {activeTab === 'estoque' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-zinc-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
              <p className="text-yellow-500 text-[10px] font-black uppercase tracking-[0.4em] mb-4">Valor de Inventário</p>
              <p className="text-5xl font-black">{formatAOA(totalValue)}</p>
            </div>
            <div className={`p-8 rounded-[2.5rem] border flex flex-col justify-between shadow-sm ${lowStockCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-sky-100'}`}>
              <AlertTriangle size={32} className={lowStockCount > 0 ? 'text-red-500' : 'text-zinc-200'} />
              <div>
                <p className="text-[10px] font-black uppercase text-zinc-400">Alertas Reposição</p>
                <p className={`text-4xl font-black ${lowStockCount > 0 ? 'text-red-600' : 'text-zinc-900'}`}>{lowStockCount}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 bg-white p-2 rounded-[1.5rem] shadow-sm border border-sky-100 w-full flex items-center">
              <Search className="ml-4 text-zinc-300" size={18} />
              <input placeholder="Pesquisar..." className="w-full bg-transparent border-none focus:ring-0 py-3 font-bold px-4" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <button onClick={() => openItemModal()} className="px-8 py-4 bg-zinc-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-zinc-800 flex items-center gap-2"><Plus size={16} /> Novo Item</button>
          </div>

          <div className="bg-white rounded-[3rem] border border-sky-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-100 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                  <th className="px-8 py-6">Artigo</th>
                  <th className="px-8 py-6 text-center">Stock</th>
                  <th className="px-8 py-6 text-right">Preço</th>
                  <th className="px-8 py-6 text-right">Total</th>
                  <th className="px-8 py-6 text-right">Acções</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-zinc-50/50">
                    <td className="px-8 py-4">
                      <p className="font-black text-zinc-900 text-sm">{item.nome}</p>
                      <p className="text-[9px] font-bold text-zinc-400 uppercase">{item.categoria}</p>
                    </td>
                    <td className="px-8 py-4 text-center font-black text-lg">{item.qtd}</td>
                    <td className="px-8 py-4 text-right font-bold text-zinc-600">{formatAOA(item.preco)}</td>
                    <td className="px-8 py-4 text-right font-black text-zinc-900">{formatAOA(item.total)}</td>
                    <td className="px-8 py-4 text-right flex justify-end gap-2">
                      <button onClick={() => { setSelectedItemForMovement(item); setShowMovementModal(true); }} className="p-3 bg-zinc-900 text-white rounded-xl"><ArrowRightLeft size={16} /></button>
                      <button onClick={() => openItemModal(item)} className="p-3 text-zinc-300"><Edit size={16} /></button>
                      <button onClick={() => handleDeleteItem(item.id, item.nome)} className="p-3 text-zinc-300 hover:text-red-500"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-[3rem] shadow-sm">
          <h2 className="text-xl font-black mb-6 uppercase">Histórico de Movimentações</h2>
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-zinc-400 uppercase border-b">
                <th className="py-4">Data</th>
                <th className="py-4">Item</th>
                <th className="py-4">Tipo</th>
                <th className="py-4">Qtd</th>
                <th className="py-4">Entidade</th>
              </tr>
            </thead>
            <tbody>
              {reportMovements.map(m => (
                <tr key={m.id} className="border-b border-zinc-50 text-sm">
                  <td className="py-4">{new Date(m.data).toLocaleDateString()}</td>
                  <td className="py-4 font-bold">{m.item_nome}</td>
                  <td className={`py-4 font-black uppercase text-[10px] ${m.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>{m.tipo}</td>
                  <td className="py-4 font-black">{m.quantidade}</td>
                  <td className="py-4">{m.entidade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODALS */}
      {showItemModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/80 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden p-10 space-y-6">
            <h2 className="text-2xl font-black">{editingItem ? 'Editar Item' : 'Novo Item'}</h2>
            <form onSubmit={handleItemSubmit} className="space-y-4">
              <Input label="Nome" value={itemForm.nome} onChange={e => setItemForm({ ...itemForm, nome: e.target.value })} required />
              <Select label="Categoria" value={itemForm.categoria} onChange={e => setItemForm({ ...itemForm, categoria: e.target.value })} options={categorias.map(c => ({ value: c, label: c }))} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Preço" type="number" value={itemForm.preco} onChange={e => setItemForm({ ...itemForm, preco: Number(e.target.value) })} required />
                <Input label="Stock Inicial" type="number" value={itemForm.qtd} onChange={e => setItemForm({ ...itemForm, qtd: Number(e.target.value) })} required />
              </div>
              <button type="submit" className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-black uppercase text-xs">Salvar</button>
              <button type="button" onClick={() => setShowItemModal(false)} className="w-full text-zinc-400 font-bold text-xs">Cancelar</button>
            </form>
          </div>
        </div>
      )}

      {showMovementModal && selectedItemForMovement && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/80 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden p-10 space-y-6">
            <h2 className="text-2xl font-black">Movimentar: {selectedItemForMovement.nome}</h2>
            <form onSubmit={handleMovementSubmit} className="space-y-4">
              <Select label="Tipo" value={movementForm.tipo} onChange={e => setMovementForm({ ...movementForm, tipo: e.target.value as any })} options={[{ value: 'entrada', label: 'Entrada' }, { value: 'saida', label: 'Saída' }]} />
              <Input label="Quantidade" type="number" value={movementForm.quantidade} onChange={e => setMovementForm({ ...movementForm, quantidade: Number(e.target.value) })} required />
              <Input label="Entidade/Origem" value={movementForm.entidade} onChange={e => setMovementForm({ ...movementForm, entidade: e.target.value })} required />
              <button type="submit" className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-black uppercase text-xs">Confirmar</button>
              <button type="button" onClick={() => setShowMovementModal(false)} className="w-full text-zinc-400 font-bold text-xs">Voltar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;
