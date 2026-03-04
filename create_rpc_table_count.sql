-- RPC para o contador de tabelas na Dashboard de Configurações
DROP FUNCTION IF EXISTS get_table_count();

CREATE OR REPLACE FUNCTION get_table_count()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    table_count int;
BEGIN
    SELECT count(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public';
    RETURN table_count;
END;
$$;
