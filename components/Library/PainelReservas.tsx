
import React, { useState, useEffect } from 'react';
import { X, Bookmark, User, Clock, CheckCircle, Info, Archive, Trash2 } from 'lucide-react';
import { supabase } from '../../src/lib/supabase';
import { AmazingStorage } from '../../utils/storage';

interface PainelReservasProps {
    onClose: () => void;
}

const PainelReservas: React.FC<PainelReservasProps> = ({ onClose }) => {
    const [reservas, setReservas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchReservas = async () => {
        setLoading(true);
        try {
            const { data } = await supabase
                .from('biblioteca_reservas')
                .select('*, material:biblioteca_materiais(titulo, status_atual), profile:profiles(nome)')
                .order('data_reserva', { ascending: true });
            setReservas(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReservas();
    }, []);

    const handleCancel = async (id: string) => {
        if (!confirm("Cancelar esta reserva?")) return;
        try {
            await supabase.from('biblioteca_reservas').update({ status: 'cancelada' }).eq('id', id);

            // Log Audit
            AmazingStorage.logAction(
                `Reserva Cancelada`,
                'Biblioteca',
                `Reserva ID ${id} cancelada.`,
                'warning'
            );

            fetchReservas();
        } catch (err) {
            alert("Erro ao cancelar.");
        }
    };

    const handleFulfill = async (id: string, materialId: string) => {
        try {
            // Check if material is available
            const item = reservas.find(r => r.id === id);
            if (item.material.status_atual !== 'disponivel') {
                alert("O material ainda não está disponível.");
                return;
            }

            // Atender reserva
            await supabase.from('biblioteca_reservas').update({ status: 'atendida' }).eq('id', id);

            // Log Audit
            AmazingStorage.logAction(
                `Reserva Atendida`,
                'Biblioteca',
                `Reserva ID ${id} atendida e marcada como pronta.`,
                'info'
            );

            // Iniciar empréstimo automático (opcional, ou apenas alertar)
            alert("Reserva marcada como atendida. Por favor, processe o empréstimo físico.");
            fetchReservas();
        } catch (err) {
            alert("Erro ao processar.");
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl border border-zinc-100 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-sky-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                            <Bookmark size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-zinc-900 uppercase">Fila de Reservas</h2>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Solicitações pendentes</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white hover:shadow-md rounded-2xl text-zinc-400 transition-all active:scale-95"><X size={24} /></button>
                </div>

                <div className="p-8 space-y-4 flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="py-20 flex justify-center"><div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" /></div>
                    ) : reservas.length === 0 ? (
                        <div className="text-center py-20 text-zinc-400 font-bold uppercase tracking-widest text-[10px]">Sem reservas activas.</div>
                    ) : (
                        <div className="space-y-3">
                            {reservas.map((res, index) => (
                                <div key={res.id} className="p-5 bg-zinc-50 border border-zinc-100 rounded-2xl flex items-center justify-between group">
                                    <div className="flex items-center gap-6">
                                        <div className="w-8 h-8 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-[10px] font-black text-zinc-400">
                                            #{index + 1}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-zinc-900 uppercase">{res.material?.titulo}</h4>
                                            <div className="flex items-center gap-4 mt-1">
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-sky-600">
                                                    <User size={12} /> {res.profile?.nome}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400">
                                                    <Clock size={12} /> {new Date(res.data_reserva).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${res.material?.status_atual === 'disponivel' ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-500'}`}>
                                            {res.material?.status_atual}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleFulfill(res.id, res.material_id)}
                                                className="p-2 text-zinc-400 hover:text-green-600 hover:bg-white rounded-lg shadow-sm transition-all"
                                                title="Marcar como atendida"
                                            >
                                                <CheckCircle size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleCancel(res.id)}
                                                className="p-2 text-zinc-400 hover:text-red-500 hover:bg-white rounded-lg shadow-sm transition-all"
                                                title="Cancelar reserva"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PainelReservas;
