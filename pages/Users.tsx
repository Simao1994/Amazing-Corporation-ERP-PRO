
import React, { useState, useEffect } from 'react';
import { supabase } from '../src/lib/supabase';
import { UserPlus, Trash2, RefreshCw, ShieldCheck, User, Search, Eye, EyeOff, Edit2, Key, Info } from 'lucide-react';
import { useSaaS } from '../src/contexts/SaaSContext';
import { formatAOA } from '../src/utils/subscription';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const roleOptions = [
    { value: 'admin', label: 'Administrador do Sistema (Global)' },
    { value: 'director_arena', label: 'Director Amazing Arena Gamer' },
    { value: 'director_agro', label: 'Director Amazing Agro' },
    { value: 'director_express', label: 'Director Amazing Express' },
    { value: 'director_realestate', label: 'Director Amazing Imobiliário' },
    { value: 'director_accounting', label: 'Director ContábilExpress' },
    { value: 'director_treasury', label: 'Director Tesouraria' },
    { value: 'director_maintenance', label: 'Director Manutenção' },
    { value: 'manager_inventory', label: 'Responsável Inventário & Stock' },
    { value: 'director_hr', label: 'Director Recursos Humanos' },
    { value: 'director_finance', label: 'Director Finanças' },
    { value: 'bibliotecario', label: 'Bibliotecário Institucional' },
    { value: 'operario', label: 'Operário (Acesso Restrito)' },
];

const getRoleLabel = (role: string) => roleOptions.find(r => r.value === role)?.label || role;

const roleColors: Record<string, string> = {
    admin: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    director_arena: 'bg-purple-100 text-purple-800 border-purple-300',
    director_agro: 'bg-green-100 text-green-800 border-green-300',
    director_express: 'bg-blue-100 text-blue-800 border-blue-300',
    director_realestate: 'bg-amber-100 text-amber-800 border-amber-300',
    director_accounting: 'bg-teal-100 text-teal-800 border-teal-300',
    director_treasury: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    director_maintenance: 'bg-orange-100 text-orange-800 border-orange-300',
    manager_inventory: 'bg-rose-100 text-rose-800 border-rose-300',
    director_hr: 'bg-pink-100 text-pink-800 border-pink-300',
    director_finance: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    bibliotecario: 'bg-zinc-100 text-zinc-800 border-zinc-300',
    operario: 'bg-blue-100 text-blue-800 border-blue-300',
};

interface Profile {
    id: string;
    email: string;
    nome: string;
    role: string;
    avatar_url?: string;
    created_at: string;
}

interface UsersPageProps {
    user?: any;
}

