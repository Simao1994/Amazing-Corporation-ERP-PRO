
import React, { useState, useEffect } from 'react';
import { X, Clock, CheckCircle, AlertTriangle, User, UserCheck, Calendar, BookOpen, Search } from 'lucide-react';
import { supabase } from '../../src/lib/supabase';
import { AmazingStorage } from '../../utils/storage';

interface PainelEmprestimosProps {
    onClose: () => void;
}

const PainelEmprestimos: React.FC<PainelEmprestimosProps> = ({ onClose }) => {
    const [emprestimos, setEmprestimos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    const fetchEmprestimos = async () => {
        setLoading(true);
        try {
            const { data } = await supabase
                .from('biblioteca_emprestimos')
                .select('*, material:biblioteca_materiais(titulo), profile:profiles(nome)')
                .order('data_emprestimo', { ascending: false });
            setEmprestimos(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmprestimos();
    }, []);

    const handleReturn = async (id: string, materialId: string) => {
        try {
            // Update loan
            await supabase.from('biblioteca_emprestimos').update({
                data_devolucao: new Date().toISOString(),
                status: 'devolvido'
            }).eq('id', id);

            // Update material status
            await supabase.from('biblioteca_materiais').update({
                status_atual: 'disponivel'
            }).eq('id', materialId);

            // Log Audit
            AmazingStorage.logAction(
                `Devolução de Material`,
                'Biblioteca',
                `Material ID ${materialId} devolvido via Painel Administrativo.`,
                'info'
            );

            fetchEmprestimos();
        } catch (err) {
            alert("Erro ao processar devolução.");
        }
    };

    const filtered = emprestimos.filter(emp => {
        if (filter === 'all') return true;
        if (filter === 'active') return emp.status === 'emprestado' || emp.status === 'atrasado';
        return emp.status === filter;
    });

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl border border-zinc-100 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center text-yellow-500 shadow-lg">
                            <Clock size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-zinc-900 uppercase">Gestão de Empréstimos</h2>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Controle de materiais físicos</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white hover:shadow-md rounded-2xl text-zinc-400 transition-all active:scale-95"><X size={24} /></button>
                </div>

                <div className="p-8 space-y-6 flex-1 overflow-y-auto">
                    <div className="flex gap-2">
                        {['all', 'active', 'devolvido'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-zinc-900 text-white shadow-lg' : 'bg-zinc-100 text-zinc-400 hover:text-zinc-600'}`}
                            >
                                {f === 'all' ? 'Todos' : f === 'active' ? 'Ativos' : 'Devolvidos'}
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <div className="py-20 flex justify-center"><div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" /></div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {filtered.map(emp => (
                                <div key={emp.id} className="p-6 bg-zinc-50 border border-zinc-100 rounded-[2rem] flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-all">
                                    <div className="flex items-center gap-5">
                                        <div className="w-12 h-12 bg-white rounded-2xl border border-zinc-100 flex items-center justify-center text-sky-500">
                                            <BookOpen size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-zinc-900 uppercase truncate max-w-[250px]">{emp.material?.titulo}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <User size={12} className="text-zinc-400" />
                                                <span className="text-[10px] font-bold text-zinc-500">{emp.profile?.nome}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-8">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Saída</p>
                                            <p className="text-xs font-bold text-zinc-600">{new Date(emp.data_emprestimo).toLocaleDateString()}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Prevista</p>
                                            <p className="text-xs font-bold text-zinc-600">{new Date(emp.data_prevista).toLocaleDateString()}</p>
                                        </div>
                                        <div className="px-4 py-2 rounded-xl bg-white border border-zinc-100 flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${emp.status === 'emprestado' ? 'bg-orange-500' : emp.status === 'atrasado' ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{emp.status}</span>
                                        </div>
                                    </div>

                                    {emp.status !== 'devolvido' && (
                                        <button
                                            onClick={() => handleReturn(emp.id, emp.material_id)}
                                            className="px-6 py-3 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all flex items-center gap-2"
                                        >
                                            <CheckCircle size={14} /> Devolver
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PainelEmprestimos;
