/**
 * Pure time policy for the Midnight Reminder extension.
 *
 * No Pi APIs, no timers, no system-clock reads: the caller supplies `now`.
 */

/** Reminder window: 00:00 (inclusive) through 06:00 (exclusive), local time. */
const WINDOW_START_HOUR = 0;
const WINDOW_END_HOUR = 6;

/** Format a Date as a local calendar-day key, e.g. "2025-01-15". */
export function localDateKey(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

/** True when `now` falls inside [00:00, 06:00) local time. */
function isInReminderWindow(now: Date): boolean {
	const hour = now.getHours();
	return hour >= WINDOW_START_HOUR && hour < WINDOW_END_HOUR;
}

/**
 * Decide whether to show the late-night reminder.
 *
 * Returns true only when `now` is inside the reminder window AND the user
 * has not already been reminded on `now`'s local calendar day.
 */
export function shouldRemind(now: Date, lastRemindedDate: string | null): boolean {
	if (!isInReminderWindow(now)) {
		return false;
	}
	if (lastRemindedDate === localDateKey(now)) {
		return false;
	}
	return true;
}
