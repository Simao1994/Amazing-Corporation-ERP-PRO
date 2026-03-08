
export type CandidaturaStatus = 'pendente' | 'aprovado' | 'rejeitado';
export type EscolaridadeTipo = 'Ensino Primário' | 'Ensino Médio' | 'Licenciatura' | 'Mestrado' | 'Doutoramento';

// --- USUÁRIOS E SEGURANÇA ---
export type UserRole =
  | 'admin'
  | 'director_arena'
  | 'director_agro'
  | 'director_express'
  | 'director_realestate'
  | 'director_accounting'
  | 'director_treasury'
  | 'director_maintenance'
  | 'manager_inventory'
  | 'manager_sales'
  | 'director_hr'
  | 'director_finance'
  | 'bibliotecario'
  | 'operario'
  | 'saas_admin';

export interface Tenant {
  id: string;
  nome: string;
  slug: string;
  logo_url?: string;
  status: 'ativo' | 'suspenso' | 'expirado';
  config?: any;
}

export interface User {
  id: string;
  nome: string;
  role: UserRole;
  email: string;
  tenant_id: string;
}

// --- CHAT ---
export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  type: 'text' | 'file' | 'image';
}

export interface ChatContact {
  id: string;
  nome: string;
  role: string;
  avatar: string;
  online: boolean;
  lastSeen: string;
  unreadCount: number;
}

// --- PUBLICIDADE INTERNA ---
export interface InternalAd {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  startDate: string;
  endDate: string;
  targetRoles: 'all' | UserRole[];
  active: boolean;
  views: number;
  clicks: number;
  createdBy: string;
  link?: string;
}

// --- ARENA GAMES ---
export type GameStatus = 'Ativo' | 'Manutenção' | 'Indisponível';
export type PaymentMethod = 'Multicaixa' | 'PayPal' | 'Unitel Money' | 'Visa/Mastercard' | 'Quick Payment';
export type TransactionStatus = 'Pendente' | 'Confirmado' | 'Cancelado' | 'Estornado';
export type TransacaoStatus = 'Pendente' | 'Aprovado' | 'Rejeitado' | 'Liquidado';

export interface Game {
  id: string;
  titulo: string;
  descricao: string;
  historico: string;
  categoria: string;
  imagem_url: string;
  preco_sessao: number;
  tempo_minutos: number;
  popularidade: number; // 0 a 100
  status: GameStatus;
  vagas_disponiveis: number;
}

export interface GamePayment {
  id: string;
  game_id: string;
  game_titulo: string;
  valor: number;
  metodo: PaymentMethod;
  data: string;
  status: TransactionStatus | TransacaoStatus;
  cliente_nome: string;
  cliente_telefone: string;
  referencia_externa?: string;
}

export interface ArenaTournament {
  id: string;
  titulo: string;
  game_id: string;
  data_inicio: string;
  data_fim: string;
  premio: string;
  status: 'Inscrições' | 'A decorrer' | 'Finalizado';
  vagas: number;
  vencedor?: string;
  meta_pontos?: number;
}

export interface ArenaRanking {
  id: string;
  player_name: string;
  score: number;
  last_game: string;
  rank: number;
}

// --- RH E PESSOAL ---
export interface ContaBancariaHR {
  id: string;
  funcionario_id: string;
  nome_banco: string;
  numero_conta: string;
  iban?: string;
  swift_bic?: string;
  tipo_conta?: string;
  moeda: string;
  titular_conta?: string;
  pais_banco: string;
  codigo_banco?: string;
  codigo_agencia?: string;
  principal: boolean;
  status: 'ativo' | 'inativo';
  observacoes?: string;
  criado_em?: string;
  atualizado_em?: string;
}

export type ContratoTipo = 'Indeterminado' | 'Determinado' | 'Estágio' | 'Prestação de Serviços';
export type FuncionarioStatus = 'ativo' | 'ferias' | 'inativo' | 'rescindido';

