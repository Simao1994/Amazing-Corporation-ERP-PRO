
import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../src/lib/supabase';
import { ShieldCheck, Eye, EyeOff, Home } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Logo from '../components/Logo';

interface LoginProps {
  onLogin: (user: any) => void;
}

const LoginPage: React.FC<LoginProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState(() => localStorage.getItem('amazing_remember_email') || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchParams] = useSearchParams();
  const [tenantName, setTenantName] = useState<string | null>(null);

  React.useEffect(() => {
    const slug = searchParams.get('empresa');
    if (slug) {
      const fetchTenant = async () => {
        const { data } = await supabase
          .from('saas_tenants')
          .select('nome')
          .eq('slug', slug)
          .single();
        if (data) setTenantName(data.nome);
      };
      fetchTenant();
    }
  }, [searchParams]);

  const translateError = (msg: string): string => {
    if (msg.includes('Invalid login credentials')) return 'Email ou senha incorretos.';
    if (msg.includes('Email not confirmed')) return 'Por favor confirme o seu email antes de entrar.';
    if (msg.includes('User already registered')) return 'Este email já está registado.';
    if (msg.includes('Password should be at least')) return 'A senha deve ter pelo menos 6 caracteres.';
    if (msg.includes('Unable to validate email address')) return 'Endereço de email inválido.';
    if (msg.includes('signup is disabled')) return 'O registo de novos utilizadores está desativado.';
    return msg;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (data.user) {
        if (rememberMe) {
          localStorage.setItem('amazing_remember_email', email);
        } else {
          localStorage.removeItem('amazing_remember_email');
        }

        // NO-WAIT: call onLogin immediately with fallback data.
        // App.tsx auth listener handles background enrichment.
        onLogin({
          id: data.user.id,
          email: data.user.email,
          role: data.user.email === 'simaopambo94@gmail.com' ? 'saas_admin' : 'operario',
          nome: data.user.user_metadata?.nome || email.split('@')[0],
        });
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      setErrorMsg(translateError(error.message || 'Erro na autenticação'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-zinc-950 flex items-center justify-center p-6 py-12 relative overflow-x-hidden">
      {/* Background Gradients - Static */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-yellow-500/5 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-sky-500/5 blur-[120px] rounded-full pointer-events-none"></div>

      {/* Center Content Block */}
      <div className="w-full max-w-md flex flex-col items-center relative z-10 animate-in fade-in zoom-in-95 duration-700">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo className="h-16 md:h-18 w-auto" />
          <p className="text-white text-xs mt-3 uppercase tracking-[0.6em] font-black">Sistema Empresarial ERP</p>
        </div>

        <div className="bg-white w-full rounded-[2.5rem] shadow-2xl p-8 space-y-5 border border-sky-100 relative">
          <div className="text-center">
            <h2 className="text-2xl font-black text-slate-900">
              {tenantName ? `Bem-vindo à ${tenantName}` : 'Acesso Seguro'}
            </h2>
            <p className="text-slate-500 text-sm mt-2 font-medium">
              {tenantName ? 'Entre com as suas credenciais para aceder ao portal.' : 'Entre com suas credenciais corporativas.'}
            </p>
          </div>

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-2xl px-4 py-3">
              ⚠️ {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm font-semibold rounded-2xl px-4 py-3">
              ✅ {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="E-mail Corporativo"
              type="email"
              placeholder="nome@amazing.com"
              className="bg-white border-sky-100 text-slate-900"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div className="relative">
              <Input
                label="Senha"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="bg-white border-sky-100 text-slate-900 pr-12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-9 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-slate-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-sky-200 bg-white text-yellow-500 focus:ring-yellow-500"
                />
                Lembrar sessão
              </label>
              <Link to="/recuperar-senha" title="Clique para recuperar sua senha" className="text-yellow-600 font-bold hover:text-yellow-700">Recuperar Senha</Link>
            </div>

            <Button
              type="submit"
              isLoading={isLoading}
              className="w-full mt-4 font-black py-5 rounded-2xl shadow-xl shadow-yellow-500/20 uppercase text-xs tracking-widest"
            >
              <span className="flex items-center justify-center gap-2"><ShieldCheck size={16} /> Autenticar</span>
            </Button>
          </form>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-100"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase font-black text-zinc-400">
              <span className="bg-white px-4 tracking-widest">OU</span>
            </div>
          </div>

          <button
            onClick={() => navigate('/')}
            className="w-full py-3 bg-zinc-50 border-2 border-dashed border-zinc-200 text-zinc-500 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 hover:border-yellow-500 hover:text-yellow-600 transition-all"
          >
            <Home size={18} /> Voltar para Página Inicial
          </button>
        </div>

        {/* Footer info - Part of the centered block for stability */}
        <div className="mt-6 text-center space-y-1">
          <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em]">© 2026 Amazing Corporation.</p>
          <p className="text-slate-300 text-[8px] font-medium italic">Sistema protegido por criptografia ponta-a-ponta.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

