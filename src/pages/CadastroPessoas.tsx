import { useState } from 'react';
import { Plus, Edit2, Trash2, Copy, Check, AlertCircle, Loader } from 'lucide-react';
import { usePeople, useCreatePerson, useUpdatePerson, useDeletePerson, useGeneratePersonToken, usePersonTokens } from '@/features/repertorio/hooks-people';
import type { Person, CreatePersonInput, UpdatePersonInput } from '@/types/people';
import { toast } from '@/hooks/use-toast';

export default function CadastroPessoas() {
  const { data: people = [], isLoading, isError } = usePeople();
  const createMutation = useCreatePerson();
  const updateMutation = useUpdatePerson();
  const deleteMutation = useDeletePerson();
  const generateTokenMutation = useGeneratePersonToken();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreatePersonInput>({
    name: '',
    church: '',
    phone: '',
    email: '',
    notes: '',
  });

  const handleReset = () => {
    setFormData({ name: '', church: '', phone: '', email: '', notes: '' });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleEdit = (person: Person) => {
    setFormData({
      name: person.name,
      church: person.church,
      phone: person.phone,
      email: person.email,
      notes: person.notes,
    });
    setEditingId(person.id);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.church.trim()) {
      toast({
        title: 'Erro',
        description: 'Nome e Igreja são obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...formData });
        toast({
          title: 'Sucesso',
          description: 'Pessoa atualizada com sucesso',
        });
      } else {
        await createMutation.mutateAsync(formData);
        toast({
          title: 'Sucesso',
          description: 'Pessoa cadastrada com sucesso',
        });
      }
      handleReset();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast({
        title: 'Erro',
        description: error?.message || 'Falha ao salvar pessoa. Verifique a conexão com o banco de dados.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja deletar esta pessoa?')) return;

    try {
      await deleteMutation.mutateAsync(id);
      toast({
        title: 'Sucesso',
        description: 'Pessoa deletada com sucesso',
      });
    } catch (error: any) {
      console.error('Erro ao deletar:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao deletar pessoa',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-white mb-2">📋 Cadastro de Pessoas</h1>
          <p className="text-slate-300 font-semibold">Gerenciador centralizado de equipes e responsáveis</p>
        </div>

        {/* Erro de conexão */}
        {isError && (
          <div className="mb-6 glass-card p-4 rounded-2xl border-2 border-red-400/50 bg-red-900/20 flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-red-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-white font-bold mb-1">Erro de Conexão</h3>
              <p className="text-red-200 text-sm">Nãofollow conseguir conectar ao banco de dados. Verifique a configuração do Supabase.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* FORMULÁRIO LATERAL */}
          <div className="lg:col-span-1">
            <div className="glass-card p-6 rounded-2xl border-2 border-cyan-400/50 bg-gradient-to-br from-cyan-900/20 via-blue-900/15 to-slate-900/10 shadow-2xl shadow-cyan-600/20 sticky top-6">
              <h2 className="text-xl font-black text-white mb-5 flex items-center gap-2">
                {editingId ? '✏️ Editar Pessoa' : '➕ Nova Pessoa'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-bold text-cyan-200 block mb-1.5">Nome *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-700/50 border-2 border-cyan-400/30 text-white placeholder-slate-400 focus:border-cyan-400 focus:outline-none transition-all font-semibold"
                    placeholder="João Silva"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-cyan-200 block mb-1.5">Igreja *</label>
                  <input
                    type="text"
                    value={formData.church}
                    onChange={(e) => setFormData({ ...formData, church: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-700/50 border-2 border-cyan-400/30 text-white placeholder-slate-400 focus:border-cyan-400 focus:outline-none transition-all font-semibold"
                    placeholder="Igreja Apostólica"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-cyan-200 block mb-1.5">Telefone</label>
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-700/50 border-2 border-cyan-400/30 text-white placeholder-slate-400 focus:border-cyan-400 focus:outline-none transition-all font-semibold"
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-cyan-200 block mb-1.5">Email</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-700/50 border-2 border-cyan-400/30 text-white placeholder-slate-400 focus:border-cyan-400 focus:outline-none transition-all font-semibold"
                    placeholder="joao@email.com"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-cyan-200 block mb-1.5">Notas</label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-700/50 border-2 border-cyan-400/30 text-white placeholder-slate-400 focus:border-cyan-400 focus:outline-none transition-all font-semibold resize-none h-20"
                    placeholder="Observações..."
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-black hover:shadow-lg hover:shadow-cyan-500/40 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {(createMutation.isPending || updateMutation.isPending) && (
                      <Loader className="h-4 w-4 animate-spin" />
                    )}
                    {editingId ? '💾 Atualizar' : '➕ Criar'}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-4 py-3 rounded-lg bg-slate-700/50 text-slate-300 font-black hover:bg-slate-600/50 transition-all border border-slate-600"
                    >
                      ✕ Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* LISTA DE PESSOAS */}
          <div className="lg:col-span-2">
            <div className="space-y-3">
              {isLoading ? (
                <div className="glass-card p-8 rounded-2xl text-center text-slate-300 flex items-center justify-center gap-2">
                  <Loader className="h-5 w-5 animate-spin text-cyan-400" />
                  <p className="font-semibold">Carregando pessoas...</p>
                </div>
              ) : people.length === 0 ? (
                <div className="glass-card p-8 rounded-2xl text-center text-slate-300 border-2 border-dashed border-slate-600">
                  <AlertCircle className="h-8 w-8 mx-auto mb-3 opacity-50" />
                  <p className="font-semibold">Nenhuma pessoa cadastrada ainda</p>
                </div>
              ) : (
                people.map((person) => (
                  <PersonCard
                    key={person.id}
                    person={person}
                    isExpanded={expandedId === person.id}
                    onToggle={() => setExpandedId(expandedId === person.id ? null : person.id)}
                    onEdit={() => handleEdit(person)}
                    onDelete={() => handleDelete(person.id)}
                    onGenerateToken={() => generateTokenMutation.mutate(person.id)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PersonCardProps {
  person: Person;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onGenerateToken: () => void;
}

function PersonCard({
  person,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onGenerateToken,
}: PersonCardProps) {
  const { data: tokens = [], isLoading: tokensLoading } = usePersonTokens(person.id);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const copyToClipboard = (token: string) => {
    const link = `${window.location.origin}/equipe-musica/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);

    toast({
      title: 'Copiado!',
      description: 'Link copiado para a área de transferência',
    });
  };

  return (
    <div className="glass-card rounded-2xl border-2 border-purple-400/40 bg-gradient-to-br from-purple-900/15 via-indigo-900/10 to-slate-900/5 shadow-lg overflow-hidden transition-all hover:shadow-xl hover:border-purple-400/60">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-4 flex-1 text-left">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg">
            {person.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-lg font-black text-white">{person.name}</h3>
            <p className="text-sm text-slate-300 font-semibold">📍 {person.church}</p>
          </div>
        </div>
        <div className="text-2xl">{isExpanded ? '▼' : '▶'}</div>
      </button>

      {isExpanded && (
        <div className="border-t border-purple-400/20 px-6 py-4 space-y-4 bg-white/3">
          {/* Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {person.phone && (
              <div>
                <p className="text-slate-400 font-semibold mb-1">📱 Telefone</p>
                <p className="text-white font-bold">{person.phone}</p>
              </div>
            )}
            {person.email && (
              <div>
                <p className="text-slate-400 font-semibold mb-1">✉️ Email</p>
                <p className="text-white font-bold">{person.email}</p>
              </div>
            )}
          </div>

          {person.notes && (
            <div>
              <p className="text-slate-400 font-semibold mb-1">📝 Notas</p>
              <p className="text-white text-sm">{person.notes}</p>
            </div>
          )}

          {/* Tokens */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-400 font-semibold">🔗 Links de Acesso</p>
              <button
                onClick={onGenerateToken}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/40 text-emerald-100 text-xs font-bold border border-emerald-400/50 hover:bg-emerald-500/50 transition-all disabled:opacity-50 flex items-center gap-1"
              >
                ➕ Novo
              </button>
            </div>
            {tokensLoading ? (
              <p className="text-slate-500 text-sm flex items-center gap-1">
                <Loader className="h-3 w-3 animate-spin" />
                Carregando...
              </p>
            ) : tokens.length === 0 ? (
              <p className="text-slate-500 text-sm italic">Nenhum link gerado ainda</p>
            ) : (
              <div className="space-y-2">
                {tokens.map((token) => (
                  <div key={token.id} className="flex items-center gap-2 bg-slate-700/40 rounded-lg p-2">
                    <code className="flex-1 text-xs text-slate-300 font-mono truncate">{token.token}</code>
                    <button
                      onClick={() => copyToClipboard(token.token)}
                      className="p-1.5 rounded-lg hover:bg-slate-600/50 transition-all"
                      title="Copiar link"
                    >
                      {copiedToken === token.token ? (
                        <Check className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Copy className="h-4 w-4 text-slate-400" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ações */}
          <div className="flex gap-2 pt-2 border-t border-purple-400/20">
            <button
              onClick={onEdit}
              className="flex-1 px-4 py-2.5 rounded-lg bg-blue-500/40 text-blue-100 font-bold hover:bg-blue-500/50 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Edit2 className="h-4 w-4" /> Editar
            </button>
            <button
              onClick={onDelete}
              className="flex-1 px-4 py-2.5 rounded-lg bg-red-500/40 text-red-100 font-bold hover:bg-red-500/50 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Trash2 className="h-4 w-4" /> Deletar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
