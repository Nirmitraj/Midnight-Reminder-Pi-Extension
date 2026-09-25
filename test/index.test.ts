import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import midnightReminderExtension from "../src/index";

/**
 * Integration tests (green) for the finished extension wiring.
 *
 * The extension factory receives an ExtensionAPI and registers:
 *   - pi.on("session_start", (event, ctx) => ...)
 *   - pi.on("session_shutdown", (event, ctx) => ...)
 *
 * On session_start it owns a MidnightReminder runtime. Inside the reminder
 * window a notification is shown via ctx.ui.notify(message, "warning") only
 * when ctx.hasUI is true. On session_shutdown it stops the runtime so the
 * underlying interval is cleared.
 *
 * These fakes mirror the installed Pi 0.87.1 API shape:
 *   ExtensionAPI.on(event, handler): () => void
 *   ExtensionContext.hasUI: boolean
 *   ExtensionContext.ui.notify(message, type?): void
 */

type EventHandler = (event: unknown, ctx: unknown) => unknown;

interface FakePi {
	on: (event: string, handler: EventHandler) => () => void;
}

function createFakePi() {
	const handlers = new Map<string, EventHandler>();
	const on = vi.fn((event: string, handler: EventHandler) => {
		handlers.set(event, handler);
		return () => handlers.delete(event);
	});
	return { pi: { on } as FakePi, handlers };
}

function createFakeCtx(hasUI: boolean) {
	return {
		hasUI,
		ui: {
			notify: vi.fn(),
		},
	};
}

const EXPECTED_MESSAGE = "It's late — consider stopping work and getting some rest.";

describe("Midnight Reminder extension", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("registers a session_start handler", () => {
		const { pi, handlers } = createFakePi();

		midnightReminderExtension(pi as never);

		expect(handlers.has("session_start")).toBe(true);
	});

	it("registers a session_shutdown handler", () => {
		const { pi, handlers } = createFakePi();

		midnightReminderExtension(pi as never);

		expect(handlers.has("session_shutdown")).toBe(true);
	});

	it("starts a reminder runtime on session_start and notifies inside the window", () => {
		vi.setSystemTime(new Date(2025, 0, 15, 2, 0, 0, 0));
		const { pi, handlers } = createFakePi();
		midnightReminderExtension(pi as never);
		const ctx = createFakeCtx(true);

		handlers.get("session_start")!({ type: "session_start", reason: "startup" }, ctx);

		expect(ctx.ui.notify).toHaveBeenCalledTimes(1);
	});

	it("shows the reminder through ctx.ui.notify with a warning type", () => {
		vi.setSystemTime(new Date(2025, 0, 15, 2, 0, 0, 0));
		const { pi, handlers } = createFakePi();
		midnightReminderExtension(pi as never);
		const ctx = createFakeCtx(true);

		handlers.get("session_start")!({ type: "session_start", reason: "startup" }, ctx);

		expect(ctx.ui.notify).toHaveBeenCalledWith(EXPECTED_MESSAGE, "warning");
	});

	it("does not notify and does not crash when ctx.hasUI is false", () => {
		vi.setSystemTime(new Date(2025, 0, 15, 2, 0, 0, 0));
		const { pi, handlers } = createFakePi();
		midnightReminderExtension(pi as never);
		const ctx = createFakeCtx(false);

		expect(() =>
			handlers.get("session_start")!({ type: "session_start", reason: "startup" }, ctx),
		).not.toThrow();
		expect(ctx.ui.notify).not.toHaveBeenCalled();
	});

	it("stops the running reminder on session_shutdown so the timer is cleared", () => {
		vi.setSystemTime(new Date(2025, 0, 15, 12, 0, 0, 0)); // outside window
		const { pi, handlers } = createFakePi();
		midnightReminderExtension(pi as never);
		const ctx = createFakeCtx(true);

		handlers.get("session_start")!({ type: "session_start", reason: "startup" }, ctx);
		handlers.get("session_shutdown")!({ type: "session_shutdown", reason: "quit" }, ctx);

		// Advance into the next day's reminder window; a live timer would fire.
		vi.advanceTimersByTime(13 * 60 * 60 * 1000);

		expect(ctx.ui.notify).not.toHaveBeenCalled();
	});
});