const UsersPage: React.FC<UsersPageProps> = ({ user: appUser }) => {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const formRef = React.useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [search, setSearch] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [editingUser, setEditingUser] = useState<Profile | null>(null);
    const { saasSub } = useSaaS();

    const [form, setForm] = useState({
        nome: '',
        email: '',
        password: '',
        role: 'admin',
    });

    const fetchUsers = async () => {
        setLoading(true);
        setError('');

        try {
            // Attempt to fetch profiles. If not authenticated, Supabase will return empty or error based on RLS.
            // Since App.tsx now guarantees session before rendering this, we can be more direct.
            const { data, error: fetchError } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (fetchError) {
                // If it's a JWT/Session error, let's be explicit
                if (fetchError.code === 'PGRST301' || fetchError.message.includes('JWT')) {
                    throw new Error('Sessão expirada ou inválida. Por favor, saia e entre novamente.');
                }
                throw fetchError;
            }

            if (data) {
                setProfiles(data);
            }
        } catch (err: any) {
            console.error('Error fetching users:', err);
            setError(`Falha ao carregar utilizadores: ${err.message || 'Erro desconhecido'}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        setError('');
        setSuccess('');

        // SaaS Limit Check
        if (!editingUser && saasSub && saasSub.maxUsers > 0 && profiles.length >= saasSub.maxUsers) {
            setError(`Limite de utilizadores atingido (${saasSub.maxUsers}). Faça upgrade do seu plano para adicionar mais colaboradores.`);
            setCreating(false);
            return;
        }

        try {
            // Validação: Mínimo dois nomes
            const nameParts = form.nome.trim().split(/\s+/);
            if (nameParts.length < 2) {
                throw new Error('O nome completo deve conter pelo menos dois nomes (ex: Simão Pambo).');
            }

            // Obtém a sessão de forma silenciosa ou usa o objeto de utilizador global
            let { data: { session } } = await supabase.auth.getSession();

            // Se ainda não houver sessão, tentamos o refresh silencioso
            if (!session) {
                const { data: refreshData } = await supabase.auth.refreshSession();
                session = refreshData.session;
            }

            const url = editingUser
                ? `${SUPABASE_URL}/functions/v1/update-user`
                : `${SUPABASE_URL}/functions/v1/create-user`;

            const body = editingUser
                ? {
                    id: editingUser.id,
                    email: form.email.toLowerCase().trim(),
                    password: form.password || undefined,
                    nome: form.nome.trim(),
                    role: form.role,
                }
                : {
                    email: form.email.toLowerCase().trim(),
                    password: form.password,
                    nome: form.nome.trim(),
                    role: form.role,
                };

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY as string,
                },
                body: JSON.stringify(body),
            });

            let result: any = {};
            const responseText = await response.text();
            try {
                result = JSON.parse(responseText);
            } catch {
                throw new Error(`Erro de servidor: O painel Supabase devolveu uma resposta não reconhecida.`);
            }

            if (!response.ok || !result.success) {
                throw new Error(result.error || `Erro ${response.status}: Falha ao processar pedido.`);
            }

            // Log action
            const { AmazingStorage } = await import('../utils/storage');
            const actionText = editingUser
                ? `Administrador atualizou utilizador: ${form.nome.trim()} (${form.email})`
                : `Administrador criou novo utilizador: ${form.nome.trim()} (${form.email})`;

            AmazingStorage.logAction('Segurança', 'Utilizadores', actionText);

            setSuccess(`✅ ${result.message || (editingUser ? 'Utilizador atualizado com sucesso!' : 'Utilizador criado com sucesso!')}`);
            setForm({ nome: '', email: '', password: '', role: 'admin' });
            setShowForm(false);
            setEditingUser(null);
            await fetchUsers();

        } catch (err: any) {
            setError(err.message || 'Erro ao processar pedido');
        } finally {
            setCreating(false);
        }
    };

    const resetForm = () => {
        setForm({ nome: '', email: '', password: '', role: 'admin' });
        setEditingUser(null);
        setError('');
        setSuccess('');
    };

    const handleEdit = (user: Profile) => {
        setEditingUser(user);
        setForm({
            nome: user.nome || '',
            email: user.email || '',
            password: '',
            role: user.role || 'admin',
        });
        setShowForm(true);
        setError('');
        setSuccess('');

        // Timeout para garantir que o formulário está renderizado antes do scroll
        setTimeout(() => {
            formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    const filtered = profiles.filter(p =>
        p.nome?.toLowerCase().includes(search.toLowerCase()) ||
        p.email?.toLowerCase().includes(search.toLowerCase()) ||
        p.role?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">Gestão de Utilizadores</h1>
                    <p className="text-slate-500 text-sm mt-1">Gerencie os acessos ao sistema ERP Amazing Corporation</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchUsers}
                        className="p-2.5 bg-zinc-100 rounded-xl hover:bg-zinc-200 transition-colors"
                        title="Atualizar"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin text-zinc-500' : 'text-zinc-600'} />
                    </button>
                    <button
                        onClick={() => {
                            setShowForm(!showForm);
                            setEditingUser(null);
                            setForm({ nome: '', email: '', password: '', role: 'admin' });
                            setError('');
                            setSuccess('');
                        }}
                        className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white font-black px-5 py-2.5 rounded-xl transition-colors shadow-lg shadow-yellow-500/30 text-sm uppercase tracking-wider"
                    >
                        <UserPlus size={18} />
                        Novo Utilizador
                    </button>
                </div>
            </div>

            {/* Notifications */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-2xl px-5 py-3 flex items-center gap-2">
                    ⚠️ {error}
                </div>
            )}
            {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 text-sm font-semibold rounded-2xl px-5 py-3 flex items-center gap-2">
                    ✅ {success}
                </div>
            )}

            {/* Create Form */}
            {showForm && (
                <div ref={formRef} className="bg-white border border-sky-100 rounded-3xl shadow-xl p-8 animate-in slide-in-from-top duration-300 scroll-mt-6">
                    <h2 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                        {editingUser ? (
                            <Edit2 size={20} className="text-yellow-500" />
                        ) : (
                            <UserPlus size={20} className="text-yellow-500" />
                        )}
                        {editingUser ? 'Editar Utilizador' : 'Cadastrar Novo Utilizador'}
                    </h2>

                    <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Nome Completo *</label>
                            <input
                                type="text"
                                placeholder="Ex: Simão Pambo Puca"
                                value={form.nome}
                                onChange={e => {
                                    const val = e.target.value;
                                    // Permitir apenas letras e espaços
                                    if (val === '' || /^[A-Za-zÀ-ÖØ-öø-ÿ\s]*$/.test(val)) {
                                        setForm(f => ({ ...f, nome: val }));
                                    }
                                }}
                                required
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                            />
                            <p className="text-[9px] text-zinc-400 mt-1 uppercase font-bold">Mínimo dois nomes, apenas letras e espaços.</p>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Email *</label>
                            <input
                                type="email"
                                placeholder="utilizador@amazing.com"
                                value={form.email}
                                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                required
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">
                                {editingUser ? 'Alterar Senha' : 'Senha *'}
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder={editingUser ? "Deixe em branco para não alterar" : "Senha segura"}
                                    value={form.password}
                                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                    required={!editingUser}
                                    minLength={6}
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 pr-12 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {editingUser && (
                                <p className="text-[9px] text-zinc-400 mt-1 uppercase font-bold flex items-center gap-1">
                                    <Key size={10} /> Deixe em branco para manter a senha atual.
                                </p>
                            )}
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Privilégio / Cargo *</label>
                            <select
                                value={form.role}
                                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                                required
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                            >
                                {roleOptions.map(r => (
                                    <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="sm:col-span-2 flex flex-wrap gap-3 pt-2">
                            <button
                                type="submit"
                                disabled={creating}
                                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-black py-3 rounded-xl transition-colors shadow-lg shadow-yellow-500/30 text-sm uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2 min-w-[160px]"
                            >
                                {creating ? (
                                    <><RefreshCw size={16} className="animate-spin" /> {editingUser ? 'A atualizar...' : 'A criar...'}</>
                                ) : (
                                    <><ShieldCheck size={16} /> {editingUser ? 'Salvar Alterações' : 'Criar Utilizador'}</>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-6 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-black py-3 rounded-xl transition-colors text-sm uppercase tracking-wider flex items-center gap-2"
                                title="Limpar todos os campos e cancelar edição"
                            >
                                <RefreshCw size={14} />
                                Limpar
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-6 bg-zinc-50 hover:bg-zinc-100 text-zinc-400 font-bold py-3 rounded-xl transition-colors text-sm uppercase tracking-wider"
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white border border-zinc-100 rounded-2xl p-4 text-center shadow-sm">
                    <p className="text-3xl font-black text-slate-900">{profiles.length}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Total</p>
                </div>
                <div className="bg-white border border-zinc-100 rounded-2xl p-4 text-center shadow-sm">
                    <p className="text-3xl font-black text-yellow-600">{profiles.filter(p => p.role === 'admin').length}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Admins</p>
                </div>
                <div className="bg-white border border-zinc-100 rounded-2xl p-4 text-center shadow-sm">
                    <p className="text-3xl font-black text-blue-600">{profiles.filter(p => p.role?.startsWith('director')).length}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Directores</p>
                </div>
                <div className="bg-white border border-zinc-100 rounded-2xl p-4 text-center shadow-sm">
                    <p className="text-3xl font-black text-green-600">{profiles.filter(p => !p.role?.startsWith('director') && p.role !== 'admin').length}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Técnicos</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search size={18} className="absolute left-4 top-3.5 text-zinc-400" />
                <input
                    type="text"
                    placeholder="Pesquisar por nome, email ou cargo..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-2xl pl-12 pr-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow-sm"
                />
            </div>

            {/* Users List */}
            {loading ? (
                <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-4">
                    <RefreshCw className="w-12 h-12 text-yellow-600 animate-spin" />
                    <p className="text-zinc-500 font-bold animate-pulse uppercase tracking-widest text-xs">Sincronizando com a Nuvem...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-white border border-zinc-100 rounded-3xl p-12 text-center shadow-sm">
                    <User size={48} className="mx-auto text-zinc-300 mb-4" />
                    <p className="text-slate-500 font-semibold">
                        {profiles.length === 0 ? 'Nenhum utilizador registado ainda.' : 'Nenhum resultado encontrado.'}
                    </p>
                    {profiles.length === 0 && (
                        <button
                            onClick={() => setShowForm(true)}
                            className="mt-4 bg-yellow-500 text-white font-black px-6 py-2.5 rounded-xl text-sm uppercase tracking-wider hover:bg-yellow-600 transition-colors"
                        >
                            Criar primeiro utilizador
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map(profile => (
                        <div key={profile.id} className="bg-white border border-zinc-100 rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all hover:-translate-y-0.5 group">
                            <div className="flex items-start gap-4">
                                <img
                                    src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(profile.email || profile.id)}`}
                                    alt={profile.nome}
                                    className="w-14 h-14 rounded-2xl border-2 border-zinc-100 bg-zinc-50 object-cover"
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="font-black text-slate-900 truncate">{profile.nome || 'Sem nome'}</p>
                                    <p className="text-slate-500 text-xs truncate mt-0.5">{profile.email}</p>
                                    <span className={`inline-block mt-2 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${roleColors[profile.role] || 'bg-zinc-100 text-zinc-600 border-zinc-200'}`}>
                                        {getRoleLabel(profile.role)}
                                    </span>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-zinc-50 flex items-center justify-between">
                                <span className="text-[10px] text-zinc-400 font-medium">
                                    {new Date(profile.created_at).toLocaleDateString('pt-PT')}
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            console.log('Edit clicked for user:', profile.nome);
                                            handleEdit(profile);
                                        }}
                                        className="p-2.5 bg-yellow-50 rounded-xl text-yellow-600 hover:text-white hover:bg-yellow-500 transition-all border border-yellow-200 hover:border-yellow-600 shadow-sm active:scale-95"
                                        title="Editar Utilizador"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity items-center">
                                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Ativo"></span>
                                        <span className="text-[10px] text-green-600 font-bold">Ativo</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default UsersPage;
