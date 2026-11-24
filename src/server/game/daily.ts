
import type { PrivateCase } from './case';
import { LEGACY_CASES as CASES } from './registry';

const DAY_MS = 24 * 60 * 60 * 1000;

const LAUNCH_DATE = Date.UTC(2026, 11, 8);

// Keep Case 001 active during development.
const DEVELOPMENT_MODE = true;
const DEVELOPMENT_CASE_ID = 'case-002';

export function getUtcDay(now: Date = new Date()): number {
    return Math.floor(now.getTime() / DAY_MS);
}

export function getDailyCase(
    now: Date = new Date()
): PrivateCase {
    const firstCase = CASES[0];

    if (!firstCase) {
        throw new Error('No cases are registered.');
    }

    if (DEVELOPMENT_MODE) {
        const developmentCase = CASES.find(
            (item) => item.public.id === DEVELOPMENT_CASE_ID
        );

        if (!developmentCase) {
            throw new Error(
                `Development case not found: ${DEVELOPMENT_CASE_ID}`
            );
        }

        return developmentCase;
    }

    const launchDay = Math.floor(LAUNCH_DATE / DAY_MS);
    const currentDay = getUtcDay(now);

    const daysSinceLaunch = Math.max(
        0,
        currentDay - launchDay
    );

    const caseIndex = Math.min(
        daysSinceLaunch,
        CASES.length - 1
    );

    return CASES[caseIndex] ?? firstCase;
}

export function getNextReset(
    now: Date = new Date()
): string {
    const nextDay = getUtcDay(now) + 1;

    return new Date(nextDay * DAY_MS).toISOString();
}

export function getVerdictsKey(caseId: string): string {
    return `daily-alibi:${caseId}:verdicts`;
}