export interface Funcionario {
  id: string;
  nome: string;
  data_nascimento: string;
  funcao: string;
  bilhete: string;
  telefone: string;
  morada: string;
  departamento_id: string;
  data_admissao: string;
  tipo_contrato: ContratoTipo;
  status: FuncionarioStatus;
  nivel_escolaridade: string;
  area_formacao: string;
  salario_base: number;
  subsidio_alimentacao: number;
  subsidio_transporte: number;
  bonus_assiduidade: number;
  outros_bonus: number;
  foto_url: string;
  documentos: string[];
  historico_alteracoes: { data: string; usuario: string; acao: string; }[];
  tempo_contrato: string;
  provincia?: string;
  municipio?: string;
  nome_pai?: string;
  nome_mae?: string;
  telefone_alternativo?: string;
}

export interface RegistroPresenca {
  id: string;
  funcionario_id: string;
  data: string;
  entrada: string;
  saida?: string;
  status: 'Presente' | 'Ausente' | 'Falta Justificada' | 'Atraso';
  horas_extras: number;
}

export interface ReciboSalarial {
  id: string;
  funcionario_id: string;
  nome: string;
  cargo?: string;
  bilhete?: string;
  mes: string;
  ano: number;
  base: number;
  subsidios: number; // For backward compatibility
  subsidio_alimentacao: number;
  subsidio_transporte: number;
  subsidio_ferias: number;
  subsidio_natal: number;
  horas_extras_valor: number;
  bonus_premios: number;
  total_proventos: number;
  faltas_desconto: number;
  inss_trabalhador: number;
  irt: number;
  adiantamentos: number; // For backward compatibility/loans
  emprestimos: number;
  outros_descontos: number;
  bruto: number;
  liquido: number;
  data_emissao: string;
  numero_documento?: string;
}

export interface MetaDesempenho {
  id: string;
  funcionario_id: string;
  titulo: string;
  progresso: number;
  prazo: string;
  status: 'Em curso' | 'Concluída';
}

export interface Departamento {
  id: string;
  nome: string;
  descricao: string;
}

export interface PasseServico {
  id: string;
  funcionario_id: string;
  validade: string;
}

// --- TRANSPORTES E FROTA ---
export interface Motoqueiro {
  id: string;
  nome: string;
  bilhete: string;
  telefone: string;
  telefone_alternativo?: string;
  email?: string;
  sexo?: 'Masculino' | 'Feminino';
  nacionalidade?: string;
  naturalidade?: string;
  nome_pai?: string;
  nome_mae?: string;
  data_nascimento?: string;
  idade?: number;
  escolaridade?: string;
  formacao?: string;
  estado_civil?: string;
  num_filhos?: number;
  morada?: string;
  provincia?: string;
  municipio: string;
  matricula: string;
  mota_marca: string;
  mota_cor?: string;
  mota_quadro: string;
  mota_motor: string;
  mota_chama: string;
  mota_data_compra?: string;
  mota_preco?: number;
  mota_descricao?: string;
  status: 'Ativo' | 'Inativo';
  foto_url: string;
  data_entrada: string;
  data_saida: string;
  prestacao: number;
  prestacao_semanal?: number;
  prestacao_mensal?: number;
  prestacao_anual?: number;
  divida: number;
  divida_inicial?: number;
  grupo: string;
  supervisor: string;
  observacoes: string;
  tempo_contrato: string;
  // Gestão de Equipamento & Operação
  epi_capacete?: boolean;
  epi_colete?: boolean;
  epi_mochila?: boolean;
  consumo_mensal_estimado?: number;
  historico_ocorrencias?: string;
  // Documentos Digitais
  doc_bi?: string;
  doc_cv?: string;
  doc_contrato?: string;
  doc_certificados?: string;
  doc_banco?: string;
  doc_outros?: string;
}

// --- MANUTENÇÃO ---
export interface Manutencao {
  id: string;
  descricao: string;
  matricula: string;
  quantidade: number;
  preco_total: number;
  data_manutencao: string;
  responsavel_id: string;
  supervisor_id: string;
  condutor_nome?: string;
  municipio?: string;
  grupo?: string;
  responsavel_grupo?: string;
  observacoes_gerais?: string;
  status: 'Pendente' | 'Em Curso' | 'Concluída';
  categoria: 'Preventiva' | 'Correctiva';
  quilometragem?: number;
  proxima_revisao_km?: number;
  nivel_combustivel?: 'Vazio' | '1/4' | '1/2' | '3/4' | 'Cheio';
  estado_pneus?: string;
  tipo_veiculo?: string;
  itens: ManutencaoItem[];
}

