// =============================================================================
// GerenciarBases — Admin page for managing bases and executors.
// Route: /settings/bases
// =============================================================================

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Server, Plus, Settings, Trash2, Wifi, WifiOff, HardDrive,
  Monitor, Music, Video, Presentation, ArrowLeft, Loader2,
  MoreVertical, Shield, Activity, CheckCircle2, XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useBases, useCreateBase, useUpdateBase, useDeleteBase,
  useExecutors,
} from '@/domains/platform/hooks';
import type { Base, BaseType, Executor } from '@/domains/platform/types';

const BASE_TYPE_LABELS: Record<BaseType, { label: string; desc: string }> = {
  primary: { label: 'Primária', desc: 'Base principal de operação' },
  secondary: { label: 'Secundária', desc: 'Base auxiliar para redundância' },
  backup: { label: 'Backup', desc: 'Base de contingência' },
  remote: { label: 'Remota', desc: 'Base para operações remotas' },
};

export default function GerenciarBases() {
  const navigate = useNavigate();
  const { data: bases = [], isLoading } = useBases();
  const { data: executors = [] } = useExecutors();
  const createBase = useCreateBase();
  const updateBase = useUpdateBase();
  const deleteBase = useDeleteBase();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Base | null>(null);
  const [newBase, setNewBase] = useState({
    name: '',
    base_type: 'primary' as BaseType,
    default_media_root: 'C:\\7flow\\media',
    supports_audio: true,
    supports_video: true,
    supports_slides: true,
    supports_displays: true,
  });

  const handleCreate = useCallback(() => {
    if (!newBase.name.trim()) return;
    createBase.mutate(newBase, {
      onSuccess: () => {
        setShowCreateDialog(false);
        setNewBase({
          name: '',
          base_type: 'primary',
          default_media_root: 'C:\\7flow\\media',
          supports_audio: true,
          supports_video: true,
          supports_slides: true,
          supports_displays: true,
        });
      },
    });
  }, [newBase, createBase]);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteBase.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  }, [deleteTarget, deleteBase]);

  const handleToggleEnabled = useCallback((base: Base) => {
    updateBase.mutate({ id: base.id, updates: { is_enabled: !base.is_enabled } });
  }, [updateBase]);

  const getExecutorsForBase = useCallback(
    (baseId: string) => executors.filter((e) => e.base_id === baseId),
    [executors],
  );

  return (
    <div className="container max-w-5xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Server className="h-6 w-6" /> Gerenciar Bases
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure as bases locais e seus executores
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nova Base
        </Button>
      </div>

      <Tabs defaultValue="bases">
        <TabsList>
          <TabsTrigger value="bases" className="gap-1.5">
            <Server className="h-4 w-4" /> Bases ({bases.length})
          </TabsTrigger>
          <TabsTrigger value="executors" className="gap-1.5">
            <HardDrive className="h-4 w-4" /> Executores ({executors.length})
          </TabsTrigger>
        </TabsList>

        {/* Bases Tab */}
        <TabsContent value="bases" className="mt-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : bases.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Server className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-lg font-medium mb-1">Nenhuma base configurada</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Crie uma base para conectar executores locais.
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Criar primeira base
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {bases.map((base) => {
                const baseExecutors = getExecutorsForBase(base.id);
                const onlineCount = baseExecutors.filter((e) => e.is_online).length;
                const typeInfo = BASE_TYPE_LABELS[base.base_type] ?? BASE_TYPE_LABELS.primary;

                return (
                  <Card key={base.id} className={!base.is_enabled ? 'opacity-60' : ''}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <Server className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base flex items-center gap-2">
                              {base.name}
                              <Badge variant={base.is_enabled ? 'default' : 'outline'}>
                                {base.is_enabled ? 'Ativa' : 'Desativada'}
                              </Badge>
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {typeInfo.label} · {typeInfo.desc}
                            </CardDescription>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleToggleEnabled(base)}>
                              {base.is_enabled ? <XCircle className="mr-2 h-4 w-4" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                              {base.is_enabled ? 'Desativar' : 'Ativar'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteTarget(base)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Capabilities */}
                      <div className="flex flex-wrap gap-2">
                        {base.supports_audio && (
                          <Badge variant="outline" className="gap-1 text-xs"><Music className="h-3 w-3" /> Áudio</Badge>
                        )}
                        {base.supports_video && (
                          <Badge variant="outline" className="gap-1 text-xs"><Video className="h-3 w-3" /> Vídeo</Badge>
                        )}
                        {base.supports_slides && (
                          <Badge variant="outline" className="gap-1 text-xs"><Presentation className="h-3 w-3" /> Slides</Badge>
                        )}
                        {base.supports_displays && (
                          <Badge variant="outline" className="gap-1 text-xs"><Monitor className="h-3 w-3" /> Displays</Badge>
                        )}
                      </div>

                      {/* Executors summary */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <HardDrive className="h-4 w-4" />
                          <span>{baseExecutors.length} executor{baseExecutors.length !== 1 ? 'es' : ''}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {onlineCount > 0 ? (
                            <><Wifi className="h-4 w-4 text-green-500" /> {onlineCount} online</>
                          ) : (
                            <><WifiOff className="h-4 w-4 text-muted-foreground" /> Nenhum online</>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <HardDrive className="h-4 w-4" />
                          <span className="font-mono text-xs">{base.default_media_root}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Executors Tab */}
        <TabsContent value="executors" className="mt-4 space-y-4">
          {executors.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <HardDrive className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-lg font-medium mb-1">Nenhum executor registrado</h3>
                <p className="text-sm text-muted-foreground">
                  Executores são registrados automaticamente quando o agente local é iniciado.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {executors.map((executor) => {
                const parentBase = bases.find((b) => b.id === executor.base_id);
                return (
                  <Card key={executor.id}>
                    <CardContent className="py-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          <HardDrive className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{executor.machine_name}</p>
                            <Badge variant={executor.is_online ? 'default' : 'outline'}>
                              {executor.is_online ? (
                                <><Wifi className="mr-1 h-3 w-3" /> Online</>
                              ) : (
                                <><WifiOff className="mr-1 h-3 w-3" /> Offline</>
                              )}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            {parentBase && <span>Base: {parentBase.name}</span>}
                            {executor.device_label && <span>{executor.device_label}</span>}
                            {executor.executor_version && <span>v{executor.executor_version}</span>}
                            {executor.last_seen_at && (
                              <span>
                                Visto: {new Date(executor.last_seen_at).toLocaleTimeString('pt-BR')}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Capabilities */}
                        <div className="hidden sm:flex gap-1">
                          {executor.supports_audio && <Music className="h-4 w-4 text-muted-foreground" />}
                          {executor.supports_video && <Video className="h-4 w-4 text-muted-foreground" />}
                          {executor.supports_slides && <Presentation className="h-4 w-4 text-muted-foreground" />}
                          {executor.supports_displays && <Monitor className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Base Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Base</DialogTitle>
            <DialogDescription>
              Configure uma nova base local para operação do 7Flow.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="base-name">Nome</Label>
              <Input
                id="base-name"
                value={newBase.name}
                onChange={(e) => setNewBase((s) => ({ ...s, name: e.target.value }))}
                placeholder="Ex: Base Igreja Central"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={newBase.base_type}
                onValueChange={(v) => setNewBase((s) => ({ ...s, base_type: v as BaseType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(BASE_TYPE_LABELS).map(([key, info]) => (
                    <SelectItem key={key} value={key}>{info.label} — {info.desc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="media-root">Caminho raiz das mídias</Label>
              <Input
                id="media-root"
                value={newBase.default_media_root}
                onChange={(e) => setNewBase((s) => ({ ...s, default_media_root: e.target.value }))}
                placeholder="C:\7flow\media"
              />
            </div>

            <div className="space-y-3">
              <Label>Capacidades</Label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'supports_audio' as const, label: 'Áudio', icon: Music },
                  { key: 'supports_video' as const, label: 'Vídeo', icon: Video },
                  { key: 'supports_slides' as const, label: 'Slides', icon: Presentation },
                  { key: 'supports_displays' as const, label: 'Displays', icon: Monitor },
                ].map(({ key, label, icon: Icon }) => (
                  <div key={key} className="flex items-center gap-2">
                    <Switch
                      checked={newBase[key]}
                      onCheckedChange={(v) => setNewBase((s) => ({ ...s, [key]: v }))}
                    />
                    <Icon className="h-4 w-4" />
                    <span className="text-sm">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!newBase.name.trim() || createBase.isPending}>
              {createBase.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Base
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir base?</AlertDialogTitle>
            <AlertDialogDescription>
              A base <strong>{deleteTarget?.name}</strong> e todos os seus executores serão removidos.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {deleteBase.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
