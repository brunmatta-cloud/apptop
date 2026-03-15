// =============================================================================
// 7Flow Platform Types
// Canonical TypeScript types for all new platform tables and enums.
// These types mirror the database schema exactly.
// =============================================================================

// -------------------------------------------------------
// ENUM TYPES (matching PostgreSQL enums)
// -------------------------------------------------------

export type SessionStatus = 'draft' | 'planned' | 'live' | 'paused' | 'finished' | 'archived';

export type MomentType =
  | 'musica_ao_vivo' | 'playback' | 'video' | 'vinheta'
  | 'oracao' | 'fala' | 'aviso' | 'leitura'
  | 'ceia' | 'ofertorio' | 'batismo' | 'outro' | 'nenhum';

export type MediaType = 'audio' | 'video' | 'slides' | 'image';

export type UploadStatus = 'pending' | 'uploading' | 'uploaded' | 'failed';

export type AvailabilityStatus = 'metadata_only' | 'remote' | 'syncing' | 'synced_local' | 'failed';

export type SyncJobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export type SyncJobType = 'download_to_local' | 'upload_to_storage' | 'delete_local' | 'verify_integrity';

export type PlayerType = 'audio' | 'video' | 'slides';

export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'stopped' | 'error';

export type CommandTarget = 'session' | 'audio' | 'video' | 'slides' | 'display' | 'moderator';

export type CommandStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'rejected' | 'expired';

export type DisplayType = 'main' | 'stage' | 'audio' | 'moderator' | 'custom';

export type DisplayMode =
  | 'idle' | 'logo' | 'message' | 'video'
  | 'slides' | 'timeline' | 'countdown' | 'blackout' | 'custom';

export type BaseType = 'primary' | 'secondary' | 'backup' | 'remote';

export type ExecutorSyncStatus = 'not_synced' | 'syncing' | 'synced' | 'outdated' | 'error';

export type UserRole =
  | 'admin' | 'gestao' | 'cerimonialista' | 'sonoplastia'
  | 'moderador' | 'equipe_musica' | 'visualizador';

export type ConnectionState = 'connecting' | 'online' | 'degraded' | 'offline';

// -------------------------------------------------------
// SESSION COMMAND TYPES
// -------------------------------------------------------

export type SessionCommandType =
  | 'START_SESSION' | 'PAUSE_SESSION' | 'RESUME_SESSION' | 'FINISH_SESSION'
  | 'ADVANCE_MOMENT' | 'GO_TO_MOMENT' | 'SKIP_MOMENT';

export type AudioCommandType =
  | 'ADD_SONG_TO_MOMENT' | 'REMOVE_SONG_FROM_MOMENT' | 'REORDER_MOMENT_SONGS'
  | 'PLAY_AUDIO' | 'PAUSE_AUDIO' | 'STOP_AUDIO'
  | 'NEXT_AUDIO' | 'PREV_AUDIO'
  | 'QUEUE_AUDIO_NOW' | 'QUEUE_AUDIO_NEXT';

export type VideoCommandType =
  | 'LOAD_VIDEO' | 'PLAY_VIDEO' | 'PAUSE_VIDEO' | 'STOP_VIDEO'
  | 'SEEK_VIDEO' | 'RESTART_VIDEO';

export type SlidesCommandType =
  | 'LOAD_SLIDES' | 'NEXT_SLIDE' | 'PREV_SLIDE'
  | 'GO_TO_SLIDE' | 'FIRST_SLIDE' | 'LAST_SLIDE';

export type DisplayCommandType =
  | 'SET_DISPLAY_MODE' | 'SHOW_LOGO' | 'SHOW_MESSAGE'
  | 'SHOW_VIDEO' | 'SHOW_SLIDES' | 'SHOW_TIMELINE' | 'BLACKOUT_DISPLAY';

export type ModeratorCommandType =
  | 'TRIGGER_MODERATOR_RELEASE' | 'ACK_MODERATOR_RELEASE' | 'UPDATE_CALL_STATUS';

export type PlatformCommandType =
  | SessionCommandType | AudioCommandType | VideoCommandType
  | SlidesCommandType | DisplayCommandType | ModeratorCommandType;

// -------------------------------------------------------
// SESSION EVENT TYPES
// -------------------------------------------------------