export interface ManutencaoItem {
  id: string;
  numero: number;
  descricao: string;
  quantidade: number;
  preco_unitario: number;
  preco_total: number;
  data_manutencao: string;
  observacoes: string;
}

// --- FINANCEIRO E CONTABILIDADE ---
export interface NotaFiscal {
  id: string;
  numero: string;
  fornecedor: string;
  data_emissao: string;
  valor_total: number;
  impostos?: number;
  categoria: string;
  detalhes?: { status: string };
}

export type TransacaoTipo = 'Despesa' | 'Receita' | 'Reembolso' | 'Orçamento';

export interface TransacaoFinanceira {
  id: string;
  tipo: string | TransacaoTipo;
  data: string;
  categoria: string;
  descricao: string;
  valor: number;
  status: string | TransacaoStatus;
  moeda?: string;
  forma_pagamento?: string;
  entidade?: string;
  documento_ref?: string;
  centro_custo?: string;
  usuario_id?: string;
  usuario_nome?: string;
  data_criacao?: string;
  historico_alteracoes?: { data: string; usuario: string; acao: string; }[];
}

export interface LancamentoContabil {
  id: string;
  data: string;
  periodo_id?: string;
  mes_referencia?: string;
  ano_referencia?: number;
  descricao: string;
  empresa_id: string;
  usuario_id: string;
  usuario_nome?: string;
  status: 'Postado' | 'Pendente' | 'Anulado';
  tipo_transacao: 'Manual' | 'Folha' | 'Venda' | 'Compra' | 'Ajuste';
  itens: LancamentoItem[];
  metadata?: any;
  auditoria?: { data: string; usuario: string; acao: string; }[];
}

export interface LancamentoItem {
  id: string;
  conta_codigo: string;
  conta_nome: string;
  tipo: 'D' | 'C';
  valor: number;
}

export interface FolhaPagamento {
  id: string;
  funcionario_id: string;
  funcionario_nome: string;
  mes_referencia: string;
  salario_base: number;
  subsidios: number;
  inss_trabalhador: number;
  inss_empresa: number;
  irt: number;
  seguro_trabalhador: number;
  salario_liquido: number;
  status: 'Pendente' | 'Processado' | 'Pago';
}

export interface ObrigacaoFiscal {
  id: string;
  titulo: string;
  data_vencimento: string;
  valor: number;
  status: 'Pendente' | 'Pago' | 'Atrasado';
}

export interface DocumentoDigital {
  id: string;
  nome: string;
  url: string;
  tipo: string;
  data_upload: string;
}

export interface MovimentoBancario {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  tipo: 'D' | 'C';
  saldo_apos: number;
}

export interface PlanoConta {
  id: string;
  codigo: string;
  nome: string;
  tipo: 'Ativo' | 'Passivo' | 'Capital' | 'Receita' | 'Despesa';
  natureza: 'Devedora' | 'Credora';
  nivel?: number;
  pai_id?: string;
  e_analitica?: boolean;
  e_sintetica?: boolean;
  aceita_lancamentos?: boolean;
}

export interface PeriodoContabil {
  id: string;
  ano: number;
  mes: number;
  status: 'Aberto' | 'Fechado';
  data_fecho?: string;
  empresa_id?: string;
}

// --- INVENTÁRIO ---
export interface InventarioItem {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  qtd: number;
  qtd_minima: number;
  preco: number;
  total: number;
  data_validade?: string;
  lote?: string;
  fornecedor_id?: string;
  referencia?: string; // OEM / Ref Técnica
  compatibilidade?: string; // Modelos de motorizadas
  garantia_meses?: number;
}

export interface InventarioAnalytics {
  id: string;
  periodo: string;
  giro_stock: number;
  curva_abc: 'A' | 'B' | 'C';
  margem_media: number;
  valor_total_vendas: number;
  unidades_vendidas: number;
}

