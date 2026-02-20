
import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import {
  Truck, Users, TrendingUp, AlertCircle, MapPin,
  Activity, LucideIcon, X, ExternalLink, Navigation,
  Bike, CreditCard, Clock, Car, Megaphone, Plus, Calendar, Image as ImageIcon,
  ChevronLeft, ChevronRight, Edit, Trash2, Eye, CheckCircle2,
  Gamepad2, Sprout, Building2, Scale, BarChart3, Zap
} from 'lucide-react';
import { formatAOA } from '../constants';
import Skeleton from '../components/ui/Skeleton';
import { AmazingStorage, STORAGE_KEYS } from '../utils/storage';
import { Funcionario, Motoqueiro, NotaFiscal, User, InternalAd, Imovel, Agricultor, ArenaTournament } from '../types';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { supabase } from '../src/lib/supabase';

const weeklyData = [
  { name: 'Seg', viagens: 45, receita: 125000 },
  { name: 'Ter', viagens: 52, receita: 145000 },
  { name: 'Qua', viagens: 38, receita: 110000 },
  { name: 'Qui', viagens: 65, receita: 180000 },
  { name: 'Sex', viagens: 48, receita: 135000 },
  { name: 'Sáb', viagens: 70, receita: 195000 },
  { name: 'Dom', viagens: 25, receita: 85000 },
];

