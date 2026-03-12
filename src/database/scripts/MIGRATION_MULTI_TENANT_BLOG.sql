-- ==========================================
-- 🏢 MULTI-TENANT BLOG POSTS & CORPORATE PORTAL
-- ==========================================

-- 1. Adicionar tenant_id à tabela blog_posts
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blog_posts' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.blog_posts ADD COLUMN tenant_id uuid REFERENCES public.saas_tenants(id);
    END IF;
END $$;

-- 2. Backfill: Atribuir posts existentes ao tenant Amazing (ou Root)
-- Assumindo que o tenant Amazing Corp tem o slug 'amazing-corp'
UPDATE public.blog_posts 
SET tenant_id = (SELECT id FROM public.saas_tenants WHERE slug = 'amazing-corp' LIMIT 1)
WHERE tenant_id IS NULL;

-- 3. Configurar RLS para blog_posts
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Política: Qualquer um pode VER posts marcados como públicos (necessário para o CorporateHome)
DROP POLICY IF EXISTS "Posts públicos são visíveis para todos" ON public.blog_posts;
CREATE POLICY "Posts públicos são visíveis para todos" 
ON public.blog_posts FOR SELECT 
USING (is_publico = true);

-- Política: Usuários autenticados vêem posts do seu tenant (sejam públicos ou privados)
DROP POLICY IF EXISTS "Tenants vêem seus próprios posts" ON public.blog_posts;
CREATE POLICY "Tenants vêem seus próprios posts" 
ON public.blog_posts FOR SELECT 
TO authenticated
USING (tenant_id = public.get_auth_tenant());

-- Política: Apenas membros do tenant (admin ou autores) podem CRIAR posts para o seu tenant
DROP POLICY IF EXISTS "Tenants podem inserir seus próprios posts" ON public.blog_posts;
CREATE POLICY "Tenants podem inserir seus próprios posts" 
ON public.blog_posts FOR INSERT 
TO authenticated
WITH CHECK (tenant_id = public.get_auth_tenant());

-- Política: Apenas membros do tenant podem EDITAR seus próprios posts
DROP POLICY IF EXISTS "Tenants podem atualizar seus próprios posts" ON public.blog_posts;
CREATE POLICY "Tenants podem atualizar seus próprios posts" 
ON public.blog_posts FOR UPDATE 
TO authenticated
USING (tenant_id = public.get_auth_tenant())
WITH CHECK (tenant_id = public.get_auth_tenant());

-- Política: Apenas membros do tenant podem APAGAR seus próprios posts
DROP POLICY IF EXISTS "Tenants podem apagar seus próprios posts" ON public.blog_posts;
CREATE POLICY "Tenants podem apagar seus próprios posts" 
ON public.blog_posts FOR DELETE 
TO authenticated
USING (tenant_id = public.get_auth_tenant());

-- 4. Criar View para o Corporate Home facilitado (opcional, mas bom para performance)
-- Integra posts com dados básicos do tenant para exibir marcas
CREATE OR REPLACE VIEW public.v_public_posts AS
SELECT 
    p.*,
    t.nome as tenant_nome,
    t.logo_url as tenant_logo_url,
    t.slug as tenant_slug
FROM public.blog_posts p
LEFT JOIN public.saas_tenants t ON p.tenant_id = t.id
WHERE p.is_publico = true;

GRANT SELECT ON public.v_public_posts TO anon, authenticated;
