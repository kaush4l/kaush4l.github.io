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
