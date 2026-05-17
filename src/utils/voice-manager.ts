import {
  AudioPlayer,
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
  StreamType,
  VoiceConnection,
  VoiceConnectionStatus,
} from "@discordjs/voice";
import { Collection } from "discord.js";
import * as googleTTS from "google-tts-api";
import { spawn, spawnSync } from "child_process";
import { createRequire } from "module";
import fs from "fs";
import { mkdir, unlink, writeFile } from "fs/promises";
import os from "os";
import path from "path";

const require = createRequire(import.meta.url);
const ffmpegStaticPath = require("ffmpeg-static");

function canRunFfmpeg(candidate: string): boolean {
  const isPath = candidate.includes("/") || candidate.includes("\\");
  if (isPath && !fs.existsSync(candidate)) return false;

  const result = spawnSync(candidate, ["-version"], {
    encoding: "utf-8",
    timeout: 3000,
  });

  if (result.error || result.status !== 0) {
    console.warn(
      `[VoiceMgr] FFmpeg candidate failed: ${candidate}`,
      result.error ?? result.stderr,
    );
    return false;
  }

  return true;
}

function resolveFfmpegPath(): string {
  const candidates = [
    process.env.FFMPEG_PATH,
    process.platform === "linux" ? "ffmpeg" : undefined,
    ffmpegStaticPath,
    "ffmpeg",
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (canRunFfmpeg(candidate)) {
      console.log(`[VoiceMgr] Using FFmpeg: ${candidate}`);
      return candidate;
    }
  }

  console.warn("[VoiceMgr] No verified FFmpeg found, falling back to 'ffmpeg'");
  return "ffmpeg";
}

const ffmpegPath = resolveFfmpegPath();
const vietNeuTtsUrl = process.env.VIETNEU_TTS_URL ?? "http://127.0.0.1:8765/tts";
const vietNeuTtsDir = path.join(os.tmpdir(), "moe-bot-vietneu-tts");

interface AudioChunk {
  input: string;
  cleanupPath?: string;
}

function createGoogleTtsChunks(content: string): AudioChunk[] {
  return googleTTS
    .getAllAudioUrls(content, {
      lang: "vi",
      slow: false,
      host: "https://translate.google.com",
    })
    .map((chunk) => ({ input: chunk.url }));
}

async function createVietNeuTtsChunk(content: string): Promise<AudioChunk> {
  const response = await fetch(vietNeuTtsUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: content,
      emotion: "natural",
      voice_id: null,
    }),
  });

  if (!response.ok) {
    throw new Error(`VietNeu TTS returned ${response.status} ${response.statusText}`);
  }

  const audio = Buffer.from(await response.arrayBuffer());
  if (audio.length === 0) {
    throw new Error("VietNeu TTS returned an empty audio response");
  }

  await mkdir(vietNeuTtsDir, { recursive: true });
  const filePath = path.join(
    vietNeuTtsDir,
    `${Date.now()}-${Math.random().toString(36).slice(2)}.wav`,
  );
  await writeFile(filePath, audio);

  return {
    input: filePath,
    cleanupPath: filePath,
  };
}

async function cleanupAudioChunks(chunks: AudioChunk[]) {
  await Promise.all(
    chunks
      .filter((chunk): chunk is AudioChunk & { cleanupPath: string } => Boolean(chunk.cleanupPath))
      .map((chunk) =>
        unlink(chunk.cleanupPath).catch((err) => {
          console.warn(`[VoiceMgr] Failed to remove temp TTS file ${chunk.cleanupPath}:`, err);
        }),
      ),
  );
}

export interface QueueItem {
  content: string;
  speed: number;
  channelId: string;
  guildId: string;
  adapterCreator: any;
  onTtsProcessing?: () => void | Promise<void>;
  onTtsReady?: (source: "vietneu" | "google") => void | Promise<void>;
  onTtsFallback?: () => void | Promise<void>;
}

class GuildVoiceManager {
  private queue: QueueItem[] = [];
  private player: AudioPlayer;
  private connection: VoiceConnection | null = null;
  private currentChunks: AudioChunk[] = [];
  private currentChunkIndex = 0;
  private currentSpeed = 1;
  private guildId: string;
  private leaveTimeout: NodeJS.Timeout | null = null;
  private isProcessingQueue = false;
  private playbackVersion = 0;

