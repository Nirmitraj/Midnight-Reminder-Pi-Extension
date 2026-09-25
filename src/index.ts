import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import { MidnightReminder } from "./midnight-reminder";

const REMINDER_MESSAGE = "It's late — consider stopping work and getting some rest.";

/**
 * Pi extension factory. Thin wiring only: all timing and duplicate logic
 * lives in MidnightReminder (which in turn delegates to the pure policy).
 */
export default function midnightReminderExtension(pi: ExtensionAPI): void {
	let reminder: MidnightReminder | undefined;

	pi.on("session_start", (_event, ctx) => {
		if (reminder) {
			return; // Already running for this session.
		}
		reminder = new MidnightReminder({
			now: () => new Date(),
			notify: () => {
				if (ctx.hasUI) {
					ctx.ui.notify(REMINDER_MESSAGE, "warning");
				}
			},
		});
		reminder.start();
	});

	pi.on("session_shutdown", () => {
		reminder?.stop();
		reminder = undefined;
	});
}
