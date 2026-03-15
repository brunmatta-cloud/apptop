// =============================================================================
// 7Flow Bases & Executors Service
// CRUD for bases and executors, active base detection, heartbeat.
// =============================================================================

import { supabase } from '@/integrations/supabase/client';
import type {
  Base, Executor, ExecutorMediaInventory, Session,
} from './types';
import { logger } from '@/lib/logger';

const log = logger.scoped('Base');

const DEFAULT_ORG = '00000000-0000-0000-0000-000000000000';

// -------------------------------------------------------
// BASES CRUD
// -------------------------------------------------------

export async function listBases(organization_id = DEFAULT_ORG): Promise<Base[]> {
  const { data, error } = await supabase
    .from('bases')
    .select('*')
    .eq('organization_id', organization_id)
    .order('name');

  if (error) {
    log.error(`listBases error`, error);
    return [];
  }
  return (data ?? []) as Base[];
}

export async function getBase(id: string): Promise<Base | null> {
  const { data, error } = await supabase
    .from('bases')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as Base;
}

export async function createBase(base: Partial<Base>): Promise<Base> {
  const { data, error } = await supabase
    .from('bases')
    .insert({
      organization_id: base.organization_id ?? DEFAULT_ORG,
      name: base.name ?? 'Nova Base',
      description: base.description ?? null,
      base_type: base.base_type ?? 'primary',
      is_enabled: base.is_enabled ?? true,
      is_primary_candidate: base.is_primary_candidate ?? false,
      default_media_root: base.default_media_root ?? 'C:\\7flow-media',
      supports_audio: base.supports_audio ?? true,
      supports_video: base.supports_video ?? true,
      supports_slides: base.supports_slides ?? true,
      supports_displays: base.supports_displays ?? true,
    })
    .select()
    .single();

  if (error) {
    log.error(`createBase error`, error);
    throw new Error(`Falha ao criar base: ${error.message}`);
  }
  return data as Base;
}

export async function updateBase(id: string, updates: Partial<Base>): Promise<Base> {
  const { data, error } = await supabase
    .from('bases')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    log.error(`updateBase error`, error);
    throw new Error(`Falha ao atualizar base: ${error.message}`);
  }
  return data as Base;
}

export async function deleteBase(id: string): Promise<boolean> {
  const { error } = await supabase.from('bases').delete().eq('id', id);
  if (error) {
    log.error(`deleteBase error`, error);
    throw new Error(`Falha ao excluir base: ${error.message}`);
  }
  return true;
}

// -------------------------------------------------------
// ACTIVE BASE
// -------------------------------------------------------

export async function setActiveBase(session_id: string, base_id: string | null): Promise<boolean> {
  const { error } = await supabase
    .from('sessions')
    .update({ active_base_id: base_id, updated_at: new Date().toISOString() })
    .eq('id', session_id);

  if (error) {
    log.error(`setActiveBase error`, error);
    return false;
  }

  console.log(`Active base set to ${base_id} for session ${session_id}`);
  return true;
}

export async function getActiveBase(session_id: string): Promise<{ session: Session; base: Base | null; executor: Executor | null } | null> {
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', session_id)
    .single();

  if (sessionError || !session) return null;

  if (!session.active_base_id) {
    return { session: session as Session, base: null, executor: null };
  }

  const { data: base } = await supabase
    .from('bases')
    .select('*')
    .eq('id', session.active_base_id)
    .single();

  let executor: Executor | null = null;
  if (base) {
    const { data: exec } = await supabase
      .from('executors')
      .select('*')
      .eq('base_id', base.id)
      .eq('is_online', true)
      .order('last_seen_at', { ascending: false })
      .limit(1)
      .single();

    executor = exec as Executor | null;
  }

  return {
    session: session as Session,
    base: base as Base | null,
    executor,
  };
}

// -------------------------------------------------------
// EXECUTORS CRUD
// -------------------------------------------------------

export async function listExecutors(base_id?: string, organization_id = DEFAULT_ORG): Promise<Executor[]> {
  let query = supabase
    .from('executors')
    .select('*')
    .eq('organization_id', organization_id)
    .order('machine_name');

  if (base_id) {
    query = query.eq('base_id', base_id);
  }

  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as Executor[];
}

