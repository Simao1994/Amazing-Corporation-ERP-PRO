
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, LogOut } from 'lucide-react';
import { User } from '../types';

interface AutoLogoutProps {
  user: User | null;
  onLogout: () => Promise<void>;
}

const INACTIVITY_LIMIT = 5 * 60 * 1000; // 5 minutos
const WARNING_THRESHOLD = 30 * 1000; // 30 segundos
const CHECK_INTERVAL = 1000; // 1 segundo para o temporizador visual

const AutoLogout: React.FC<AutoLogoutProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const lastActivityRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    lastActivityRef.current = Date.now();
    if (showWarning) {
      setShowWarning(false);
      setTimeLeft(30);
    }
  };

  const handleLogout = async () => {
    await onLogout();
    navigate('/');
    setShowWarning(false);
  };

  useEffect(() => {
    if (!user) return;

    const activityEvents = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click'
    ];

    const handleActivity = () => resetTimer();

    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Loop de verificação de inatividade
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const diff = now - lastActivityRef.current;

      if (diff >= INACTIVITY_LIMIT - WARNING_THRESHOLD && !showWarning) {
        setShowWarning(true);
        setTimeLeft(30);
      }

      if (diff >= INACTIVITY_LIMIT) {
        handleLogout();
      }
    }, 1000);

    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (timerRef.current) clearInterval(timerRef.current);
      if (warningTimerRef.current) clearInterval(warningTimerRef.current);
    };
  }, [user, showWarning]);

  // Temporizador regressivo visual no modal
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showWarning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showWarning, timeLeft]);

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl border-4 border-yellow-500 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="bg-yellow-500 p-6 flex flex-col items-center text-zinc-900">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 animate-bounce">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-black uppercase tracking-tighter text-center leading-tight">
            Sessão Prestes a Terminar
          </h2>
        </div>

        <div className="p-8 text-center">
          <p className="text-zinc-600 font-medium mb-6">
            Detectamos inatividade prolongada. Faltam <span className="text-yellow-600 font-black text-2xl">{timeLeft}s</span> para encerrar a sua sessão por segurança.
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={resetTimer}
              className="w-full bg-zinc-900 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-zinc-800 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Clock size={20} className="text-yellow-500" />
              CONTINUAR TRABALHO
            </button>
            
            <button
              onClick={handleLogout}
              className="w-full bg-red-50 text-red-600 font-bold py-3 rounded-xl hover:bg-red-100 transition-all flex items-center justify-center gap-2"
            >
              <LogOut size={18} />
              SAIR AGORA
            </button>
          </div>
        </div>

        <div className="bg-zinc-50 p-4 border-t border-zinc-100 text-center">
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
            Amazing Corp Security Protocol
          </p>
        </div>
      </div>
    </div>
  );
};

export default AutoLogout;
