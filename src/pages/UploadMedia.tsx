import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, Video, Image, Presentation, CheckCircle2, AlertCircle,
  Loader2, X, ArrowLeft, Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useUploadMedia } from '@/domains/platform/hooks';
import type { MediaType, UploadStep } from '@/domains/platform/types';

const TYPE_OPTIONS: { value: MediaType; label: string; icon: React.ReactNode; accept: string; desc: string }[] = [
  { value: 'video', label: 'Vídeo', icon: <Video className="h-4 w-4" />, accept: 'video/*', desc: 'MP4, MOV, AVI, MKV' },
  { value: 'slides', label: 'Slides', icon: <Presentation className="h-4 w-4" />, accept: '.pptx,.ppt,.pdf,.key', desc: 'PPTX, PDF, KEY' },
  { value: 'image', label: 'Imagem', icon: <Image className="h-4 w-4" />, accept: 'image/*', desc: 'JPG, PNG, SVG, WebP' },
];

const STEP_LABELS: Record<UploadStep, string> = {
  idle: '',
  selecting: 'Selecione um arquivo',
  uploading: 'Enviando arquivo...',
  registering: 'Registrando mídia...',
  creating_job: 'Criando job de sincronização...',
  syncing: 'Sincronizando...',
  available: 'Mídia disponível!',
  error: 'Erro no upload',
};

export default function UploadMedia() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutate: upload, progress, reset, isPending } = useUploadMedia();

  const [mediaType, setMediaType] = useState<MediaType>('video');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);

  const currentTypeConfig = TYPE_OPTIONS.find((t) => t.value === mediaType)!;

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    if (!title) {
      setTitle(selected.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '));
    }
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
      type: mediaType,
      tags,
      notes: notes.trim() || undefined,
      file,
    });
  }, [file, title, mediaType, tags, notes, upload]);

  const handleReset = useCallback(() => {
    setTitle('');
    setNotes('');
    setTags([]);
    setFile(null);
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
          <h1 className="text-2xl font-bold">Upload de Mídia</h1>
          <p className="text-sm text-muted-foreground">
            Envie vídeos, slides ou imagens para a biblioteca
          </p>
        </div>
      </div>

      {/* Success */}
      {isSuccess && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <div>
                <h3 className="text-lg font-semibold text-green-600">Mídia Cadastrada!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  O arquivo foi enviado e registrado com sucesso.
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleReset}>Enviar outro</Button>
                <Button onClick={() => navigate('/media')}>Ver biblioteca</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form */}
      {!isSuccess && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type Selector */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tipo de Mídia</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setMediaType(opt.value);
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors
                      ${mediaType === opt.value
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-muted-foreground/30'}`}
                  >
                    {opt.icon}
                    <span className="text-sm font-medium">{opt.label}</span>
                    <span className="text-xs text-muted-foreground">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* File */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Arquivo</CardTitle>
              <CardDescription>{currentTypeConfig.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                  ${file ? 'border-green-500/50 bg-green-500/5' : 'border-muted-foreground/25 hover:border-primary/50'}`}
                onClick={() => fileInputRef.current?.click()}
              >
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    {currentTypeConfig.icon}
                    <div className="text-left">
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / (1024 * 1024)).toFixed(1)} MB
                      </p>
                    </div>
                    <Button
                      type="button" variant="ghost" size="icon" className="ml-auto"
                      onClick={(e) => { e.stopPropagation(); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">Clique para selecionar o arquivo</p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={currentTypeConfig.accept}
                className="hidden"
                onChange={handleFileChange}
              />
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader><CardTitle className="text-base">Informações</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nome da mídia" required />
              </div>
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                    placeholder="Ex: culto, especial"
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
                        <button type="button" onClick={() => handleRemoveTag(tag)}><X className="h-3 w-3" /></button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Notas opcionais..." />
              </div>
            </CardContent>
          </Card>

          {/* Progress */}
          {isProcessing && (
            <Card className="border-blue-500/30 bg-blue-500/5">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm font-medium">{STEP_LABELS[progress.step]}</span>
                  </div>
                  <Progress value={progress.percent} className="h-2" />
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
                  <p className="text-sm text-red-600">{progress.message}</p>
                </div>
                <Button variant="outline" className="mt-3" onClick={handleReset}>Tentar novamente</Button>
              </CardContent>
            </Card>
          )}

          {/* Submit */}
          <Button type="submit" size="lg" className="w-full" disabled={!file || !title.trim() || isProcessing}>
            {isProcessing
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
              : <><Upload className="mr-2 h-4 w-4" /> Enviar Mídia</>}
          </Button>
        </form>
      )}
    </div>
  );
}
