

import type { CaseSolution } from '../../shared/api';

import type {
    LegacyPublicCase,
    AdvancedPublicCase,
} from '../../shared/case';

import type {
    AdvancedCaseSolution,
} from '../../shared/investigation';

import { CASE_001 } from './cases/case-001';

export type PrivateCase = {
    public: LegacyPublicCase;
    solution: CaseSolution;
};

export type AdvancedPrivateCase = {
    public: AdvancedPublicCase;
    solution: AdvancedCaseSolution;
};

export type AnyPrivateCase =
    | PrivateCase
    | AdvancedPrivateCase;


// Generic validation

export function isCaseSuspect(
    gameCase: PrivateCase,
    value: unknown
): value is string {
    return (
        typeof value === 'string' &&
        gameCase.public.suspects.some(
            (suspect) => suspect.id === value
        )
    );
}

export function isCaseEvidence(
    gameCase: PrivateCase,
    value: unknown
): value is string {
    return (
        typeof value === 'string' &&
        gameCase.public.evidence.some(
            (evidence) => evidence.id === value
        )
    );
}

// Generic scoring

export function scoreCase(
    gameCase: PrivateCase,
    suspectId: string,
    evidenceId: string
): number {
    const suspectPoints =
        suspectId === gameCase.solution.suspectId ? 100 : 0;

    const evidencePoints =
        evidenceId === gameCase.solution.evidenceId ? 50 : 0;

    return suspectPoints + evidencePoints;
}

// Temporary compatibility exports

export const CASE_ID = CASE_001.public.id;

export const CASE_SOLUTION = CASE_001.solution;

export const VALID_SUSPECT_IDS =
    CASE_001.public.suspects.map((suspect) => suspect.id);

export const VALID_EVIDENCE_IDS =
    CASE_001.public.evidence.map((evidence) => evidence.id);

export function isValidSuspect(
    value: unknown
): value is string {
    return isCaseSuspect(CASE_001, value);
}

export function isValidEvidence(
    value: unknown
): value is string {
    return isCaseEvidence(CASE_001, value);
}

export function calculateScore(
    suspectId: string,
    evidenceId: string
): number {
    return scoreCase(CASE_001, suspectId, evidenceId);
}

export function isAdvancedCase(
    gameCase: AnyPrivateCase
): gameCase is AdvancedPrivateCase {
    return gameCase.public.version === 2;
}

export function isLegacyCase(
    gameCase: AnyPrivateCase
): gameCase is PrivateCase {
    return (
        gameCase.public.version === undefined ||
        gameCase.public.version === 1
    );
}
