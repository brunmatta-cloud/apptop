import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Search, Upload, Video, Image, Presentation, MoreVertical,
  Play, Trash2, Clock, Filter, ArrowUpDown, Loader2, FileType,
  ChevronLeft, ChevronRight,
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMediaItems } from '@/domains/platform/hooks';
import type { MediaType, MediaItem } from '@/domains/platform/types';

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; accept: string }> = {
  all: { label: 'Todos', icon: <FileType className="h-4 w-4" />, accept: '*' },
  video: { label: 'Vídeos', icon: <Video className="h-4 w-4" />, accept: 'video/*' },
  slides: { label: 'Slides', icon: <Presentation className="h-4 w-4" />, accept: '.pptx,.ppt,.pdf' },
  image: { label: 'Imagens', icon: <Image className="h-4 w-4" />, accept: 'image/*' },
};

const AVAILABILITY_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  metadata_only: { label: 'Metadata', variant: 'outline' },
  remote: { label: 'Remoto', variant: 'secondary' },
  syncing: { label: 'Sincronizando', variant: 'secondary' },
  synced_local: { label: 'Disponível', variant: 'default' },
  failed: { label: 'Falhou', variant: 'destructive' },
};

function formatSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function BibliotecaMedia() {
  const navigate = useNavigate();
  const { tipo } = useParams<{ tipo?: string }>();
  const activeType = (tipo && tipo in TYPE_CONFIG) ? tipo : 'all';

  const [searchTerm, setSearchTerm] = useState('');
  const [orderBy, setOrderBy] = useState<'title' | 'usage_count' | 'created_at'>('created_at');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const mediaType: MediaType | undefined = activeType === 'all' ? undefined : activeType as MediaType;

  // Reset page when filters change
  React.useEffect(() => { setPage(0); }, [searchTerm, selectedTag, orderBy, activeType]);

  const { data: result, isLoading, isFetching } = useMediaItems({
    type: mediaType,
    search: searchTerm || undefined,
    tags: selectedTag ? [selectedTag] : undefined,
    orderBy,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const items = result?.data ?? [];
  const totalCount = result?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    items.forEach((item) => item.tags?.forEach((t: string) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [items]);

  const config = TYPE_CONFIG[activeType] ?? TYPE_CONFIG.all;

  return (
    <div className="container max-w-5xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {config.icon} Biblioteca de Mídia
          </h1>
          <p className="text-sm text-muted-foreground">
            {totalCount} ite{totalCount !== 1 ? 'ns' : 'm'} {activeType !== 'all' ? `(${config.label})` : ''}
          </p>
        </div>
        <Button onClick={() => navigate('/media/upload-media')}>
          <Upload className="mr-2 h-4 w-4" /> Upload
        </Button>
      </div>

      {/* Type Tabs */}
      <Tabs value={activeType} onValueChange={(v) => navigate(v === 'all' ? '/media' : `/media/${v}`)}>
        <TabsList>
          {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
            <TabsTrigger key={key} value={key} className="gap-1.5">
              {cfg.icon} {cfg.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

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

            <Select value={orderBy} onValueChange={(v) => setOrderBy(v as typeof orderBy)}>
              <SelectTrigger className="w-[180px]">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="title">Título (A-Z)</SelectItem>
                <SelectItem value="usage_count">Mais usados</SelectItem>
                <SelectItem value="created_at">Mais recentes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            {config.icon && React.cloneElement(config.icon as React.ReactElement, {
              className: 'h-12 w-12 mx-auto mb-4 text-muted-foreground/30',
            })}
            <h3 className="text-lg font-medium mb-1">Nenhum item encontrado</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchTerm || selectedTag
                ? 'Tente ajustar os filtros de busca.'
                : 'Comece enviando mídias para a biblioteca.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[35%]">Título</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-center">
                  <Clock className="inline h-4 w-4" />
                </TableHead>
                <TableHead className="text-center">Tamanho</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Tags</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const typeConf = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.all;
                const avail = AVAILABILITY_LABELS[item.availability_status] ?? AVAILABILITY_LABELS.metadata_only;
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        {typeConf.icon} {typeConf.label}
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {formatDuration(item.duration_seconds)}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {formatSize(item.file_size_bytes)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={avail.variant}>{avail.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 justify-center">
                        {item.tags?.slice(0, 2).map((tag: string) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-xs cursor-pointer"
                            onClick={() => setSelectedTag(tag)}
                          >
                            {tag}
                          </Badge>
                        ))}
                        {(item.tags?.length ?? 0) > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{item.tags!.length - 2}
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
                            <Play className="mr-2 h-4 w-4" /> Reproduzir
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" disabled>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} de {totalCount}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || isFetching}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1 || isFetching}
            >
              Próxima <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
