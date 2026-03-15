// =============================================================================
// 7Flow Executor Local — Node.js standalone agent
// Responsibilities:
//   1. Register executor on startup
//   2. Send heartbeat every N seconds
//   3. Poll for pending sync jobs
//   4. Download media files from Supabase Storage
//   5. Update executor_media_inventory with local file info
//   6. Check if this executor belongs to the active base
// =============================================================================

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync, mkdirSync, writeFileSync, createWriteStream } from 'node:fs';
import { join, dirname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { createHash } from 'node:crypto';

// -------------------------------------------------------
// Configuration
// -------------------------------------------------------

const configPath = join(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), 'config.json');
let config;
try {
  config = JSON.parse(readFileSync(configPath, 'utf-8'));
} catch (err) {
  console.error('[Executor] Failed to read config.json:', err.message);
  console.error('[Executor] Copy config.json and fill in your Supabase URL + key.');
  process.exit(1);
}

const {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  BASE_ID,
  ORGANIZATION_ID = '00000000-0000-0000-0000-000000000000',
  MEDIA_ROOT = 'C:\\7flow-media',
  MACHINE_NAME = 'EXECUTOR-01',
  DEVICE_LABEL = null,
  HEARTBEAT_INTERVAL_MS = 15000,
  POLL_INTERVAL_MS = 5000,
  EXECUTOR_VERSION = '1.0.0',
} = config;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !BASE_ID) {
  console.error('[Executor] SUPABASE_URL, SUPABASE_ANON_KEY, and BASE_ID are required in config.json.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const LOG = (msg, ...args) => console.log(`[Executor ${new Date().toISOString()}] ${msg}`, ...args);
const ERR = (msg, ...args) => console.error(`[Executor ${new Date().toISOString()}] ERROR ${msg}`, ...args);

// -------------------------------------------------------
// Ensure media root directory exists
// -------------------------------------------------------

function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    LOG(`Created directory: ${dir}`);
  }
}

ensureDir(MEDIA_ROOT);
ensureDir(join(MEDIA_ROOT, 'audio'));
ensureDir(join(MEDIA_ROOT, 'video'));
ensureDir(join(MEDIA_ROOT, 'slides'));
ensureDir(join(MEDIA_ROOT, 'images'));

// -------------------------------------------------------
// 1. Register executor
// -------------------------------------------------------

let executorId = null;

