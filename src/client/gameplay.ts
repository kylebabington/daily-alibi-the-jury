
import type {
    PublicCase,
    AdvancedPublicCase,
} from '../shared/case';

import type {
    AnySavedVerdict,
    AnyVerdictRequest,
} from '../shared/api';

export type PlayerSelections = {
    suspectId: string;
    motiveId: string | null;
    evidenceIds: string[];
};

export function isAdvancedPublicCase(
    gameCase: PublicCase
): gameCase is AdvancedPublicCase {
    return gameCase.version === 2;
}

export function createEmptySelections(): PlayerSelections {
    return {
        suspectId: '',
        motiveId: null,
        evidenceIds: [],
    };
}

export function getRequiredEvidenceCount(
    gameCase: PublicCase
): number {
    return isAdvancedPublicCase(gameCase)
        ? gameCase.investigation.requiredEvidenceCount
        : 1;
}

export function requiresMotive(
    gameCase: PublicCase
): boolean {
    return (
        isAdvancedPublicCase(gameCase) &&
        gameCase.investigation.requiresMotive
    );
}

export function toggleEvidence(
    selected: string[],
    evidenceId: string,
    maximum: number
): string[] {
    if (selected.includes(evidenceId)) {
        return selected.filter(
            (id) => id !== evidenceId
        );
    }

    if (maximum === 1) {
        return [evidenceId];
    }

    if (selected.length >= maximum) {
        return selected;
    }

    return [...selected, evidenceId];
}

export function canSubmitVerdict(
    gameCase: PublicCase,
    selections: PlayerSelections
): boolean {
    const {
        suspectId,
        motiveId,
        evidenceIds,
    } = selections;

    if (
        !gameCase.suspects.some(
            (person) => person.id === suspectId
        )
    ) {
        return false;
    }

    if (isAdvancedPublicCase(gameCase)) {
        if (gameCase.investigation.requiresMotive) {
            if (
                !gameCase.motives.some(
                    (motive) => motive.id === motiveId
                )
            ) {
                return false;
            }
        } else if (motiveId !== null) {
            return false;
        }
    } else if (motiveId !== null) {
        return false;
    }

    if (
        evidenceIds.length !==
        getRequiredEvidenceCount(gameCase)
    ) {
        return false;
    }

    if (
        new Set(evidenceIds).size !==
        evidenceIds.length
    ) {
        return false;
    }

    return evidenceIds.every(
        (id) => gameCase.evidence.some(
            (item) => item.id === id
        )
    );
}

export function buildVerdictRequest(
    gameCase: PublicCase,
    selections: PlayerSelections
): AnyVerdictRequest {
    if (!canSubmitVerdict(gameCase, selections)) {
        throw new Error(
            'Complete all required selections.'
        );
    }

    if (isAdvancedPublicCase(gameCase)) {
        return {
            caseId: gameCase.id,
            suspectId: selections.suspectId,
            motiveId: selections.motiveId,
            evidenceIds: [...selections.evidenceIds],
        };
    }

    const evidenceId = selections.evidenceIds[0];

    if (!evidenceId) {
        throw new Error('Evidence selection is required.');
    }

    return {
        caseId: gameCase.id,
        suspectId: selections.suspectId,
        evidenceId,
    };
}

export function restoreSelections(
    verdict: AnySavedVerdict
): PlayerSelections {
    if (verdict.version === 2) {
        return {
            suspectId: verdict.suspectId,
            motiveId: verdict.motiveId,
            evidenceIds: [...verdict.evidenceIds],
        };
    }

    return {
        suspectId: verdict.suspectId,
        motiveId: null,
        evidenceIds: [verdict.evidenceId],
    };
}
