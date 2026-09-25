import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MidnightReminder } from "../src/midnight-reminder";

/**
 * Runtime tests (green) for the MidnightReminder component:
 *
 *   new MidnightReminder({ now, notify, intervalMs? })
 *
 * - `start()` checks immediately, then checks on every `intervalMs` tick.
 * - `notify()` is called at most once per local calendar day, and only
 *   while inside the [00:00, 06:00) reminder window.
 * - `stop()` clears the interval and is idempotent.
 *
 * Fake timers + vi.setSystemTime() make this deterministic and instant.
 */
const DEFAULT_INTERVAL_MS = 60_000;

function makeReminder(notify: () => void, intervalMs = DEFAULT_INTERVAL_MS) {
	return new MidnightReminder({
		now: () => new Date(),
		notify,
		intervalMs,
	});
}

describe("MidnightReminder", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("checks immediately when started", () => {
		vi.setSystemTime(new Date(2025, 0, 15, 2, 0, 0, 0));
		const notify = vi.fn();
		const reminder = makeReminder(notify);

		reminder.start();

		expect(notify).toHaveBeenCalledTimes(1);

		reminder.stop();
	});

	it("notifies once when started at 02:00 and not yet reminded today", () => {
		vi.setSystemTime(new Date(2025, 0, 15, 2, 0, 0, 0));
		const notify = vi.fn();
		const reminder = makeReminder(notify);

		reminder.start();

		expect(notify).toHaveBeenCalledTimes(1);

		reminder.stop();
	});

	it("does not duplicate notifications across interval ticks in the same day", () => {
		vi.setSystemTime(new Date(2025, 0, 15, 2, 0, 0, 0));
		const notify = vi.fn();
		const reminder = makeReminder(notify);

		reminder.start();
		vi.advanceTimersByTime(DEFAULT_INTERVAL_MS * 5);

		expect(notify).toHaveBeenCalledTimes(1);

		reminder.stop();
	});

	it("does not notify when started outside the reminder window", () => {
		vi.setSystemTime(new Date(2025, 0, 15, 12, 0, 0, 0));
		const notify = vi.fn();
		const reminder = makeReminder(notify);

		reminder.start();
		vi.advanceTimersByTime(DEFAULT_INTERVAL_MS * 3);

		expect(notify).not.toHaveBeenCalled();

		reminder.stop();
	});

	it("stops checking after stop() is called", () => {
		vi.setSystemTime(new Date(2025, 0, 15, 12, 0, 0, 0));
		const notify = vi.fn();
		const reminder = makeReminder(notify);

		reminder.start();
		reminder.stop();

		// Advance into the next day's reminder window.
		vi.advanceTimersByTime(13 * 60 * 60 * 1000);

		expect(notify).not.toHaveBeenCalled();
	});

	it("allows stop() to be called more than once", () => {
		vi.setSystemTime(new Date(2025, 0, 15, 2, 0, 0, 0));
		const notify = vi.fn();
		const reminder = makeReminder(notify);

		reminder.start();
		reminder.stop();

		expect(() => reminder.stop()).not.toThrow();
	});
});
