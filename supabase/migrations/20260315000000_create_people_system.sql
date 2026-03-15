-- Criar tabela de pessoas/equipe
CREATE TABLE IF NOT EXISTS people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  church TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_people_name ON people(name);
CREATE INDEX IF NOT EXISTS idx_people_church ON people(church);

-- Criar tabela de tokens por pessoa (para links de preenchimento)
CREATE TABLE IF NOT EXISTS person_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_person_tokens_token ON person_access_tokens(token);
CREATE INDEX IF NOT EXISTS idx_person_tokens_person_id ON person_access_tokens(person_id);

-- Adicionar coluna de person_id na tabela moment_song_forms
ALTER TABLE moment_song_forms ADD COLUMN IF NOT EXISTS person_id UUID REFERENCES people(id) ON DELETE SET NULL;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_moment_song_forms_person_id ON moment_song_forms(person_id);

-- RLS Policies para pessoas (public read, autenticado write)
ALTER TABLE people ENABLE ROW LEVEL SECURITY;

CREATE POLICY "People are readable by everyone" ON people
  FOR SELECT USING (true);

CREATE POLICY "People can be inserted by authenticated users" ON people
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "People can be updated by authenticated users" ON people
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "People can be deleted by authenticated users" ON people
  FOR DELETE USING (auth.role() = 'authenticated');

-- RLS Policies para tokens (public read for token validation)
ALTER TABLE person_access_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tokens are readable by everyone" ON person_access_tokens
  FOR SELECT USING (true);

CREATE POLICY "Tokens can be created by authenticated users" ON person_access_tokens
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Tokens can be deleted by authenticated users" ON person_access_tokens
  FOR DELETE USING (auth.role() = 'authenticated');
