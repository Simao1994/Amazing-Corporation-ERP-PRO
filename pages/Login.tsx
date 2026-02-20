
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../src/lib/supabase';
import { UserPlus, ShieldCheck, ArrowRight, Eye, EyeOff } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Logo from '../components/Logo';
import { UserRole } from '../types';

interface LoginProps {
  onLogin: (user: any) => void;
}

const LoginPage: React.FC<LoginProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        if (data.user) {
          // Fetch role and name from profiles table in DB
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          onLogin({
            id: data.user.id,
            email: data.user.email,
            role: profile?.role || 'admin',
            nome: profile?.nome || data.user.user_metadata?.nome || email.split('@')[0],
          });
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              nome: nome || email.split('@')[0],
              role: selectedRole,
              avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`,
            },
          },
        });

        if (error) throw error;

        // If email confirmation is disabled, the user gets a session immediately
        if (data.session) {
          onLogin({
            id: data.user?.id,
            email: data.user?.email,
            role: selectedRole,
            nome: nome || email.split('@')[0],
          });
        } else {
          setSuccessMsg('Cadastro realizado! Verifique seu email para confirmar a conta.');
          setIsLogin(true);
        }
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      setErrorMsg(translateError(error.message || 'Erro na autenticação'));
    } finally {
      setIsLoading(false);
    }
  };

  const roleOptions = [
    { value: 'admin', label: 'Administrador do Sistema (Global)' },
    { value: 'director_arena', label: 'Director Amazing Arena Gamer' },
    { value: 'director_agro', label: 'Director Amazing Agro' },
    { value: 'director_express', label: 'Director Amazing Express' },
    { value: 'director_realestate', label: 'Director Amazing Imobiliário' },
    { value: 'director_accounting', label: 'Director Amazing ContábilExpress' },
    { value: 'director_treasury', label: 'Director Tesouraria' },
    { value: 'director_maintenance', label: 'Director Manutenção' },
    { value: 'manager_inventory', label: 'Responsável Inventário & Stock' },
    { value: 'director_hr', label: 'Director Recursos Humanos' },
    { value: 'director_finance', label: 'Director Finanças' },
  ];

  return (
    <div className="min-h-screen bg-[#e0f2fe] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-sky-400/20 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-yellow-500/10 blur-[120px] rounded-full"></div>

      <div className="mb-8 flex flex-col items-center relative z-10 text-center">
        <Logo className="items-center" showTagline />
        <p className="text-slate-500 text-[10px] mt-4 uppercase tracking-[0.5em] font-black">Sistema Empresarial ERP</p>
      </div>

      <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10 space-y-6 border border-sky-100 relative z-10 animate-in zoom-in-95 duration-500">
        <div className="text-center">
          <h2 className="text-2xl font-black text-slate-900">{isLogin ? 'Acesso Seguro' : 'Criar Conta'}</h2>
          <p className="text-slate-500 text-sm mt-2 font-medium">
            {isLogin ? 'Entre com suas credenciais corporativas.' : 'Preencha os dados para registo.'}
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
          {!isLogin && (
            <Input
              label="Nome Completo"
              placeholder="Ex: João Manuel"
              className="bg-white border-sky-100 text-slate-900"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          )}

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

          {/* Role selector only for signup */}
          {!isLogin && (
            <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Selecione o Cargo</p>
              <Select
                options={roleOptions}
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
              />
            </div>
          )}

          {isLogin && (
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-slate-500 cursor-pointer">
                <input type="checkbox" className="rounded border-sky-200 bg-white text-yellow-500 focus:ring-yellow-500" />
                Lembrar sessão
              </label>
              <button type="button" className="text-yellow-600 font-bold hover:text-yellow-700">Recuperar Senha</button>
            </div>
          )}

          <Button
            type="submit"
            isLoading={isLoading}
            className="w-full mt-4 font-black py-5 rounded-2xl shadow-xl shadow-yellow-500/20 uppercase text-xs tracking-widest"
          >
            {isLogin ? (
              <span className="flex items-center justify-center gap-2"><ShieldCheck size={16} /> Autenticar</span>
            ) : (
              <span className="flex items-center justify-center gap-2"><ArrowRight size={16} /> Criar Conta</span>
            )}
          </Button>
        </form>

        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-100"></div></div>
          <div className="relative flex justify-center text-[10px] uppercase font-black text-zinc-400">
            <span className="bg-white px-4 tracking-widest">OU</span>
          </div>
        </div>

        <Link
          to="/candidatura"
          className="w-full py-4 bg-zinc-50 border-2 border-dashed border-zinc-200 text-zinc-500 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 hover:border-yellow-500 hover:text-yellow-600 transition-all"
        >
          <UserPlus size={18} /> Portal do Candidato (Candidate Hub)
        </Link>

        <p className="text-center text-sm text-slate-500">
          {isLogin ? 'Não possui conta?' : 'Já possui conta?'}{' '}
          <button
            onClick={() => { setIsLogin(!isLogin); setErrorMsg(''); setSuccessMsg(''); }}
            className="text-yellow-600 font-black hover:underline"
          >
            {isLogin ? 'Criar conta' : 'Entrar'}
          </button>
        </p>
      </div>

      <div className="mt-8 text-center space-y-2">
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">© 2026 Amazing Corporation.</p>
        <p className="text-slate-300 text-[9px] font-medium italic">Sistema protegido por criptografia ponta-a-ponta.</p>
      </div>
    </div>
  );
};

export default LoginPage;