export type SessionEventType =
  | 'SESSION_CREATED' | 'SESSION_STARTED' | 'SESSION_PAUSED'
  | 'SESSION_RESUMED' | 'SESSION_FINISHED'
  | 'MOMENT_ADVANCED' | 'MOMENT_SKIPPED' | 'MOMENT_GOTO'
  | 'AUDIO_PLAY' | 'AUDIO_PAUSE' | 'AUDIO_STOP'
  | 'AUDIO_NEXT' | 'AUDIO_PREV' | 'AUDIO_QUEUE'
  | 'VIDEO_LOAD' | 'VIDEO_PLAY' | 'VIDEO_PAUSE' | 'VIDEO_STOP'
  | 'SLIDES_LOAD' | 'SLIDE_NEXT' | 'SLIDE_PREV' | 'SLIDE_GOTO'
  | 'DISPLAY_MODE_SET' | 'DISPLAY_BLACKOUT'
  | 'MODERATOR_RELEASE' | 'MODERATOR_ACK' | 'MODERATOR_CALL_STATUS'
  | 'SONG_UPLOADED' | 'MEDIA_SYNCED' | 'MEDIA_SYNC_FAILED'
  | 'EXECUTOR_REGISTERED' | 'EXECUTOR_HEARTBEAT' | 'EXECUTOR_OFFLINE'
  | 'BASE_ACTIVATED' | 'BASE_DEACTIVATED'
  | 'REVISION_CONFLICT' | 'RECONCILIATION' | 'CONNECTION_FALLBACK';

// -------------------------------------------------------
// TABLE ROW TYPES
// -------------------------------------------------------

export interface Session {
  id: string;
  organization_id: string;
  title: string;
  date: string;
  status: SessionStatus;
  auto_mode: boolean;
  current_moment_id: string | null;
  revision: number;
  active_base_id: string | null;
  sync_session_id: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string;
}

