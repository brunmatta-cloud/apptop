import { useState, useMemo, useEffect } from 'react';
import { AlertCircle, Loader2, Music4, Users2, ArrowRight, CheckCircle2, Plus, Save } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useSyncStore } from '@/contexts/SyncStoreContext';
import { usePersonByToken, useMomentsForPersonToken } from '@/features/repertorio/hooks-people';
import { useMomentSongBundleByToken, useEnsureMomentSongFormMutation, useSaveMomentRepertoireByTokenMutation } from '@/features/repertorio/hooks';
import { RepertorioEditor } from '@/components/repertorio/RepertorioEditor';
import { buildEditableSongDraft, sanitizeSongDraftsForSave, sortMomentSongs } from '@/features/repertorio/model';
import { toast } from '@/hooks/use-toast';
import type { EditableSongDraft } from '@/features/repertorio/model';

const MusicaEquipe = () => {
  const { token = '' } = useParams();
  const { remoteState } = useSyncStore();
  
  // Try to validate as person token
  const personQuery = usePersonByToken(token);
  const momentsQuery = useMomentsForPersonToken(token);
  const [selectedMomentId, setSelectedMomentId] = useState<string | null>(null);

  // For each moment, fetch the bundle
  const selectedMoment = momentsQuery.data?.find(m => m.moment_id === selectedMomentId) ?? momentsQuery.data?.[0];
  
  // Initialize selected moment on load
  useMemo(() => {
    if (!selectedMomentId && momentsQuery.data && momentsQuery.data.length > 0) {
      setSelectedMomentId(momentsQuery.data[0].moment_id);
    }
  }, [momentsQuery.data, selectedMomentId]);

  if (personQuery.isLoading || momentsQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-10 flex items-center justify-center">
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-900/20 p-8 flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
          <span className="text-sm font-semibold text-slate-200">Carregando seus momentos...</span>
        </div>
      </div>
    );
  }

  if (personQuery.error || !personQuery.data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-10 flex items-center justify-center">
        <div className="rounded-2xl border border-red-400/20 bg-red-900/20 p-8 max-w-md">
          <div className="flex gap-3">
            <AlertCircle className="h-6 w-6 text-red-400 shrink-0" />
            <div>
              <h2 className="font-black text-white mb-1">Link inválido ou expirado</h2>
              <p className="text-sm text-slate-300">
                Este link não é válido. Peça um novo link para o seu responsável.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (momentsQuery.error || !momentsQuery.data || momentsQuery.data.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-10 flex items-center justify-center">
        <div className="rounded-2xl border border-yellow-400/20 bg-yellow-900/20 p-8 max-w-md">
          <div className="flex gap-3">
            <AlertCircle className="h-6 w-6 text-yellow-400 shrink-0" />
            <div>
              <h2 className="font-black text-white mb-1">Nenhum momento atribuído</h2>
              <p className="text-sm text-slate-300">
                Você ainda não tem momentos musicais atribuídos na programação.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="glass-card p-6 rounded-2xl border-2 border-cyan-400/50 bg-gradient-to-br from-cyan-900/20 via-blue-900/15 to-slate-900/10 shadow-2xl">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500">
              <Users2 className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-black text-white mb-1">👋 Bem-vindo, {personQuery.data.name}!</h1>
              <p className="text-slate-300 font-semibold">
                Aqui você pode preemcher as músicas dos seus {momentsQuery.data.length} momento{momentsQuery.data.length !== 1 ? 's' : ''} musical{momentsQuery.data.length !== 1 ? 's' : ''}.
              </p>
              <p className="text-sm text-slate-400 mt-2">🏢 Igreja: {personQuery.data.church}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {momentsQuery.data.map((momento, index) => (
            <button
              key={momento.moment_id}
              onClick={() => setSelectedMomentId(momento.moment_id)}
              className={`px-4 py-2.5 rounded-lg font-semibold text-sm whitespace-nowrap transition-all border-2 ${
                selectedMomentId === momento.moment_id
                  ? 'border-cyan-400 bg-cyan-500/20 text-cyan-100'
                  : 'border-slate-600 bg-slate-700/50 text-slate-300 hover:border-cyan-400/50'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <span>#{index + 1}</span>
                <span>{momento.atividade || 'Momento'}</span>
              </span>
            </button>
          ))}
        </div>

        {/* Moment Content */}
        {selectedMoment && (
          <MomentEditor 
            moment={selectedMoment}
            personName={personQuery.data.name}
            personToken={token}
            remoteState={remoteState}
          />
        )}
      </div>
    </div>
  );
};

interface MomentData {
  moment_id: string;
  culto_id: string;
  atividade: string;
  horario_inicio: string;
  responsavel: string;
  form_token: string;
}

interface MomentEditorProps {
  moment: MomentData;
  personName: string;
  personToken: string;
  remoteState: any;
}

function MomentEditor({ moment, personName, personToken, remoteState }: MomentEditorProps) {
  const [draftSongs, setDraftSongs] = useState<EditableSongDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  
  // Ensure a form exists for this moment and get the token
  const ensureMutation = useEnsureMomentSongFormMutation();
  const [momentFormToken, setMomentFormToken] = useState<string | null>(null);

  // Load the bundle using the moment's form token
  const bundleQuery = useMomentSongBundleByToken(momentFormToken ?? undefined);
  const saveMutation = useSaveMomentRepertoireByTokenMutation(momentFormToken ?? '');

  // Initialize the form token on mount
  useEffect(() => {
    const initForm = async () => {
      try {
        setIsLoading(true);
        const form = await ensureMutation.mutateAsync({
          cultoId: moment.culto_id,
          momentoId: moment.moment_id,
        });
        setMomentFormToken(form.token);
      } catch (error) {
        console.error('Erro ao carregar formulário:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar o formulário',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    initForm();
  }, [moment.moment_id, moment.culto_id]);

  // Load songs when bundle is available
  useEffect(() => {
    if (bundleQuery.data?.songs) {
      const songs = sortMomentSongs(bundleQuery.data.songs).map(song => buildEditableSongDraft(song));
      setDraftSongs(songs);
      setIsLoading(false);
    }
  }, [bundleQuery.data?.songs]);

  const handleAddSong = () => {
    setDraftSongs(current => [...current, buildEditableSongDraft()]);
  };

  const handleSave = async () => {
    if (!momentFormToken) return;
    
    try {
      setIsSaving(true);
      await saveMutation.mutateAsync(sanitizeSongDraftsForSave(draftSongs));
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 3000);
      toast({
        title: 'Músicas salvas com sucesso!',
        description: `${draftSongs.length} música${draftSongs.length !== 1 ? 's' : ''} salva${draftSongs.length !== 1 ? 's' : ''}.`,
      });
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: error instanceof Error ? error.message : 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || bundleQuery.isLoading) {
    return (
      <div className="glass-card p-6 rounded-2xl border-2 border-slate-700/50 flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
        <p className="text-slate-300 font-semibold">Carregando formulário...</p>
      </div>
    );
  }

  if (bundleQuery.error) {
    return (
      <div className="glass-card p-6 rounded-2xl border-2 border-red-400/40 bg-red-900/20">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-300">Erro ao carregar</p>
            <p className="text-sm text-red-200 mt-1">{bundleQuery.error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 rounded-2xl border-2 border-purple-400/40 bg-gradient-to-br from-purple-900/15 via-indigo-900/10 to-slate-900/5 shadow-lg space-y-4">
      {/* Header */}
      <div>
        <p className="text-xs font-black text-purple-300 mb-1">MOMENTO MUSICAL</p>
        <h2 className="text-2xl font-black text-white mb-3">{moment.atividade}</h2>
        <div className="grid gap-2 sm:grid-cols-2 text-sm">
          <div className="flex gap-2">
            <span className="text-slate-400">⏰</span>
            <span className="text-slate-300 font-semibold">{moment.horario_inicio}</span>
          </div>
          {moment.responsavel && (
            <div className="flex gap-2">
              <span className="text-slate-400">🏛️</span>
              <span className="text-slate-300 font-semibold">{moment.responsavel}</span>
            </div>
          )}
        </div>
      </div>

      {/* Saved indicator */}
      {showSaved && (
        <div className="rounded-lg border-2 border-emerald-400/40 bg-emerald-500/10 p-3 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <span className="text-sm font-semibold text-emerald-300">Salvo com sucesso!</span>
        </div>
      )}

      {/* Editor */}
      {momentFormToken && (
        <div className="space-y-3 py-2">
          <RepertorioEditor
            songs={draftSongs}
            onChange={setDraftSongs}
            disabled={isSaving}
            helperText="Preencha o título, marque se usa mídia ou playback. As músicas são salvas automaticamente ao clicar em 'Salvar Músicas'."
            emptyDescription="Comece adicionando a primeira música deste momento."
            showBottomAddButton={false}
          />

          <button
            onClick={handleAddSong}
            className="w-full px-4 py-3 rounded-lg border-2 border-dashed border-slate-600 hover:border-slate-500 text-slate-300 hover:text-slate-200 font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Adicionar Música
          </button>
        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-black hover:shadow-lg hover:shadow-emerald-500/40 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Salvando...
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />
            💾 Salvar Músicas ({draftSongs.length})
          </>
        )}
      </button>
    </div>
  );
}

export default MusicaEquipe;
