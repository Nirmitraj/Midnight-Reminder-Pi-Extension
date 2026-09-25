import { describe, expect, it } from "vitest";

import { shouldRemind } from "../src/policy";

/**
 * Policy tests (green) for the pure time/dedup rule:
 *
 *   shouldRemind(now: Date, lastRemindedDate: string | null): boolean
 *
 * - Reminder window is [00:00, 06:00) in LOCAL time.
 * - `lastRemindedDate` is the local calendar day already reminded,
 *   formatted as "YYYY-MM-DD", or null if the user has not been reminded.
 * - Return true only when `now` is inside the window AND the user has
 *   not already been reminded on `now`'s local calendar day.
 *
 * Fixed local Dates are used so the tests never depend on the wall clock.
 */
describe("shouldRemind", () => {
	it("does not remind at 23:59", () => {
		const now = new Date(2025, 0, 15, 23, 59, 0, 0);
		expect(shouldRemind(now, null)).toBe(false);
	});

	it("reminds at 00:00", () => {
		const now = new Date(2025, 0, 15, 0, 0, 0, 0);
		expect(shouldRemind(now, null)).toBe(true);
	});

	it("does not remind again when already reminded today", () => {
		const now = new Date(2025, 0, 15, 1, 0, 0, 0);
		const lastRemindedDate = "2025-01-15"; // same local calendar day
		expect(shouldRemind(now, lastRemindedDate)).toBe(false);
	});

	it("reminds at 05:59", () => {
		const now = new Date(2025, 0, 15, 5, 59, 0, 0);
		expect(shouldRemind(now, null)).toBe(true);
	});

	it("does not remind at 06:00", () => {
		const now = new Date(2025, 0, 15, 6, 0, 0, 0);
		expect(shouldRemind(now, null)).toBe(false);
	});
});
