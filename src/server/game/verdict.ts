
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
