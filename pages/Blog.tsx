import React, { useState, useEffect, useMemo } from 'react';
import { Newspaper, Plus, Search, Edit, Trash2, Calendar, User, Tag, Eye, X, Send, Image as ImageIcon, RefreshCw } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { BlogPost } from '../types';
import { supabase } from '../src/lib/supabase';

const BlogPage: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [posts, setPosts] = useState<BlogPost[]>([]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('data_publicacao', { ascending: false });

      if (error) throw error;

      // Map to frontend type
      const mapped = (data || []).map(p => ({
        id: p.id,
        titulo: p.titulo,
        categoria: p.categoria,
        conteudo: p.conteudo,
        autor: p.autor_name,
        data: p.data_publicacao,
        imagem_url: p.imagem_url,
        visualizacoes: p.visualizacoes
      }));

      setPosts(mapped as any);
    } catch (err) {
      console.error('Erro ao carregar blog:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const filtered = useMemo(() =>
    posts.filter(p => p.titulo.toLowerCase().includes(searchTerm.toLowerCase())),
    [searchTerm, posts]
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const isEditing = !!editingItem;

    const dataPayload = {
      titulo: formData.get('titulo') as string,
      categoria: formData.get('categoria') as any || 'Institucional',
      conteudo: formData.get('conteudo') as string,
      autor_name: formData.get('autor') as string,
      data_publicacao: editingItem?.data || new Date().toISOString().split('T')[0],
      imagem_url: formData.get('imagem_url') as string || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800',
      updated_at: new Date().toISOString()
    };

    try {
      if (isEditing) {
        const { error } = await supabase
          .from('blog_posts')
          .update(dataPayload)
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('blog_posts')
          .insert([dataPayload]);
        if (error) throw error;
      }

      await fetchPosts();
      setShowModal(false);
      setEditingItem(null);
    } catch (err) {
      console.error('Erro ao guardar artigo:', err);
      alert('Não foi possível publicar o artigo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, titulo: string) => {
    if (confirm(`Remover permanentemente o artigo "${titulo}"?`)) {
      try {
        const { error } = await supabase
          .from('blog_posts')
          .delete()
          .eq('id', id);
        if (error) throw error;
        await fetchPosts();
      } catch (err) {
        console.error('Erro ao eliminar artigo:', err);
      }
    }
  };


  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-sky-200">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Newspaper className="text-yellow-500" size={14} />
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em]">Comunicação Corporativa</span>
          </div>
          <h1 className="text-4xl font-black text-zinc-900 tracking-tight uppercase">Blog & Notícias</h1>
          <p className="text-zinc-500 font-medium mt-1">Gestão de artigos oficiais e comunicados do grupo Amazing.</p>
        </div>
        <button
          onClick={() => { setEditingItem(null); setShowModal(true); }}
          className="px-8 py-4 bg-zinc-900 text-white rounded-2xl flex items-center gap-3 font-black shadow-xl hover:bg-zinc-800 transition-all active:scale-95"
        >
          <Plus size={20} /> ESCREVER ARTIGO
        </button>
      </div>

      <div className="bg-white p-2 rounded-[2rem] shadow-sm border border-sky-100">
        <Input
          placeholder="Pesquisar por título ou palavra-chave..."
          icon={<Search size={20} className="text-zinc-400" />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent border-none py-4 text-lg font-semibold"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {loading ? (
          <div className="col-span-full py-20 flex flex-col items-center bg-white rounded-[3rem] border border-sky-100 italic font-bold">
            <RefreshCw size={40} className="text-yellow-500 animate-spin mb-4" />
            <p className="text-zinc-400 uppercase tracking-widest text-xs">Consultando Arquivos...</p>
          </div>
        ) : filtered.length > 0 ? filtered.map(post => (
          <div key={post.id} className="bg-white rounded-[3rem] overflow-hidden border border-sky-100 shadow-sm hover:shadow-2xl transition-all group flex flex-col md:flex-row">
            {/* ... rest of the card content ... */}
            <div className="md:w-1/3 aspect-video md:aspect-auto overflow-hidden relative">
              <img src={post.imagem_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={post.titulo} />
              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 bg-yellow-500 text-zinc-900 text-[9px] font-black uppercase tracking-widest rounded-lg shadow-lg">
                  {post.categoria}
                </span>
              </div>
            </div>
            <div className="md:w-2/3 p-8 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-black text-zinc-900 leading-tight group-hover:text-yellow-600 transition-colors">{post.titulo}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingItem(post); setShowModal(true); }} className="p-2 text-zinc-300 hover:text-yellow-600 transition-colors"><Edit size={16} /></button>
                    <button onClick={() => handleDelete(post.id, post.titulo)} className="p-2 text-zinc-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                  </div>
                </div>
                <p className="text-zinc-500 text-sm line-clamp-2 font-medium mb-6">
                  {post.conteudo}
                </p>
              </div>
              <div className="pt-4 border-t border-zinc-50 flex items-center justify-between text-zinc-400">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest">
                    <User size={12} className="text-yellow-500" /> {post.autor}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest">
                    <Calendar size={12} className="text-yellow-500" /> {new Date(post.data).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest">
                  <Eye size={12} className="text-yellow-500" /> {post.visualizacoes}
                </div>
              </div>
            </div>
          </div>
        )) : (
          <div className="col-span-full py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-sky-100">
            <Newspaper size={64} className="mx-auto text-sky-100 mb-4" />
            <p className="text-zinc-400 font-bold italic text-lg">Nenhum artigo encontrado no blog.</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
              <h2 className="text-2xl font-black text-zinc-900 flex items-center gap-3">
                <Send className="text-yellow-500" />
                {editingItem ? 'Editar Conteúdo' : 'Redigir Novo Artigo'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-3 hover:bg-zinc-200 rounded-full transition-all"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-10 space-y-6 overflow-y-auto max-h-[75vh]">
              <Input name="titulo" label="Título do Artigo" defaultValue={editingItem?.titulo} required placeholder="Ex: A Nova Era da Logística em Angola" />
              <div className="grid grid-cols-2 gap-6">
                <Select name="categoria" label="Categoria" defaultValue={editingItem?.categoria} options={[
                  { value: 'Logística', label: 'Logística & Transportes' },
                  { value: 'Agronegócio', label: 'Agronegócio' },
                  { value: 'Imobiliário', label: 'Imobiliário' },
                  { value: 'Institucional', label: 'Institucional / RH' }
                ]} />
                <Input name="autor" label="Autor / Fonte" defaultValue={editingItem?.autor || 'Comunicação Amazing'} required />
              </div>
              <Input name="imagem_url" label="URL da Imagem de Capa" defaultValue={editingItem?.imagem_url} placeholder="https://..." icon={<ImageIcon size={18} />} />
              <div className="space-y-1">
                <label className="block text-sm font-black text-zinc-700 uppercase tracking-widest mb-1">Conteúdo do Artigo</label>
                <textarea
                  name="conteudo"
                  defaultValue={editingItem?.conteudo}
                  required
                  className="w-full p-6 bg-zinc-50 border border-zinc-200 rounded-[2rem] h-48 outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 font-medium text-zinc-700"
                  placeholder="Escreva aqui a sua notícia ou comunicado..."
                />
              </div>
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-5 bg-zinc-900 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-xl hover:bg-zinc-800 transition-all disabled:opacity-70"
                >
                  {saving ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
                  {saving ? 'PUBLICANDO...' : (editingItem ? 'SALVAR ALTERAÇÕES' : 'PUBLICAR ARTIGO AGORA')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default BlogPage;