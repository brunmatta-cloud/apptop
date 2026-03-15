# 7Flow Executor Local

Agente Node.js standalone para sincronização de mídia e monitoramento de saúde.

## Responsabilidades

1. **Registro** — Se registra como executor ao iniciar
2. **Heartbeat** — Envia heartbeat a cada 15s para manter status online
3. **Polling de Jobs** — Verifica jobs de sincronização pendentes a cada 5s
4. **Download** — Baixa arquivos de mídia do Supabase Storage para disco local
5. **Inventário** — Atualiza `executor_media_inventory` com informações dos arquivos locais
6. **Shutdown graceful** — Marca executor como offline ao parar

## Configuração

1. Copie `config.json` e preencha:
   - `SUPABASE_URL` — URL do projeto Supabase
   - `SUPABASE_ANON_KEY` — Chave anônima do Supabase
   - `BASE_ID` — UUID da base cadastrada no sistema
   - `MEDIA_ROOT` — Diretório raiz para mídia local (padrão: `C:\7flow-media`)
   - `MACHINE_NAME` — Nome identificador desta máquina

2. Instale dependências:
   ```bash
   cd executor-local
   npm install
   ```

3. Execute:
   ```bash
   npm start
   ```

   Ou em modo dev com hot-reload:
   ```bash
   npm run dev
   ```

## Estrutura de diretórios criada

```
C:\7flow-media\
├── audio\      # Músicas e áudios
├── video\      # Vídeos
├── slides\     # Apresentações de slides
└── images\     # Imagens avulsas
```

## Segurança

- O `config.json` contém a chave do Supabase. **Não commite este arquivo.**
- Adicione `executor-local/config.json` ao `.gitignore`.
