
import type { PrivateCase } from './case';

import { CASE_001 } from './cases/case-001';
import { CASE_002 } from './cases/case-002';

export const CASES: readonly PrivateCase[] = [
    CASE_001,
    CASE_002,
];

export function getCaseById(
    caseId: string
): PrivateCase | undefined {
    return CASES.find((item) => item.public.id === caseId);
}

export function getCaseCount(): number {
    return CASES.length;
}
