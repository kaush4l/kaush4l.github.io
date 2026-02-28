/**
 * Shared typed message protocol for all AI web workers.
 * Every worker speaks the same Load/Progress/Ready/Error envelope,
 * with domain-specific payloads for Generate / Transcribe / Synthesize.
 *
 * Keeping types here (instead of @ts-nocheck) gives us compile-time
 * safety across all three workers and their consumers.
 */

// ─── Inbound messages (main thread → worker) ───────────────────────────────

export interface LoadMessage {
    type: 'load';
    data: { model: string };
}

export interface GenerateMessage {
    type: 'generate';
    data: {
        messages: Array<{ role: string; content: string }>;
        images?: string[];
        requestId?: string;
        max_new_tokens?: number;
    };
}

export interface TranscribeMessage {
    type: 'transcribe';
    data: {
        audio: Float32Array;
        requestId?: string;
    };
}

export interface SynthesizeMessage {
    type: 'synthesize';
    data: {
        text: string;
        language?: string;
        speaker?: string;
        requestId?: string;
        generation_config?: Record<string, unknown>;
    };
}

export type LLMInbound = LoadMessage | GenerateMessage;
export type STTInbound = LoadMessage | TranscribeMessage;
export type TTSInbound = LoadMessage | SynthesizeMessage;

// ─── Outbound messages (worker → main thread) ──────────────────────────────

export interface ProgressMessage {
    type: 'progress';
    data: {
        status?: string;
        progress?: number;
        file?: string;
        loaded?: number;
        total?: number;
        /** Streaming token chunk from LLM */
        output?: string;
        requestId?: string;
    };
}

export interface ReadyMessage {
    type: 'ready';
}

export interface ErrorMessage {
    type: 'error';
    data:
        | string
        | { message: string; requestId?: string };
}

export interface CompleteMessage {
    type: 'complete';
    data: {
        output?: string;
        audio?: Float32Array;
        sampling_rate?: number;
        model?: string;
        language?: string;
        speaker?: string;
        requestId?: string;
    };
}

export interface TranscriptionMessage {
    type: 'transcription';
    data: { text: string; requestId?: string } | string;
}

export type WorkerOutbound =
    | ProgressMessage
    | ReadyMessage
    | ErrorMessage
    | CompleteMessage
    | TranscriptionMessage;
