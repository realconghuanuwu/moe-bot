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
import { spawn } from "child_process";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static");

export interface QueueItem {
  content: string;
  speed: number;
  channelId: string;
  guildId: string;
  adapterCreator: any;
}

class GuildVoiceManager {
  private queue: QueueItem[] = [];
  private player: AudioPlayer;
  private connection: VoiceConnection | null = null;
  private currentChunks: { url: string }[] = [];
  private currentChunkIndex = 0;
  private currentSpeed = 1;
  private guildId: string;
  private leaveTimeout: NodeJS.Timeout | null = null;

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
      this.processQueue();
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
    });

    this.connection.on("error", (err) => {
      console.error(`[VoiceMgr:${this.guildId}] Connection Error:`, err);
    });
  }

  private processQueue() {
    if (this.queue.length === 0) {
      console.log(`[VoiceMgr:${this.guildId}] Queue empty, setting leave timeout`);
      this.startLeaveTimeout();
      return;
    }

    const nextItem = this.queue.shift()!;
    this.currentSpeed = nextItem.speed;
    this.currentChunks = googleTTS.getAllAudioUrls(nextItem.content, {
      lang: "vi",
      slow: false,
      host: "https://translate.google.com",
    });
    this.currentChunkIndex = 0;

    console.log(`[VoiceMgr:${this.guildId}] Processing new item, chunks: ${this.currentChunks.length}`);
    this.playNextChunk();
  }

  private playNextChunk() {
    if (this.currentChunkIndex >= this.currentChunks.length) {
      this.currentChunks = [];
      this.processQueue();
      return;
    }

    const chunkUrl = this.currentChunks[this.currentChunkIndex].url;
    console.log(`[VoiceMgr:${this.guildId}] Playing chunk ${this.currentChunkIndex + 1}/${this.currentChunks.length} (Speed: ${this.currentSpeed}x)`);

    const ffmpegArgs = ["-i", chunkUrl];

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

    const ffmpegProcess = spawn(ffmpeg, ffmpegArgs, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    ffmpegProcess.on("error", (err) => {
      console.error(`[VoiceMgr:${this.guildId}] FFmpeg spawn error:`, err);
    });

    ffmpegProcess.stderr.on("data", (data) => {
      const msg = data.toString();
      if (msg.includes("Error") || msg.includes("failed")) {
        console.error(`[VoiceMgr:${this.guildId}] FFmpeg stderr: ${msg}`);
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
    this.queue = [];
    this.currentChunks = [];
    this.player.stop();
    if (this.connection) {
      this.connection.destroy();
      this.connection = null;
    }
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
