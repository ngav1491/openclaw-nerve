/**
 * Shared types for the Nerve updater.
 */
// ── Exit codes ───────────────────────────────────────────────────────
export const EXIT_CODES = {
    SUCCESS: 0,
    UP_TO_DATE: 1,
    PREFLIGHT: 10,
    VERSION_RESOLUTION: 20,
    BUILD: 40,
    RESTART: 50,
    HEALTH: 60,
    ROLLBACK: 70,
    LOCK: 80,
};
// ── Custom errors ────────────────────────────────────────────────────
export class UpdateError extends Error {
    stage;
    exitCode;
    constructor(message, stage, exitCode) {
        super(message);
        this.name = 'UpdateError';
        this.stage = stage;
        this.exitCode = exitCode;
    }
}
