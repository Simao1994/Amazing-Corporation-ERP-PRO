
import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, BookOpen, Layers, Clock, Bookmark, Plus, RefreshCw, BarChart4, Hash, Database, Library } from 'lucide-react';
import { supabase } from '../src/lib/supabase';
import { AmazingStorage } from '../utils/storage';
import { User } from '../types';

// Components
import Catalogo from '../components/Library/Catalogo';
import PesquisaBiblioteca from '../components/Library/PesquisaBiblioteca';
import DetalhesMaterial from '../components/Library/DetalhesMaterial';
import GestorCategorias from '../components/Library/GestorCategorias';
import PainelEmprestimos from '../components/Library/PainelEmprestimos';
import PainelReservas from '../components/Library/PainelReservas';
import ModalManuseioMaterial from '../components/Library/ModalManuseioMaterial';
import MeusEmprestimos from '../components/Library/MeusEmprestimos';

const DashboardLibrary: React.FC = () => {
    // Data State
    const [materiais, setMateriais] = useState<any[]>([]);
    const [categorias, setCategorias] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState('');
    const [categoria, setCategoria] = useState('all');
    const [tipo, setTipo] = useState('all');

    // UI State
    const [previewItem, setPreviewItem] = useState<any | null>(null);
    const [showCategorias, setShowCategorias] = useState(false);
    const [showEmprestimos, setShowEmprestimos] = useState(false);
    const [showReservas, setShowReservas] = useState(false);
    const [showManuseio, setShowManuseio] = useState(false);
    const [showMeusItems, setShowMeusItems] = useState(false);
    const [itemParaEditar, setItemParaEditar] = useState<any | null>(null);

    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
                setUser({
                    id: session.user.id,
                    email: session.user.email || '',
                    nome: profile?.nome || session.user.user_metadata?.nome || 'Utilizador',
                    role: profile?.role || 'user'
                });
            }
        };
        fetchUser();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Categorias
            const { data: cats } = await supabase.from('biblioteca_categorias').select('*').order('nome');
            setCategorias(cats || []);

            // Materiais
            let query = supabase.from('biblioteca_materiais').select('*').order('criado_em', { ascending: false });

            if (categoria !== 'all') query = query.eq('categoria_id', categoria);
            if (tipo !== 'all') query = query.eq('tipo_material', tipo);

            const { data: mats } = await query;

            // Search local
            let filtered = mats || [];
            if (search) {
                const s = search.toLowerCase();
                filtered = filtered.filter(m =>
                    m.titulo.toLowerCase().includes(s) ||
                    m.autor.toLowerCase().includes(s) ||
                    m.isbn?.toLowerCase().includes(s) ||
                    m.palavras_chave?.toLowerCase().includes(s)
                );
            }

            setMateriais(filtered);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchData();
    }, [categoria, tipo, search, user]);

    const handleCreateMaterial = () => {
        setItemParaEditar(null);
        setShowManuseio(true);
    };

    const handleUpdate = async (id: string, updates: any) => {
        try {
            const { error } = await supabase.from('biblioteca_materiais').update(updates).eq('id', id);
            if (error) throw error;

            setMateriais(materiais.map(m => m.id === id ? { ...m, ...updates } : m));
            if (previewItem?.id === id) setPreviewItem({ ...previewItem, ...updates });

            // Log Audit
            AmazingStorage.logAction(
                `Ajuste de Material: ${updates.titulo || 'Métricas'}`,
                'Biblioteca',
                `Material ID ${id} atualizado.`,
                'info'
            );
        } catch (err) {
            alert("Erro ao atualizar.");
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const item = materiais.find(m => m.id === id);
            await supabase.from('biblioteca_materiais').delete().eq('id', id);
            setMateriais(materiais.filter(m => m.id !== id));
            setPreviewItem(null);

            AmazingStorage.logAction(
                `Remoção de Material: ${item?.titulo || id}`,
                'Biblioteca',
                `Material removido permanentemente.`,
                'warning'
            );
        } catch (err) {
            alert("Erro ao eliminar.");
        }
    };

    const handleLoan = async (materialId: string) => {
        const dias = prompt("Dias de empréstimo:", "15");
        if (!dias) return;

        try {
            const dataPrevista = new Date();
            dataPrevista.setDate(dataPrevista.getDate() + parseInt(dias));

            await supabase.from('biblioteca_emprestimos').insert({
                material_id: materialId,
                usuario_id: user?.id,
                data_prevista: dataPrevista.toISOString()
            });

            await handleUpdate(materialId, { status_atual: 'emprestado' });

            // Log Audit
            AmazingStorage.logAction(
                `Novo Empréstimo: ${materiais.find(m => m.id === materialId)?.titulo}`,
                'Biblioteca',
                `Material emprestado ao utilizador ${user?.nome}`,
                'info'
            );

            alert("Empréstimo registado!");
        } catch (err) {
            alert("Erro no empréstimo.");
        }
    };

    const handleReserve = async (materialId: string) => {
        try {
            await supabase.from('biblioteca_reservas').insert({
                material_id: materialId,
                usuario_id: user?.id
            });
            await handleUpdate(materialId, { status_atual: 'reservado' });

            // Log Audit
            AmazingStorage.logAction(
                `Nova Reserva: ${materiais.find(m => m.id === materialId)?.titulo}`,
                'Biblioteca',
                `Reserva efetuada pelo utilizador ${user?.nome}`,
                'info'
            );

            alert("Reserva efectuada!");
        } catch (err) {
            alert("Erro na reserva.");
        }
    };

    const stats = useMemo(() => {
        return {
            total: materiais.length,
            fisicos: materiais.filter(m => m.formato === 'fisico').length,
            digitais: materiais.filter(m => m.formato === 'digital').length,
            emprestados: materiais.filter(m => m.status_atual === 'emprestado').length
        };
    }, [materiais]);

    const isLibrarian = user?.role === 'admin' || user?.role === 'librarian' || user?.role === 'bibliotecario';

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            {/* Header Premium */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-sky-200">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-2">
                        <Library className="text-yellow-500" size={14} />
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em]">Conhecimento & Ativos</span>
                    </div>
                    <h1 className="text-4xl font-black text-zinc-900 tracking-tight uppercase">Biblioteca Institucional</h1>
                    <p className="text-zinc-500 font-medium">Acervo digital e físico de materiais técnico-científicos do grupo.</p>
                </div>

                <div className="flex flex-wrap gap-3">
                    {isLibrarian && (
                        <>
                            <button onClick={() => setShowEmprestimos(true)} className="px-6 py-3 bg-white border border-sky-100 text-zinc-600 font-black rounded-2xl uppercase text-[10px] tracking-widest flex items-center gap-3 shadow-sm hover:shadow-md transition-all active:scale-95">
                                <Clock size={16} className="text-orange-400" /> Empréstimos
                            </button>
                            <button onClick={() => setShowReservas(true)} className="px-6 py-3 bg-white border border-sky-100 text-zinc-600 font-black rounded-2xl uppercase text-[10px] tracking-widest flex items-center gap-3 shadow-sm hover:shadow-md transition-all active:scale-95">
                                <Bookmark size={16} className="text-sky-400" /> Reservas
                            </button>
                            <button onClick={handleCreateMaterial} className="px-8 py-4 bg-zinc-900 text-white font-black rounded-2xl uppercase text-[11px] tracking-[0.2em] flex items-center gap-3 shadow-xl hover:bg-zinc-800 transition-all active:scale-95">
                                <Plus size={18} className="text-yellow-500" /> Novo Material
                            </button>
                        </>
                    )}

                    <button onClick={() => setShowMeusItems(true)} className="px-6 py-3 bg-white border border-sky-100 text-zinc-600 font-black rounded-2xl uppercase text-[10px] tracking-widest flex items-center gap-3 shadow-sm hover:shadow-md transition-all active:scale-95">
                        <BookOpen size={16} className="text-yellow-500" /> Minhas Leituras
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Sidebar Stats & Cats */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-[2rem] border border-sky-100 shadow-sm space-y-6">
                        <div className="flex items-center gap-3 text-zinc-900">
                            <BarChart4 size={20} className="text-yellow-500" />
                            <h3 className="text-sm font-black uppercase tracking-widest">Snapshot Acervo</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-zinc-50 rounded-2xl">
                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Total</p>
                                <p className="text-xl font-black text-zinc-900 uppercase">{stats.total}</p>
                            </div>
                            <div className="p-4 bg-zinc-50 rounded-2xl">
                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Digitais</p>
                                <p className="text-xl font-black text-zinc-900 uppercase">{stats.digitais}</p>
                            </div>
                        </div>
                        <div className="space-y-4 pt-4 border-t border-zinc-50">
                            <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                <span>Emprestados</span>
                                <span className="text-orange-500">{stats.emprestados}</span>
                            </div>
                            <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                                <div className="h-full bg-orange-500 transition-all duration-1000" style={{ width: `${(stats.emprestados / (stats.total || 1)) * 100}%` }} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] border border-sky-100 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <Layers size={20} className="text-yellow-500" />
                                <h3 className="text-sm font-black uppercase tracking-widest">Categorias</h3>
                            </div>
                            {isLibrarian && (
                                <button onClick={() => setShowCategorias(true)} className="p-2 hover:bg-zinc-50 rounded-lg text-zinc-400 transition-all"><Plus size={16} /></button>
                            )}
                        </div>
                        <div className="space-y-2">
                            <button
                                onClick={() => setCategoria('all')}
                                className={`w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${categoria === 'all' ? 'bg-zinc-900 text-white shadow-md' : 'text-zinc-500 hover:bg-zinc-50'}`}
                            >
                                Todos os Temas
                            </button>
                            {categorias.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setCategoria(cat.id)}
                                    className={`w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${categoria === cat.id ? 'bg-zinc-900 text-white shadow-md' : 'text-zinc-500 hover:bg-zinc-50'}`}
                                >
                                    {cat.nome}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Catalogo Area */}
                <div className="lg:col-span-3 space-y-6">
                    <PesquisaBiblioteca
                        search={search}
                        onSearchChange={setSearch}
                        categoria={categoria}
                        onCategoriaChange={setCategoria}
                        categorias={categorias}
                        tipo={tipo}
                        onTipoChange={setTipo}
                    />

                    <div className="min-h-[600px]">
                        <Catalogo
                            items={materiais}
                            loading={loading}
                            onPreview={setPreviewItem}
                        />
                    </div>
                </div>
            </div>

            {/* Modals */}
            {previewItem && (
                <DetalhesMaterial
                    material={previewItem}
                    user={user}
                    onClose={() => setPreviewItem(null)}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                    onEdit={(item) => {
                        setItemParaEditar(item);
                        setShowManuseio(true);
                        setPreviewItem(null);
                    }}
                    onLoan={handleLoan}
                    onReserve={handleReserve}
                />
            )}

            {showCategorias && isLibrarian && (
                <GestorCategorias
                    categorias={categorias}
                    onRefresh={fetchData}
                    onClose={() => setShowCategorias(false)}
                />
            )}

            {showEmprestimos && isLibrarian && (
                <PainelEmprestimos
                    onClose={() => setShowEmprestimos(false)}
                />
            )}

            {showReservas && isLibrarian && (
                <PainelReservas
                    onClose={() => setShowReservas(false)}
                />
            )}

            {showManuseio && (
                <ModalManuseioMaterial
                    material={itemParaEditar}
                    categorias={categorias}
                    user={user}
                    onClose={() => {
                        setShowManuseio(false);
                        setItemParaEditar(null);
                    }}
                    onRefresh={() => {
                        fetchData();
                        AmazingStorage.logAction(
                            itemParaEditar ? 'Atualização de Obra' : 'Novo Registro de Obra',
                            'Biblioteca',
                            `Operação de catálogo concluída por ${user?.nome}`,
                            'info'
                        );
                    }}
                />
            )}

            {showMeusItems && (
                <MeusEmprestimos
                    user={user}
                    onClose={() => setShowMeusItems(false)}
                />
            )}
        </div>
    );
};

export default DashboardLibrary;
