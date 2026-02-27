-- Função para contar o total de tabelas no esquema public
-- Necessário para exibir informações dinâmicas na página de Configurações
CREATE OR REPLACE FUNCTION get_table_count()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER -- Executa com privilégios de administrador para aceder ao information_schema
AS $$
BEGIN
  RETURN (
    SELECT count(*)
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
  );
END;
$$;

-- Garantir que a função pode ser chamada via RPC pelo cliente (anon/authenticated)
GRANT EXECUTE ON FUNCTION get_table_count() TO anon;
GRANT EXECUTE ON FUNCTION get_table_count() TO authenticated;
