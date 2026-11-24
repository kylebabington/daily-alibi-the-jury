import type { CaseSolution } from '../../shared/api';
export const CASE_ID = 'case-001';

export const VALID_SUSPECT_IDS = [
    'arthur',
    'mara',
    'elias',
    'nina',
] as const;

export const VALID_EVIDENCE_IDS = [
    'key-register',
    'departure-log',
    'platform-camera',
    'signal-repair',
    'hall-camera',
    'key-cabinet',
] as const;

const CORRECT_SUSPECT = 'nina';
const DECISIVE_EVIDENCE = 'key-cabinet';

export const CASE_SOLUTION: CaseSolution = {
    suspectId: CORRECT_SUSPECT,
    evidenceId: DECISIVE_EVIDENCE,
    explanation: [
        'Nina Brooks stole the watch. She took the emergency office key at 11:39 PM and returned it at 11:44 PM. The security recording directly contradicts her claim that she remained in the waiting hall.',
        'Arthur, Mara, and Elias were continuously recorded elsewhere during the theft window.',
    ],
};

export function isValidSuspect(value: unknown): value is string {
    return (
        typeof value === 'string' &&
        VALID_SUSPECT_IDS.some((id) => id === value)
    );
}

export function isValidEvidence(value: unknown): value is string {
    return (
        typeof value === 'string' &&
        VALID_EVIDENCE_IDS.some((id) => id === value)
    );
}

export function calculateScore(
    suspectId: string,
    evidenceId: string
): number {
    const suspectPoints = suspectId === CORRECT_SUSPECT ? 100 : 0;
    const evidencePoints = evidenceId === DECISIVE_EVIDENCE ? 50 : 0;

    return suspectPoints + evidencePoints;
}