  constructor(guildId: string) {
    this.guildId = guildId;
    this.player = createAudioPlayer();

    this.player.on(AudioPlayerStatus.Idle, () => {
      console.log(`[VoiceMgr:${this.guildId}] Player idle, playing next chunk`);
      this.playNextChunk();
    });

    this.player.on("error", (error) => {
      console.error(`[VoiceMgr:${this.guildId}] Audio Player Error:`, error);
      this.playNextChunk();
    });
  }

  public async addToQueue(item: QueueItem) {
    this.queue.push(item);
    console.log(
      `[VoiceMgr:${this.guildId}] Added to queue. Size: ${this.queue.length}`,
    );

    if (this.leaveTimeout) {
      clearTimeout(this.leaveTimeout);
      this.leaveTimeout = null;
    }

    if (!this.connection || this.connection.state.status === VoiceConnectionStatus.Destroyed) {
      this.connect(item);
    }

    if (this.player.state.status === AudioPlayerStatus.Idle && this.currentChunks.length === 0) {
      if (this.connection?.state.status === VoiceConnectionStatus.Ready) {
        void this.processQueue();
      } else {
        console.log(
          `[VoiceMgr:${this.guildId}] Waiting for voice connection to be ready before playback`,
        );
      }
    }
  }

  private connect(item: QueueItem) {
    console.log(`[VoiceMgr:${this.guildId}] Joining voice channel: ${item.channelId}`);
    this.connection = joinVoiceChannel({
      channelId: item.channelId,
      guildId: item.guildId,
      adapterCreator: item.adapterCreator,
      selfDeaf: false,
      selfMute: false,
    });

    this.connection.subscribe(this.player);

    this.connection.on(VoiceConnectionStatus.Ready, () => {
      console.log(`[VoiceMgr:${this.guildId}] Connection Ready`);
      if (
        this.player.state.status === AudioPlayerStatus.Idle &&
        this.currentChunks.length === 0 &&
        this.queue.length > 0
      ) {
        void this.processQueue();
      }
    });

    this.connection.on("error", (err) => {
      console.error(`[VoiceMgr:${this.guildId}] Connection Error:`, err);
    });
  }

  private async processQueue() {
    if (this.isProcessingQueue) {
      return;
    }

    if (this.queue.length === 0) {
      console.log(`[VoiceMgr:${this.guildId}] Queue empty, setting leave timeout`);
      this.startLeaveTimeout();
      return;
    }

    this.isProcessingQueue = true;
    const nextItem = this.queue.shift()!;
    const playbackVersion = this.playbackVersion;
    this.currentSpeed = nextItem.speed;

    try {
      await nextItem.onTtsProcessing?.();

      try {
        this.currentChunks = [await createVietNeuTtsChunk(nextItem.content)];
        console.log(`[VoiceMgr:${this.guildId}] Using VietNeu TTS`);
        await nextItem.onTtsReady?.("vietneu");
      } catch (error) {
        console.warn(
          `[VoiceMgr:${this.guildId}] VietNeu TTS failed, falling back to Google TTS:`,
          error,
        );
        await nextItem.onTtsFallback?.();
        this.currentChunks = createGoogleTtsChunks(nextItem.content);
        await nextItem.onTtsReady?.("google");
      }

      if (playbackVersion !== this.playbackVersion) {
        await cleanupAudioChunks(this.currentChunks);
        this.currentChunks = [];
        return;
      }

      this.currentChunkIndex = 0;
      console.log(`[VoiceMgr:${this.guildId}] Processing new item, chunks: ${this.currentChunks.length}`);
      this.playNextChunk();
    } finally {
      this.isProcessingQueue = false;
      if (
        this.currentChunks.length === 0 &&
        this.queue.length > 0 &&
        this.player.state.status === AudioPlayerStatus.Idle
      ) {
        void this.processQueue();
      }
    }
  }

