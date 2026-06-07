'use client';

/**
 * useAudioRecorder — capture microphone audio and return it as the mono,
 * 16 kHz Float32Array that transformers.js audio models expect.
 *
 * Recording uses MediaRecorder; decoding + resampling uses the Web Audio API
 * (decodeAudioData -> downmix -> OfflineAudioContext resample). No dependencies.
 */

import { useCallback, useRef, useState } from 'react';

const TARGET_SAMPLE_RATE = 16000;

/** Decode an encoded audio Blob into mono PCM at 16 kHz. */
async function blobToMono16k(blob: Blob): Promise<Float32Array> {
    const arrayBuffer = await blob.arrayBuffer();
    const AudioCtx: typeof AudioContext =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    const ctx = new AudioCtx();
    let decoded: AudioBuffer;
    try {
        decoded = await ctx.decodeAudioData(arrayBuffer);
    } finally {
        await ctx.close();
    }

    // Downmix all channels to mono.
    const { length, numberOfChannels, sampleRate } = decoded;
    const mono = new Float32Array(length);
    for (let ch = 0; ch < numberOfChannels; ch++) {
        const data = decoded.getChannelData(ch);
        for (let i = 0; i < length; i++) mono[i] += data[i] / numberOfChannels;
    }

    if (sampleRate === TARGET_SAMPLE_RATE) return mono;

    // Resample to 16 kHz via an offline render.
    const outLength = Math.max(1, Math.ceil((length * TARGET_SAMPLE_RATE) / sampleRate));
    const offline = new OfflineAudioContext(1, outLength, TARGET_SAMPLE_RATE);
    const buffer = offline.createBuffer(1, length, sampleRate);
    buffer.copyToChannel(mono, 0);
    const source = offline.createBufferSource();
    source.buffer = buffer;
    source.connect(offline.destination);
    source.start();
    const rendered = await offline.startRendering();
    return rendered.getChannelData(0).slice();
}

export interface AudioRecorder {
    recording: boolean;
    /** Begin capturing. Resolves once recording has started. */
    start: () => Promise<void>;
    /** Stop and return decoded mono 16 kHz PCM (or null if nothing usable). */
    stop: () => Promise<Float32Array | null>;
    /** Abort without producing audio. */
    cancel: () => void;
}

export function useAudioRecorder(): AudioRecorder {
    const [recording, setRecording] = useState(false);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);

    const releaseStream = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
    };

    const start = useCallback(async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        chunksRef.current = [];
        const recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorderRef.current = recorder;
        recorder.start();
        setRecording(true);
    }, []);

    const stop = useCallback(async (): Promise<Float32Array | null> => {
        const recorder = recorderRef.current;
        if (!recorder) return null;

        const blob = await new Promise<Blob>((resolve) => {
            recorder.onstop = () =>
                resolve(new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' }));
            recorder.stop();
        });

        setRecording(false);
        releaseStream();
        recorderRef.current = null;
        if (blob.size === 0) return null;

        try {
            return await blobToMono16k(blob);
        } catch {
            return null;
        }
    }, []);

    const cancel = useCallback(() => {
        try {
            recorderRef.current?.stop();
        } catch {
            /* already stopped */
        }
        releaseStream();
        recorderRef.current = null;
        chunksRef.current = [];
        setRecording(false);
    }, []);

    return { recording, start, stop, cancel };
}
