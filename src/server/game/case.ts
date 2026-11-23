
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
    'waiting-hall',
    'key-cabinet',
] as const;

const CORRECT_SUSPECT = 'nina';
const DECISIVE_EVIDENCE = 'key-cabinet';

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
