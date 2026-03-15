import { useState } from 'react';
import { AlertCircle, CheckCircle, Loader, Copy, Check } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

export default function DebugTokens() {
  const [testToken, setTestToken] = useState('');
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const runTests = async () => {
    setLoading(true);
    setResults({});
    const testResults: Record<string, any> = {};

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      testResults['env_vars'] = {
        url: supabaseUrl?.substring(0, 50) + '...',
        key: supabaseKey?.substring(0, 50) + '...',
        status: supabaseUrl && supabaseKey ? '✅ Configuradas' : '❌ Faltando',
      };

      const supabase = createClient(supabaseUrl, supabaseKey);

      // Test 1: Verificar tabelas
      try {
        const { data: people, error: peopleError } = await supabase
          .from('people')
          .select('count')
          .single();

        testResults['table_people'] = {
          status: peopleError ? `❌ ${peopleError.message}` : '✅ Exists',
          error: peopleError?.message,
        };
      } catch (e: any) {
        testResults['table_people'] = {
          status: `❌ ${e.message}`,
          error: e.message,
        };
      }

      // Test 2: Verificar tokens
      try {
        const { data: tokens, error: tokensError } = await supabase
          .from('person_access_tokens')
          .select('count')
          .single();

        testResults['table_tokens'] = {
          status: tokensError ? `❌ ${tokensError.message}` : '✅ Exists',
          error: tokensError?.message,
        };
      } catch (e: any) {
        testResults['table_tokens'] = {
          status: `❌ ${e.message}`,
          error: e.message,
        };
      }

      // Test 3: Listar pessoas
      try {
        const { data, error } = await supabase
          .from('people')
          .select('*')
          .limit(50);

        testResults['list_people'] = {
          status: error ? `❌ ${error.message}` : `✅ Retornou ${data?.length || 0} pessoas`,
          count: data?.length,
          error: error?.message,
          sample: data?.[0],
        };
      } catch (e: any) {
        testResults['list_people'] = {
          status: `❌ ${e.message}`,
          error: e.message,
        };
      }

      // Test 4: Testar RPC get_person_by_token (sem token específico)
      try {
        const { data, error } = await supabase.rpc('get_person_by_token', {
          token_param: 'TEST_TOKEN_123',
        });

        testResults['rpc_get_person'] = {
          status: error
            ? `❌ ${error.message}`
            : data
              ? `✅ RPC funciona (retornou: ${typeof data})`
              : '❓ RPC executou mas retornou null/vazio',
          error: error?.message,
          data: data,
        };
      } catch (e: any) {
        testResults['rpc_get_person'] = {
          status: `❌ ${e.message}`,
          error: e.message,
        };
      }

      // Test 5: Testar RPC get_moments_for_person (sem ID específico)
      try {
        const { data, error } = await supabase.rpc('get_moments_for_person', {
          person_id_param: '00000000-0000-0000-0000-000000000000',
        });

        testResults['rpc_get_moments'] = {
          status: error
            ? `❌ ${error.message}`
            : Array.isArray(data)
              ? `✅ RPC funciona (retornou ${data.length} items)`
              : '❓ RPC retornou tipo inesperado',
          error: error?.message,
          itemCount: Array.isArray(data) ? data.length : null,
        };
      } catch (e: any) {
        testResults['rpc_get_moments'] = {
          status: `❌ ${e.message}`,
          error: e.message,
        };
      }

      setResults(testResults);
    } catch (error: any) {
      setResults({
        fatal_error: {
          message: error.message,
          stack: error.stack,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const testSpecificToken = async () => {
    if (!testToken.trim()) {
      alert('Digite um token para testar');
      return;
    }

    setLoading(true);
    const testResults: Record<string, any> = {};

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Teste 1: Get token direto da tabela
      try {
        const { data, error } = await supabase
          .from('person_access_tokens')
          .select('*')
          .eq('token', testToken)
          .single();

        testResults['direct_token_lookup'] = {
          status: error ? `❌ ${error.message}` : '✅ Token encontrado',
          token: data,
          error: error?.message,
        };
      } catch (e: any) {
        testResults['direct_token_lookup'] = {
          status: `❌ ${e.message}`,
          error: e.message,
        };
      }

      // Teste 2: Usar RPC para validar
      try {
        const { data, error } = await supabase.rpc('get_person_by_token', {
          token_param: testToken,
        });

        testResults['rpc_token_validation'] = {
          status: error ? `❌ ${error.message}` : data ? '✅ Pessoa encontrada' : '❌ Token inválido',
          person: data,
          error: error?.message,
        };
      } catch (e: any) {
        testResults['rpc_token_validation'] = {
          status: `❌ ${e.message}`,
          error: e.message,
        };
      }

      setResults(testResults);
    } finally {
      setLoading(false);
    }
  };

  const copyResults = () => {
    const text = JSON.stringify(results, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-black text-white mb-2">🔧 Debug Tokens - Supabase</h1>
          <p className="text-slate-300 font-semibold">
            Ferramenta para diagnosticar problemas com tokens e RPC functions
          </p>
        </div>

        <div className="space-y-6">
          {/* Test Controls */}
          <div className="glass-card p-6 rounded-2xl border-2 border-cyan-400/50 bg-gradient-to-br from-cyan-900/20 via-blue-900/15 to-slate-900/10 shadow-2xl">
            <h2 className="text-xl font-black text-white mb-4">📋 Testes Automáticos</h2>
            <button
              onClick={runTests}
              disabled={loading}
              className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-black hover:shadow-lg hover:shadow-cyan-500/40 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader className="h-5 w-5 animate-spin" />}
              {loading ? 'Executando...' : '▶ Executar Testes'}
            </button>
          </div>

          {/* Token Testing */}
          <div className="glass-card p-6 rounded-2xl border-2 border-purple-400/50 bg-gradient-to-br from-purple-900/20 via-indigo-900/15 to-slate-900/10 shadow-2xl">
            <h2 className="text-xl font-black text-white mb-4">🔐 Testar Token Específico</h2>
            <div className="space-y-3">
              <input
                type="text"
                value={testToken}
                onChange={(e) => setTestToken(e.target.value)}
                placeholder="Cole um token aqui para testar..."
                className="w-full px-4 py-3 rounded-lg bg-slate-700/50 border-2 border-purple-400/30 text-white placeholder-slate-400 focus:border-purple-400 focus:outline-none font-mono text-sm"
              />
              <button
                onClick={testSpecificToken}
                disabled={loading || !testToken.trim()}
                className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-black hover:shadow-lg hover:shadow-purple-500/40 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader className="h-5 w-5 animate-spin" />}
                {loading ? 'Testando...' : '🔍 Testar Token'}
              </button>
            </div>
          </div>

          {/* Results */}
          {Object.keys(results).length > 0 && (
            <div className="glass-card p-6 rounded-2xl border-2 border-emerald-400/50 bg-gradient-to-br from-emerald-900/20 via-cyan-900/15 to-slate-900/10 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black text-white">📊 Resultados</h2>
                <button
                  onClick={copyResults}
                  className="px-3 py-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 font-bold flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-400" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copiar
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-3">
                {Object.entries(results).map(([key, value]) => (
                  <div key={key} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                    <div className="flex items-start gap-3">
                      {typeof value.status === 'string' && value.status.startsWith('✅') ? (
                        <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-black text-white text-sm mb-1">{key}</h3>
                        <p className="text-slate-300 text-sm font-semibold mb-1">{value.status}</p>

                        {value.error && (
                          <div className="bg-slate-900/50 rounded p-2 mt-2 border-l-2 border-red-500">
                            <code className="text-xs text-red-300 break-words">{value.error}</code>
                          </div>
                        )}

                        {value.sample && (
                          <div className="bg-slate-900/50 rounded p-2 mt-2 border-l-2 border-blue-500">
                            <p className="text-xs text-blue-300 font-mono">
                              {JSON.stringify(value.sample).substring(0, 200)}...
                            </p>
                          </div>
                        )}

                        {value.token && (
                          <div className="bg-slate-900/50 rounded p-2 mt-2 border-l-2 border-cyan-500">
                            <p className="text-xs text-cyan-300 font-mono">
                              Token: {value.token.token?.substring(0, 20)}...
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              Active: {value.token.is_active ? '✅' : '❌'}
                            </p>
                          </div>
                        )}

                        {value.person && (
                          <div className="bg-slate-900/50 rounded p-2 mt-2 border-l-2 border-emerald-500">
                            <p className="text-xs text-emerald-300 font-mono">
                              Person: {value.person.name} ({value.person.id?.substring(0, 8)})
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="glass-card p-6 rounded-2xl border-2 border-yellow-400/50 bg-gradient-to-br from-yellow-900/20 via-orange-900/15 to-slate-900/10 shadow-2xl">
            <h2 className="text-xl font-black text-white mb-4">📌 Como Usar</h2>
            <ul className="space-y-2 text-slate-300 font-semibold">
              <li>✅ Apertue <strong>Executar Testes</strong> para verificar configuração geral + RPC functions</li>
              <li>✅ Vá em <strong>CadastroPessoas</strong>, crie uma pessoa e gere um token</li>
              <li>✅ Cole o token no campo <strong>Testar Token Específico</strong></li>
              <li>✅ Se aparecer <strong>❌</strong>, o problema está em um dos pontos diagnosticados</li>
              <li>✅ Copie os resultados e compartilhe se precisar de ajuda</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