export async function registerExecutor(executor: Partial<Executor>): Promise<Executor | null> {
  const { data, error } = await supabase
    .from('executors')
    .insert({
      organization_id: executor.organization_id ?? DEFAULT_ORG,
      base_id: executor.base_id!,
      machine_name: executor.machine_name ?? 'unknown',
      device_label: executor.device_label ?? null,
      executor_version: executor.executor_version ?? null,
      is_online: true,
      base_path: executor.base_path ?? 'C:\\7flow-media',
      supports_audio: executor.supports_audio ?? true,
      supports_video: executor.supports_video ?? true,
      supports_slides: executor.supports_slides ?? true,
      supports_displays: executor.supports_displays ?? true,
      last_seen_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    log.error(`registerExecutor error`, error);
    return null;
  }
  return data as Executor;
}

export async function sendHeartbeat(executor_id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('executors')
      .update({ is_online: true, last_seen_at: new Date().toISOString() })
      .eq('id', executor_id);

    return !error;
  } catch {
    return false;
  }
}

export async function setExecutorOffline(executor_id: string): Promise<void> {
  await supabase
    .from('executors')
    .update({ is_online: false, updated_at: new Date().toISOString() })
    .eq('id', executor_id);
}

// -------------------------------------------------------
// BASE ACTIVE DETECTION
// Determines if the current executor is part of the active base.
// -------------------------------------------------------

export interface ActiveBaseCheck {
  isActiveBase: boolean;
  reason: string;
  executor?: Executor;
  base?: Base;
}

export async function checkIfActiveBase(
  executor_id: string,
  session_id: string
): Promise<ActiveBaseCheck> {
  // Fetch executor
  const { data: executor } = await supabase
    .from('executors')
    .select('*')
    .eq('id', executor_id)
    .single();

  if (!executor) {
    return { isActiveBase: false, reason: 'Executor not found' };
  }

  if (!executor.is_online) {
    return { isActiveBase: false, reason: 'Executor is offline', executor: executor as Executor };
  }

  // Fetch base
  const { data: base } = await supabase
    .from('bases')
    .select('*')
    .eq('id', executor.base_id)
    .single();

  if (!base) {
    return { isActiveBase: false, reason: 'Base not found', executor: executor as Executor };
  }

  if (!base.is_enabled) {
    return { isActiveBase: false, reason: 'Base is disabled', executor: executor as Executor, base: base as Base };
  }

  // Fetch session
  const { data: session } = await supabase
    .from('sessions')
    .select('active_base_id')
    .eq('id', session_id)
    .single();

  if (!session) {
    return { isActiveBase: false, reason: 'Session not found', executor: executor as Executor, base: base as Base };
  }

  const isActive = session.active_base_id === executor.base_id;

  return {
    isActiveBase: isActive,
    reason: isActive ? 'Active base confirmed' : 'Not the active base for this session',
    executor: executor as Executor,
    base: base as Base,
  };
}

// -------------------------------------------------------
// INVENTORY
// -------------------------------------------------------

export async function getInventory(executor_id: string): Promise<ExecutorMediaInventory[]> {
  const { data, error } = await supabase
    .from('executor_media_inventory')
    .select('*')
    .eq('executor_id', executor_id);

  if (error) return [];
  return (data ?? []) as ExecutorMediaInventory[];
}

export async function updateInventoryItem(
  executor_id: string,
  song_id: string | null,
  media_item_id: string | null,
  local_file_path: string,
  sync_status: string,
  file_size_bytes?: number,
  checksum?: string
): Promise<boolean> {
  const { error } = await supabase
    .from('executor_media_inventory')
    .upsert({
      executor_id,
      song_id: song_id ?? null,
      media_item_id: media_item_id ?? null,
      local_file_path,
      sync_status,
      file_size_bytes: file_size_bytes ?? null,
      checksum: checksum ?? null,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'executor_id,song_id',
    });

  return !error;
}
