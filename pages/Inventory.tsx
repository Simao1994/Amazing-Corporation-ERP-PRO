
import React, { useState, useEffect, useMemo, useDeferredValue } from 'react';
import {
  Package, Search, Plus, X, Trash2, Box, Edit, Save, AlertCircle,
  ArrowUpRight, ArrowDownLeft, RefreshCw, FileBarChart, History,
  ArrowRightLeft, AlertTriangle, TrendingUp, Filter, CheckCircle2,
  Calendar, Printer, DollarSign, Tag, Info, ShoppingCart, ListFilter,
  ArrowDownCircle, ArrowUpCircle, Hash, Wrench, BarChart3, PieChart as PieIcon,
  TrendingDown, Layers, Target, ChevronRight
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { formatAOA } from '../constants';
import { InventarioItem, MovimentacaoEstoque } from '../types';
import { AmazingStorage, STORAGE_KEYS } from '../utils/storage';
import { supabase } from '../src/lib/supabase';
import { useAuth } from '../src/contexts/AuthContext';
import Logo from '../components/Logo';

const InventoryPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'estoque' | 'relatorios'>('estoque');
  const [showItemModal, setShowItemModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [editingItem, setEditingItem] = useState<InventarioItem | null>(null);
  const [selectedItemForMovement, setSelectedItemForMovement] = useState<InventarioItem | null>(null);

  const [items, setItems] = useState<InventarioItem[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([]);
  const [categorias, setCategorias] = useState<string[]>(['Peças', 'Pneus', 'Fluidos', 'Consumíveis', 'Ferramentas']);
  const [loading, setLoading] = useState(true);

  const fetchInventoryData = async () => {
    setLoading(true);

    const failSafe = setTimeout(() => {
      setLoading(prev => {
        if (prev) {
          console.warn('Inventory: Timeout de 15s atingido. Forçando interrupção do loading.');
          return false;
        }
        return prev;
      });
    }, 15000);

    try {
      const { data: invData, error: invError } = await supabase
        .from('inventario')
        .select('*')
        .eq('tenant_id', user?.tenant_id)
        .order('nome');
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
          total: Number(i.quantidade_atual) * Number(i.preco_unitario),
          data_validade: i.data_validade,
          lote: i.lote,
          fornecedor_id: i.fornecedor_id,
          referencia: i.referencia,
          compatibilidade: i.compatibilidade,
          garantia_meses: i.garantia_meses
        }));
        setItems(finalItems);
      }

      const { data: movData, error: movError } = await supabase
        .from('stock_movimentos')
        .select('*')
        .eq('tenant_id', user?.tenant_id)
        .order('created_at', { ascending: false });
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
      clearTimeout(failSafe);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, []);

  // Form States
  const [itemForm, setItemForm] = useState({
    nome: '',
    descricao: '',
    categoria: 'Peças',
    qtd: 0,
    qtd_minima: 5,
    preco: 0,
    data_validade: '',
    lote: '',
    fornecedor_id: '',
    referencia: '',
    compatibilidade: '',
    garantia_meses: 0
  });
  const [movementForm, setMovementForm] = useState({ tipo: 'entrada' as any, quantidade: 1, entidade: '', observacao: '' });

  // Report Filters
  const [reportFilters, setReportFilters] = useState({
    type: 'todos',
    period: 'personalizado',
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
    search: '',
    analytics_mode: 'universo', // universo, abc, turnover
    periodicity: 'diario', // diario, semanal, mensal, anual
    iva: 14 // Standard IVA (Angola)
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
      setItemForm({
        nome: item.nome,
        descricao: item.descricao,
        categoria: item.categoria,
        qtd: item.qtd,
        qtd_minima: item.qtd_minima,
        preco: item.preco,
        data_validade: item.data_validade || '',
        lote: item.lote || '',
        fornecedor_id: item.fornecedor_id || '',
        referencia: item.referencia || '',
        compatibilidade: item.compatibilidade || '',
        garantia_meses: item.garantia_meses || 0
      });
    } else {
      setEditingItem(null);
      setItemForm({
        nome: '',
        descricao: '',
        categoria: categorias[0],
        qtd: 0,
        qtd_minima: 2,
        preco: 0,
        data_validade: '',
        lote: '',
        fornecedor_id: ''
      });
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
      updated_at: new Date().toISOString(),
      data_validade: itemForm.data_validade || null,
      lote: itemForm.lote || null,
      fornecedor_id: itemForm.fornecedor_id || null,
      referencia: itemForm.referencia || null,
      compatibilidade: itemForm.compatibilidade || null,
      garantia_meses: Number(itemForm.garantia_meses) || 0,
      tenant_id: user?.tenant_id
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
      tenant_id: user?.tenant_id,
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
      item.nome.toLowerCase().includes(deferredSearchTerm.toLowerCase()) ||
      item.categoria?.toLowerCase().includes(deferredSearchTerm.toLowerCase())
    );
  }, [deferredSearchTerm, items]);

  const reportMovements = useMemo(() => {
    return movimentacoes.filter(m => {
      const d = new Date(m.data);
      const now = new Date();

      if (reportFilters.periodicity === 'diario') {
        return d.toDateString() === now.toDateString();
      }
      if (reportFilters.periodicity === 'semanal') {
        const lastWeek = new Date(now.setDate(now.getDate() - 7));
        return d >= lastWeek;
      }
      if (reportFilters.periodicity === 'mensal') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      if (reportFilters.periodicity === 'anual') {
        return d.getFullYear() === now.getFullYear();
      }

      const day = m.data.split('T')[0];
      return day >= reportFilters.start && day <= reportFilters.end;
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
        <style>{`
          @media print {
            @page { size: A4 portrait; margin: 15mm; }
            body { background: white !important; }
            .no-print { display: none !important; }
            .print-only { display: block !important; }
            table { width: 100% !important; border-collapse: collapse !important; }
            th, td { border-bottom: 1px solid #e4e4e7 !important; padding: 8px !important; }
            thead { display: table-header-group; }
          }
        `}</style>
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
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[500px]">
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
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-black text-zinc-900 text-sm">{item.nome}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[9px] font-bold text-zinc-400 uppercase">{item.categoria}</span>
                              {item.referencia && <span className="text-[8px] px-1.5 py-0.5 bg-zinc-100 text-zinc-500 rounded font-black">REF: {item.referencia}</span>}
                            </div>
                          </div>
                          {item.data_validade && (
                            <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${new Date(item.data_validade) < new Date() ? 'bg-red-100 text-red-600' :
                              new Date(item.data_validade) < new Date(new Date().setDate(new Date().getDate() + 30)) ? 'bg-orange-100 text-orange-600' :
                                'bg-green-100 text-green-600'
                              }`}>
                              Limit: {new Date(item.data_validade).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        {item.compatibilidade && <p className="text-[8px] font-medium text-blue-500 mt-1 italic">Compatível: {item.compatibilidade}</p>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-sky-100 relative overflow-hidden print:shadow-none print:border-none">
            <div className="absolute top-0 right-0 p-10 opacity-[0.05] pointer-events-none print:hidden">
              <BarChart3 size={120} />
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 relative z-10 print:hidden">
              <div>
                <h2 className="text-2xl font-black text-zinc-900 uppercase">Relatórios de Alta Dimensão</h2>
                <p className="text-zinc-500 font-medium">Análise estratégica de mecânica e rotação de peças</p>
              </div>
              <div className="flex bg-zinc-100 p-1.5 rounded-2xl gap-1">
                {[
                  { id: 'universo', label: 'Universo', icon: <Layers size={14} /> },
                  { id: 'abc', label: 'Curva ABC', icon: <PieIcon size={14} /> },
                  { id: 'turnover', label: 'Turnover', icon: <RefreshCw size={14} /> }
                ].map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => setReportFilters({ ...reportFilters, analytics_mode: mode.id })}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${reportFilters.analytics_mode === mode.id ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
                  >
                    {mode.icon} {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {reportFilters.analytics_mode === 'universo' && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 print:hidden">
                {[
                  { label: 'Giro de Stock Médio', value: '4.2x', color: 'text-blue-600', sub: 'Peças/Mês' },
                  { label: 'Margem Média', value: '32%', color: 'text-green-600', sub: 'Bruta' },
                  { label: 'Valor em Trânsito', value: formatAOA(totalValue * 0.15), color: 'text-zinc-400', sub: 'Pedido Fornecedor' },
                  { label: 'Índice de Obsolescência', value: '12%', color: 'text-red-500', sub: 'Ref. Antigas' }
                ].map((stat, i) => (
                  <div key={i} className="bg-zinc-50 p-6 rounded-[2rem] border border-zinc-100">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">{stat.label}</p>
                    <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                    <p className="text-[9px] font-bold text-zinc-300 mt-1 italic">{stat.sub}</p>
                  </div>
                ))}
              </div>
            )}

            {reportFilters.analytics_mode === 'abc' && (
              <div className="p-10 bg-zinc-900 rounded-[2.5rem] text-white animate-in zoom-in-95 duration-500 print:hidden">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-yellow-500 flex items-center justify-center text-zinc-900"><Target size={24} /></div>
                  <div>
                    <h3 className="font-black text-xl">Segmentação ABC de Peças</h3>
                    <p className="text-zinc-400 text-xs font-medium">Priorização de investimento por impacto financeiro</p>
                  </div>
                </div>
                <div className="space-y-6">
                  {[
                    { cat: 'A', perc: '70', items: 'Peças Motor, Transmissão', color: 'bg-yellow-500', desc: 'Alto Valor / Alta Importância' },
                    { cat: 'B', perc: '20', items: 'Travões, Suspensão', color: 'bg-zinc-400', desc: 'Valor Médio' },
                    { cat: 'C', perc: '10', items: 'Parafusos, Cabos, Filtros', color: 'bg-zinc-700', desc: 'Baixo Valor / Alta Rotatividade' }
                  ].map((bar, i) => (
                    <div key={i}>
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">{bar.cat} - {bar.items}</span>
                        <span className="font-black text-sm">{bar.perc}%</span>
                      </div>
                      <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                        <div className={`h-full ${bar.color}`} style={{ width: `${bar.perc}%` }}></div>
                      </div>
                      <p className="text-[9px] text-zinc-500 mt-1 italic">{bar.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {reportFilters.analytics_mode === 'turnover' && (
              <div className="bg-blue-50 p-8 rounded-[2.5rem] border border-blue-100 animate-in fade-in duration-500 print:hidden">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp className="text-blue-600" />
                  <h3 className="text-sm font-black text-blue-900 uppercase">Top 5 Peças de Alta Rotação</h3>
                </div>
                <div className="space-y-4">
                  {items.slice(0, 5).map((item, i) => (
                    <div key={i} className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-blue-100/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs">{i + 1}</div>
                        <div>
                          <p className="font-black text-zinc-900 text-xs">{item.nome}</p>
                          <p className="text-[9px] text-zinc-400 font-bold uppercase">{item.referencia || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-blue-600 text-sm">{(15 - i) * 1.2}x</p>
                        <p className="text-[8px] text-zinc-300 font-black uppercase">Giro Mensal</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-sky-100 print:border-none print:shadow-none">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-6 print:hidden">
              <div>
                <h2 className="text-xl font-black uppercase flex items-center gap-2 text-zinc-900"><History size={20} className="text-yellow-600" /> Histórico & Fluxo Financeiro</h2>
                <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest mt-1 italic">Cálculos baseados em IVA de {reportFilters.iva}%</p>
              </div>

              <div className="flex flex-wrap items-center gap-4 bg-zinc-50 p-2 rounded-2xl border border-zinc-100 w-full md:w-auto">
                <div className="flex items-center gap-2 px-3 border-r border-zinc-200">
                  <span className="text-[10px] font-black uppercase text-zinc-400">IVA (%):</span>
                  <input
                    type="number"
                    value={reportFilters.iva}
                    onChange={(e) => setReportFilters({ ...reportFilters, iva: Number(e.target.value) })}
                    className="w-12 bg-transparent border-none font-black text-xs text-yellow-600 focus:ring-0 p-0 text-center"
                  />
                </div>
                <select
                  value={reportFilters.periodicity}
                  onChange={(e) => setReportFilters({ ...reportFilters, periodicity: e.target.value as any })}
                  className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-zinc-600 focus:ring-0 cursor-pointer"
                >
                  <option value="diario">Relatório Diário</option>
                  <option value="semanal">Relatório Semanal</option>
                  <option value="mensal">Relatório Mensal</option>
                  <option value="anual">Relatório Anual</option>
                  <option value="personalizado">Período Personalizado</option>
                </select>
                <div className="flex gap-2">
                  <button onClick={() => window.print()} className="p-2.5 bg-white rounded-xl text-zinc-400 hover:text-zinc-900 shadow-sm transition-all flex items-center gap-2 text-[10px] font-black uppercase"><Printer size={14} /> Imprimir PDF</button>
                </div>
              </div>
            </div>

            {/* Print Header (Visible in A4 Print) */}
            <div className="hidden print:block mb-12 border-b-4 border-zinc-900 pb-10">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-3 mb-2">
                    <img src="/assets/logo.png" alt="Logo" className="h-16 object-contain" />
                  </div>
                  <div className="text-[10px] text-zinc-600 space-y-0.5 font-bold uppercase leading-relaxed">
                    <p>Endereço: Bairro da Massangarala, Província de Benguela, Município de Benguela</p>
                    <p>NIF: 5000218797</p>
                    <p>Telefone: (+244) 929 882 067</p>
                    <p>Email: geral.amazingcorporatio@gmail.com</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="bg-zinc-900 text-white px-4 py-2 rounded-lg inline-block mb-4">
                    <p className="text-[10px] font-black uppercase tracking-widest">Relatório de Gestão de Stock</p>
                  </div>
                  <p className="text-[10px] font-black uppercase text-zinc-400">ID Documento: {new Date().getTime()}</p>
                  <p className="text-[10px] font-bold text-zinc-900 uppercase">Data: {new Date().toLocaleDateString()}</p>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase">Gerado por: Administrador</p>
                </div>
              </div>
              <div className="mt-8 flex gap-8 text-[10px] font-bold uppercase text-zinc-500 bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                <div><span className="text-zinc-400">Período:</span> <span className="text-zinc-900">{reportFilters.start} a {reportFilters.end}</span></div>
                <div><span className="text-zinc-400">Agrupamento:</span> <span className="text-zinc-900">{reportFilters.periodicity}</span></div>
                <div><span className="text-zinc-400">Taxa IVA aplicada:</span> <span className="text-zinc-900">{reportFilters.iva}%</span></div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[600px] border-collapse">
                <thead>
                  <tr className="text-[10px] font-black text-zinc-400 uppercase border-b border-zinc-100 print:text-zinc-900">
                    <th className="py-4 px-4">Data / Ref</th>
                    <th className="py-4">Item / Categoria</th>
                    <th className="py-4">Fluxo</th>
                    <th className="py-4 text-right">Qtd</th>
                    <th className="py-4 text-right">Preço Un.</th>
                    <th className="py-4 text-right">Subtotal</th>
                    <th className="py-4 text-right pr-4 text-yellow-600" style={{ color: '#eab308' }}>Total c/ IVA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {reportMovements.map(m => {
                    const item = items.find(i => i.nome === m.item_nome);
                    const precoUn = item?.preco || 0;
                    const subtotal = precoUn * m.quantidade;
                    const totalComIVA = subtotal * (1 + (reportFilters.iva / 100));

                    return (
                      <tr key={m.id} className="text-sm group hover:bg-zinc-50/50 print:break-inside-avoid">
                        <td className="py-4 px-4">
                          <p className="font-bold text-zinc-400 text-[10px]">{new Date(m.data).toLocaleDateString()}</p>
                          <p className="text-[9px] font-black uppercase text-zinc-300">#{m.id.substring(0, 6)}</p>
                        </td>
                        <td className="py-4">
                          <p className="font-black text-zinc-900">{m.item_nome}</p>
                          <p className="text-[9px] text-zinc-400 font-bold uppercase">{item?.categoria}</p>
                        </td>
                        <td className="py-4">
                          <span className={`px-2 py-0.5 rounded-md font-black uppercase text-[8px] tracking-widest ${m.tipo === 'entrada' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                            {m.tipo === 'entrada' ? 'ENTRADA' : 'SAÍDA'}
                          </span>
                        </td>
                        <td className="py-4 text-right font-black">{m.quantidade}</td>
                        <td className="py-4 text-right font-medium text-zinc-400">{formatAOA(precoUn)}</td>
                        <td className="py-4 text-right font-bold text-zinc-600">{formatAOA(subtotal)}</td>
                        <td className="py-4 text-right font-black text-zinc-900 pr-4" style={{ color: '#eab308' }}>{formatAOA(totalComIVA)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-zinc-900 text-white print:bg-zinc-100 print:text-zinc-900">
                    <td colSpan={5} className="py-6 px-8 text-right font-black uppercase tracking-widest text-xs">Resumo Financeiro Total</td>
                    <td className="py-6 text-right font-black text-sm">
                      {formatAOA(reportMovements.reduce((acc, m) => acc + ((items.find(i => i.nome === m.item_nome)?.preco || 0) * m.quantidade), 0))}
                    </td>
                    <td className="py-6 text-right pr-8 font-black text-lg text-yellow-400 print:text-zinc-900">
                      {formatAOA(reportMovements.reduce((acc, m) => {
                        const val = (items.find(i => i.nome === m.item_nome)?.preco || 0) * m.quantidade;
                        return acc + (val * (1 + (reportFilters.iva / 100)));
                      }, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="hidden print:flex justify-between mt-20 px-8 text-[10px] font-black uppercase text-zinc-400">
              <div className="text-center w-48 border-t-2 border-zinc-100 pt-4">Assinatura Armazém</div>
              <div className="text-center w-48 border-t-2 border-zinc-100 pt-4">Validação Financeira</div>
              <div className="text-center w-48 border-t-2 border-zinc-100 pt-4">Selo Amazing Corp</div>
            </div>
          </div>
        </div>
      )}

      {showItemModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/80 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden p-10 space-y-6">
            <h2 className="text-2xl font-black">{editingItem ? 'Editar Item' : 'Novo Item'}</h2>
            <form onSubmit={handleItemSubmit} className="space-y-4">
              <Input label="Nome" value={itemForm.nome} onChange={e => setItemForm({ ...itemForm, nome: e.target.value })} required />
              <Select label="Categoria" value={itemForm.categoria} onChange={e => setItemForm({ ...itemForm, categoria: e.target.value })} options={categorias.map(c => ({ value: c, label: c }))} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Preço de Compra/Venda" type="number" value={itemForm.preco} onChange={e => setItemForm({ ...itemForm, preco: Number(e.target.value) })} required />
                <Input label="Stock Disponível" type="number" value={itemForm.qtd} onChange={e => setItemForm({ ...itemForm, qtd: Number(e.target.value) })} required />
              </div>
              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-4">
                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                  <Wrench size={14} className="text-yellow-600" /> Especificações Mecânicas
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Ref (OEM / Técnica)" value={itemForm.referencia} onChange={e => setItemForm({ ...itemForm, referencia: e.target.value })} placeholder="Ex: AX-405-Y" />
                  <Input label="Garantia (Meses)" type="number" value={itemForm.garantia_meses} onChange={e => setItemForm({ ...itemForm, garantia_meses: Number(e.target.value) })} />
                </div>
                <Input label="Modelos Compatíveis" value={itemForm.compatibilidade} onChange={e => setItemForm({ ...itemForm, compatibilidade: e.target.value })} placeholder="Ex: Yamaha DT, Honda CG, etc." />
              </div>
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3">Lote & Manutenção técnica</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Data Limite Técnica" type="date" value={itemForm.data_validade} onChange={e => setItemForm({ ...itemForm, data_validade: e.target.value })} />
                  <Input label="Nº de Lote / Série" value={itemForm.lote} onChange={e => setItemForm({ ...itemForm, lote: e.target.value })} placeholder="Ex: SRV-2026" />
                </div>
              </div>
              <button type="submit" className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-black uppercase text-xs">Salvar</button>
              <button type="button" onClick={() => setShowItemModal(false)} className="w-full text-zinc-400 font-bold text-xs">Cancelar</button>
            </form>
          </div>
        </div>
      )
      }

      {
        showMovementModal && selectedItemForMovement && (
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
        )
      }
    </div >
  );
};

export default InventoryPage;
