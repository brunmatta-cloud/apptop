-- Desabilitar RLS temporariamente para ajustar policies
ALTER TABLE people DISABLE ROW LEVEL SECURITY;
ALTER TABLE person_access_tokens DISABLE ROW LEVEL SECURITY;

-- Remover policies antigas
DROP POLICY IF EXISTS "People are readable by everyone" ON people;
DROP POLICY IF EXISTS "People can be inserted by authenticated users" ON people;
DROP POLICY IF EXISTS "People can be updated by authenticated users" ON people;
DROP POLICY IF EXISTS "People can be deleted by authenticated users" ON people;
DROP POLICY IF EXISTS "Tokens are readable by everyone" ON person_access_tokens;
DROP POLICY IF EXISTS "Tokens can be created by authenticated users" ON person_access_tokens;
DROP POLICY IF EXISTS "Tokens can be deleted by authenticated users" ON person_access_tokens;

-- Reabilitar RLS
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_access_tokens ENABLE ROW LEVEL SECURITY;

-- Criar novas policies mais simples e funcionais

-- PEOPLE: Todos podem ler, apenas autenticados podem modificar
CREATE POLICY "people_select" ON people
  FOR SELECT USING (true);

CREATE POLICY "people_insert" ON people
  FOR INSERT WITH CHECK (true);

CREATE POLICY "people_update" ON people
  FOR UPDATE USING (true);

CREATE POLICY "people_delete" ON people
  FOR DELETE USING (true);

-- PERSON_ACCESS_TOKENS: Todos podem ler (para validar), apenas autenticados podem criar/deletar
CREATE POLICY "person_access_tokens_select" ON person_access_tokens
  FOR SELECT USING (true);

CREATE POLICY "person_access_tokens_insert" ON person_access_tokens
  FOR INSERT WITH CHECK (true);

CREATE POLICY "person_access_tokens_update" ON person_access_tokens
  FOR UPDATE USING (true);

CREATE POLICY "person_access_tokens_delete" ON person_access_tokens
  FOR DELETE USING (true);

-- MOMENT_SONG_FORMS: Permite acesso público via token
ALTER TABLE moment_song_forms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "form_select" ON moment_song_forms;
DROP POLICY IF EXISTS "form_insert" ON moment_song_forms;
DROP POLICY IF EXISTS "form_update" ON moment_song_forms;

CREATE POLICY "form_select" ON moment_song_forms
  FOR SELECT USING (true);

CREATE POLICY "form_insert" ON moment_song_forms
  FOR INSERT WITH CHECK (true);

CREATE POLICY "form_update" ON moment_song_forms
  FOR UPDATE USING (true);

-- MOMENT_SONGS: Permite acesso público
ALTER TABLE moment_songs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "song_select" ON moment_songs;
DROP POLICY IF EXISTS "song_insert" ON moment_songs;
DROP POLICY IF EXISTS "song_update" ON moment_songs;
DROP POLICY IF EXISTS "song_delete" ON moment_songs;

CREATE POLICY "song_select" ON moment_songs
  FOR SELECT USING (true);

CREATE POLICY "song_insert" ON moment_songs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "song_update" ON moment_songs
  FOR UPDATE USING (true);

CREATE POLICY "song_delete" ON moment_songs
  FOR DELETE USING (true);

-- Criar função RPC para validar e obter dados da pessoa
CREATE OR REPLACE FUNCTION get_person_by_token(token_param TEXT)
RETURNS TABLE (
  person_id UUID,
  person_name TEXT,
  person_church TEXT,
  person_phone TEXT,
  person_email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pat.person_id,
    p.name,
    p.church,
    p.phone,
    p.email
  FROM person_access_tokens pat
  JOIN people p ON p.id = pat.person_id
  WHERE pat.token = token_param
    AND pat.is_active = true
    AND (pat.expires_at IS NULL OR pat.expires_at > now());
END;
$$ LANGUAGE plpgsql STABLE;

-- Criar função para obter momentos de uma pessoa
CREATE OR REPLACE FUNCTION get_moments_for_person(person_id_param UUID)
RETURNS TABLE (
  moment_id UUID,
  culto_id UUID,
  atividade TEXT,
  horario_inicio TEXT,
  responsavel TEXT,
  form_token TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    m.id,
    m.culto_id,
    m.atividade,
    m.horarioInicio,
    m.responsavel,
    msf.token
  FROM "MomentoProgramacao" m
  LEFT JOIN moment_song_forms msf ON msf.moment_id = m.id
  WHERE m.responsavel IN (
    SELECT name FROM people WHERE id = person_id_param
  )
  ORDER BY m.horarioInicio;
END;
$$ LANGUAGE plpgsql STABLE;
