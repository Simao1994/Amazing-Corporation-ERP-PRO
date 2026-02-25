
import React, { useState, useEffect } from 'react';
import { X, Clock, CheckCircle, BookOpen, Bookmark, Calendar, AlertTriangle } from 'lucide-react';
import { supabase } from '../../src/lib/supabase';

interface MeusEmprestimosProps {
    user: any;
    onClose: () => void;
}

const MeusEmprestimos: React.FC<MeusEmprestimosProps> = ({ user, onClose }) => {
    const [emprestimos, setEmprestimos] = useState<any[]>([]);
    const [reservas, setReservas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: emp } = await supabase
                .from('biblioteca_emprestimos')
                .select('*, material:biblioteca_materiais(*)')
                .eq('usuario_id', user.id)
                .order('criado_em', { ascending: false });

            const { data: res } = await supabase
                .from('biblioteca_reservas')
                .select('*, material:biblioteca_materiais(*)')
                .eq('usuario_id', user.id)
                .order('criado_em', { ascending: false });

            setEmprestimos(emp || []);
            setReservas(res || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchData();
    }, [user]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl border border-zinc-100 overflow-hidden flex flex-col max-h-[85vh]">
                <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-sky-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                            <Clock size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-zinc-900 uppercase">Minhas Requisições</h2>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Controle pessoal de materiais</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white hover:shadow-md rounded-2xl text-zinc-400 transition-all active:scale-95"><X size={24} /></button>
                </div>

                <div className="p-8 space-y-10 flex-1 overflow-y-auto custom-scrollbar">
                    {/* Empréstimos Ativos */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-3">
                            <BookOpen size={18} className="text-orange-500" />
                            <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Empréstimos em Curso ({emprestimos.filter(e => e.status !== 'devolvido').length})</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {emprestimos.filter(e => e.status !== 'devolvido').map(emp => (
                                <div key={emp.id} className="p-5 bg-zinc-50 border border-zinc-100 rounded-2xl flex gap-4 hover:shadow-md transition-all">
                                    <div className="w-16 h-20 bg-white rounded-xl border border-zinc-100 overflow-hidden flex-shrink-0">
                                        {emp.material?.capa_url ? <img src={emp.material.capa_url} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-zinc-200"><BookOpen size={20} /></div>}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-xs font-black text-zinc-900 uppercase line-clamp-1">{emp.material?.titulo}</h4>
                                        <div className="mt-2 space-y-1">
                                            <div className="flex items-center gap-2 text-[9px] font-bold text-zinc-400 uppercase">
                                                <Calendar size={12} /> Devolução: <span className="text-zinc-600">{new Date(emp.data_prevista).toLocaleDateString()}</span>
                                            </div>
                                            {new Date(emp.data_prevista) < new Date() && (
                                                <div className="flex items-center gap-2 text-[9px] font-bold text-red-500 uppercase animate-pulse">
                                                    <AlertTriangle size={12} /> Atrasado
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {emprestimos.filter(e => e.status !== 'devolvido').length === 0 && (
                                <div className="col-span-2 text-center py-10 bg-zinc-50/50 rounded-2xl border border-dashed border-zinc-200 text-[10px] font-black text-zinc-400 uppercase">Nenhum empréstimo ativo.</div>
                            )}
                        </div>
                    </section>

                    {/* Reservas na Fila */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-3">
                            <Bookmark size={18} className="text-sky-500" />
                            <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Minhas Reservas ({reservas.filter(r => r.status === 'pendente').length})</h3>
                        </div>

                        <div className="space-y-3">
                            {reservas.filter(r => r.status === 'pendente').map(res => (
                                <div key={res.id} className="p-4 bg-white border border-zinc-100 rounded-2xl flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-2 h-2 rounded-full ${res.material?.status_atual === 'disponivel' ? 'bg-green-500 animate-bounce' : 'bg-red-500'}`} />
                                        <span className="text-xs font-bold text-zinc-900 uppercase">{res.material?.titulo}</span>
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                                        {res.material?.status_atual === 'disponivel' ? 'Já Disponível!' : 'Em Espera'}
                                    </span>
                                </div>
                            ))}
                            {reservas.filter(r => r.status === 'pendente').length === 0 && (
                                <div className="text-center py-10 bg-zinc-50/50 rounded-2xl border border-dashed border-zinc-200 text-[10px] font-black text-zinc-400 uppercase">Nenhuma reserva ativa.</div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default MeusEmprestimos;
