import { localDateKey, shouldRemind } from "./policy";

export interface MidnightReminderOptions {
	/** Returns the current time. Injected so tests control the clock. */
	now: () => Date;
	/** Called when a reminder should be shown. */
	notify: () => void;
	/** How often to re-check, in milliseconds. Defaults to 60 seconds. */
	intervalMs?: number;
}

const DEFAULT_INTERVAL_MS = 60_000;

/**
 * Owns the reminder lifecycle: periodic checks, in-memory per-day duplicate
 * state, and the start/stop timer bookkeeping. Time decisions are delegated
 * to the pure policy in `src/policy.ts`.
 */
export class MidnightReminder {
	private readonly now: () => Date;
	private readonly notify: () => void;
	private readonly intervalMs: number;

	/** Local "YYYY-MM-DD" of the day already reminded, or null. */
	private lastRemindedDate: string | null = null;
	private timer: ReturnType<typeof setInterval> | undefined;

	constructor(options: MidnightReminderOptions) {
		this.now = options.now;
		this.notify = options.notify;
		this.intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
	}

	/** Run one check and, if due, notify and record the day. */
	private check(): void {
		const now = this.now();
		if (shouldRemind(now, this.lastRemindedDate)) {
			this.notify();
			this.lastRemindedDate = localDateKey(now);
		}
	}

	/** Check immediately, then start the periodic checks. */
	start(): void {
		if (this.timer !== undefined) {
			return; // Already running; avoid stacking intervals.
		}
		this.check();
		this.timer = setInterval(() => this.check(), this.intervalMs);
	}

	/** Stop periodic checks. Safe to call more than once. */
	stop(): void {
		if (this.timer !== undefined) {
			clearInterval(this.timer);
			this.timer = undefined;
		}
	}
}
