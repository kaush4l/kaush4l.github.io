/**
 * Shared typed message protocol for the multimodal LLM web worker.
 * The worker runs a Gemma-4-class model that accepts text and audio.
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
        /** Mono 16 kHz PCM attached to the latest user turn (voice input). */
        audio?: Float32Array;
        requestId?: string;
        max_new_tokens?: number;
    };
}

export type LLMInbound = LoadMessage | GenerateMessage;

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
        requestId?: string;
    };
}

export type WorkerOutbound =
    | ProgressMessage
    | ReadyMessage
    | ErrorMessage
    | CompleteMessage;
