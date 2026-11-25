
import type {
    AnyPrivateCase,
    PrivateCase,
} from './case';

import {
    isAdvancedCase,
    isLegacyCase,
} from './case';

import { validateAdvancedCase } from './integrity';

import { CASE_001 } from './cases/case-001';
import { CASE_002 } from './cases/case-002';
import { CASE_003 } from './cases/case-003';

export const CASES: readonly AnyPrivateCase[] = [
    CASE_001,
    CASE_002,
    CASE_003,
];

export function validateCaseRegistry(
    cases: readonly AnyPrivateCase[]
): void {
    if (cases.length === 0) {
        throw new Error('No cases are registered.');
    }

    const ids = new Set<string>();
    const numbers = new Set<number>();

    for (const gameCase of cases) {
        const { id, number } = gameCase.public;

        if (ids.has(id)) {
            throw new Error(`Duplicate case ID: ${id}`);
        }

        if (numbers.has(number)) {
            throw new Error(`Duplicate case number: ${number}`);
        }

        ids.add(id);
        numbers.add(number);

        if (isAdvancedCase(gameCase)) {
            validateAdvancedCase(gameCase);
        } else if (!isLegacyCase(gameCase)) {
            throw new Error(`Unsupported case version: ${id}`);
        }
    }
}

validateCaseRegistry(CASES);

export function getCaseById(
    caseId: string
): AnyPrivateCase | undefined {
    return CASES.find(
        (item) => item.public.id === caseId
    );
}

export function getCaseCount(): number {
    return CASES.length;
}

export const LEGACY_CASES: readonly PrivateCase[] =
    CASES.filter(isLegacyCase);
