/**
 * Resolve the target version for an update.
 * Reads tags from the git remote and picks the latest semver tag,
 * or accepts an explicit --version flag.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EXIT_CODES, UpdateError } from './types.js';
/**
 * Resolve the target update version.
 * If `explicitVersion` is given, validates it exists as a remote tag.
 * Otherwise, finds the latest semver tag via `git ls-remote --tags`.
 */
export function resolveVersion(cwd, explicitVersion) {
    const pkgPath = join(cwd, 'package.json');
    let current;
    try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        current = pkg.version;
    }
    catch {
        throw new UpdateError(`Cannot read ${pkgPath}`, 'resolve', EXIT_CODES.VERSION_RESOLUTION);
    }
    let tag;
    let version;
    if (explicitVersion) {
        tag = explicitVersion.startsWith('v') ? explicitVersion : `v${explicitVersion}`;
        version = tag.slice(1);
        // Validate tag exists on remote/local
        const available = fetchRemoteTags(cwd);
        if (!available.includes(version)) {
            throw new UpdateError(`Tag ${tag} not found (available: ${available.map(v => `v${v}`).join(', ') || 'none'})`, 'resolve', EXIT_CODES.VERSION_RESOLUTION);
        }
    }
    else {
        const tags = fetchRemoteTags(cwd);
        if (tags.length === 0) {
            throw new UpdateError('No semver tags found on remote', 'resolve', EXIT_CODES.VERSION_RESOLUTION);
        }
        version = tags[tags.length - 1];
        tag = `v${version}`;
    }
    return {
        tag,
        version,
        current,
        isUpToDate: version === current,
    };
}
/**
 * Fetch all semver tags from the remote, sorted ascending.
 * Falls back to local tags if remote returns nothing (e.g. tags not pushed).
 */
function fetchRemoteTags(cwd) {
    // Try remote first, fall back to local tags on failure or empty result
    let versions = [];
    try {
        versions = fetchTagsFromSource(cwd, 'git ls-remote --tags origin');
    }
    catch {
        // Remote unreachable — fall through to local
    }
    if (versions.length === 0) {
        versions = fetchTagsFromSource(cwd, 'git tag -l');
    }
    return versions;
}
function fetchTagsFromSource(cwd, command) {
    let output;
    try {
        output = execSync(command, { cwd, stdio: 'pipe' }).toString();
    }
    catch {
        throw new UpdateError(`Failed to fetch tags (${command})`, 'resolve', EXIT_CODES.VERSION_RESOLUTION);
    }
    // Match only clean semver (no prerelease suffix like -beta.1)
    const semverRegex = /v?(\d+\.\d+\.\d+)$/;
    const versions = [];
    for (const line of output.split('\n')) {
        const match = semverRegex.exec(line.trim());
        if (match) {
            if (!versions.includes(match[1])) {
                versions.push(match[1]);
            }
        }
    }
    return versions.sort(compareSemver);
}
function compareSemver(a, b) {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        if (pa[i] !== pb[i])
            return pa[i] - pb[i];
    }
    return 0;
}
