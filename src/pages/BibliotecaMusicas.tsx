import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Upload, Music, MoreVertical, Play, ListPlus, Trash2,
  Clock, Tag, Filter, ArrowUpDown, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useSongs, useDeleteSong } from '@/domains/platform/hooks';
import type { Song } from '@/domains/platform/types';

function useDebounce(value: string, delay = 200) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pendente', variant: 'outline' },
  uploading: { label: 'Enviando', variant: 'secondary' },
  uploaded: { label: 'Disponível', variant: 'default' },
  failed: { label: 'Falhou', variant: 'destructive' },
};

export default function BibliotecaMusicas() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [orderBy, setOrderBy] = useState<'title' | 'usage_count' | 'created_at'>('title');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Song | null>(null);

  const debouncedSearch = useDebounce(searchTerm);

  const { data: result, isLoading } = useSongs({

    search: debouncedSearch || undefined,
    tags: selectedTag ? [selectedTag] : undefined,
    orderBy,
  });

  const songs = result?.data ?? [];

  const deleteMutation = useDeleteSong();

  // Collect all unique tags for the filter
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    songs.forEach((song) => song.tags?.forEach((t: string) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [songs]);

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  return (
    <div className="container max-w-5xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Music className="h-6 w-6" /> Biblioteca de Músicas
          </h1>
          <p className="text-sm text-muted-foreground">
            {songs.length} música{songs.length !== 1 ? 's' : ''} na biblioteca
          </p>
        </div>
        <Button onClick={() => navigate('/media/upload')}>
          <Upload className="mr-2 h-4 w-4" /> Upload
        </Button>
      </div>

      {/* Filters Bar */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título ou artista..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Tag filter */}
            {allTags.length > 0 && (
              <Select
                value={selectedTag ?? '__all__'}
                onValueChange={(v) => setSelectedTag(v === '__all__' ? null : v)}
              >
                <SelectTrigger className="w-[160px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas as tags</SelectItem>
                  {allTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Order */}
            <Select value={orderBy} onValueChange={(v) => setOrderBy(v as typeof orderBy)}>
              <SelectTrigger className="w-[180px]">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="title">Título (A-Z)</SelectItem>
                <SelectItem value="usage_count">Mais usadas</SelectItem>
                <SelectItem value="created_at">Mais recentes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Songs Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : songs.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Music className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-medium mb-1">Nenhuma música encontrada</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchTerm || selectedTag
                ? 'Tente ajustar os filtros de busca.'
                : 'Comece enviando músicas para a biblioteca.'}
            </p>
            {!searchTerm && !selectedTag && (
              <Button onClick={() => navigate('/media/upload')}>
                <Upload className="mr-2 h-4 w-4" /> Enviar primeira música
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Título</TableHead>
                <TableHead>Artista</TableHead>
                <TableHead className="text-center">
                  <Clock className="inline h-4 w-4" />
                </TableHead>
                <TableHead className="text-center">Usos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Tags</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {songs.map((song) => {
                const status = STATUS_LABELS[song.upload_status] ?? STATUS_LABELS.pending;
                return (
                  <TableRow key={song.id}>
                    <TableCell className="font-medium">{song.title}</TableCell>
                    <TableCell className="text-muted-foreground">{song.artist ?? '—'}</TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {formatDuration(song.duration_seconds)}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {song.usage_count}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 justify-center">
                        {song.tags?.slice(0, 3).map((tag: string) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-xs cursor-pointer"
                            onClick={() => setSelectedTag(tag)}
                          >
                            {tag}
                          </Badge>
                        ))}
                        {(song.tags?.length ?? 0) > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{song.tags!.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem disabled>
                            <Play className="mr-2 h-4 w-4" /> Tocar agora
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled>
                            <ListPlus className="mr-2 h-4 w-4" /> Adicionar à fila
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteTarget(song)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir música?</AlertDialogTitle>
            <AlertDialogDescription>
              A música <strong>{deleteTarget?.title}</strong> será removida permanentemente da biblioteca.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
