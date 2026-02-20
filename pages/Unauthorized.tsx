
import React from 'react';
import { ShieldAlert, Lock, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const UnauthorizedPage: React.FC = () => {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center p-6 animate-in fade-in zoom-in duration-500">
      <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6 border-4 border-red-100">
        <ShieldAlert size={48} />
      </div>
      
      <h1 className="text-4xl font-black text-zinc-900 mb-2 uppercase tracking-tight">Acesso Restrito</h1>
      <div className="flex items-center gap-2 text-zinc-500 font-bold mb-8 bg-zinc-100 px-4 py-2 rounded-full">
        <Lock size={16} />
        <span className="text-xs uppercase tracking-widest">Permissão Insuficiente</span>
      </div>

      <p className="max-w-md text-zinc-600 mb-8 font-medium leading-relaxed">
        O seu perfil de utilizador não possui as credenciais necessárias para aceder a este módulo. 
        Por favor, contacte o Administrador do Sistema ou o Director do Departamento.
      </p>

      <Link 
        to="/"
        className="px-8 py-4 bg-zinc-900 text-white font-black rounded-2xl shadow-xl hover:bg-zinc-800 transition-all flex items-center gap-3 uppercase text-xs tracking-widest"
      >
        <ArrowLeft size={16} /> Voltar ao Início
      </Link>
    </div>
  );
};

export default UnauthorizedPage;
