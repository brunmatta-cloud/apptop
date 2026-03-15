import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Music, CheckCircle2, AlertCircle, Loader2, X, ArrowLeft, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useUploadSong } from '@/domains/platform/hooks';
import { toast } from '@/hooks/use-toast';
import type { UploadStep } from '@/domains/platform/types';

const STEP_LABELS: Record<UploadStep, string> = {
  idle: '',
  selecting: 'Selecione um arquivo',
  uploading: 'Enviando arquivo para o servidor...',
  registering: 'Registrando música no banco de dados...',
  creating_job: 'Criando job de sincronização...',
  syncing: 'Sincronizando com a base principal...',
  available: 'Música disponível para uso!',
  error: 'Ocorreu um erro no upload',
};

const STEP_ICONS: Record<UploadStep, React.ReactNode> = {
  idle: <Upload className="h-5 w-5" />,
  selecting: <Music className="h-5 w-5" />,
  uploading: <Loader2 className="h-5 w-5 animate-spin" />,
  registering: <Loader2 className="h-5 w-5 animate-spin" />,
  creating_job: <Loader2 className="h-5 w-5 animate-spin" />,
  syncing: <Loader2 className="h-5 w-5 animate-spin" />,
  available: <CheckCircle2 className="h-5 w-5 text-green-500" />,
  error: <AlertCircle className="h-5 w-5 text-red-500" />,
};

export default function UploadMusica() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutate: upload, progress, reset, isPending } = useUploadSong();

  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number | undefined>();

  const ALLOWED_AUDIO_TYPES = [
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac',
    'audio/aac', 'audio/mp4', 'audio/x-m4a', 'audio/webm',
  ];
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!ALLOWED_AUDIO_TYPES.includes(selected.type) && !selected.name.match(/\.(mp3|wav|ogg|flac|aac|m4a|weba)$/i)) {
      toast({ title: 'Tipo de arquivo não permitido', description: 'Envie apenas MP3, WAV, OGG, FLAC, AAC ou M4A.', variant: 'destructive' });
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      toast({ title: 'Arquivo muito grande', description: 'O tamanho máximo é 50MB.', variant: 'destructive' });
      return;
    }

    setFile(selected);

    // Auto-fill title from filename if empty
    if (!title) {
      const nameWithoutExt = selected.name.replace(/\.[^/.]+$/, '');
      setTitle(nameWithoutExt.replace(/[_-]/g, ' '));
    }

    // Try to get duration from audio
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(Math.round(audio.duration));
      }
      URL.revokeObjectURL(audio.src);
    };
    audio.src = URL.createObjectURL(selected);
  }, [title]);

  const handleAddTag = useCallback(() => {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
    }
    setTagInput('');
  }, [tagInput, tags]);

  const handleRemoveTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) return;

    upload({
      title: title.trim(),
      artist: artist.trim() || undefined,
      duration_seconds: duration,
      youtube_url: youtubeUrl.trim() || undefined,
      tags,
      notes: notes.trim() || undefined,
      file,
    });
  }, [file, title, artist, duration, youtubeUrl, tags, notes, upload]);

  const handleReset = useCallback(() => {
    setTitle('');
    setArtist('');
    setYoutubeUrl('');
    setNotes('');
    setTags([]);
    setFile(null);
    setDuration(undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
    reset();
  }, [reset]);

  const isSuccess = progress.step === 'available';
  const isError = progress.step === 'error';
  const isProcessing = isPending && !isSuccess && !isError;

  return (
    <div className="container max-w-2xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Upload de Música</h1>
          <p className="text-sm text-muted-foreground">
            Envie músicas para a biblioteca do 7Flow
          </p>
        </div>
      </div>

      {/* Success Card */}
      {isSuccess && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <div>
                <h3 className="text-lg font-semibold text-green-600">Música Cadastrada!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  A música foi enviada e registrada com sucesso. O executor local irá sincronizá-la automaticamente.
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleReset}>
                  Enviar outra
                </Button>
                <Button onClick={() => navigate('/media/audio')}>
                  Ver biblioteca
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Form */}
      {!isSuccess && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Dropper */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Arquivo de Áudio</CardTitle>
              <CardDescription>MP3, WAV, OGG, FLAC, AAC, M4A (máx. 50MB)</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                  ${file ? 'border-green-500/50 bg-green-500/5' : 'border-muted-foreground/25 hover:border-primary/50'}`}
                onClick={() => fileInputRef.current?.click()}
              >
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <Music className="h-8 w-8 text-green-500" />
                    <div className="text-left">
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / (1024 * 1024)).toFixed(1)} MB
                        {duration ? ` · ${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}` : ''}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="ml-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setDuration(undefined);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      Clique para selecionar ou arraste o arquivo aqui
                    </p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informações da Música</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Nome da música"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="artist">Artista / Intérprete</Label>
                <Input
                  id="artist"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="Nome do artista"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="youtube">Link do YouTube (opcional)</Label>
                <Input
                  id="youtube"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="Ex: louvor, adoração, coral"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={handleAddTag}>
                    <Tag className="h-4 w-4" />
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <button type="button" onClick={() => handleRemoveTag(tag)}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observações sobre a música..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Progress */}
          {isProcessing && (
            <Card className="border-blue-500/30 bg-blue-500/5">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    {STEP_ICONS[progress.step]}
                    <span className="text-sm font-medium">{STEP_LABELS[progress.step]}</span>
                  </div>
                  <Progress value={progress.percent} className="h-2" />

                  {/* Step indicators */}
                  <div className="grid grid-cols-4 gap-1 text-xs text-muted-foreground">
                    {(['uploading', 'registering', 'creating_job', 'available'] as const).map((step) => {
                      const stepOrder = ['uploading', 'registering', 'creating_job', 'available'];
                      const currentIdx = stepOrder.indexOf(progress.step);
                      const stepIdx = stepOrder.indexOf(step);
                      const isDone = stepIdx < currentIdx;
                      const isActive = step === progress.step;

                      return (
                        <div
                          key={step}
                          className={`text-center py-1 rounded ${
                            isDone ? 'text-green-500 font-medium' :
                            isActive ? 'text-blue-500 font-medium' :
                            'text-muted-foreground/50'
                          }`}
                        >
                          {isDone ? '✓ ' : ''}{STEP_LABELS[step]?.split('...')[0]}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error */}
          {isError && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="font-medium text-red-600">Falha no upload</p>
                    <p className="text-sm text-muted-foreground">{progress.message}</p>
                  </div>
                </div>
                <Button variant="outline" className="mt-3" onClick={handleReset}>
                  Tentar novamente
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Submit */}
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={!file || !title.trim() || isProcessing}
          >
            {isProcessing ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
            ) : (
              <><Upload className="mr-2 h-4 w-4" /> Enviar Música</>
            )}
          </Button>
        </form>
      )}
    </div>
  );
}
