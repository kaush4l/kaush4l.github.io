export class TextStreamAccumulator {
    private buffer: string = '';
    private onSentence: (sentence: string) => void;

    constructor(onSentence: (sentence: string) => void) {
        this.onSentence = onSentence;
    }

    // Backwards/alternate naming used by some callers.
    push(chunk: string) {
        this.add(chunk);
    }

    reset() {
        this.buffer = '';
    }

    add(chunk: string) {
        this.buffer += chunk;
        this.process();
    }

    private process() {
        // Match sentence endings: . ? ! followed by space or end of string
        // Also handle some common abbreviations if needed (simplified here)
        let match;
        // Regex looks for punctuation followed by whitespace, or punctuation at end of buffer
        while ((match = this.buffer.match(/([.!?։។।]+)(\s+|$)/))) {
            const index = match.index! + match[0].length;
            const sentence = this.buffer.slice(0, index).trim();
            if (sentence) {
                this.onSentence(sentence);
            }
            this.buffer = this.buffer.slice(index);
        }
    }

    flush() {
        if (this.buffer.trim()) {
            this.onSentence(this.buffer.trim());
            this.buffer = '';
        }
    }
}

export class AsyncQueue<T> {
    private queue: T[] = [];
    private processing: boolean = false;
    private worker: (item: T) => Promise<void>;

    constructor(worker: (item: T) => Promise<void>) {
        this.worker = worker;
    }

    push(item: T) {
        this.queue.push(item);
        this.process();
    }

    private async process() {
        if (this.processing) return;
        this.processing = true;

        while (this.queue.length > 0) {
            const item = this.queue.shift();
            if (item) {
                try {
                    await this.worker(item);
                } catch (e) {
                    console.error('Queue processing error:', e);
                }
            }
        }

        this.processing = false;
    }

    clear() {
        this.queue = [];
        this.processing = false;
    }
}
