import React, { useState, useEffect } from 'react';
import { History, Clock, User, Info, FileEdit, Trash2, ArrowUpCircle } from 'lucide-react';
import { supabase } from '../../src/lib/supabase';

interface ActivityLog {
    id: string;
    timestamp: string;
    user_name: string;
    action: string;
    details: string;
    type: string;
}

const LogAtividades: React.FC = () => {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('sys_logs')
                .select('*')
                .eq('module', 'Documentos')
                .order('timestamp', { ascending: false })
                .limit(10);

            if (error) throw error;
            setLogs(data || []);
        } catch (err) {
            console.error('Erro ao carregar logs:', err);
        } finally {
            setLoading(false);
        }
    };

    const getActionIcon = (action: string) => {
        const act = action.toLowerCase();
        if (act.includes('upload') || act.includes('subida')) return <ArrowUpCircle className="w-4 h-4 text-emerald-500" />;
        if (act.includes('exclu') || act.includes('remov')) return <Trash2 className="w-4 h-4 text-red-500" />;
        if (act.includes('config') || act.includes('tema')) return <FileEdit className="w-4 h-4 text-amber-500" />;
        return <Info className="w-4 h-4 text-indigo-500" />;
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden sticky top-4">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                    <History className="w-4 h-4 text-indigo-600" />
                    Atividade Recente
                </h3>
                <button onClick={fetchLogs} className="p-1 hover:bg-slate-200 rounded text-slate-400">
                    <Clock className="w-3 h-3" />
                </button>
            </div>

            <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {loading ? (
                    <div className="flex justify-center p-8">
                        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : logs.length === 0 ? (
                    <p className="text-center text-slate-400 py-8 text-xs italic">Sem atividades registadas.</p>
                ) : (
                    <div className="space-y-4">
                        {logs.map(log => (
                            <div key={log.id} className="relative pl-6 border-l-2 border-slate-100 py-1">
                                <div className="absolute -left-[9px] top-2 w-4 h-4 bg-white flex items-center justify-center">
                                    {getActionIcon(log.action)}
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-xs font-bold text-slate-700 leading-tight">{log.action}</p>
                                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                            {new Date(log.timestamp).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                                        {log.details}
                                    </p>
                                    <div className="flex items-center gap-1 text-[10px] text-indigo-500 font-semibold">
                                        <User className="w-2.5 h-2.5" />
                                        {log.user_name}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LogAtividades;