async function registerExecutor() {
  LOG('Registering executor...');

  // Check if already registered
  const { data: existing } = await supabase
    .from('executors')
    .select('id')
    .eq('base_id', BASE_ID)
    .eq('machine_name', MACHINE_NAME)
    .single();

  if (existing) {
    executorId = existing.id;
    // Update to online
    await supabase
      .from('executors')
      .update({
        is_online: true,
        last_seen_at: new Date().toISOString(),
        executor_version: EXECUTOR_VERSION,
      })
      .eq('id', executorId);
    LOG(`Re-registered (existing ID: ${executorId})`);
    return;
  }

  const { data, error } = await supabase
    .from('executors')
    .insert({
      organization_id: ORGANIZATION_ID,
      base_id: BASE_ID,
      machine_name: MACHINE_NAME,
      device_label: DEVICE_LABEL,
      executor_version: EXECUTOR_VERSION,
      is_online: true,
      base_path: MEDIA_ROOT,
      supports_audio: true,
      supports_video: true,
      supports_slides: true,
      supports_displays: true,
      last_seen_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    ERR('Registration failed:', error.message);
    process.exit(1);
  }

  executorId = data.id;
  LOG(`Registered as ${executorId}`);
}

// -------------------------------------------------------
// 2. Heartbeat
// -------------------------------------------------------

async function sendHeartbeat() {
  if (!executorId) return;

  const { error } = await supabase
    .from('executors')
    .update({
      is_online: true,
      last_seen_at: new Date().toISOString(),
    })
    .eq('id', executorId);

  if (error) {
    ERR('Heartbeat failed:', error.message);
  }
}

// -------------------------------------------------------
// 3. Poll for pending sync jobs
// -------------------------------------------------------

async function pollSyncJobs() {
  if (!executorId) return;

  const { data: jobs, error } = await supabase
    .from('media_sync_jobs')
    .select('*')
    .eq('status', 'pending')
    .eq('organization_id', ORGANIZATION_ID)
    .order('created_at', { ascending: true })
    .limit(5);

  if (error) {
    ERR('Poll sync jobs failed:', error.message);
    return;
  }

  if (!jobs || jobs.length === 0) return;

  LOG(`Found ${jobs.length} pending sync job(s)`);

  for (const job of jobs) {
    await processJob(job);
  }
}

// -------------------------------------------------------
// 4. Process a sync job (download media)
// -------------------------------------------------------

async function processJob(job) {
  const jobId = job.id;
  LOG(`Processing job ${jobId}: ${job.job_type} (${job.media_type})`);

  // Claim job
  const { error: claimError } = await supabase
    .from('media_sync_jobs')
    .update({
      status: 'processing',
      processed_by: executorId,
      processed_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .eq('status', 'pending'); // Optimistic lock

  if (claimError) {
    ERR(`Claim job ${jobId} failed:`, claimError.message);
    return;
  }

  try {
    if (job.job_type === 'download_to_local') {
      await downloadMedia(job);
    } else {
      LOG(`Unsupported job type: ${job.job_type}, skipping`);
    }

    // Mark completed
    await supabase
      .from('media_sync_jobs')
      .update({ status: 'completed' })
      .eq('id', jobId);

    LOG(`Job ${jobId} completed`);
  } catch (err) {
    ERR(`Job ${jobId} failed:`, err.message);

    const retries = (job.retry_count ?? 0) + 1;
    await supabase
      .from('media_sync_jobs')
      .update({
        status: retries >= (job.max_retries ?? 3) ? 'failed' : 'pending',
        error_message: err.message,
        retry_count: retries,
      })
      .eq('id', jobId);
  }
}

// -------------------------------------------------------
// 5. Download a media file from Supabase Storage
// -------------------------------------------------------

async function downloadMedia(job) {
  const payload = job.payload_json ?? {};
  const bucket = payload.bucket ?? (job.media_type === 'audio' ? 'media-audio' : 'media-uploads');
  const storagePath = payload.storage_path;

  if (!storagePath) {
    // Try to resolve from song or media item
    let resolvedPath = null;
    let resolvedBucket = bucket;

    if (job.song_id) {
      const { data: song } = await supabase
        .from('songs')
        .select('storage_bucket, storage_path')
        .eq('id', job.song_id)
        .single();
      if (song) {
        resolvedBucket = song.storage_bucket ?? bucket;
        resolvedPath = song.storage_path;
      }
    } else if (job.media_item_id) {
      const { data: item } = await supabase
        .from('media_items')
        .select('storage_bucket, storage_path')
        .eq('id', job.media_item_id)
        .single();
      if (item) {
        resolvedBucket = item.storage_bucket ?? bucket;
        resolvedPath = item.storage_path;
      }
    }

    if (!resolvedPath) {
      throw new Error('No storage_path found for download');
    }

    return await doDownload(resolvedBucket, resolvedPath, job);
  }

  return await doDownload(bucket, storagePath, job);
}

async function doDownload(bucket, storagePath, job) {
  LOG(`Downloading ${bucket}/${storagePath}...`);

  const { data, error } = await supabase.storage
    .from(bucket)
    .download(storagePath);

  if (error || !data) {
    throw new Error(`Storage download failed: ${error?.message ?? 'no data'}`);
  }

  // Determine local path
  const subdir = job.media_type === 'audio' ? 'audio' : job.media_type === 'video' ? 'video' : job.media_type === 'slides' ? 'slides' : 'images';
  const filename = storagePath.split('/').pop();
  const localDir = join(MEDIA_ROOT, subdir);
  ensureDir(localDir);
  const localPath = join(localDir, filename);

  // Write file
  const buffer = Buffer.from(await data.arrayBuffer());
  writeFileSync(localPath, buffer);

  const checksum = createHash('sha256').update(buffer).digest('hex');

  LOG(`Downloaded to ${localPath} (${buffer.length} bytes, sha256: ${checksum.substring(0, 12)}...)`);

  // Update inventory
  await supabase
    .from('executor_media_inventory')
    .upsert({
      executor_id: executorId,
      song_id: job.song_id ?? null,
      media_item_id: job.media_item_id ?? null,
      local_file_path: localPath,
      sync_status: 'synced',
      file_size_bytes: buffer.length,
      checksum,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'executor_id,song_id',
    });

  return localPath;
}

// -------------------------------------------------------
// 6. Graceful shutdown
// -------------------------------------------------------

async function shutdown() {
  LOG('Shutting down...');
  if (executorId) {
    await supabase
      .from('executors')
      .update({ is_online: false, updated_at: new Date().toISOString() })
      .eq('id', executorId);
    LOG('Marked offline');
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// -------------------------------------------------------
// Main loop
// -------------------------------------------------------

async function main() {
  LOG('========================================');
  LOG('7Flow Executor Local starting...');
  LOG(`Machine: ${MACHINE_NAME}`);
  LOG(`Base ID: ${BASE_ID}`);
  LOG(`Media root: ${MEDIA_ROOT}`);
  LOG(`Heartbeat: ${HEARTBEAT_INTERVAL_MS}ms`);
  LOG(`Poll: ${POLL_INTERVAL_MS}ms`);
  LOG('========================================');

  await registerExecutor();

  // Heartbeat loop
  setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

  // Job polling loop
  setInterval(pollSyncJobs, POLL_INTERVAL_MS);

  // Initial poll
  await pollSyncJobs();

  LOG('Running. Press Ctrl+C to stop.');
}

main().catch((err) => {
  ERR('Fatal error:', err);
  process.exit(1);
});
