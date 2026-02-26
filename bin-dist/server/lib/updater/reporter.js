/**
 * Colored terminal reporter — mirrors install.sh visual style.
 */
import { createInterface } from 'node:readline';
// ── Colors (matching install.sh) ─────────────────────────────────────
const RED = '\x1b[0;31m';
const GREEN = '\x1b[0;32m';
const YELLOW = '\x1b[1;33m';
const CYAN = '\x1b[0;36m';
const ORANGE = '\x1b[38;5;208m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const NC = '\x1b[0m';
const RAIL = `${DIM}│${NC}`;
// ── Reporter implementation ──────────────────────────────────────────
export function createReporter(verboseMode) {
    return {
        stage(name, current, total) {
            if (current > 1)
                write(`  ${RAIL}`);
            write(`  ${ORANGE}●${NC} ${ORANGE}${BOLD}${name}${NC}  ${DIM}[${current}/${total}]${NC}`);
            write(`  ${RAIL}`);
        },
        ok(msg) {
            write(`  ${RAIL}  ${GREEN}✓${NC} ${msg}`);
        },
        warn(msg) {
            write(`  ${RAIL}  ${YELLOW}⚠${NC} ${msg}`);
        },
        fail(msg) {
            write(`  ${RAIL}  ${RED}✗${NC} ${msg}`);
        },
        info(msg) {
            write(`  ${RAIL}  ${CYAN}→${NC} ${msg}`);
        },
        dry(msg) {
            write(`  ${RAIL}  ${YELLOW}⊘${NC} ${DIM}[dry-run]${NC} ${msg}`);
        },
        verbose(msg) {
            if (verboseMode) {
                write(`  ${RAIL}  ${DIM}${msg}${NC}`);
            }
        },
        hint(msg) {
            write(`  ${RAIL}`);
            write(`  ${RAIL}  ${BOLD}${msg}${NC}`);
            write(`  ${RAIL}`);
        },
        cmd(msg) {
            write(`  ${RAIL}    ${CYAN}$ ${msg}${NC}`);
        },
        async confirm(msg) {
            const rl = createInterface({ input: process.stdin, output: process.stdout });
            return new Promise((resolve) => {
                rl.question(`  ${RAIL}  ${YELLOW}?${NC} ${msg} (y/N) `, (answer) => {
                    rl.close();
                    resolve(answer.trim().toLowerCase() === 'y');
                });
            });
        },
        done(fromVersion, toVersion) {
            write(`  ${RAIL}`);
            write(`  ${GREEN}●${NC} ${GREEN}${BOLD}Done${NC}`);
            write('');
            write(`     ${GREEN}${BOLD}✅ Updated ${fromVersion} → ${toVersion}${NC}`);
            write('');
        },
        summary(result) {
            write(`  ${RAIL}`);
            if (result.success) {
                write(`  ${GREEN}●${NC} ${GREEN}${BOLD}Update complete${NC}`);
            }
            else {
                write(`  ${RED}●${NC} ${RED}${BOLD}Update failed at stage: ${result.stage}${NC}`);
                if (result.error) {
                    write(`  ${RAIL}  ${RED}${result.error}${NC}`);
                }
                if (result.rolledBack) {
                    write(`  ${RAIL}  ${YELLOW}⚠${NC} Rolled back to ${result.fromVersion}`);
                }
            }
            write('');
        },
    };
}
function write(msg) {
    process.stderr.write(msg + '\n');
}