export interface MovimentacaoEstoque {
  id: string;
  item_id: string;
  item_nome: string;
  tipo: 'entrada' | 'saida';
  quantidade: number;
  data: string;
  entidade: string;
  observacao: string;
  usuario: string;
}

// --- COMUNICAÇÃO E FEED ---
export interface Post {
  id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  content: string;
  timestamp: string;
  likes: number;
  type: 'general' | 'safety' | 'achievement' | 'announcement';
  foto_url: string;
}

export interface BlogPost {
  id: string;
  titulo: string;
  categoria: 'Logística' | 'Agronegócio' | 'Imobiliário' | 'Institucional' | 'Social';
  conteudo: string;
  autor: string;
  data: string;
  imagem_url: string;
  video_url?: string;
  galeria_urls?: string[];
  tipo: 'artigo' | 'video' | 'galeria' | 'momento';
  is_publico: boolean;
  visualizacoes: number;
}

export interface Solicitacao {
  id: string;
  nome: string;
  email: string;
  assunto: string;
  mensagem: string;
  status: 'pendente' | 'resolvido';
  data: string;
}

export interface Testemunho {
  id: string;
  nome: string;
  empresa: string;
  texto: string;
  avatar: string;
  aprovado: boolean;
  destaque: boolean;
}

// --- CORPORATIVO E AFILIADAS ---
export interface CorporateSettings {
  ceo_nome: string;
  ceo_mensagem: string;
  ceo_foto_url: string;
  fundacao_ano: string;
  sede_principal: string;
}

export interface Fornecedor {
  id: string;
  nome: string;
  nif: string;
  contato: string;
  email: string;
  categoria: string;
  status: 'ativo' | 'inativo';
  iban?: string;
  banco?: string;
  telefone?: string;
  morada?: string;
  avaliacao?: number; // 1 a 5
}

export type RegimeAGT = 'Geral' | 'Simplificado' | 'Exclusão' | 'Isento';

export interface EmpresaAfiliada {
  id: string;
  nome: string;
  nif: string;
  setor: string;
  localizacao: string;
  responsavel: string;
  tipo_parceria: 'Subsidiária' | 'Estratégico' | 'Operacional';
  data_registro: string;
  website?: string;
  foto_url?: string;
  historico?: MarcoHistorico[];
  // Campos Fiscais (AGT)
  regime_agt?: RegimeAGT;
  taxa_iva?: number;
  taxa_ii?: number; // Imposto Industrial
  incidencia_irt?: boolean;
  retencao_fonte?: boolean;
}

export interface MarcoHistorico {
  id: string;
  data: string;
  evento: string;
}

// --- AGRO ---
export interface Agricultor {
  id: string;
  nome: string;
  bi: string;
  telefone: string;
  localidade: string;
  provincia: string;
  area_cultivada_ha: number;
  cultura_principal: string;
  cooperativa: string;
  foto_url: string;
  status: 'ativo' | 'inativo' | 'bloqueado';
  data_registo: string;
  nif?: string;
}

export interface FinanciamentoAgro {
  id: string;
  agricultor_id: string;
  tipo: 'Sementes' | 'Fertilizantes' | 'Equipamento' | 'Monetário';
  valor_solicitado: number;
  data_solicitacao: string;
  status: 'Pendente' | 'Aprovado' | 'Rejeitado' | 'Liquidado';
  prazo_pagamento: string;
  observacoes: string;
}

export interface VisitaTecnica {
  id: string;
  agricultor_id: string;
  data: string;
  agronomo: string;
  fase_cultura: 'Preparação' | 'Sementeira' | 'Crescimento' | 'Colheita';
  recomendacoes: string;
  foto_evidencia?: string;
  estado_solo?: string;
  pragas_detetadas?: string;
}

export interface Colheita {
  id: string;
  agricultor_id: string;
  cultura: string;
  qtd_kg: number;
  data: string;
  destino: 'Consumo Próprio' | 'Venda Cooperativa' | 'Armazém';
}

