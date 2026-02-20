
import React from 'react';

interface LogoProps {
  className?: string;
  showTagline?: boolean;
  light?: boolean;
  onClick?: () => void;
}

/**
 * Identidade Visual da Amazing Corporation.
 * Substituído o logotipo gráfico por identidade textual simplificada.
 */
const Logo: React.FC<LogoProps> = ({ className = "", showTagline = true, light = false, onClick }) => {
  const textColor = light ? "text-white" : "text-zinc-900";
  const subColor = light ? "text-zinc-400" : "text-zinc-500";

  return (
    <div 
      className={`flex flex-col leading-none select-none ${className}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="flex flex-col">
        <span className={`text-2xl font-black uppercase tracking-tighter ${textColor}`}>
          Grupo <span className="text-yellow-500">Amazing</span>
        </span>
        <span className={`text-xs font-black uppercase tracking-[0.3em] -mt-1 ${subColor}`}>
          Corporation
        </span>
      </div>
      
      {showTagline && (
        <span className={`text-[9px] font-bold uppercase tracking-widest mt-2 ${subColor} opacity-70`}>
          Aqui o cliente é que faz a escolha
        </span>
      )}
    </div>
  );
};

export default Logo;
