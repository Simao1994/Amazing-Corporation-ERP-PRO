
import React, { useState, useEffect, useMemo } from 'react';
import { Wrench, Plus, Search, X, Trash2, Edit, Save, Car, User, Clock, ShieldCheck, AlertCircle, Printer, CloudUpload, FileText, CheckCircle2, MoreHorizontal, UserCheck, MessageSquare, MapPin, Users, Briefcase, RefreshCw } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { formatAOA } from '../constants';
import { Manutencao, Motoqueiro, ManutencaoItem } from '../types';
import { AmazingStorage, STORAGE_KEYS } from '../utils/storage';
import { supabase } from '../src/lib/supabase';
import Logo from '../components/Logo';

const MaintenancePage: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState<Manutencao | null>(null);
  const [printingItem, setPrintingItem] = useState<Manutencao | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [records, setRecords] = useState<Manutencao[]>([]);
  const [frota, setFrota] = useState<any[]>([]);

  const fetchMaintenanceData = async () => {
    setIsLoading(true);
    try {
      // Fetch Records
      const { data: mainData, error: mainError } = await supabase.from('manutencao').select('*').order('created_at', { ascending: false });
      if (mainError) throw mainError;
      if (mainData) {
        setRecords(mainData.map((m: any) => ({
          id: m.id,
          descricao: m.descricao,
          matricula: m.ativo_nome,
          quantidade: m.pecas_utilizadas ? m.pecas_utilizadas.length : 0,
          preco_total: Number(m.custo),
          data_manutencao: m.data_inicio,
          responsavel_id: m.tecnico_responsavel,
          supervisor_id: m.notas?.match(/Supervisor: (.*?)(?:$|\n)/)?.[1] || 'N/A',
          condutor_nome: m.notas?.match(/Condutor: (.*?)(?:$|\n)/)?.[1] || '',
          municipio: m.notas?.match(/Município: (.*?)(?:$|\n)/)?.[1] || '',
          grupo: m.notas?.match(/Grupo: (.*?)(?:$|\n)/)?.[1] || '',
          responsavel_grupo: m.notas?.match(/Resp. Grupo: (.*?)(?:$|\n)/)?.[1] || '',
          observacoes_gerais: m.notas?.replace(/Supervisor:.*|Condutor:.*|Município:.*|Grupo:.*|Resp. Grupo:.*/g, '').trim(),
          status: m.status as any,
          categoria: m.tipo_manutencao as any,
          itens: m.pecas_utilizadas || [],
          quilometragem: m.quilometragem,
          proxima_revisao_km: m.proxima_revisao_km,
          nivel_combustivel: m.nivel_combustivel,
          estado_pneus: m.estado_pneus,
          tipo_veiculo: m.tipo_veiculo
        })));
      }

      // Fetch Fleet
      const { data: fleetData, error: fleetError } = await supabase.from('veiculos').select('*');
      if (fleetError) throw fleetError;
      setFrota(fleetData || []);

    } catch (error) {
      console.error('Error fetching maintenance data:', error);
      alert('Erro ao carregar dados de manutenção. Verifique a sua ligação.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMaintenanceData();
  }, []);

  // Estado para os campos gerais da ordem
  const [formData, setFormData] = useState({
    matricula: '',
    responsavel: '', // Mecânico / Técnico
    supervisor: '', // Validação Final
    condutor: '',
    municipio: '',
    grupo: '',
    responsavelGrupo: '',
    observacoesGerais: '',
    status: 'Pendente' as Manutencao['status'],
    categoria: 'Correctiva' as Manutencao['categoria'],
    quilometragem: '' as string | number,
    proximaRevisao: '' as string | number,
    nivelCombustivel: '1/2' as Manutencao['nivel_combustivel'],
    estadoPneus: 'Bom',
    tipoVeiculo: 'Mota'
  });

  // Efeito: Vincula automaticamente Condutor, Grupo e Município ao selecionar Matrícula
  useEffect(() => {
    if (formData.matricula && !editingItem) {
      const veiculo = frota.find(v => v.matricula === formData.matricula);
      if (veiculo) {
        setFormData(prev => ({
          ...prev,
          condutor: veiculo.nome,
          municipio: veiculo.municipio || 'Benguela',
          grupo: veiculo.grupo || 'Geral',
          // Tenta inferir o responsável do grupo se houver lógica, senão deixa vazio para preenchimento
          responsavelGrupo: ''
        }));
      }
    }
  }, [formData.matricula, frota, editingItem]);

  // Estado para as 20 linhas da tabela
  const [itensTabela, setItensTabela] = useState<ManutencaoItem[]>([]);

  // Inicializa a tabela com 20 linhas vazias
  const initializeTable = (existingItems?: ManutencaoItem[]) => {
    const rows: ManutencaoItem[] = [];
    const today = new Date().toISOString().split('T')[0];

    for (let i = 0; i < 20; i++) {
      if (existingItems && existingItems[i]) {
        rows.push(existingItems[i]);
      } else {
        rows.push({
          id: Math.random().toString(36).substr(2, 9),
          numero: i + 1,
          descricao: '',
          quantidade: 0,
          preco_unitario: 0,
          preco_total: 0,
          data_manutencao: today,
          observacoes: ''
        });
      }
    }
    setItensTabela(rows);
  };

  const handleItemChange = (index: number, field: keyof ManutencaoItem, value: any) => {
    const newItems = [...itensTabela];
    newItems[index] = { ...newItems[index], [field]: value };

    // Cálculo automático: Qtd * Preço Unitário = Total
    if (field === 'quantidade' || field === 'preco_unitario') {
      const qtd = Number(newItems[index].quantidade) || 0;
      const preco = Number(newItems[index].preco_unitario) || 0;
      newItems[index].preco_total = qtd * preco;
    }

    setItensTabela(newItems);
  };

  const clearRow = (index: number) => {
    const newItems = [...itensTabela];
    newItems[index] = {
      ...newItems[index],
      descricao: '',
      quantidade: 0,
      preco_unitario: 0,
      preco_total: 0,
      observacoes: ''
    };
    setItensTabela(newItems);
  };

  const grandTotal = useMemo(() => {
    return itensTabela.reduce((acc, item) => acc + (item.preco_total || 0), 0);
  }, [itensTabela]);

  const filteredRecords = useMemo(() => {
    return records.filter(r =>
      r.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.matricula.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, records]);

  const stats = useMemo(() => {
    const total = records.reduce((acc, curr) => acc + curr.preco_total, 0);
    const count = records.length;
    const pendentes = records.filter(r => r.status === 'Pendente').length;
    return { total, count, pendentes };
  }, [records]);

  const handleOpenModal = (item?: Manutencao) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        matricula: item.matricula,
        responsavel: item.responsavel_id,
        supervisor: item.supervisor_id,
        condutor: item.condutor_nome || '',
        municipio: item.municipio || '',
        grupo: item.grupo || '',
        responsavelGrupo: item.responsavel_grupo || '',
        observacoesGerais: item.observacoes_gerais || '',
        status: item.status,
        categoria: item.categoria,
        quilometragem: item.quilometragem || '',
        proximaRevisao: item.proxima_revisao_km || '',
        nivelCombustivel: item.nivel_combustivel || '1/2',
        estadoPneus: item.estado_pneus || 'Bom',
        tipoVeiculo: item.tipo_veiculo || 'Mota'
      });
      initializeTable(item.itens);
    } else {
      setEditingItem(null);
      setFormData({
        matricula: frota.length > 0 ? frota[0].matricula : '',
        responsavel: '',
        supervisor: '',
        condutor: '',
        municipio: '',
        grupo: '',
        responsavelGrupo: '',
        observacoesGerais: '',
        status: 'Pendente',
        categoria: 'Correctiva',
        quilometragem: '',
        proximaRevisao: '',
        nivelCombustivel: '1/2',
        estadoPneus: 'Bom',
        tipoVeiculo: 'Mota'
      });
      initializeTable();
    }
    setShowModal(true);
  };

  const handlePrint = (item: Manutencao) => {
    setPrintingItem(item);
    setTimeout(() => {
      window.print();
      setPrintingItem(null);
    }, 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.matricula || !formData.supervisor) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setIsLoading(true);
    setIsSyncing(true);

    const filledItems = itensTabela.filter(i => i.descricao.trim() !== '');
    const descricaoGeral = formData.observacoesGerais || (filledItems.length > 0 ? filledItems[0].descricao : 'Manutenção Geral');

    // Notes field is used to store extra metadata as it's a simple text field in the current schema
    const combinedNotes = `Supervisor: ${formData.supervisor}\nCondutor: ${formData.condutor}\nMunicípio: ${formData.municipio}\nGrupo: ${formData.grupo}\nResp. Grupo: ${formData.responsavelGrupo}\n\n${formData.observacoesGerais}`;

    const dbData = {
      tipo_ativo: 'Veículo',
      ativo_nome: formData.matricula,
      tipo_manutencao: formData.categoria,
      descricao: descricaoGeral,
      tecnico_responsavel: formData.responsavel || 'Oficina Central',
      data_inicio: new Date().toISOString(),
      custo: grandTotal,
      status: formData.status,
      prioridade: 'Média',
      pecas_utilizadas: filledItems,
      notas: combinedNotes,
      updated_at: new Date().toISOString(),
      quilometragem: Number(formData.quilometragem) || null,
      proxima_revisao_km: Number(formData.proximaRevisao) || null,
      nivel_combustivel: formData.nivelCombustivel,
      estado_pneus: formData.estadoPneus,
      tipo_veiculo: formData.tipoVeiculo
    };

    try {
      if (editingItem) {
        const { error } = await supabase.from('manutencao').update(dbData).eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('manutencao').insert([{ ...dbData, created_at: new Date().toISOString() }]);
        if (error) throw error;
      }

      fetchMaintenanceData();
      AmazingStorage.logAction(editingItem ? 'Actualização' : 'Novo Registo', 'Manutenção', `${dbData.tipo_manutencao} - ${dbData.ativo_nome}`);
      setShowModal(false);
    } catch (error) {
      alert('Erro ao guardar ordem de serviço');
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Concluída': return 'bg-green-100 text-green-700 border-green-200';
      case 'Em Curso': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
  };

  // O carregamento agora é não-bloqueante

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* VIEW DE IMPRESSÃO - ORDEM DE SERVIÇO */}
      {printingItem && (
        <div className="print-only p-12 bg-white text-zinc-900 min-h-screen relative">
          <div className="flex justify-between items-start border-b-4 border-zinc-900 pb-8 mb-10">
            <Logo className="h-12" showTagline />
            <div className="text-right">
              <h1 className="text-3xl font-black uppercase tracking-tighter">Ordem de Serviço</h1>
              <p className="text-zinc-500 font-bold">Nº Registo: {printingItem.id}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-12 mb-10 bg-zinc-50 p-6 rounded-xl border border-zinc-100">
            <div className="space-y-4">
              <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest border-b pb-1">Identificação</h3>
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase">Matrícula</p>
                  <p className="text-xl font-black">{printingItem.matricula}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase">Condutor (Motoqueiro)</p>
                  <p className="text-sm font-bold text-zinc-800">{printingItem.condutor_nome || '-'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">Município</p>
                    <p className="text-sm font-bold text-zinc-800">{printingItem.municipio || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">Grupo</p>
                    <p className="text-sm font-bold text-zinc-800">{printingItem.grupo || '-'}</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-zinc-200 mt-2">
                  <h4 className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2">Dados Técnicos do Veículo</h4>
                  <div className="grid grid-cols-2 gap-y-3">
                    <div>
                      <p className="text-[8px] font-bold text-zinc-400 uppercase">Quilometragem</p>
                      <p className="text-sm font-black">{printingItem.quilometragem || '-'} KM</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold text-zinc-400 uppercase">Combustível</p>
                      <p className="text-sm font-black">{printingItem.nivel_combustivel || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold text-zinc-400 uppercase">Próxima Revisão</p>
                      <p className="text-sm font-bold text-zinc-600">{printingItem.proxima_revisao_km ? `${printingItem.proxima_revisao_km} KM` : '-'}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold text-zinc-400 uppercase">Estado Pneus</p>
                      <p className="text-sm font-bold text-zinc-600">{printingItem.estado_pneus || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest border-b pb-1">Dados da Intervenção</h3>
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase">Data de Entrada</p>
                <p className="text-xl font-black">{new Date(printingItem.data_manutencao).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-6">
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase">Categoria</p>
                  <p className="text-sm font-bold text-zinc-600">{printingItem.categoria}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase">Estado</p>
                  <p className="text-sm font-bold text-zinc-600">{printingItem.status}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-10">
            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">Detalhamento dos Serviços</h3>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-zinc-900">
                  <th className="py-2 text-xs font-black uppercase w-12 text-center">Nº</th>
                  <th className="py-2 text-xs font-black uppercase">Descrição</th>
                  <th className="py-2 text-xs font-black uppercase text-center w-24">Qtd</th>
                  <th className="py-2 text-xs font-black uppercase text-right w-32">Unitário</th>
                  <th className="py-2 text-xs font-black uppercase text-right w-32">Total</th>
                </tr>
              </thead>
              <tbody>
                {printingItem.itens?.filter(i => i.descricao).map((item, idx) => (
                  <tr key={idx} className="border-b border-zinc-100">
                    <td className="py-3 text-sm text-center font-bold text-zinc-400">{item.numero}</td>
                    <td className="py-3 text-sm font-bold">{item.descricao}</td>
                    <td className="py-3 text-sm text-center">{item.quantidade}</td>
                    <td className="py-3 text-sm text-right">{formatAOA(item.preco_unitario)}</td>
                    <td className="py-3 text-sm text-right font-black">{formatAOA(item.preco_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mb-12">
            <div className="p-6 bg-zinc-900 text-white rounded-2xl shadow-xl w-64 border-l-8 border-yellow-500">
              <p className="text-[10px] font-black text-yellow-500 uppercase">Total Geral</p>
              <p className="text-2xl font-black">{formatAOA(printingItem.preco_total)}</p>
            </div>
          </div>

          {printingItem.observacoes_gerais && (
            <div className="mb-10 p-4 border border-zinc-200 rounded-xl bg-zinc-50">
              <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Observações Adicionais</h3>
              <p className="text-sm font-medium italic">"{printingItem.observacoes_gerais}"</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-20 pt-20 mt-auto border-t border-zinc-200">
            <div className="text-center">
              <div className="border-b border-zinc-900 mb-2 w-3/4 mx-auto"></div>
              <p className="text-sm font-bold uppercase">{printingItem.condutor_nome || 'Condutor'}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Assinatura do Motoqueiro</p>
            </div>
            <div className="text-center">
              <div className="border-b border-zinc-900 mb-2 w-3/4 mx-auto"></div>
              <p className="text-sm font-bold uppercase">{printingItem.supervisor_id || 'Supervisor'}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Assinatura Responsável (Validação)</p>
            </div>
          </div>
        </div>
      )}

      {/* INTERFACE WEB */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-sky-200 print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="text-yellow-500" size={14} />
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em]">Departamento Técnico</span>
          </div>
          <h1 className="text-4xl font-black text-zinc-900 tracking-tight uppercase">Gestão de Oficina</h1>
          <p className="text-zinc-500 font-medium mt-1">Controle rigoroso de manutenções com integração à Frota Express.</p>
        </div>

        <div className="flex items-center gap-4">
          {isSyncing && (
            <div className="flex items-center gap-2 text-sky-600 animate-pulse bg-sky-50 px-4 py-2 rounded-xl border border-sky-100">
              <CloudUpload size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest">Sincronizando Cloud...</span>
            </div>
          )}
          <button
            onClick={() => handleOpenModal()}
            className="px-8 py-4 bg-zinc-900 text-white font-black rounded-2xl shadow-xl shadow-zinc-900/10 hover:bg-zinc-800 transition-all active:scale-95 flex items-center gap-3 uppercase text-[10px] tracking-widest"
          >
            <Plus size={20} /> Nova Ordem de Serviço
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
        <div className="bg-white p-8 rounded-[2.5rem] border border-sky-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
            <CheckCircle2 size={100} className="text-green-500" />
          </div>
          <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Total Investido</p>
          <p className="text-4xl font-black text-zinc-900">{formatAOA(stats.total)}</p>
          <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-green-600">
            ✓ Custos consolidados
          </div>
        </div>

        <div className="bg-zinc-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <Wrench size={120} />
          </div>
          <p className="text-yellow-500 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Intervenções Realizadas</p>
          <p className="text-5xl font-black">{stats.count}</p>
          <p className="text-xs text-zinc-400 font-bold mt-2">Ordens de serviço registadas</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-sky-100 shadow-sm flex flex-col justify-between group">
          <div className="flex justify-between items-center mb-4">
            <div className={`p-3 rounded-2xl ${stats.pendentes > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
              <AlertCircle size={20} />
            </div>
            <span className="text-[9px] font-black text-zinc-300 uppercase">Estado da Oficina</span>
          </div>
          <div>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Trabalhos Pendentes</p>
            <p className="text-2xl font-black text-zinc-900">{stats.pendentes} Serviços</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-3 rounded-[2rem] shadow-sm border border-sky-100 print:hidden">
        <Input
          placeholder="Pesquisar por descrição do serviço ou matrícula do veículo..."
          icon={<Search size={22} className="text-zinc-400" />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent border-none py-4 text-lg font-bold placeholder:font-normal"
        />
      </div>

      <div className="bg-white rounded-[3rem] shadow-sm border border-sky-100 overflow-hidden print:hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">
                <th className="px-10 py-8">Serviço & Veículo</th>
                <th className="px-10 py-8">Estado / Tipo</th>
                <th className="px-10 py-8 text-center">Data</th>
                <th className="px-10 py-8 text-right">Custo Total</th>
                <th className="px-10 py-8 text-right">Acções</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {isLoading && records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-10 py-24 text-center space-y-4">
                    <RefreshCw className="mx-auto w-10 h-10 text-yellow-500 animate-spin" />
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest animate-pulse">A sintonizar Oficina...</p>
                  </td>
                </tr>
              ) : filteredRecords.length > 0 ? (
                filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-zinc-50/30 transition-all group">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400 group-hover:bg-yellow-500 group-hover:text-white transition-all shadow-inner">
                          <Car size={24} />
                        </div>
                        <div>
                          <span className="font-black text-zinc-900 block text-base leading-tight">{rec.descricao}</span>
                          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1 block">
                            Matrícula: <span className="text-yellow-600">{rec.matricula}</span> • Condutor: {rec.condutor_nome}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <div className="flex flex-col gap-2">
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border w-fit ${getStatusStyle(rec.status)}`}>
                          {rec.status}
                        </span>
                        <span className="text-[9px] font-bold text-zinc-400 uppercase">{rec.categoria}</span>
                      </div>
                    </td>
                    <td className="px-10 py-6 text-center">
                      <div className="flex flex-col items-center">
                        <Clock size={14} className="text-zinc-400 mb-1" />
                        <span className="text-xs font-black text-zinc-700">{new Date(rec.data_manutencao).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <span className="text-lg font-black text-zinc-900">{formatAOA(rec.preco_total)}</span>
                      <p className="text-[9px] font-bold text-zinc-400 uppercase">Itens: {rec.itens ? rec.itens.filter(i => i.descricao).length : rec.quantidade}</p>
                    </td>
                    <td className="px-10 py-6 text-right flex justify-end gap-2">
                      <button onClick={() => handlePrint(rec)} className="p-3 text-zinc-300 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all" title="Imprimir Ordem de Serviço"><Printer size={18} /></button>
                      <button onClick={() => handleOpenModal(rec)} className="p-3 text-zinc-300 hover:text-yellow-600 hover:bg-yellow-50 rounded-xl transition-all" title="Editar Registo"><Edit size={18} /></button>
                      <button onClick={async () => {
                        if (confirm(`Excluir manutenção de ${rec.matricula}?`)) {
                          const { error } = await supabase.from('manutencao').delete().eq('id', rec.id);
                          if (error) {
                            alert('Erro ao excluir manutenção');
                          } else {
                            fetchMaintenanceData();
                            AmazingStorage.logAction('Eliminação', 'Manutenção', `Ordem ${rec.id} removida.`);
                          }
                        }
                      }} className="p-3 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-10 py-24 text-center">
                    <Wrench size={48} className="mx-auto text-sky-100 mb-4" />
                    <p className="text-zinc-400 font-black italic">Nenhum registo de manutenção encontrado.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-7xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50 flex-shrink-0">
              <h2 className="text-2xl font-black text-zinc-900 flex items-center gap-3 uppercase tracking-tight">
                {editingItem ? <Edit className="text-yellow-500" /> : <Wrench className="text-yellow-500" />}
                {editingItem ? 'Actualizar Ordem' : 'Registar Nova Manutenção'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-3 hover:bg-zinc-200 rounded-full transition-all text-zinc-400"><X size={28} /></button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-8 space-y-6 overflow-y-auto flex-1">
                {/* Cabeçalho da Ordem */}
                <div className="bg-zinc-50 p-6 rounded-3xl border border-zinc-100 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="md:col-span-1">
                      <Select
                        name="matricula"
                        label="Veículo da Frota (Amazing Express)"
                        required
                        value={formData.matricula}
                        onChange={(e) => setFormData({ ...formData, matricula: e.target.value })}
                        options={frota.length > 0 ? frota.map(v => ({ value: v.matricula, label: `${v.matricula} - ${v.mota_marca}` })) : [
                          { value: 'APOLO', label: 'Apolo' },
                          { value: 'LINGKEN', label: 'Lingken' },
                          { value: 'BALDEX', label: 'Baldex' }
                        ]}
                      />
                    </div>
                    <div className="md:col-span-1">
                      <Input
                        label="Responsável Técnico (Mecânico)"
                        value={formData.responsavel}
                        onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                        placeholder="Nome do Técnico"
                        required
                      />
                    </div>
                    <div className="md:col-span-1">
                      <Select
                        label="Tipo de Manutenção"
                        value={formData.categoria}
                        onChange={(e) => setFormData({ ...formData, categoria: e.target.value as Manutencao['categoria'] })}
                        options={[
                          { value: 'Preventiva', label: 'Manutenção Preventiva' },
                          { value: 'Correctiva', label: 'Manutenção Correctiva' }
                        ]}
                      />
                    </div>
                    <div className="md:col-span-1">
                      <Select
                        label="Estado do Serviço"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as Manutencao['status'] })}
                        options={[
                          { value: 'Pendente', label: 'Pendente / Entrada' },
                          { value: 'Em Curso', label: 'Em Curso / Oficina' },
                          { value: 'Concluída', label: 'Concluída / Pronto' }
                        ]}
                      />
                    </div>
                  </div>
                </div>

                {/* Dados do Veículo (Novo Bloco) */}
                <div className="bg-white p-6 rounded-3xl border border-sky-100 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Car size={16} className="text-yellow-600" />
                    <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Informação Técnica do Veículo</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                    <Input
                      label="Quilometragem Actual (KM)"
                      type="number"
                      placeholder="Ex: 15400"
                      value={formData.quilometragem}
                      onChange={(e) => setFormData({ ...formData, quilometragem: e.target.value })}
                    />
                    <Input
                      label="Próxima Revisão (KM)"
                      type="number"
                      placeholder="Ex: 20000"
                      value={formData.proximaRevisao}
                      onChange={(e) => setFormData({ ...formData, proximaRevisao: e.target.value })}
                    />
                    <Select
                      label="Nível de Combustível"
                      value={formData.nivelCombustivel}
                      onChange={(e) => setFormData({ ...formData, nivelCombustivel: e.target.value as any })}
                      options={[
                        { value: 'Vazio', label: 'Vazio' },
                        { value: '1/4', label: '1/4' },
                        { value: '1/2', label: '1/2' },
                        { value: '3/4', label: '3/4' },
                        { value: 'Cheio', label: 'Cheio' }
                      ]}
                    />
                    <Select
                      label="Estado dos Pneus"
                      value={formData.estadoPneus}
                      onChange={(e) => setFormData({ ...formData, estadoPneus: e.target.value })}
                      options={[
                        { value: 'Novo', label: 'Novos/Excelentes' },
                        { value: 'Bom', label: 'Bom Estado' },
                        { value: 'Desgastado', label: 'Desgastados (Troca Próxima)' },
                        { value: 'Critico', label: 'Crítico (Trocar Agora)' }
                      ]}
                    />
                    <Select
                      label="Tipo de Veículo"
                      value={formData.tipoVeiculo}
                      onChange={(e) => setFormData({ ...formData, tipoVeiculo: e.target.value })}
                      options={[
                        { value: 'Mota', label: 'Motociclo / Mota' },
                        { value: 'Ligeiro', label: 'Viatura Ligeira' },
                        { value: 'Pesado', label: 'Viatura Pesada' }
                      ]}
                    />
                  </div>
                </div>

                {/* Tabela de 20 Linhas */}
                <div className="border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                      <thead>
                        <tr className="bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest">
                          <th className="px-4 py-3 w-12 text-center">Nº</th>
                          <th className="px-4 py-3">Descrição do Serviço / Peça</th>
                          <th className="px-4 py-3 w-24 text-center">Qtd</th>
                          <th className="px-4 py-3 w-32 text-right">Preço Unit.</th>
                          <th className="px-4 py-3 w-32 text-right">Preço Total</th>
                          <th className="px-4 py-3 w-32">Data</th>
                          <th className="px-4 py-3">Obs. Item</th>
                          <th className="px-4 py-3 w-16 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 text-sm">
                        {itensTabela.map((item, index) => (
                          <tr key={index} className="hover:bg-zinc-50 group">
                            <td className="px-4 py-2 text-center font-bold text-zinc-400">{item.numero}</td>
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                className="w-full bg-transparent outline-none font-medium placeholder:text-zinc-300"
                                placeholder="Descrição do item..."
                                value={item.descricao}
                                onChange={(e) => handleItemChange(index, 'descricao', e.target.value)}
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                className="w-full bg-transparent outline-none text-center font-bold"
                                min="0"
                                value={item.quantidade}
                                onChange={(e) => handleItemChange(index, 'quantidade', e.target.value)}
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                className="w-full bg-transparent outline-none text-right font-bold"
                                min="0"
                                value={item.preco_unitario}
                                onChange={(e) => handleItemChange(index, 'preco_unitario', e.target.value)}
                              />
                            </td>
                            <td className="px-4 py-2 text-right font-black text-zinc-700 bg-zinc-50/50">
                              {formatAOA(item.preco_total)}
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="date"
                                className="w-full bg-transparent outline-none text-xs text-zinc-500"
                                value={item.data_manutencao}
                                onChange={(e) => handleItemChange(index, 'data_manutencao', e.target.value)}
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                className="w-full bg-transparent outline-none text-xs text-zinc-500 placeholder:text-zinc-200"
                                placeholder="Notas..."
                                value={item.observacoes}
                                onChange={(e) => handleItemChange(index, 'observacoes', e.target.value)}
                              />
                            </td>
                            <td className="px-4 py-2 text-center">
                              {item.descricao && (
                                <button type="button" onClick={() => clearRow(index)} className="p-1.5 hover:bg-red-50 text-zinc-300 hover:text-red-500 rounded-lg transition-colors">
                                  <X size={14} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Validação e Observações (Novo Bloco) */}
                <div className="bg-zinc-50 p-6 rounded-3xl border border-zinc-100 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare size={16} className="text-yellow-600" />
                    <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Validação & Observações</h3>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700">Observações Gerais da Manutenção</label>
                    <textarea
                      className="w-full bg-white border border-zinc-200 rounded-xl p-4 outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 min-h-[80px] text-sm resize-none"
                      placeholder="Descreva anomalias extras, recomendações para o condutor ou detalhes do serviço..."
                      value={formData.observacoesGerais}
                      onChange={(e) => setFormData({ ...formData, observacoesGerais: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="md:col-span-1">
                      <Input
                        label="Condutor (Automático)"
                        value={formData.condutor}
                        readOnly
                        className="bg-zinc-100 text-zinc-600 cursor-not-allowed border-zinc-200"
                        icon={<User size={16} />}
                      />
                    </div>

                    <div className="md:col-span-1">
                      <Input
                        label="Município"
                        value={formData.municipio}
                        readOnly
                        className="bg-zinc-100 text-zinc-600 cursor-not-allowed border-zinc-200"
                        icon={<MapPin size={16} />}
                      />
                    </div>

                    <div className="md:col-span-1">
                      <Input
                        label="Grupo"
                        value={formData.grupo}
                        readOnly
                        className="bg-zinc-100 text-zinc-600 cursor-not-allowed border-zinc-200"
                        icon={<Users size={16} />}
                      />
                    </div>

                    <div className="md:col-span-1">
                      <Input
                        label="Resp. Grupo"
                        placeholder="Nome do Responsável"
                        value={formData.responsavelGrupo}
                        onChange={(e) => setFormData({ ...formData, responsavelGrupo: e.target.value })}
                        icon={<UserCheck size={16} />}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <Input
                      label="Supervisor (Validação Final)"
                      placeholder="Nome do Supervisor"
                      required
                      value={formData.supervisor}
                      onChange={(e) => setFormData({ ...formData, supervisor: e.target.value })}
                      icon={<ShieldCheck size={16} className="text-zinc-400" />}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <div className="bg-white border border-zinc-200 p-4 rounded-xl w-64 flex justify-between items-center shadow-sm">
                    <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">Custo Total</span>
                    <span className="text-xl font-black text-zinc-900">{formatAOA(grandTotal)}</span>
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-zinc-100 bg-zinc-50/30 flex justify-end gap-6 flex-shrink-0">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 text-[11px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-600 transition-colors">Cancelar</button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-12 py-4 bg-zinc-900 text-white font-black rounded-2xl shadow-xl hover:bg-yellow-500 hover:text-zinc-900 transition-all uppercase text-[10px] tracking-[0.2em] flex items-center gap-3 active:scale-95 disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <Save size={20} />
                  )}
                  {editingItem ? 'Actualizar Ficha Completa' : 'Efectivar Ordem de Serviço'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenancePage;
