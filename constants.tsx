
import React from 'react';
import {
  LayoutDashboard, Truck, Users, Wallet, Package, BookOpen, Wrench, ShieldCheck,
  LogOut, Bell, Search, Plus, FileText, Download, Trash2, Edit, Eye, Settings,
  Layers, Share2, Home, Inbox, Handshake, Building2, Newspaper, Image as ImageIcon,
  Factory, Scale, Calculator, PieChart as PieChartIcon, Sprout, Key, ClipboardList,
  UserPlus, Gamepad2, Files
} from 'lucide-react';
import { UserRole } from './types';

export { LogOut, Bell, Search };

export const COLORS = {
  primary: 'bg-yellow-500',
  primaryHover: 'hover:bg-yellow-600',
  secondary: 'bg-zinc-900',
  sidebar: 'bg-zinc-800',
  card: 'bg-white',
  textMain: 'text-zinc-900',
  textLight: 'text-zinc-100',
  accent: 'text-yellow-500'
};

export const MENU_ITEMS = [
  { id: 'home', label: 'Home Corporativo', icon: <Home size={20} />, path: '/' },
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
  { id: 'arena_admin', label: 'Arena Gamer', icon: <Gamepad2 size={20} />, path: '/arena/admin' },
  { id: 'candidaturas', label: 'Candidatura Online', icon: <UserPlus size={20} />, path: '/recrutamento' },
  { id: 'solicitacoes', label: 'Solicitações', icon: <Inbox size={20} />, path: '/solicitacoes' },
  { id: 'galeria', label: 'Galeria & CEO', icon: <ImageIcon size={20} />, path: '/galeria' },
  { id: 'galeria_corp', label: 'Galeria Corporativa', icon: <ImageIcon size={20} />, path: '/dashboard/galeria' },
  { id: 'biblioteca', label: 'Biblioteca', icon: <BookOpen size={20} />, path: '/dashboard/biblioteca' },
  { id: 'agro', label: 'Amazing Agro', icon: <Sprout size={20} />, path: '/agro' },
  { id: 'imobiliario', label: 'Amazing Imobiliário', icon: <Building2 size={20} />, path: '/imobiliario' },
  { id: 'tesouraria', label: 'Tesouraria', icon: <PieChartIcon size={20} />, path: '/tesouraria' },
  { id: 'transportes', label: 'Amazing Express', icon: <Truck size={20} />, path: '/transportes' },
  { id: 'manutencao', label: 'Manutenção', icon: <Wrench size={20} />, path: '/manutencao' },
  { id: 'inventario', label: 'Inventário & Stock', icon: <Package size={20} />, path: '/inventario' },
  { id: 'rh', label: 'Recursos Humanos', icon: <Users size={20} />, path: '/rh' },
  { id: 'financeiro', label: 'Finanças', icon: <Wallet size={20} />, path: '/financeiro' },
  { id: 'contabilidade', label: 'Amazing ContábilExpert', icon: <Scale size={20} />, path: '/contabilidade' },
  { id: 'auditoria', label: 'Auditoria & Logs', icon: <ShieldCheck size={20} />, path: '/auditoria' },
  { id: 'blog', label: 'Blog & Notícias', icon: <Newspaper size={20} />, path: '/blog' },
  { id: 'configuracoes', label: 'Configurações', icon: <Settings size={20} />, path: '/configuracoes' },
  { id: 'parceiros', label: 'Base de Parceiros', icon: <Handshake size={20} />, path: '/parceiros' },
  { id: 'fornecedores', label: 'Gestão de Fornecedores', icon: <Handshake size={20} />, path: '/fornecedores' },
  { id: 'empresas', label: 'Unidades do Grupo', icon: <Building2 size={20} />, path: '/empresas' },
  { id: 'utilizadores', label: 'Gestão de Utilizadores', icon: <Users size={20} />, path: '/utilizadores' },
  { id: 'arquivos', label: 'Gestão de Arquivos', icon: <Files size={20} />, path: '/dashboard/arquivos' },
];

export const ROLE_ACCESS: Record<UserRole, string[]> = {
  // Administrador tem acesso total (incluindo gestão de utilizadores)
  admin: ['all', 'utilizadores', 'fornecedores', 'parceiros', 'empresas', 'galeria_corp', 'biblioteca', 'arquivos'],

  // Director Amazing Arena Gamer - Apenas Arena + Dashboard + Solicitações
  director_arena: ['home', 'dashboard', 'arena_admin', 'solicitacoes', 'blog'],

  // Director Amazing Agro - Apenas Agro + Dashboard + Solicitações
  director_agro: ['home', 'dashboard', 'agro', 'solicitacoes', 'blog'],

  // Director da Amazing Express - Apenas Transportes + Dashboard + Solicitações
  director_express: ['home', 'dashboard', 'transportes', 'solicitacoes', 'blog'],

  // Amazing Imobiliário - Apenas Imobiliário + Dashboard + Solicitações
  director_realestate: ['home', 'dashboard', 'imobiliario', 'solicitacoes', 'blog'],

  // Director da Amazing ContábilExpress - Apenas Contabilidade + Dashboard + Solicitações
  director_accounting: ['home', 'dashboard', 'contabilidade', 'solicitacoes', 'blog', 'empresas'],

  // Director da Tesouraria - Apenas Tesouraria + Dashboard + Solicitações
  director_treasury: ['home', 'dashboard', 'tesouraria', 'solicitacoes', 'blog'],

  // Director da Manutenção - Apenas Manutenção + Dashboard + Solicitações
  director_maintenance: ['home', 'dashboard', 'manutencao', 'solicitacoes', 'blog'],

  // Responsável de Inventário & Stock - Apenas Inventário + Dashboard + Solicitações
  manager_inventory: ['home', 'dashboard', 'inventario', 'solicitacoes', 'blog'],

  // Director de Recursos Humanos - Apenas RH + Dashboard + Solicitações + CANDIDATURAS
  director_hr: ['home', 'dashboard', 'rh', 'candidaturas', 'solicitacoes', 'blog'],

  // Director de Finanças - Apenas Finanças + Dashboard + Solicitações
  director_finance: ['home', 'dashboard', 'financeiro', 'solicitacoes', 'blog', 'empresas'],

  // Bibliotecário - Gestão da Biblioteca
  bibliotecario: ['home', 'dashboard', 'biblioteca', 'solicitacoes', 'blog'],
};

export const formatAOA = (value: number) => {
  return new Intl.NumberFormat('pt-AO', {
    style: 'currency',
    currency: 'AOA',
  }).format(value);
};
