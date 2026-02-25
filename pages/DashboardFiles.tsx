import React, { useState, useEffect } from 'react';
import { Files, Plus, FolderTree, AlertCircle, Loader2, LayoutGrid, LayoutList } from 'lucide-react';
import BarraFiltros from '../components/Files/BarraFiltros';
import AreaUpload from '../components/Files/AreaUpload';
import CartaoArquivo from '../components/Files/CartaoArquivo';
import GerenciadorCategorias from '../components/Files/GerenciadorCategorias';
import ModalPreviewArquivo from '../components/Files/ModalPreviewArquivo';
import LogAtividades from '../components/Files/LogAtividades';
import { FilesService, FileDocument, FileCategory } from '../utils/filesService';

const DashboardFiles: React.FC = () => {
    const [documents, setDocuments] = useState<FileDocument[]>([]);
    const [categories, setCategories] = useState<FileCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showUpload, setShowUpload] = useState(false);
    const [showCatManager, setShowCatManager] = useState(false);
    const [previewDoc, setPreviewDoc] = useState<FileDocument | null>(null);

    const [filters, setFilters] = useState({
        search: '',
        category: 'all',
        type: 'all'
    });

    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadDocuments();
        }, 300);
        return () => clearTimeout(timer);
    }, [filters]);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const cats = await FilesService.getCategories();
            setCategories(cats);
            await loadDocuments();
        } catch (err: any) {
            setError('Falha ao sincronizar com o servidor de arquivos.');
        } finally {
            setLoading(false);
        }
    };

    const loadDocuments = async () => {
        try {
            const docs = await FilesService.getDocuments(filters);
            setDocuments(docs);
        } catch (err: any) {
            setError('Erro ao carregar lista de documentos.');
        }
    };

    const handleDelete = async (id: string, caminho: string, nome: string) => {
        try {
            await FilesService.deleteDocument(id, caminho, nome);
            setDocuments(docs => docs.filter(d => d.id !== id));
        } catch (err) {
            alert('Erro ao excluir documento.');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/50 p-4 lg:p-8">
            {/* Header Section */}
            <div className="max-w-7xl mx-auto mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200">
                            <Files className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Gestão de Arquivos</h1>
                            <p className="text-slate-500 font-medium mt-1">Armazenamento seguro e organização documental</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                            className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 transition-all shadow-sm"
                            title="Trocar visualização"
                        >
                            {viewMode === 'grid' ? <LayoutList className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
                        </button>
                        <button
                            onClick={() => setShowCatManager(true)}
                            className="px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
                        >
                            <FolderTree className="w-5 h-5 text-indigo-500" />
                            <span>Categorias</span>
                        </button>
                        <button
                            onClick={() => setShowUpload(!showUpload)}
                            className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg ${showUpload
                                    ? 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
                                }`}
                        >
                            <Plus className={`w-5 h-5 transition-transform ${showUpload ? 'rotate-45' : ''}`} />
                            <span>{showUpload ? 'Cancelar' : 'Novo Arquivo'}</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Main Content Area */}
                <div className="lg:col-span-3 space-y-8">

                    {/* Filters Bar */}
                    <BarraFiltros
                        categories={categories}
                        filters={filters}
                        setFilters={setFilters}
                        onRefresh={loadDocuments}
                    />

                    {/* Upload Section (Expandable) */}
                    {showUpload && (
                        <div className="animate-in slide-in-from-top-4 duration-300">
                            <AreaUpload
                                categories={categories}
                                onSuccess={() => {
                                    setShowUpload(false);
                                    loadDocuments();
                                }}
                            />
                        </div>
                    )}

                    {/* Documents Grid/List */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
                            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                            <p className="text-slate-500 font-medium">Sincronizando ficheiros...</p>
                        </div>
                    ) : error ? (
                        <div className="p-8 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-4 text-red-600 shadow-sm">
                            <AlertCircle className="w-8 h-8" />
                            <div>
                                <p className="font-bold">Aviso de Sistema</p>
                                <p className="text-sm opacity-90">{error}</p>
                            </div>
                        </div>
                    ) : documents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 bg-slate-50/50 rounded-[3rem] border-4 border-dashed border-slate-200">
                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-slate-300 mb-6 shadow-sm border border-slate-100">
                                <Files className="w-10 h-10" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800">Nenhum documento encontrado</h3>
                            <p className="text-slate-500 mt-2 max-w-xs text-center leading-relaxed">
                                Tente ajustar os filtros de busca ou comece enviando um novo arquivo para o repositório.
                            </p>
                            <button
                                onClick={() => setShowUpload(true)}
                                className="mt-8 px-8 py-3 bg-white border border-slate-200 text-indigo-600 rounded-xl font-bold hover:border-indigo-600 transition-all"
                            >
                                Fazer o primeiro Upload
                            </button>
                        </div>
                    ) : (
                        <div className={
                            viewMode === 'grid'
                                ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
                                : 'space-y-4'
                        }>
                            {documents.map(doc => (
                                <CartaoArquivo
                                    key={doc.id}
                                    doc={doc}
                                    onDelete={handleDelete}
                                    onPreview={setPreviewDoc}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Sidebar Logs */}
                <div className="lg:col-span-1">
                    <LogAtividades />
                </div>
            </div>

            {/* Modals */}
            {showCatManager && (
                <GerenciadorCategorias
                    categories={categories}
                    onClose={() => setShowCatManager(false)}
                    onRefresh={async () => {
                        const cats = await FilesService.getCategories();
                        setCategories(cats);
                    }}
                />
            )}

            {previewDoc && (
                <ModalPreviewArquivo
                    doc={previewDoc}
                    onClose={() => setPreviewDoc(null)}
                />
            )}
        </div>
    );
};

export default DashboardFiles;
