
import React, { useState, useEffect, useMemo } from 'react';
import {
  Share2, Send, MessageCircle, Star, ShieldAlert, Award, Info,
  User as UserIcon, MoreHorizontal, Image as ImageIcon, RefreshCw
} from 'lucide-react';
import { Post, User } from '../types';
import { supabase } from '../src/lib/supabase';

const FeedPage: React.FC = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [newPostContent, setNewPostContent] = useState('');
  const [postType, setPostType] = useState<Post['type']>('general');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setCurrentUser(profile as User);
      }
    };
    getSession();
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('feed_posts')
        .select(`
          *,
          author:profiles!feed_posts_author_id_fkey (
            id,
            nome,
            role,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (err) {
      console.error('Erro ao buscar posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() || !currentUser || posting) return;

    setPosting(true);
    try {
      const { error } = await supabase
        .from('feed_posts')
        .insert([{
          author_id: currentUser.id,
          content: newPostContent,
          type: postType
        }]);

      if (error) throw error;

      setNewPostContent('');
      await fetchPosts();
    } catch (err) {
      console.error('Erro ao postar:', err);
      alert('Não foi possível publicar no feed.');
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!currentUser) return;
    try {
      // First try to insert the like
      const { error: likeError } = await supabase
        .from('feed_likes')
        .insert([{ post_id: postId, user_id: currentUser.id }]);

      if (likeError) {
        if (likeError.code === '23505') { // Unique constraint violation (already liked)
          return;
        }
        throw likeError;
      }

      // Increment likes_count on the post
      const { error: updateError } = await supabase.rpc('increment_likes', { post_id_to_inc: postId });

      // If RPC is not available (not created yet), do manual update
      if (updateError) {
        const currentPost = posts.find(p => p.id === postId);
        await supabase
          .from('feed_posts')
          .update({ likes_count: (currentPost?.likes_count || 0) + 1 })
          .eq('id', postId);
      }

      await fetchPosts();
    } catch (err) {
      console.error('Erro ao dar like:', err);
    }
  };

  const getPostIcon = (type: Post['type']) => {
    switch (type) {
      case 'safety': return <ShieldAlert className="text-red-500" size={20} />;
      case 'achievement': return <Award className="text-yellow-500" size={20} />;
      case 'announcement': return <Info className="text-sky-500" size={20} />;
      default: return <MessageCircle className="text-zinc-400" size={20} />;
    }
  };


  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-700">
      {/* Sidebar Esquerda - Perfil Rápido */}
      <div className="hidden lg:block lg:col-span-3 space-y-6">
        <div className="bg-white rounded-[2rem] p-8 border border-sky-100 shadow-sm text-center">
          <div className="w-24 h-24 rounded-3xl bg-zinc-100 mx-auto mb-4 overflow-hidden border-4 border-white shadow-xl">
            <img src={`https://ui-avatars.com/api/?name=${currentUser.nome}&background=6d28d9&color=fff`} className="w-full h-full object-cover" />
          </div>
          <h2 className="text-xl font-black text-zinc-900">{currentUser.nome}</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-purple-600 mt-1">{currentUser.role}</p>

          <div className="grid grid-cols-2 gap-2 mt-8 border-t border-zinc-50 pt-6">
            <div>
              <p className="text-[9px] font-black text-zinc-400 uppercase">Posts</p>
              <p className="text-lg font-black text-zinc-900">
                {posts.filter(p => p.author_name === currentUser.nome).length}
              </p>
            </div>
            <div className="border-l border-zinc-50">
              <p className="text-[9px] font-black text-zinc-400 uppercase">Amazing</p>
              <p className="text-lg font-black text-zinc-900">128</p>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <Award size={120} />
          </div>
          <h3 className="font-bold text-yellow-500 text-xs uppercase tracking-widest mb-4">Destaque da Semana</h3>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center text-zinc-900 font-bold">#1</div>
            <div>
              <p className="font-bold text-sm">António Manuel</p>
              <p className="text-[10px] text-zinc-400">Recorde de 48 Entregas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Feed Principal */}
      <div className="lg:col-span-6 space-y-6">
        {/* Editor de Post */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-sky-100">
          <form onSubmit={handleCreatePost}>
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
                {currentUser?.avatar_url ? (
                  <img src={currentUser.avatar_url} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="text-purple-600" />
                )}
              </div>
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="O que está a acontecer na Amazing Corp hoje?"
                className="w-full bg-transparent border-none focus:ring-0 text-zinc-700 font-medium placeholder:text-zinc-300 resize-none py-2"
                rows={2}
              />
            </div>

            <div className="mt-6 pt-6 border-t border-zinc-50 flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPostType('general')}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${postType === 'general' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-400 hover:bg-zinc-50'}`}
                >
                  Geral
                </button>
                <button
                  type="button"
                  onClick={() => setPostType('safety')}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${postType === 'safety' ? 'bg-red-50 text-red-600' : 'text-zinc-400 hover:bg-zinc-50'}`}
                >
                  Segurança
                </button>
                <button
                  type="button"
                  onClick={() => setPostType('achievement')}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${postType === 'achievement' ? 'bg-yellow-50 text-yellow-600' : 'text-zinc-400 hover:bg-zinc-50'}`}
                >
                  Conquista
                </button>
              </div>

              <button
                type="submit"
                disabled={posting || !currentUser}
                className="px-8 py-3 bg-zinc-900 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-zinc-900/10 hover:bg-zinc-800 flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
              >
                {posting ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                {posting ? 'A publicar...' : 'Publicar'}
              </button>
            </div>
          </form>
        </div>

        {/* Lista de Posts */}
        <div className="space-y-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center bg-white/50 rounded-[2.5rem] border border-sky-100">
              <RefreshCw size={40} className="text-purple-600 animate-spin mb-4" />
              <p className="text-zinc-400 font-black uppercase tracking-widest text-[10px]">Actualizando Feed...</p>
            </div>
          ) : posts.map((post) => (
            <div key={post.id} className="bg-white rounded-[2.5rem] p-8 border border-sky-100 shadow-sm hover:shadow-xl hover:shadow-sky-500/5 transition-all duration-500">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-100 overflow-hidden shadow-md">
                    <img src={post.author?.avatar_url || `https://ui-avatars.com/api/?name=${post.author?.nome || 'User'}&background=random`} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="font-black text-zinc-900 text-sm">{post.author?.nome || 'Utilizador Amazing'}</h4>
                    <p className="text-[9px] font-black text-purple-600 uppercase tracking-widest">{post.author?.role || 'MEMBRO'} • {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getPostIcon(post.type)}
                  <button className="text-zinc-300 hover:text-zinc-600 transition-colors"><MoreHorizontal size={20} /></button>
                </div>
              </div>

              <div className="text-zinc-600 font-medium leading-relaxed text-base mb-6 px-1">
                {post.content}
              </div>

              <div className="pt-6 border-t border-zinc-50 flex items-center gap-6">
                <button
                  onClick={() => handleLike(post.id)}
                  className="flex items-center gap-2 text-zinc-400 hover:text-yellow-500 transition-all group"
                >
                  <div className="p-2 bg-zinc-50 rounded-xl group-hover:bg-yellow-50 transition-colors">
                    <Star size={18} className={post.likes_count > 0 ? "fill-yellow-500 text-yellow-500" : ""} />
                  </div>
                  <span className="text-xs font-black">{post.likes_count || 0}</span>
                </button>

                <button className="flex items-center gap-2 text-zinc-400 hover:text-sky-500 transition-all group">
                  <div className="p-2 bg-zinc-50 rounded-xl group-hover:bg-sky-50 transition-colors">
                    <MessageCircle size={18} />
                  </div>
                  <span className="text-xs font-black">Comentar</span>
                </button>
              </div>
            </div>
          ))}

          {!loading && posts.length === 0 && (
            <div className="text-center py-20 bg-white/40 rounded-[2.5rem] border-2 border-dashed border-sky-200">
              <Share2 size={48} className="mx-auto text-sky-200 mb-4" />
              <p className="text-sky-400 font-bold">Ainda não há publicações na comunidade Amazing.</p>
            </div>
          )}
        </div>
      </div>


      {/* Sidebar Direita - Online Now */}
      <div className="hidden lg:block lg:col-span-3 space-y-6">
        <div className="bg-white rounded-[2.5rem] p-8 border border-sky-100 shadow-sm">
          <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            Online Agora
          </h3>
          <div className="space-y-4">
            {[
              { name: 'Maria Silva', status: 'Manager' },
              { name: 'João Santos', status: 'Finance' },
              { name: 'Ricardo Pereira', status: 'Fleet' }
            ].map((u, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-zinc-50 transition-colors cursor-pointer group">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 overflow-hidden">
                    <img src={`https://ui-avatars.com/api/?name=${u.name}&background=random`} className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
                <div>
                  <p className="text-xs font-black text-zinc-900 group-hover:text-purple-600 transition-colors">{u.name}</p>
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{u.status}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-3 border border-sky-100 rounded-xl text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:bg-sky-50 transition-all">
            Ver Todos os Freends
          </button>
        </div>

        <div className="p-8 bg-white/40 rounded-[2.5rem] border border-white">
          <div className="flex items-center gap-3 mb-4">
            <Star className="text-yellow-500" size={18} />
            <h4 className="text-xs font-black text-zinc-900 uppercase">Sugestões de Amizade</h4>
          </div>
          <p className="text-[10px] text-zinc-500 font-medium leading-relaxed italic">
            "Conecte-se com outros gestores para trocar experiências operacionais."
          </p>
        </div>
      </div>
    </div>
  );
};

export default FeedPage;