const Dashboard: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [showAdModal, setShowAdModal] = useState(false);

  // --- CARREGAMENTO DE DADOS MULTISSECTORIAL ---

  const [metrics, setMetrics] = useState({
    fleetCount: 0,
    agricultoresCount: 0,
    imoveisCount: 0,
    imoveisValor: 0,
    torneiosCount: 0,
    totalInvoiced: 0,
    staffCount: 0
  });

  const [ads, setAds] = useState<InternalAd[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [editingAd, setEditingAd] = useState<InternalAd | null>(null);
  const [currentUser, setCurrentUser] = useState<User>({ id: 'sys', nome: 'System', role: 'admin', email: '' });

  const activeAds = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return ads.filter(ad =>
      ad.active &&
      ad.startDate <= today &&
      ad.endDate >= today &&
      (ad.targetRoles === 'all' || ad.targetRoles.includes(currentUser.role))
    );
  }, [ads, currentUser]);

  const fetchMetrics = async () => {
    try {
      const [
        { count: fleetCount },
        { count: agroCount },
        { data: imoveisData },
        { count: arenaCount },
        { data: notasData },
        { count: staffCount }
      ] = await Promise.all([
        supabase.from('expr_fleet').select('*', { count: 'exact', head: true }),
        supabase.from('agro_agricultores').select('*', { count: 'exact', head: true }),
        supabase.from('real_imoveis').select('preco_venda'),
        supabase.from('arena_tournaments').select('*', { count: 'exact', head: true }),
        supabase.from('fin_notas').select('valor_total'),
        supabase.from('funcionarios').select('*', { count: 'exact', head: true })
      ]);

      setMetrics({
        fleetCount: fleetCount || 0,
        agricultoresCount: agroCount || 0,
        imoveisCount: imoveisData?.length || 0,
        imoveisValor: imoveisData?.reduce((acc, i) => acc + (Number(i.preco_venda) || 0), 0) || 0,
        torneiosCount: arenaCount || 0,
        totalInvoiced: notasData?.reduce((acc, n) => acc + (Number(n.valor_total) || 0), 0) || 0,
        staffCount: staffCount || 0
      });
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
    }
  };

  const fetchAds = async () => {
    try {
      const { data, error } = await supabase.from('sys_ads').select('*').eq('active', true);
      if (error) throw error;
      if (data) {
        setAds(data.map(ad => ({
          ...ad,
          imageUrl: ad.imageurl, // Handle field case sensitivity from SQL
          startDate: ad.startdate,
          endDate: ad.enddate,
          targetRoles: ad.targetroles
        })));
      }
    } catch (err) {
      console.error('Error fetching ads:', err);
    }
  };

  const loadProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setCurrentUser({
        id: session.user.id,
        nome: session.user.user_metadata?.nome || 'Utilizador',
        role: session.user.user_metadata?.role || 'admin',
        email: session.user.email || ''
      });
    }
  };

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchMetrics(), fetchAds(), loadProfile()]);
      setIsLoading(false);
    };
    init();
  }, []);

  const handleSaveAd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newAd: InternalAd = {
      id: editingAd ? editingAd.id : Math.random().toString(36).substr(2, 9),
      title: fd.get('title') as string,
      description: fd.get('description') as string,
      imageUrl: fd.get('image') as string || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=800',
      link: fd.get('link') as string,
      startDate: fd.get('start') as string,
      endDate: fd.get('end') as string,
      targetRoles: 'all',
      active: true,
      views: editingAd ? editingAd.views : 0,
      clicks: editingAd ? editingAd.clicks : 0,
      createdBy: currentUser.nome
    };

    if (editingAd) {
      setAds(ads.map(a => a.id === newAd.id ? newAd : a));
    } else {
      setAds([...ads, newAd]);
    }
    setShowAdModal(false);
    setEditingAd(null);
  };

  const handleDeleteAd = (id: string) => {
    if (confirm('Eliminar anúncio?')) {
      setAds(ads.filter(a => a.id !== id));
    }
  };

  const nextAd = () => setCurrentAdIndex((prev) => (prev + 1) % activeAds.length);
  const prevAd = () => setCurrentAdIndex((prev) => (prev - 1 + activeAds.length) % activeAds.length);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24">

      {/* --- BANNER DE PUBLICIDADE INTERNA --- */}
      {activeAds.length > 0 && (
        <div className="relative w-full h-64 rounded-[3rem] overflow-hidden shadow-xl group">
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-700 transform hover:scale-105"
            style={{ backgroundImage: `url(${activeAds[currentAdIndex].imageUrl})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-zinc-950/40 to-transparent"></div>
          </div>

          <div className="relative z-10 p-10 h-full flex flex-col justify-center max-w-2xl text-white">
            <span className="bg-yellow-500 text-zinc-900 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg w-fit mb-4">
              Comunicado Interno
            </span>
            <h2 className="text-3xl font-black mb-2 leading-tight">{activeAds[currentAdIndex].title}</h2>
            <p className="text-zinc-200 text-sm font-medium leading-relaxed">{activeAds[currentAdIndex].description}</p>

            {activeAds[currentAdIndex].link && (
              <a
                href={activeAds[currentAdIndex].link}
                target="_blank"
                rel="noreferrer"
                className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:text-yellow-500 transition-colors"
              >
                Saber Mais <ExternalLink size={14} />
              </a>
            )}
          </div>

          {activeAds.length > 1 && (
            <div className="absolute bottom-6 right-8 flex gap-2 z-20">
              <button onClick={prevAd} className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all"><ChevronLeft size={20} /></button>
              <button onClick={nextAd} className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all"><ChevronRight size={20} /></button>
            </div>
          )}

          {user.role === 'admin' && (
            <button
              onClick={() => setShowAdModal(true)}
              className="absolute top-6 right-8 bg-zinc-900/80 hover:bg-zinc-900 text-white p-3 rounded-2xl backdrop-blur-md transition-all shadow-lg border border-white/10 z-30"
              title="Gerir Publicidade"
            >
              <Megaphone size={18} />
            </button>
          )}
        </div>
      )}

      {/* --- HEADER --- */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-zinc-900 tracking-tight uppercase">Dashboard <span className="text-yellow-500 underline decoration-4 underline-offset-8">Central</span></h1>
          <p className="text-zinc-500 font-bold mt-2 flex items-center gap-2">
            <Activity size={16} className="text-yellow-500 animate-pulse" /> Olá, {currentUser.nome} • Visão Consolidada v4.0
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl shadow-sm border border-sky-100">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">Holding Online</span>
        </div>
      </header>

      {/* --- CARDS MULTISSECTORIAIS (ECOSSISTEMA) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">

        {/* 1. Amazing Express */}
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 p-6 rounded-[2.5rem] shadow-xl text-zinc-900 relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
          <div className="absolute -right-4 -bottom-4 opacity-20 group-hover:scale-110 transition-transform"><Truck size={80} /></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md"><Truck size={20} className="text-zinc-900" /></div>
            <span className="text-[9px] font-black uppercase bg-white/20 px-2 py-1 rounded-lg">Express</span>
          </div>
          <div className="relative z-10">
            <p className="text-4xl font-black">{metrics.fleetCount}</p>
            <p className="text-[10px] font-black uppercase tracking-widest mt-1 opacity-80">Veículos na Frota</p>
          </div>
        </div>

        {/* 2. Amazing Agro */}
        <div className="bg-gradient-to-br from-green-600 to-green-700 p-6 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
          <div className="absolute -right-4 -bottom-4 opacity-20 group-hover:scale-110 transition-transform"><Sprout size={80} /></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md"><Sprout size={20} className="text-white" /></div>
            <span className="text-[9px] font-black uppercase bg-white/20 px-2 py-1 rounded-lg">Agro</span>
          </div>
          <div className="relative z-10">
            <p className="text-4xl font-black">{metrics.agricultoresCount}</p>
            <p className="text-[10px] font-black uppercase tracking-widest mt-1 opacity-80">Agricultores</p>
          </div>
        </div>

        {/* 3. Amazing Imobiliário */}
        <div className="bg-gradient-to-br from-orange-500 to-red-500 p-6 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
          <div className="absolute -right-4 -bottom-4 opacity-20 group-hover:scale-110 transition-transform"><Building2 size={80} /></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md"><Building2 size={20} className="text-white" /></div>
            <span className="text-[9px] font-black uppercase bg-white/20 px-2 py-1 rounded-lg">Imob</span>
          </div>
          <div className="relative z-10">
            <p className="text-4xl font-black">{metrics.imoveisCount}</p>
            <p className="text-[10px] font-black uppercase tracking-widest mt-1 opacity-80">Imóveis Geridos</p>
          </div>
        </div>

        {/* 4. Amazing Arena */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-6 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
          <div className="absolute -right-4 -bottom-4 opacity-20 group-hover:scale-110 transition-transform"><Gamepad2 size={80} /></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md"><Gamepad2 size={20} className="text-white" /></div>
            <span className="text-[9px] font-black uppercase bg-white/20 px-2 py-1 rounded-lg">Arena</span>
          </div>
          <div className="relative z-10">
            <p className="text-4xl font-black">{metrics.torneiosCount}</p>
            <p className="text-[10px] font-black uppercase tracking-widest mt-1 opacity-80">Torneios Activos</p>
          </div>
        </div>

        {/* 5. ContábilExpert */}
        <div className="bg-gradient-to-br from-sky-500 to-blue-600 p-6 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
          <div className="absolute -right-4 -bottom-4 opacity-20 group-hover:scale-110 transition-transform"><Scale size={80} /></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md"><Scale size={20} className="text-white" /></div>
            <span className="text-[9px] font-black uppercase bg-white/20 px-2 py-1 rounded-lg">Contábil</span>
          </div>
          <div className="relative z-10">
            <p className="text-2xl font-black truncate">{formatAOA(metrics.totalInvoiced)}</p>
            <p className="text-[10px] font-black uppercase tracking-widest mt-1 opacity-80">Faturação Total</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] shadow-sm border border-sky-100">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-2xl font-black text-zinc-900">Performance do Grupo</h2>
              <p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.3em] mt-1">Consolidado Semanal</p>
            </div>
            <div className="flex gap-2">
              <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
              <span className="text-xs font-bold text-zinc-500">Receita Operacional</span>
            </div>
          </div>
          <div className="h-80">
            {isLoading ? <Skeleton className="h-full w-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyData}>
                  <defs>
                    <linearGradient id="colorViagens" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#eab308" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a', fontWeight: 'bold' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a', fontWeight: 'bold' }} dx={-10} />
                  <Tooltip
                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '20px' }}
                    itemStyle={{ fontWeight: 'black', fontSize: '14px', textTransform: 'uppercase' }}
                    formatter={(value: number) => formatAOA(value)}
                  />
                  <Area type="monotone" dataKey="receita" stroke="#eab308" fillOpacity={1} fill="url(#colorViagens)" strokeWidth={4} dot={{ r: 6, fill: '#eab308', strokeWidth: 3, stroke: '#fff' }} activeDot={{ r: 8 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-zinc-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden h-full">
            <div className="absolute -right-8 -bottom-8 opacity-10">
              <Users size={180} />
            </div>
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xs font-black text-yellow-500 uppercase tracking-[0.4em]">Capital Humano</h3>
              <span className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-black">{metrics.staffCount} Colaboradores</span>
            </div>

            <div className="space-y-6 relative z-10">
              {/* Note: lastMotoqueiros was removed in favor of direct metric, 
                  adding a placeholder or fetching them specifically if needed */}
              <p className="text-sm text-zinc-400 italic">Sincronização em tempo real activada via Supabase Cloud.</p>
            </div>

            <div className="mt-12 pt-8 border-t border-white/5">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Valor Patrimonial (Imob)</p>
              <p className="text-2xl font-black text-white">{formatAOA(metrics.imoveisValor)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* --- MODAL DE GESTÃO DE ANÚNCIOS (ADMIN) --- */}
      {showAdModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
              <h2 className="text-xl font-black text-zinc-900 flex items-center gap-3 uppercase tracking-tight">
                <Megaphone className="text-yellow-500" /> Gestão de Publicidade Interna
              </h2>
              <button onClick={() => setShowAdModal(false)} className="p-3 text-zinc-400 hover:bg-zinc-200 rounded-full transition-all"><X size={24} /></button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              <div className="w-1/3 bg-zinc-50 border-r border-zinc-100 p-6 overflow-y-auto space-y-4">
                <button
                  onClick={() => setEditingAd(null)}
                  className="w-full py-3 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all shadow-md"
                >
                  <Plus size={14} /> Novo Anúncio
                </button>

                {ads.map(ad => (
                  <div key={ad.id} className="bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm hover:border-yellow-500 transition-all group relative cursor-pointer" onClick={() => setEditingAd(ad)}>
                    <div className="flex items-center gap-3 mb-2">
                      <img src={ad.imageUrl} className="w-10 h-10 rounded-lg object-cover bg-zinc-200" />
                      <div className="overflow-hidden">
                        <p className="font-bold text-xs truncate text-zinc-900">{ad.title}</p>
                        <p className={`text-[9px] font-bold uppercase tracking-widest ${ad.active ? 'text-green-600' : 'text-zinc-400'}`}>
                          {ad.active ? 'Activo' : 'Inactivo'}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[9px] text-zinc-400 border-t border-zinc-50 pt-2 mt-2">
                      <span className="flex items-center gap-1"><Eye size={10} /> {ad.views}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteAd(ad.id); }}
                        className="hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSaveAd} className="flex-1 p-8 space-y-6 overflow-y-auto">
                <Input name="title" label="Título do Anúncio" defaultValue={editingAd?.title} required placeholder="Ex: Campanha de Vacinação" />

                <div className="space-y-1">
                  <label className="text-sm font-medium text-zinc-700">Descrição / Texto</label>
                  <textarea
                    name="description"
                    defaultValue={editingAd?.description}
                    className="w-full p-3 bg-white border border-zinc-200 rounded-xl outline-none focus:border-yellow-500 text-sm h-24 resize-none"
                    required
                  />
                </div>

                <Input name="image" label="URL da Imagem (Banner)" defaultValue={editingAd?.imageUrl} placeholder="https://..." icon={<ImageIcon size={16} />} />
                <Input name="link" label="Link Externo (Opcional)" defaultValue={editingAd?.link} placeholder="https://..." icon={<ExternalLink size={16} />} />

                <div className="grid grid-cols-2 gap-6">
                  <Input name="start" label="Data Início" type="date" defaultValue={editingAd?.startDate} required />
                  <Input name="end" label="Data Fim" type="date" defaultValue={editingAd?.endDate} required />
                </div>

                <div className="flex justify-end pt-4 border-t border-zinc-100">
                  <button type="submit" className="px-8 py-4 bg-yellow-500 text-zinc-900 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-yellow-400 transition-all flex items-center gap-2 shadow-lg">
                    <CheckCircle2 size={16} /> Salvar Publicidade
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
