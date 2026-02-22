import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../src/lib/supabase';
import { ShieldCheck, Eye, EyeOff, Check } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Logo from '../components/Logo';

const ResetPasswordPage: React.FC = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    useEffect(() => {
        // Check if we have a session (the recovery link should provide one)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                setErrorMsg('Link de recuperação inválido ou expirado.');
            }
        });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });
            if (error) throw error;
            setSuccessMsg('Senha atualizada com sucesso!');
            setTimeout(() => navigate('/login'), 2000);
        } catch (error: any) {
            console.error('Update password error:', error);
            setErrorMsg(error.message || 'Erro ao redefinir senha');
        } finally {
            setIsLoading(false);
        }
    };

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
                    <h2 className="text-2xl font-black text-slate-900">Nova Senha</h2>
                    <p className="text-slate-500 text-sm mt-2 font-medium">
                        Defina sua nova senha de acesso.
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

                {!successMsg && !errorMsg.includes('inválido') && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="relative">
                            <Input
                                label="Nova Senha"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                className="bg-white border-sky-100 text-slate-900 pr-12"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-9 text-slate-400 hover:text-slate-600"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        <Button
                            type="submit"
                            isLoading={isLoading}
                            className="w-full mt-4 font-black py-5 rounded-2xl shadow-xl shadow-yellow-500/20 uppercase text-xs tracking-widest"
                        >
                            <span className="flex items-center justify-center gap-2"><Check size={16} /> Redefinir Senha</span>
                        </Button>
                    </form>
                )}

                {(successMsg || errorMsg.includes('inválido')) && (
                    <Button
                        onClick={() => navigate('/login')}
                        className="w-full mt-4 font-black py-4 rounded-2xl bg-zinc-900 text-white uppercase text-xs tracking-widest"
                    >
                        Ir para Login
                    </Button>
                )}
            </div>
        </div>
    );
};

export default ResetPasswordPage;
