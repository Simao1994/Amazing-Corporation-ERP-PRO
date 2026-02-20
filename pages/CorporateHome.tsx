import React, { useState } from 'react';
import { 
  ArrowRight,
  User as UserIcon,
  Truck,
  Sprout,
  Home,
  Mail,
  MapPin,
  Facebook,
  Instagram,
  Linkedin,
  Star,
  Send,
  ShieldCheck,
  Building2,
  Phone,
  Briefcase,
  Globe,
  PieChart,
  Target,
  Gamepad2,
  Rocket,
  CheckCircle2,
  Play,
  Zap,
  Scale,
  History,
  X,
  Clock,
  RefreshCw,
  Navigation,
  FileText,
  Lock,
  AlertTriangle,
  BarChart3,
  LogIn,
  LayoutDashboard
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import Input from '../components/ui/Input';
import { AmazingStorage, STORAGE_KEYS } from '../utils/storage';
import { CorporateSettings, Solicitacao, User } from '../types';

const SECTOR_HISTORIES = {
  express: {
    title: "Amazing Express",
    color: "bg-yellow-500",
    icon: <Truck />,
    milestones: [
      { year: "2018", event: "Fundação em Benguela, iniciando operações especializadas em transporte motorizado para entregas urbanas ultra-rápidas." },
      { year: "2021", event: "Expansão estratégica para o segmento de veículos automóveis, otimizando a logística de carga média e distribuição corporativa." },
      { year: "2024", event: "Digitalização total da frota com sistemas avançados de telemetria para motorizadas e automóveis em todo o território nacional." },
      { year: "2026", event: "Consolidação como a maior operadora multimodal de Angola, com eficiência comprovada em veículos de duas e quatro rodas." }
    ]
  },
  agro: {
    title: "Amazing Agro",
    color: "bg-green-600",
    icon: <Sprout />,
    milestones: [
      { year: "Missão", event: "Slogan: 'Cultivando oportunidades, colhendo progresso'. Foco total no apoio a agricultores com poucos recursos através de inclusão financeira." },
      { year: "Suporte", event: "Implementation de acompanhamento agrícola rigoroso, orientação técnica especializada e financiamento estratégico para pequenos produtores." },
      { year: "Serviços", event: "Excelência em Produção Sustentável, Apoio ao Camponês, Desenvolvimento Rural e garantia da Segurança Alimentar em Angola." },
      { year: "Impacto", event: "Trajectória consolidada na transformação da agricultura familiar em agronegócio produtivo, colhendo progresso para as comunidades rurais." }
    ]
  },
  imobiliario: {
    title: "Amazing Imobiliário",
    color: "bg-indigo-600",
    icon: <Building2 />,
    milestones: [
      { year: "Missão", event: "Somos especialistas em soluções imobiliárias completas, dedicados a oferecer qualidade, confiança e excelência em cada serviço prestado em Angola." },
      { year: "Atuação", event: "Operamos com rigor na reabilitação de imóveis, arrendamento residencial, aluguer diário e gestão imobiliária, garantindo conforto e valorização patrimonial." },
      { year: "Serviços", event: "Portfolio completo em reabilitação e remodelação de imóveis, arrendamento de residências, casas para aluguer diário e manutenção técnica preventiva." },
      { year: "Foco", event: "Consultoria imobiliária estratégica focada na satisfação total dos nossos clientes e na geração de valor sustentável para o mercado nacional." }
    ]
  },
  contabil: {
    title: "Amazing ContábilExpert",
    color: "bg-sky-600",
    icon: <Scale />,
    milestones: [
      { year: "Objeto", event: "Prestação de serviço técnico profissional de contabilidade, em total conformidade com a legislação vigente, normas contábeis e fiscais aplicáveis em Angola." },
      { year: "Contab.", event: "Contabilidade Geral: Recolha e análise documental; Classificação, organização e lançamento de documentos; Elaboração de balancetes e preparação das demonstrações financeiras." },
      { year: "Folha", event: "Folha de Pagamento: Processamento integral de salários e cálculo rigoroso de encargos sociais e impostos (IRT/INSS), de acordo com os recibos de pagamento emitidos." },
      { year: "Fiscal", event: "Obrigações Fiscais: Apuração de impostos, taxas e contribuições; Elaboração de mapas de amortizações e fluxo de caixa; Submissão de declarações e acompanhamento de prazos legais." },
      { year: "Consult.", event: "Consultoria Contábil: Esclarecimento de dúvidas técnicas, orientação fiscal básica e apoio especializado em fiscalizações quando solicitado pelo cliente." }
    ]
  },
  arena: {
    title: "Amazing Arena Gamer",
    color: "bg-indigo-600",
    icon: <Gamepad2 />,
    milestones: [
      { year: "2026", event: "Fundação da Amazing Arena Gamer com foco em entretenimento digital de alta fidelidade." },
      { year: "2026", event: "Inauguração do primeiro hub premium em Benguela equipado com tecnologia de ponta." },
      { year: "2026", event: "Lançamento da plataforma Amazing Championship para competições nacionais de eSports." }
    ]
  }
};

const LEGAL_DOCS = {
  privacy: {
    title: "Política de Privacidade",
    icon: <Lock className="text-green-500" />,
    content: `
      1. Recolha de Dados
      A Amazing Corporation recolhe dados pessoais (nome, contacto, dados profissionais) apenas para fins de prestação de serviço e recrutamento. Garantimos a confidencialidade total.

      2. Uso da Informação
      Os dados são utilizados para processamento de candidaturas, gestão de contratos e comunicação corporativa. Não partilhamos dados com terceiros sem consentimento explícito.

      3. Segurança
      Implementamos protocolos de encriptação e segurança física para proteger os seus dados contra acesso não autorizado.

      4. Direitos do Titular
      Qualquer utilizador pode solicitar a consulta, retificação ou eliminação dos seus dados através do nosso canal de suporte.
    `
  },
  terms: {
    title: "Termos de Serviço",
    icon: <FileText className="text-yellow-500" />,
    content: `
      1. Aceitação
      Ao utilizar os serviços da Amazing Corporation, o cliente concorda com os presentes termos.

      2. Serviços
      A empresa compromete-se a prestar serviços de logística, consultoria e gestão com o máximo rigor e qualidade.

      3. Pagamentos
      Os termos de pagamento são definidos contratualmente caso a caso. Atrasos podem incorrer em juros de mora legais.

      4. Propriedade Intelectual
      Todo o conteúdo deste site e materiais da marca são propriedade exclusiva da Amazing Corporation S.A.
    `
  },
  whistleblower: {
    title: "Canal de Denúncias",
    icon: <AlertTriangle className="text-red-500" />,
    content: `
      A Amazing Corporation mantém um compromisso inabalável com a ética e integridade.

      Este canal serve para reportar:
      - Fraude ou Corrupção;
      - Assédio ou Discriminação;
      - Má conduta profissional;
      - Violações de segurança.

      Garantimos o anonimato e a não-retaliação.
      
      Email directo: compliance@amazing.ao
      Linha Ética: +244 929 882 067
    `
  },
  financial: {
    title: "Relatórios Financeiros",
    icon: <BarChart3 className="text-sky-500" />,
    content: `
      Comprometidos com a transparência, disponibilizamos os resumos dos nossos exercícios fiscais para parceiros e investidores.

      Exercício 2025:
      - Crescimento Líquido: +18%
      - Expansão de Frota: +45 Unidades
      - Investimento Social: 12M AOA

      Para aceder aos relatórios detalhados auditados, por favor contacte a nossa Direcção Financeira ou aceda à área de investidores.
    `
  }
};

const CorporateHome: React.FC = () => {
  const [successMsg, setSuccessMsg] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<keyof typeof SECTOR_HISTORIES | null>(null);
  const [selectedLegalDoc, setSelectedLegalDoc] = useState<keyof typeof LEGAL_DOCS | null>(null);

  // Get current user to determine button state
  const currentUser = AmazingStorage.get<User | null>(STORAGE_KEYS.USER, null);

  // Form State for Tickets
  const [contactForm, setContactForm] = useState({
    nome: '',
    email: '',
    assunto: 'Contacto Geral',
    mensagem: ''
  });

  const corpInfo = AmazingStorage.get<CorporateSettings>(STORAGE_KEYS.CORPORATE_INFO, {
    ceo_nome: 'Euclides Cadastro Nvula',
    ceo_mensagem: 'Liderando Angola rumo a uma nova era de logística eficiente e agronegócio sustentável.',
    ceo_foto_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=800',
    fundacao_ano: '2018',
    sede_principal: 'Benguela, Angola'
  });

  const scrollIntoView = (id: string) => {
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmitContact = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);

    // Criar objecto da solicitação para o ERP
    const novaSolicitacao: Solicitacao = {
      id: `TKT-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      nome: contactForm.nome,
      email: contactForm.email,
      assunto: contactForm.assunto,
      mensagem: contactForm.mensagem,
      status: 'pendente',
      data: new Date().toISOString()
    };

    // Simulação de delay de envio
    setTimeout(() => {
      // Guardar na lista de solicitações do ERP
      const currentRequests = AmazingStorage.get<Solicitacao[]>(STORAGE_KEYS.SOLICITACOES, []);
      AmazingStorage.save(STORAGE_KEYS.SOLICITACOES, [novaSolicitacao, ...currentRequests]);
      
      // Log de acção
      AmazingStorage.logAction('Contacto', 'Website', `Nova mensagem recebida de ${contactForm.nome}`);

      setIsSending(false);
      setSuccessMsg('Mensagem enviada com sucesso! O nosso suporte técnico responderá em breve.');
      setContactForm({ nome: '', email: '', assunto: 'Contacto Geral', mensagem: '' });
      
      setTimeout(() => setSuccessMsg(''), 6000);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-white font-sans text-zinc-900 scroll-smooth selection:bg-yellow-500 selection:text-zinc-900 overflow-x-hidden">
      {/* NAVIGATION BAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-zinc-100 px-6 md:px-12 py-4 flex items-center justify-between shadow-sm">
        <Logo className="h-10 cursor-pointer" onClick={() => scrollIntoView('inicio')} />
        <div className="hidden lg:flex items-center gap-8 text-[10px] font-black uppercase tracking-widest text-zinc-500">
          <button onClick={() => scrollIntoView('inicio')} className="hover:text-yellow-600 transition-colors">Início</button>
          <button onClick={() => scrollIntoView('sectores')} className="hover:text-yellow-600 transition-colors">Sectores</button>
          <Link to="/arena" className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 transition-all bg-indigo-50 px-4 py-2 rounded-full border border-indigo-100">
            <Gamepad2 size={16}/> Amazing Arena Gamer
          </Link>
          <button onClick={() => scrollIntoView('carreiras')} className="text-zinc-900 hover:text-yellow-600 transition-colors">Trabalhe Connosco</button>
          <button onClick={() => scrollIntoView('contactos')} className="hover:text-yellow-600 transition-colors">Contactos</button>
        </div>
        <Link to="/dashboard" className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${currentUser ? 'bg-zinc-900 text-white hover:bg-zinc-800' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}>
          {currentUser ? (
            <>
              <LayoutDashboard size={16} /> Meu Dashboard
            </>
          ) : (
            <>
              <Lock size={16} /> Área Reservada
            </>
          )}
        </Link>
      </nav>

      {/* HERO SECTION - 100% WIDTH & HEIGHT */}
      <section id="inicio" className="relative h-screen w-full flex items-center pt-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=2070" className="w-full h-full object-cover" alt="Amazing Corporation Holding" />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent"></div>
        </div>
        <div className="relative z-10 w-full px-8 md:px-20 lg:px-32 flex flex-col items-start gap-8 animate-in fade-in slide-in-from-left-10 duration-1000">
          <button 
            onClick={() => scrollIntoView('sectores')}
            className="inline-flex items-center gap-2 bg-yellow-500 text-zinc-900 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-yellow-400 transition-all active:scale-95 shadow-xl shadow-yellow-500/20"
          >
            <Zap size={14} /> Soluções Multissectoriais Angolanas
          </button>
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black text-white tracking-tighter leading-none">
            Impulsionando <br/><span className="text-yellow-500">Angola</span> ao Futuro.
          </h1>
          <p className="text-zinc-300 text-xl md:text-2xl font-medium max-w-3xl leading-relaxed">
            Do transporte logístico à inovação digital, a Amazing Corporation lidera o mercado com eficiência, ética e tecnologia através das suas 5 unidades estratégicas.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-6 pt-4">
            <button onClick={() => scrollIntoView('sectores')} className="w-full sm:w-auto px-12 py-6 bg-yellow-500 text-zinc-900 font-black rounded-2xl hover:bg-yellow-400 transition-all flex items-center justify-center gap-4 shadow-2xl text-xs uppercase tracking-widest group">
              Explorar Sectores <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
            </button>
            <Link to="/arena" className="w-full sm:w-auto px-12 py-6 bg-white/10 backdrop-blur-md border border-white/20 text-white font-black rounded-2xl hover:bg-white/20 transition-all flex items-center justify-center gap-4 text-xs uppercase tracking-widest">
              Conhecer Arena <Gamepad2 size={20} />
            </Link>
          </div>
        </div>
      </section>

      {/* SECTORES SECTION - EXPANSIVE GRID */}
      <section id="sectores" className="min-h-screen py-32 px-8 md:px-20 lg:px-32 bg-zinc-50 flex flex-col justify-center">
        <div className="w-full">
          <div className="text-center space-y-4 mb-24">
             <span className="text-yellow-600 text-[18px] font-black uppercase tracking-[0.6em]">Pilar Estratégico</span>
             <h2 className="text-5xl md:text-7xl font-black text-zinc-900 tracking-tighter uppercase leading-tight">Ecossistema de Soluções <span className="text-yellow-500">Amazing</span></h2>
             <p className="text-zinc-500 max-w-5xl mx-auto font-medium text-lg md:text-xl leading-relaxed">
                Exploramos o potencial máximo do mercado nacional, integrando logística de ponta, agronegócio sustentável, gestão imobiliária, consultoria contábil e entretenimento digital.
             </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
            {/* Express */}
            <div className="bg-white p-10 rounded-[3rem] border border-zinc-100 shadow-sm hover:shadow-2xl transition-all group flex flex-col justify-between h-full min-h-[400px]">
              <div>
                <div className="w-16 h-16 bg-yellow-500 rounded-3xl flex items-center justify-center text-zinc-900 mb-8 group-hover:scale-110 transition-transform">
                  <Truck size={32} />
                </div>
                <h3 className="text-2xl font-black mb-4">Amazing Express</h3>
                <p className="text-zinc-500 font-medium leading-relaxed mb-8">Líder em logística de última milha com operation integrada em transportes motorizados e automóveis.</p>
              </div>
              <button onClick={() => setSelectedHistory('express')} className="flex items-center gap-2 text-[10px] font-black uppercase text-yellow-600 hover:text-yellow-700 transition-colors">
                Ver Histórico <History size={14} />
              </button>
            </div>

            {/* Agro */}
            <div className="bg-white p-10 rounded-[3rem] border border-zinc-100 shadow-sm hover:shadow-2xl transition-all group flex flex-col justify-between h-full min-h-[400px]">
              <div>
                <div className="w-16 h-16 bg-green-600 rounded-3xl flex items-center justify-center text-white mb-8 group-hover:scale-110 transition-transform">
                  <Sprout size={32} />
                </div>
                <h3 className="text-2xl font-black mb-4">Amazing Agro</h3>
                <p className="text-zinc-500 font-medium leading-relaxed mb-8">Fomento agrícola e produção sustentável. Cultivando oportunidades e colhendo progresso com o agricultor nacional.</p>
              </div>
              <button onClick={() => setSelectedHistory('agro')} className="flex items-center gap-2 text-[10px] font-black uppercase text-green-600 hover:text-green-700 transition-colors">
                Ver Histórico <History size={14} />
              </button>
            </div>

            {/* Imobiliário */}
            <div className="bg-white p-10 rounded-[3rem] border border-zinc-100 shadow-sm hover:shadow-2xl transition-all group flex flex-col justify-between h-full min-h-[400px]">
              <div>
                <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-white mb-8 group-hover:scale-110 transition-transform">
                  <Building2 size={32} />
                </div>
                <h3 className="text-2xl font-black mb-4">Amazing Imobiliário</h3>
                <p className="text-zinc-500 font-medium leading-relaxed mb-8">Soluções completas em reabilitação, arrendamento e gestão. Valorizando activos com excelência e confiança.</p>
              </div>
              <button onClick={() => setSelectedHistory('imobiliario')} className="flex items-center gap-2 text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-700 transition-colors">
                Ver Histórico <History size={14} />
              </button>
            </div>

            {/* ContábilExpert */}
            <div className="bg-white p-10 rounded-[3rem] border border-zinc-100 shadow-sm hover:shadow-2xl transition-all group flex flex-col justify-between h-full min-h-[400px]">
              <div>
                <div className="w-16 h-16 bg-sky-600 rounded-3xl flex items-center justify-center text-white mb-8 group-hover:scale-110 transition-transform">
                  <Scale size={32} />
                </div>
                <h3 className="text-2xl font-black mb-4">Amazing ContábilExpert</h3>
                <p className="text-zinc-500 font-medium leading-relaxed mb-8">Consultoria técnica profissional e gestão fiscal de alto nível em conformidade com as normas vigentes.</p>
              </div>
              <button onClick={() => setSelectedHistory('contabil')} className="flex items-center gap-2 text-[10px] font-black uppercase text-sky-600 hover:text-sky-700 transition-colors">
                Ver Histórico <History size={14} />
              </button>
            </div>

            {/* Arena Gamer */}
            <div className="bg-white p-10 rounded-[3rem] border border-zinc-100 shadow-sm hover:shadow-2xl transition-all group flex flex-col justify-between h-full min-h-[400px]">
              <div>
                <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-white mb-8 group-hover:scale-110 transition-transform">
                  <Gamepad2 size={32} />
                </div>
                <h3 className="text-2xl font-black mb-4">Amazing Arena Gamer</h3>
                <p className="text-zinc-500 font-medium leading-relaxed mb-8">O maior hub de eSports e entretenimento digital de Angola. Experiência imersiva e tecnologia de ponta para gamers.</p>
              </div>
              <button onClick={() => setSelectedHistory('arena')} className="flex items-center gap-2 text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-700 transition-colors">
                Ver Histórico <History size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CEO MESSAGE - 100% WIDTH */}
      <section className="min-h-screen py-32 px-8 md:px-20 lg:px-32 bg-white flex items-center">
        <div className="w-full flex flex-col md:flex-row items-center gap-20">
           <div className="md:w-1/3 relative">
              <div className="absolute -inset-4 bg-yellow-500 rounded-[3rem] rotate-3"></div>
              <img src={corpInfo.ceo_foto_url} className="relative z-10 w-full rounded-[3rem] shadow-2xl grayscale hover:grayscale-0 transition-all duration-700" alt="CEO" />
           </div>
           <div className="md:w-2/3 space-y-8">
              <div className="p-10 md:p-20 bg-zinc-50 rounded-[4rem] relative shadow-inner">
                 <Star className="absolute top-8 left-8 text-yellow-500 opacity-20" size={80} />
                 <p className="text-2xl md:text-4xl font-medium text-zinc-700 italic leading-relaxed relative z-10">
                    "{corpInfo.ceo_mensagem}"
                 </p>
                 <div className="mt-12 pt-12 border-t border-zinc-200">
                    <p className="text-3xl font-black text-zinc-900">{corpInfo.ceo_nome}</p>
                    <p className="text-[12px] font-black text-yellow-600 uppercase tracking-[0.4em] mt-2">Presidente & CEO, Amazing Corporation</p>
                 </div>
              </div>
           </div>
        </div>
      </section>

      {/* CARREIRAS / RECRUTAMENTO SECTION - 100% WIDTH */}
      <section id="carreiras" className="min-h-[70vh] py-32 px-8 md:px-20 lg:px-32 bg-zinc-900 text-white relative overflow-hidden flex items-center">
        <div className="absolute top-0 right-0 p-20 opacity-5">
           <Briefcase size={500} />
        </div>
        <div className="w-full text-center space-y-12 relative z-10">
          <h2 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter">Faça Parte da Nossa <br/><span className="text-yellow-500">História de Sucesso.</span></h2>
          <p className="text-zinc-400 text-xl md:text-2xl max-w-5xl mx-auto leading-relaxed">
            Estamos sempre em busca de talentos excepcionais para as nossas divisões de Logística, Agro e Tecnologia. Sua carreira começa aqui.
          </p>
          <div className="pt-6">
            <Link to="/candidatura" className="px-20 py-8 bg-yellow-500 text-zinc-900 font-black rounded-3xl hover:bg-yellow-400 transition-all shadow-2xl text-sm uppercase tracking-[0.3em] inline-flex items-center gap-4">
              Submeter Candidatura Online <Rocket size={24} />
            </Link>
          </div>
        </div>
      </section>

      {/* CONTACTS & MAP - 100% WIDTH */}
      <section id="contactos" className="min-h-screen py-32 px-8 md:px-20 lg:px-32 bg-white flex items-center">
        <div className="w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
            <div className="space-y-12">
               <div className="space-y-4">
                  <h2 className="text-5xl font-black text-zinc-900 tracking-tight">Entre em Contacto</h2>
                  <p className="text-zinc-500 text-lg font-medium">Nossa equipa de atendimento corporativo está pronta para responder às suas questões.</p>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-8">
                  <div className="flex items-center gap-6">
                    <div className="p-4 bg-zinc-100 rounded-2xl text-yellow-600"><MapPin size={24}/></div>
                    <div>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Sede Central</p>
                      <p className="font-bold text-zinc-800">Benguela, Bairro Massangarala, Angola</p>
                      <a 
                        href="https://www.google.com/maps/search/?api=1&query=Massangarala+Benguela+Angola" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-yellow-600 hover:text-yellow-700 mt-1 transition-colors"
                      >
                        <Navigation size={12} /> Ver no GPS
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="p-4 bg-zinc-100 rounded-2xl text-yellow-600"><Phone size={24}/></div>
                    <div>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Atendimento 24/7</p>
                      <p className="font-bold text-zinc-800">+244 929 882 067</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="p-4 bg-zinc-100 rounded-2xl text-yellow-600"><Mail size={24}/></div>
                    <div>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">E-mail Corporativo</p>
                      <p className="font-bold text-zinc-800">geral@amazing.ao</p>
                    </div>
                  </div>
               </div>

               <form onSubmit={handleSubmitContact} className="space-y-6 pt-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input 
                      placeholder="Seu Nome" 
                      required 
                      className="bg-zinc-50 border-zinc-200 py-4" 
                      value={contactForm.nome}
                      onChange={e => setContactForm({...contactForm, nome: e.target.value})}
                    />
                    <Input 
                      placeholder="E-mail" 
                      type="email" 
                      required 
                      className="bg-zinc-50 border-zinc-200 py-4" 
                      value={contactForm.email}
                      onChange={e => setContactForm({...contactForm, email: e.target.value})}
                    />
                  </div>
                  <textarea 
                    placeholder="Como podemos ajudar?" 
                    required 
                    className="w-full p-6 bg-zinc-50 border border-zinc-200 rounded-2xl h-40 outline-none focus:ring-4 focus:ring-yellow-500/10 transition-all font-medium" 
                    value={contactForm.mensagem}
                    onChange={e => setContactForm({...contactForm, mensagem: e.target.value})}
                  />
                  <button type="submit" disabled={isSending} className="px-12 py-5 bg-zinc-900 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest hover:bg-zinc-800 transition-all flex items-center gap-3 disabled:opacity-50">
                    {isSending ? <RefreshCw className="animate-spin" /> : <Send size={18}/>} 
                    {isSending ? 'Enviando...' : 'Enviar Mensagem'}
                  </button>
                  {successMsg && <p className="text-green-600 font-bold text-sm animate-in fade-in">{successMsg}</p>}
               </form>
            </div>

            <div className="relative">
               <div className="bg-zinc-100 rounded-[4rem] h-full min-h-[600px] overflow-hidden shadow-2xl border-8 border-white">
                  <iframe 
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3895.5037!2d13.405!3d-12.583!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1bb3035f55555555%3A0x5555555555555555!2sMassangarala%2C%20Benguela!5e0!3m2!1spt-PT!2sao!4v1710000000000" 
                    className="w-full h-full grayscale opacity-80"
                    style={{ border: 0 }} 
                    allowFullScreen 
                    loading="lazy" 
                  />
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER - 100% WIDTH */}
      <footer className="bg-[#0f1115] pt-32 pb-16 px-8 md:px-20 lg:px-32 text-white">
        <div className="w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-20 pb-20 border-b border-white/5">
            <div className="space-y-8">
              <Logo light className="h-12" />
              <p className="text-zinc-500 font-medium leading-relaxed">Excelência operativa e inovação constante para transformar o mercado angolano em todos os sectores.</p>
              <div className="flex gap-4">
                 <div className="p-3 bg-white/5 rounded-xl hover:bg-yellow-500 hover:text-zinc-900 transition-all cursor-pointer"><Facebook size={18}/></div>
                 <div className="p-3 bg-white/5 rounded-xl hover:bg-yellow-500 hover:text-zinc-900 transition-all cursor-pointer"><Instagram size={18}/></div>
                 <div className="p-3 bg-white/5 rounded-xl hover:bg-yellow-500 hover:text-zinc-900 transition-all cursor-pointer"><Linkedin size={18}/></div>
              </div>
            </div>
            
            <div className="space-y-6">
              <h4 className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.4em]">Navegação</h4>
              <ul className="space-y-4 text-zinc-400 font-bold text-sm">
                <li><button onClick={() => scrollIntoView('inicio')} className="hover:text-white transition-colors">Início Corporativo</button></li>
                <li><button onClick={() => scrollIntoView('sectores')} className="hover:text-white transition-colors">Sectores de Actuação</button></li>
                <li><Link to="/arena" className="hover:text-indigo-400 transition-colors">Amazing Arena Gamer</Link></li>
                <li><Link to="/candidatura" className="hover:text-white transition-colors">Carreiras / Candidaturas</Link></li>
              </ul>
            </div>

            <div className="space-y-6">
              <h4 className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">Legal & Suporte</h4>
              <div className="space-y-4 text-zinc-400 font-bold text-sm">
                <button onClick={() => setSelectedLegalDoc('privacy')} className="hover:text-white transition-colors text-left w-full">Política de Privacidade</button>
                <button onClick={() => setSelectedLegalDoc('terms')} className="hover:text-white transition-colors text-left w-full">Termos de Serviço</button>
                <button onClick={() => setSelectedLegalDoc('whistleblower')} className="hover:text-white transition-colors text-left w-full">Canal de Denúncias</button>
                <button onClick={() => setSelectedLegalDoc('financial')} className="hover:text-white transition-colors text-left w-full">Relatórios Financeiros</button>
              </div>
            </div>

            <div className="space-y-6">
              <h4 className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.4em]">Subscrever News</h4>
              <p className="text-zinc-500 text-xs font-medium">Receba as últimas notícias sobre expansão e investimentos do grupo.</p>
              <div className="flex gap-2">
                 <input placeholder="E-mail" className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs w-full focus:border-yellow-500 outline-none" />
                 <button className="p-3 bg-yellow-500 text-zinc-900 rounded-xl hover:bg-yellow-400 transition-all"><ArrowRight size={18}/></button>
              </div>
            </div>
          </div>
          
          <div className="pt-16 flex flex-col md:flex-row justify-between items-center gap-6">
             <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">© 2026 Amazing Corporation S.A. Todos os direitos reservados.</p>
             <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">System Operational • v4.2.0</span>
             </div>
          </div>
        </div>
      </footer>

      {/* HISTORIC MODAL */}
      {selectedHistory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-zinc-950/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-3xl overflow-hidden relative animate-in zoom-in-95 duration-500">
            <button 
              onClick={() => setSelectedHistory(null)}
              className="absolute top-8 right-8 p-3 bg-zinc-100 hover:bg-zinc-200 rounded-full transition-all text-zinc-500 hover:rotate-90"
            >
              <X size={20} />
            </button>
            
            <div className={`p-12 text-white ${SECTOR_HISTORIES[selectedHistory].color}`}>
               <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-white/20 rounded-2xl">
                    {React.cloneElement(SECTOR_HISTORIES[selectedHistory].icon as React.ReactElement, { size: 32 })}
                  </div>
                  <h3 className="text-3xl font-black uppercase tracking-tight">{SECTOR_HISTORIES[selectedHistory].title}</h3>
               </div>
               <p className="text-white/80 font-bold text-xs uppercase tracking-widest">Trajetória Institucional & Marcos de Sucesso</p>
            </div>

            <div className="p-12 space-y-8 overflow-y-auto max-h-[60vh] custom-scrollbar">
               {SECTOR_HISTORIES[selectedHistory].milestones.map((m, i) => (
                  <div key={i} className="flex gap-8 group">
                     <div className="flex flex-col items-center">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xs shadow-lg transition-transform group-hover:scale-110 ${SECTOR_HISTORIES[selectedHistory].color} text-white`}>
                           {m.year}
                        </div>
                        {i !== SECTOR_HISTORIES[selectedHistory].milestones.length - 1 && (
                          <div className="w-1 flex-1 bg-zinc-100 my-2 rounded-full"></div>
                        )}
                     </div>
                     <div className="pt-2 flex-1 pb-4">
                        <p className="text-2xl font-bold text-zinc-900 leading-tight mb-2">Pilar Estratégico</p>
                        <p className="text-zinc-500 font-medium leading-relaxed">{m.event}</p>
                     </div>
                  </div>
               ))}
            </div>

            <div className="p-8 border-t border-zinc-100 bg-zinc-50 flex justify-center">
               <div className="flex items-center gap-2 text-zinc-400">
                  <ShieldCheck size={16} />
                  <span className="text-[9px] font-black uppercase tracking-widest">Registo Oficial Amazing Corporation</span>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* LEGAL & SUPPORT MODAL */}
      {selectedLegalDoc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-zinc-950/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-3xl overflow-hidden relative animate-in zoom-in-95 duration-500 flex flex-col max-h-[85vh]">
            <button 
              onClick={() => setSelectedLegalDoc(null)}
              className="absolute top-8 right-8 p-3 bg-zinc-100 hover:bg-zinc-200 rounded-full transition-all text-zinc-500 hover:rotate-90 z-10"
            >
              <X size={20} />
            </button>
            
            <div className="bg-zinc-900 p-10 text-white shrink-0">
               <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 bg-white/10 rounded-2xl">
                    {LEGAL_DOCS[selectedLegalDoc].icon}
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tight">{LEGAL_DOCS[selectedLegalDoc].title}</h3>
               </div>
               <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest pl-16">Documento Oficial • v2026</p>
            </div>

            <div className="p-10 overflow-y-auto custom-scrollbar">
               <div className="prose prose-zinc max-w-none text-zinc-600 font-medium text-sm leading-relaxed whitespace-pre-line">
                  {LEGAL_DOCS[selectedLegalDoc].content}
               </div>
            </div>

            <div className="p-6 border-t border-zinc-100 bg-zinc-50 flex justify-between items-center shrink-0">
               <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck size={14} className="text-green-500"/> Validado por Compliance
               </span>
               <button onClick={() => setSelectedLegalDoc(null)} className="px-6 py-2 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-yellow-500 hover:text-zinc-900 transition-all">
                  Fechar
               </button>
            </div>
          </div>
        </div>
      )}

      {/* REFRESH ANIMATION STYLE */}
      <style>{`
        @keyframes swing {
          0% { transform: rotate(0deg); }
          25% { transform: rotate(10deg); }
          75% { transform: rotate(-10deg); }
          100% { transform: rotate(0deg); }
        }
        .animate-swing {
          animation: swing 2s ease-in-out infinite;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f4f4f5;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d4d4d8;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default CorporateHome;