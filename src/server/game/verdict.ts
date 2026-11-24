import {
    isRecord,
    isValidIdentifier,
    isAdvancedVerdictRequest,
} from './validation.ts';

import type {
    AnySavedVerdict,
} from '../../shared/api';

import type {
    AdvancedSavedVerdict,
    AdvancedVerdictRequest,
} from '../../shared/investigation';

import type { AdvancedPrivateCase } from './case';

import { scoreAdvancedVerdict } from './scoring.ts';

export function createAdvancedSavedVerdict(
    gameCase: AdvancedPrivateCase,
    request: AdvancedVerdictRequest,
    now: Date = new Date()
): AdvancedSavedVerdict {
    const breakdown = scoreAdvancedVerdict(
        gameCase,
        request
    );

    return {
        version: 2,
        caseId: gameCase.public.id,
        suspectId: request.suspectId,
        motiveId: request.motiveId,
        evidenceIds: [...request.evidenceIds],
        score: breakdown.total,
        breakdown,
        submittedAt: now.toISOString(),
    };
}

export function isAdvancedSavedVerdict(
    verdict: AnySavedVerdict
): verdict is AdvancedSavedVerdict {
    return verdict.version === 2;
}

export function serializeVerdict(
    verdict: AnySavedVerdict
): string {
    return JSON.stringify(verdict);
}


function isNonNegativeInteger(
    value: unknown
): value is number {
    return (
        typeof value === 'number' &&
        Number.isSafeInteger(value) &&
        value >= 0
    );
}

function isValidTimestamp(
    value: unknown
): value is string {
    if (typeof value !== 'string') {
        return false;
    }

    const timestamp = Date.parse(value);

    return (
        Number.isFinite(timestamp) &&
        new Date(timestamp).toISOString() === value
    );
}

export function deserializeVerdict(
    raw: string
): AnySavedVerdict {
    const value: unknown = JSON.parse(raw);

    if (!isRecord(value)) {
        throw new Error('Invalid stored verdict.');
    }

    if (
        !isValidIdentifier(value.caseId) ||
        !isValidIdentifier(value.suspectId) ||
        !isNonNegativeInteger(value.score) ||
        !isValidTimestamp(value.submittedAt)
    ) {
        throw new Error('Invalid stored verdict fields.');
    }

    if (value.version === 2) {
        if (!isAdvancedVerdictRequest(value)) {
            throw new Error('Invalid advanced verdict selections.');
        }

        const breakdown = value.breakdown;

        if (
            !isRecord(breakdown) ||
            !isNonNegativeInteger(breakdown.suspect) ||
            !isNonNegativeInteger(breakdown.motive) ||
            !isNonNegativeInteger(breakdown.evidence) ||
            !isNonNegativeInteger(breakdown.total) ||
            !isNonNegativeInteger(breakdown.maximum)
        ) {
            throw new Error('Invalid score breakdown.');
        }

        const calculatedTotal =
            breakdown.suspect +
            breakdown.motive +
            breakdown.evidence;

        if (
            !Number.isSafeInteger(calculatedTotal) ||
            calculatedTotal !== breakdown.total ||
            breakdown.total !== value.score ||
            breakdown.maximum === 0 ||
            breakdown.total > breakdown.maximum
        ) {
            throw new Error('Inconsistent stored score.');
        }

        return {
            version: 2,
            caseId: value.caseId,
            suspectId: value.suspectId,
            motiveId: value.motiveId,
            evidenceIds: [...value.evidenceIds],
            score: value.score,
            breakdown: {
                suspect: breakdown.suspect,
                motive: breakdown.motive,
                evidence: breakdown.evidence,
                total: breakdown.total,
                maximum: breakdown.maximum,
            },
            submittedAt: value.submittedAt,
        };
    }

    if (
        value.version !== undefined &&
        value.version !== 1
    ) {
        throw new Error('Unsupported verdict version.');
    }

    if (
        !isValidIdentifier(value.evidenceId) ||
        ![0, 50, 100, 150].includes(value.score)
    ) {
        throw new Error('Invalid legacy verdict.');
    }

    return {
        version: 1,
        caseId: value.caseId,
        suspectId: value.suspectId,
        evidenceId: value.evidenceId,
        score: value.score,
        submittedAt: value.submittedAt,
    };
}

