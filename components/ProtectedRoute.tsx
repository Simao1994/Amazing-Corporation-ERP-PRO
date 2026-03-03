
import React from 'react';
import { Navigate } from 'react-router-dom';
import { User, UserRole } from '../types';
import { getMergedPermissions, MENU_ITEMS } from '../constants';

interface ProtectedRouteProps {
  user: User | null;
  children: React.ReactNode;
  path: string; // O caminho da rota atual (ex: '/financeiro')
  customRole?: string; // Papel específico necessário para esta rota
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ user, children, path, customRole }) => {
  // 1. Verificar autenticação
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // 2. Se for admin ou saas_admin, acesso total
  if (user.role === 'admin' || user.role === 'saas_admin') {
    return <>{children}</>;
  }

  // 2.5. Se houver um customRole exigido, verificar se o utilizador o possui
  if (customRole && user.role === customRole) {
    return <>{children}</>;
  }

  // 3. Encontrar o ID do menu correspondente ao path
  const menuItem = MENU_ITEMS.find(item => item.path === path);

  // Se a rota não estiver mapeada no menu (ex: rota raiz '/'), permitimos acesso básico se logado
  if (!menuItem && path !== '/') {
    // Rotas internas não listadas no menu podem precisar de lógica específica, 
    // mas por segurança padrão, bloqueamos se não for explícito.
    // Assumindo que '/' é o Home Corporativo que todos têm acesso no array ROLE_ACCESS
    return <Navigate to="/unauthorized" replace />;
  }

  // 4. Verificar permissões baseadas no cargo
  const allowedMenus = getMergedPermissions(user.role);

  // Se menuItem existe e o ID dele está na lista de permitidos
  if (menuItem && allowedMenus.includes(menuItem.id)) {
    return <>{children}</>;
  }

  // Caso especial: Home Corporativo (geralmente acessível a todos os logados, mas validamos via constante)
  if (path === '/' && allowedMenus.includes('home')) {
    return <>{children}</>;
  }

  // 5. Acesso Negado
  return <Navigate to="/unauthorized" replace />;
};

export default ProtectedRoute;
