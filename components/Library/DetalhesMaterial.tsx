
import React, { useState } from 'react';
import { X, BookOpen, User, Hash, Globe, FileText, Download, Bookmark, Clock, CheckCircle, Info, Calendar, Link as LinkIcon, Edit2, Trash2, ShieldCheck } from 'lucide-react';
import { supabase } from '../../src/lib/supabase';

interface DetalhesProps {
    material: any;
    user: any;
    onClose: () => void;
    onUpdate: (id: string, updates: any) => void;
    onDelete: (id: string) => void;
    onEdit?: (material: any) => void;
    onLoan: (materialId: string) => void;
    onReserve: (materialId: string) => void;
}

const DetalhesMaterial: React.FC<DetalhesProps> = ({ material, user, onClose, onUpdate, onDelete, onEdit, onLoan, onReserve }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState(material);

    const canManage = user?.role === 'admin' || user?.role === 'librarian' || user?.role === 'bibliotecario';

    const handleSave = async () => {
        onUpdate(material.id, editData);
        setIsEditing(false);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl border border-zinc-100 overflow-hidden flex flex-col md:flex-row max-h-[90vh]">

                {/* Left: Cover & Quick Info */}
                <div className="md:w-1/3 bg-zinc-50/50 p-8 flex flex-col items-center border-r border-zinc-100">
                    <div className="w-full aspect-[3/4] bg-white rounded-3xl shadow-2xl border border-zinc-100 overflow-hidden mb-6 group relative">
                        {material.capa_url ? (
                            <img src={material.capa_url} className="w-full h-full object-cover" alt={material.titulo} />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-100 bg-zinc-50">
                                <BookOpen size={80} strokeWidth={1} />
                            </div>
                        )}
                        <div className="absolute top-4 left-4">
                            <span className="px-3 py-1 bg-yellow-500 text-zinc-900 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">
                                {material.tipo_material}
                            </span>
                        </div>
                    </div>

                    <div className="w-full space-y-4">
                        {material.formato === 'digital' && material.arquivo_url && (
                            <a
                                href={material.arquivo_url}
                                target="_blank"
                                className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 shadow-xl hover:bg-zinc-800 transition-all active:scale-95"
                            >
                                <Download size={16} className="text-yellow-500" /> Ler / Descarregar
                            </a>
                        )}

                        {material.formato === 'fisico' && (
                            <div className="space-y-2">
                                <button
                                    disabled={material.status_atual !== 'disponivel'}
                                    onClick={() => onLoan(material.id)}
                                    className="w-full py-4 bg-yellow-500 text-zinc-900 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 shadow-xl hover:bg-yellow-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Clock size={16} /> Requisitar Empréstimo
                                </button>
                                <button
                                    onClick={() => onReserve(material.id)}
                                    className="w-full py-4 bg-white border-2 border-zinc-100 text-zinc-600 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 hover:border-zinc-200 transition-all active:scale-95 shadow-sm"
                                >
                                    <Bookmark size={16} /> Reservar Obra
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 w-full p-4 bg-white rounded-2xl border border-zinc-100 space-y-3">
                        <div className="flex justify-between text-[10px] font-bold">
                            <span className="text-zinc-400 uppercase">Status</span>
                            <span className="text-zinc-900 uppercase">{material.status_atual}</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-bold">
                            <span className="text-zinc-400 uppercase">Formato</span>
                            <span className="text-zinc-900 uppercase">{material.formato}</span>
                        </div>
                    </div>
                </div>

                {/* Right: Detailed Metadata */}
                <div className="flex-1 p-10 overflow-y-auto custom-scrollbar relative">
                    <button onClick={onClose} className="absolute top-8 right-8 p-3 hover:bg-zinc-100 rounded-2xl text-zinc-400 transition-all active:scale-95"><X size={24} /></button>

                    <div className="max-w-3xl">
                        <div className="flex items-center gap-2 mb-2 text-yellow-500">
                            <Hash size={14} />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Material Interno</span>
                        </div>

                        {isEditing ? (
                            <input
                                className="text-3xl font-black text-zinc-900 w-full bg-zinc-50 p-2 rounded-xl border-none outline-none ring-2 ring-yellow-500/20"
                                value={editData.titulo}
                                onChange={e => setEditData({ ...editData, titulo: e.target.value })}
                            />
                        ) : (
                            <h1 className="text-3xl font-black text-zinc-900 uppercase tracking-tight leading-tight">{material.titulo}</h1>
                        )}

                        <div className="flex flex-wrap gap-4 mt-6">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 rounded-lg text-xs font-bold text-zinc-500">
                                <User size={14} className="text-sky-400" /> {material.autor}
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 rounded-lg text-xs font-bold text-zinc-500">
                                <Globe size={14} className="text-zinc-400" /> {material.idioma}
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 rounded-lg text-xs font-bold text-zinc-500">
                                <Calendar size={14} className="text-zinc-400" /> {material.ano_publicacao}
                            </div>
                        </div>

                        <div className="mt-10 space-y-8">
                            <div>
                                <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Descrição da Obra</h3>
                                <p className="text-sm font-medium text-zinc-600 leading-relaxed whitespace-pre-wrap">
                                    {material.descricao || 'Sem descrição detalhada disponível.'}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-zinc-100">
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Detalhes Técnicos</h4>
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold text-zinc-500">Editora: <span className="text-zinc-900">{material.editora || 'N/A'}</span></p>
                                        <p className="text-xs font-bold text-zinc-500">ISBN: <span className="text-zinc-900">{material.isbn || 'N/A'}</span></p>
                                        <p className="text-xs font-bold text-zinc-500">Páginas: <span className="text-zinc-900">{material.numero_paginas || 'N/A'}</span></p>
                                        <p className="text-xs font-bold text-yellow-600 uppercase tracking-widest pt-2 flex items-center gap-2">
                                            <ShieldCheck size={12} /> Cadastrado por: <span className="text-zinc-900">{material.profiles?.nome || 'Sistema Amazing'}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Palavras-Chave</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {(material.palavras_chave?.split(',') || ['Institucional']).map((tag: string, i: number) => (
                                            <span key={i} className="px-3 py-1 bg-white border border-zinc-100 rounded-lg text-[10px] font-black text-zinc-400 uppercase">{tag.trim()}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {canManage && (
                            <div className="mt-12 pt-8 border-t border-zinc-100 flex gap-4">
                                {isEditing ? (
                                    <button onClick={handleSave} className="px-6 py-3 bg-green-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-green-600">Guardar Alterações</button>
                                ) : (
                                    <button
                                        onClick={() => onEdit ? onEdit(material) : setIsEditing(true)}
                                        className="px-6 py-3 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-zinc-800 flex items-center gap-2"
                                    >
                                        <Edit2 size={14} /> Editar Material
                                    </button>
                                )}
                                <button
                                    onClick={() => { if (confirm("Apagar material permanentemente?")) onDelete(material.id); }}
                                    className="px-6 py-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all"
                                >
                                    Eliminar
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DetalhesMaterial;