  private playNextChunk() {
    if (this.currentChunkIndex >= this.currentChunks.length) {
      this.currentChunks = [];
      void this.processQueue();
      return;
    }

    const chunk = this.currentChunks[this.currentChunkIndex];
    console.log(`[VoiceMgr:${this.guildId}] Playing chunk ${this.currentChunkIndex + 1}/${this.currentChunks.length} (Speed: ${this.currentSpeed}x)`);

    const ffmpegArgs = ["-hide_banner", "-nostdin", "-i", chunk.input];

    if (this.currentSpeed !== 1) {
      let filter = "";
      if (this.currentSpeed <= 2) {
        filter = `atempo=${this.currentSpeed}`;
      } else {
        filter = `atempo=2.0,atempo=${this.currentSpeed / 2.0}`;
      }
      ffmpegArgs.push("-af", filter);
    }

    ffmpegArgs.push("-c:a", "libopus", "-ar", "48000", "-ac", "2", "-f", "ogg", "pipe:1");

    const ffmpegProcess = spawn(ffmpegPath, ffmpegArgs, {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let ffmpegStderr = "";

    ffmpegProcess.on("error", (err) => {
      console.error(`[VoiceMgr:${this.guildId}] FFmpeg spawn error:`, err);
    });

    ffmpegProcess.stderr.on("data", (data) => {
      const msg = data.toString();
      ffmpegStderr += msg;
      const lower = msg.toLowerCase();
      if (lower.includes("error") || lower.includes("failed")) {
        console.error(`[VoiceMgr:${this.guildId}] FFmpeg stderr: ${msg}`);
      }
    });

    ffmpegProcess.on("close", (code, signal) => {
      if (chunk.cleanupPath) {
        void cleanupAudioChunks([chunk]);
      }

      if (code !== 0) {
        console.error(
          `[VoiceMgr:${this.guildId}] FFmpeg exited with code=${code} signal=${signal}. stderr=${ffmpegStderr.slice(-2000)}`,
        );
      }
    });

    const resource = createAudioResource(ffmpegProcess.stdout, {
      inputType: StreamType.OggOpus,
    });

    this.player.play(resource);
    this.currentChunkIndex++;
  }

  private startLeaveTimeout() {
    if (this.leaveTimeout) clearTimeout(this.leaveTimeout);
    this.leaveTimeout = setTimeout(() => {
      if (this.connection && this.connection.state.status !== VoiceConnectionStatus.Destroyed) {
        console.log(`[VoiceMgr:${this.guildId}] Inactivity timeout, leaving channel`);
        this.connection.destroy();
        this.connection = null;
      }
    }, 30000); // Rời phòng sau 30 giây rảnh
  }

  public stop() {
    this.playbackVersion++;
    this.queue = [];
    this.currentChunks = [];
    this.player.stop();
    if (this.connection) {
      this.connection.destroy();
      this.connection = null;
    }
  }

  /**
   * Skip bài TTS hiện tại (bỏ hết chunk còn lại) và chuyển sang item kế trong queue.
   * @returns true nếu có gì để skip (đang phát / còn chunk / còn hàng đợi)
   */
  public skip(): boolean {
    const hasQueued = this.queue.length > 0;
    const hasCurrent =
      this.currentChunks.length > 0 ||
      this.isProcessingQueue ||
      this.player.state.status === AudioPlayerStatus.Playing ||
      this.player.state.status === AudioPlayerStatus.Buffering;

    if (!hasCurrent && !hasQueued) {
      return false;
    }

    this.playbackVersion++;
    this.currentChunks = [];
    this.currentChunkIndex = 0;

    if (
      this.player.state.status === AudioPlayerStatus.Playing ||
      this.player.state.status === AudioPlayerStatus.Buffering
    ) {
      this.player.stop();
      return true;
    }

    void this.processQueue();
    return true;
  }
}

class GlobalVoiceManager {
  private managers = new Collection<string, GuildVoiceManager>();

  public getOrCreateManager(guildId: string): GuildVoiceManager {
    if (!this.managers.has(guildId)) {
      this.managers.set(guildId, new GuildVoiceManager(guildId));
    }
    return this.managers.get(guildId)!;
  }
}

export const voiceManager = new GlobalVoiceManager();
