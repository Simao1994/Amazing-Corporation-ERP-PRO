-- Script para resolver problemas de RLS no Blog e na Galeria
-- 1. Garantir que a tabela blog_posts tem RLS configurado correctamente
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Permitir leitura para todos" ON public.blog_posts;
DROP POLICY IF EXISTS "Permitir leitura de posts públicos" ON public.blog_posts;
DROP POLICY IF EXISTS "Permitir escrita por administradores" ON public.blog_posts;
DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON public.blog_posts;

-- Criar novas políticas:
-- A) Leitura: permitida para todos (público e logado)
CREATE POLICY "Permitir leitura para todos" 
ON public.blog_posts FOR SELECT 
TO anon, authenticated 
USING (true);

-- B) Escrita: permitida para autenticados (ou anon se não houver sessão firme)
CREATE POLICY "Permitir tudo para autenticados" 
ON public.blog_posts FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- C) Emissor (Anon) fallback se necessário
CREATE POLICY "Permitir inserção anonima temporaria" 
ON public.blog_posts FOR INSERT 
TO anon 
WITH CHECK (true);

-- 2. Garantir permissões na tabela
GRANT ALL ON public.blog_posts TO anon, authenticated, service_role;

-- 3. STORAGE: Garantir que o bucket 'blog-media' existe e é público (via RLS em storage.objects)
-- Nota: A criação do bucket em si deve ser feita via Dashboard ou API, mas podemos liberar os objectos:
CREATE POLICY "Permitir leitura publica de media" 
ON storage.objects FOR SELECT 
TO anon, authenticated 
USING (bucket_id = 'blog-media');

CREATE POLICY "Permitir upload para os media do blog" 
ON storage.objects FOR INSERT 
TO anon, authenticated 
WITH CHECK (bucket_id = 'blog-media');

-- 4. Actualizar cache do schema
NOTIFY pgrst, 'reload schema';
