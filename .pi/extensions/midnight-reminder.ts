/**
 * Project-local Pi extension entry point.
 *
 * Pi discovers this file via `.pi/extensions/`. It only re-exports the
 * already-tested factory from `src/index.ts`; no logic is duplicated here.
 */
export { default } from "../../src/index";
