# Midnight Reminder Pi Extension

## Overview

Midnight Reminder is a [Pi](https://github.com/earendil-works/pi) coding-agent
extension that reminds users to stop working during late-night hours. When Pi
is running between **00:00 (inclusive)** and **06:00 (exclusive)** local time,
the extension shows a warning notification suggesting the user take a rest.

The reminder is shown **at most once per local calendar day** during a running
Pi session, so the user is not repeatedly interrupted after the first warning.

## Features

- Automatic check when a Pi session starts
- Re-checks every 60 seconds while the session is running
- Visible warning notification via `ctx.ui.notify`
- Duplicate-reminder prevention (once per local calendar day)
- Cleanup of timers on session shutdown
- Project-local Pi extension discovery
- Fully tested with [Vitest](https://vitest.dev/)

## Project Structure

| Path | Purpose |
|---|---|
| `.pi/extensions/midnight-reminder.ts` | Project-local Pi extension entry point. Pi discovers this file automatically and it re-exports the tested factory from `src/index.ts`. |
| `src/policy.ts` | Pure time policy: window and duplicate-day decisions. Takes `now` as an argument — no Pi APIs, timers, or clock reads. |
| `src/midnight-reminder.ts` | Runtime class that owns the interval, in-memory duplicate state, and start/stop lifecycle. |
| `src/index.ts` | Pi integration: wires `session_start` / `session_shutdown` events to the runtime and sends the notification. |
| `test/policy.test.ts` | Unit tests for the pure policy. |
| `test/midnight-reminder.test.ts` | Unit tests for the runtime class. |
| `test/index.test.ts` | Integration tests for the Pi extension wiring. |

## Required Behavior

| Case | Expected |
|---|---|
| 23:59 | No reminder |
| 00:00 | Reminder |
| Already reminded today | No duplicate |
| 05:59 | Reminder |
| 06:00 | No reminder |

## How It Works

The extension is split into three layers, each with a single responsibility:

1. **Policy** (`src/policy.ts`) — pure functions that decide whether the current
   time falls in `[00:00, 06:00)` and whether the user has already been reminded
   that local calendar day. Given the same inputs, it always returns the same
   result, which makes it trivial to test.
2. **Runtime** (`src/midnight-reminder.ts`) — `MidnightReminder` checks
   immediately, then every 60 seconds, records the reminded day in memory, and
   manages the interval. It delegates all time decisions to the policy.
3. **Pi integration** (`src/index.ts`) — the extension factory subscribes to
   `session_start` and `session_shutdown`, constructs the runtime with the real
   clock and `ctx.ui.notify`, and cleans up when the session ends.

## Installation / Setup

```bash
npm install
```

## Running Tests

```bash
npm test
```

There are currently **17 passing tests**:

- 5 policy tests
- 6 runtime tests
- 6 integration tests

## Type Checking

```bash
npx tsc --noEmit
```

## Running with Pi

The project-local extension lives at:

```text
.pi/extensions/midnight-reminder.ts
```

Pi automatically discovers this file when Pi is started from this project, so no
additional configuration is required. Start Pi in the repository root and the
extension will load for the session.

## TDD Workflow

Development followed a strict red → green cycle, one layer at a time:

1. **Policy RED → GREEN** — write failing tests for the window and duplicate-day
   rules, then implement `src/policy.ts` until they pass.
2. **Runtime RED → GREEN** — write failing tests for immediate checks, periodic
   checks, duplicate prevention, and stop behavior, then implement
   `src/midnight-reminder.ts`.
3. **Pi integration RED → GREEN** — write failing tests for `session_start` and
   `session_shutdown` wiring, then implement `src/index.ts` and the
   `.pi/extensions` entry point.

## Design Decisions

- **Local time is used.** The reminder follows the user's own calendar day and
  wall-clock hours rather than UTC, matching when they actually experience
  late-night work.
- **`[00:00, 06:00)` boundary.** 00:00 is included and 06:00 is excluded so the
  window is unambiguous and does not double-count the 06:00 hour.
- **In-memory duplicate state.** The "already reminded" day is held only for the
  running Pi session; nothing is persisted to disk.
- **Immediate check on `session_start`.** If Pi starts during the window, the
  user is warned right away instead of waiting up to 60 seconds.
- **Interval cleared on `session_shutdown`.** The timer is stopped and the
  runtime discarded, preventing leaks and stray notifications across sessions.
