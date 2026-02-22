import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../src/lib/supabase';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Logo from '../components/Logo';

const ForgotPasswordPage: React.FC = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/#/redefinir-senha`,
            });
            if (error) throw error;
            setSuccessMsg('Link de recuperação enviado! Verifique sua caixa de entrada.');
        } catch (error: any) {
            console.error('Reset password error:', error);
            setErrorMsg(error.message || 'Erro ao enviar email de recuperação');
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
                    <h2 className="text-2xl font-black text-slate-900">Recuperar Senha</h2>
                    <p className="text-slate-500 text-sm mt-2 font-medium">
                        Insira seu e-mail para receber o link de recuperação.
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

                    <Button
                        type="submit"
                        isLoading={isLoading}
                        className="w-full mt-4 font-black py-5 rounded-2xl shadow-xl shadow-yellow-500/20 uppercase text-xs tracking-widest"
                    >
                        <span className="flex items-center justify-center gap-2"><Send size={16} /> Enviar Link</span>
                    </Button>
                </form>

                <button
                    onClick={() => navigate(-1)}
                    className="w-full py-4 text-slate-500 font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:text-yellow-600 transition-all"
                >
                    <ArrowLeft size={16} /> Voltar
                </button>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