// --- IMOBILIÁRIO ---
export interface Imovel {
  id: string;
  titulo: string;
  tipo: ImovelTipo;
  localizacao: string;
  area_m2: number;
  quartos: number;
  preco_venda: number;
  preco_renda: number;
  status: ImovelStatus;
  proprietario: string;
  foto_principal: string;
  rentabilidade_estimada: number;
  custo_manutencao_mensal: number;
  documentacao_status?: 'Escritura' | 'IPU Pendente' | 'Legalizado' | 'Em Processo';
  comodidades?: string[];
}

export type ImovelStatus = 'Disponível' | 'Ocupado' | 'Manutenção' | 'Vendido' | 'Reservado';
export type ImovelTipo = 'Residencial' | 'Comercial' | 'Industrial' | 'Terreno';

export interface ContratoImobiliario {
  id: string;
  imovel_id: string;
  inquilino_nome: string;
  inquilino_nif: string;
  data_inicio: string;
  data_fim: string;
  valor_mensal: number;
  periodicidade_pagamento: 'Mensal' | 'Trimestral' | 'Semestral' | 'Anual';
  status: 'Activo' | 'Terminado' | 'Inadimplente';
  tipo: 'Arrendamento' | 'Aluguer Diário';
}

export interface ObraReabilitacao {
  id: string;
  imovel_id: string;
  descricao: string;
  orcamento_previsto: number;
  custo_atual: number;
  data_inicio: string;
  previsao_fim: string;
  status: 'Planejamento' | 'Em Execução' | 'Pausada' | 'Concluída';
  progresso: number;
}

// --- RECRUTAMENTO ---
export interface Candidatura {
  id: string;
  nome: string;
  sobrenome: string;
  data_nascimento: string;
  idade: number;
  bi_numero: string;
  bi_emissao: string;
  bi_validade: string;
  nacionalidade: string;
  naturalidade: string;
  provincia: string;
  morada: string;
  nome_pai: string;
  nome_mae: string;
  estado_civil: string;
  telefone: string;
  email: string;
  genero?: string;
  municipio?: string;
  disponibilidade?: string;
  pretensao_salarial?: number;
  linkedin_url?: string;
  deficiencia?: boolean;
  aceita_termos: boolean;
  carta_conducao: string;
  experiencia: string;
  escolaridade: EscolaridadeTipo;
  curso: string;
  certificacoes: string;
  doc_bi?: string;
  doc_cv?: string;
  doc_certificados?: string;
  status: CandidaturaStatus;
  data_candidatura: string;
  notas_internas?: string;
}

// --- GESTÃO DE ARQUIVOS ---
export interface FileCategory {
  id: string;
  nome: string;
  criado_em: string;
}

export interface FileDocument {
  id: string;
  titulo: string;
  descricao?: string;
  nome_arquivo: string;
  tipo_arquivo: string;
  tamanho_arquivo: number;
  categoria_id?: string;
  responsavel_id?: string;
  tags?: string;
  caminho: string;
  criado_em: string;
  atualizado_em: string;
  categoria?: { nome: string };
  responsavel?: { nome: string };
}

// --- PORTAL VAGAS DE EMPREGO (REC PUBLICO E PRIVADO) ---
export interface RhVaga {
  id: string;
  titulo: string;
  descricao: string;
  requisitos?: string;
  responsabilidades?: string;
  localizacao?: string;
  tipo_contrato?: string;
  nivel_experiencia?: string;
  salario?: string;
  quantidade: number;
  status: 'ativa' | 'encerrada';
  data_publicacao: string;
  data_encerramento?: string;
  criado_em: string;
}

export interface RhCandidaturaPublica {
  id: string;
  vaga_id: string;
  nome: string;
  email: string;
  telefone?: string;
  cv_path?: string;
  mensagem?: string;
  status: 'pendente' | 'em_analise' | 'aprovado' | 'rejeitado';
  data_envio: string;

  // Novos campos exigidos no formulário completo:
  nivel_academico?: string;
  curso?: string;
  bi?: string;
  estado_civil?: string;
  disponibilidade?: string;
  telefone_alternativo?: string;
  morada?: string;
  provincia?: string;
  naturalidade?: string;
  expectativa_5_anos?: string;
  sobre_mim?: string;
  pretensao_salarial?: string;
}