export interface Moment {
  id: string;
  session_id: string;
  title: string;
  type: MomentType;
  sort_order: number;
  planned_start: string | null;
  planned_duration_seconds: number;
  requires_manual_confirmation: boolean;
  auto_advance: boolean;
  trigger_media: boolean;
  trigger_alert: boolean;
  responsible: string | null;
  ministry: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Song {
  id: string;
  organization_id: string;
  title: string;
  artist: string | null;
  duration_seconds: number | null;
  storage_bucket: string | null;
  storage_path: string | null;
  local_file_path: string | null;
  youtube_url: string | null;
  tags: string[];
  notes: string | null;
  upload_status: UploadStatus;
  usage_count: number;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MomentSongV2 {
  id: string;
  moment_id: string;
  song_id: string;
  sort_order: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MediaItem {
  id: string;
  organization_id: string;
  title: string;
  type: MediaType;
  artist: string | null;
  duration_seconds: number | null;
  storage_bucket: string | null;
  storage_path: string | null;
  local_file_path: string | null;
  remote_url: string | null;
  thumbnail_url: string | null;
  tags: string[];
  notes: string | null;
  usage_count: number;
  availability_status: AvailabilityStatus;
  file_size_bytes: number | null;
  mime_type: string | null;
  created_at: string;
  updated_at: string;
}

export interface MomentMedia {
  id: string;
  moment_id: string;
  media_item_id: string;
  sort_order: number;
  autoplay: boolean;
  auto_advance: boolean;
  notes: string | null;
  created_at: string;
}

export interface MediaSyncJob {
  id: string;
  organization_id: string;
  media_type: MediaType;
  song_id: string | null;
  media_item_id: string | null;
  job_type: SyncJobType;
  status: SyncJobStatus;
  payload_json: Record<string, unknown>;
  created_at: string;
  processed_at: string | null;
  processed_by: string | null;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
}

export interface DisplayOutput {
  id: string;
  session_id: string;
  name: string;
  display_type: DisplayType;
  is_active: boolean;
  created_at: string;
}

export interface DisplayState {
  id: string;
  display_output_id: string;
  mode: DisplayMode;
  current_media_id: string | null;
  current_song_id: string | null;
  current_slide_index: number;
  current_moment_id: string | null;
  current_cue: Record<string, unknown>;
  custom_message: string | null;
  updated_at: string;
  updated_by: string;
}

export interface PlayerState {
  id: string;
  session_id: string;
  player_type: PlayerType;
  current_media_id: string | null;
  current_song_id: string | null;
  status: PlayerStatus;
  current_time_seconds: number;
  duration_seconds: number;
  volume: number;
  is_muted: boolean;
  queue_json: SongQueueItem[];
  updated_at: string;
  updated_by: string;
}

export interface PlayerCommand {
  id: string;
  session_id: string;
  target: CommandTarget;
  command_type: string;
  payload_json: Record<string, unknown>;
  expected_revision: number | null;
  created_at: string;
  created_by: string;
  processed_at: string | null;
  processed_by: string | null;
  status: CommandStatus;
  error_message: string | null;
  idempotency_key: string | null;
}

export interface Base {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  base_type: BaseType;
  is_enabled: boolean;
  is_primary_candidate: boolean;
  default_media_root: string;
  supports_audio: boolean;
  supports_video: boolean;
  supports_slides: boolean;
  supports_displays: boolean;
  created_at: string;
  updated_at: string;
}

export interface Executor {
  id: string;
  organization_id: string;
  base_id: string;
  machine_name: string;
  device_label: string | null;
  executor_version: string | null;
  is_online: boolean;
  base_path: string;
  supports_audio: boolean;
  supports_video: boolean;
  supports_slides: boolean;
  supports_displays: boolean;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExecutorMediaInventory {
  id: string;
  executor_id: string;
  media_item_id: string | null;
  song_id: string | null;
  local_file_path: string;
  sync_status: ExecutorSyncStatus;
  file_size_bytes: number | null;
  checksum: string | null;
  updated_at: string;
}

// -------------------------------------------------------
// COMPOSITE / DERIVED TYPES
// -------------------------------------------------------

export interface SongQueueItem {
  song_id: string;
  title: string;
  artist?: string;
  duration_seconds?: number;
  source: 'library' | 'moment' | 'search';
}

export interface SongWithAvailability extends Song {
  availability: AvailabilityStatus;
  inventory?: ExecutorMediaInventory;
}

export interface MomentWithSongs extends Moment {
  songs: (MomentSongV2 & { song: Song })[];
  total_duration_seconds: number;
  repertoire_status: RepertoireStatus;
}

export type RepertoireStatus = 'complete' | 'incomplete' | 'empty' | 'awaiting';

export interface ActiveBaseInfo {
  base: Base;
  executor: Executor | null;
  is_active: boolean;
  is_healthy: boolean;
}

export interface PlayerSnapshot {
  audio: PlayerState | null;
  video: PlayerState | null;
  slides: PlayerState | null;
}

export interface DisplaySnapshot {
  outputs: DisplayOutput[];
  states: Record<string, DisplayState>;
}

// -------------------------------------------------------
// COMMAND PAYLOADS
// -------------------------------------------------------

export interface PlayAudioPayload {
  song_id: string;
  start_at_seconds?: number;
}

export interface QueueAudioPayload {
  song_id: string;
  position?: 'now' | 'next' | 'last';
}

export interface LoadVideoPayload {
  media_item_id: string;
  autoplay?: boolean;
}

export interface SeekVideoPayload {
  time_seconds: number;
}

export interface LoadSlidesPayload {
  media_item_id: string;
  start_index?: number;
}

export interface GoToSlidePayload {
  index: number;
}

export interface SetDisplayModePayload {
  display_output_id: string;
  mode: DisplayMode;
  media_id?: string;
  message?: string;
  slide_index?: number;
}

export interface GoToMomentPayload {
  moment_id: string;
}

// -------------------------------------------------------
// UPLOAD FLOW TYPES
// -------------------------------------------------------

export type UploadStep =
  | 'idle'
  | 'selecting'
  | 'uploading'
  | 'registering'
  | 'creating_job'
  | 'syncing'
  | 'available'
  | 'error';

export interface UploadProgress {
  step: UploadStep;
  percent: number;
  message: string;
  error?: string;
}

// -------------------------------------------------------
// CONNECTION STATE
// -------------------------------------------------------

export interface ConnectionMonitorState {
  status: ConnectionState;
  lastOnlineAt: number | null;
  lastRealtimeAt: number | null;
  lastPollAt: number | null;
  reconnectAttempts: number;
}
