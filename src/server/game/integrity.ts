
import type { AdvancedPrivateCase } from './case';

import { calculateMaximumScore } from './scoring.ts';
import { isValidIdentifier } from './validation.ts';

function validateIdentifiers(
    items: readonly { id: string }[],
    label: string
): void {
    const ids = items.map((item) => item.id);

    if (!ids.every(isValidIdentifier)) {
        throw new Error(`Invalid ${label} identifier.`);
    }

    if (new Set(ids).size !== ids.length) {
        throw new Error(`Duplicate ${label} identifiers.`);
    }
}

export function validateAdvancedCase(
    gameCase: AdvancedPrivateCase
): void {
    const data = gameCase.public;
    const solution = gameCase.solution;
    const rules = data.investigation;
    const scoring = data.scoring;

    if (data.version !== 2) {
        throw new Error('Invalid case version.');
    }

    if (!isValidIdentifier(data.id)) {
        throw new Error('Invalid case identifier.');
    }

    if (
        !Number.isSafeInteger(data.number) ||
        data.number < 1
    ) {
        throw new Error('Invalid case number.');
    }

    if (
        !data.title.trim() ||
        !data.location.trim() ||
        !data.time.trim()
    ) {
        throw new Error('Missing case information.');
    }

    if (
        data.introduction.length === 0 ||
        data.introduction.some((text) => !text.trim())
    ) {
        throw new Error('Invalid case introduction.');
    }

    if (data.suspects.length < 2) {
        throw new Error('Not enough suspects.');
    }

    validateIdentifiers(data.suspects, 'suspect');
    validateIdentifiers(data.evidence, 'evidence');
    validateIdentifiers(data.motives, 'motive');

    if (
        !['rookie', 'detective', 'inspector', 'mastermind']
            .includes(rules.difficulty)
    ) {
        throw new Error('Invalid difficulty.');
    }

    if (
        !Number.isFinite(rules.estimatedMinutes) ||
        rules.estimatedMinutes <= 0
    ) {
        throw new Error('Invalid estimated investigation time.');
    }

    if (
        !Number.isSafeInteger(rules.requiredEvidenceCount) ||
        rules.requiredEvidenceCount < 1 ||
        rules.requiredEvidenceCount > 24 ||
        rules.requiredEvidenceCount >= data.evidence.length
    ) {
        throw new Error('Invalid required evidence count.');
    }

    if (
        !data.suspects.some(
            (suspect) => suspect.id === solution.suspectId
        )
    ) {
        throw new Error('Solution references unknown suspect.');
    }

    if (rules.requiresMotive) {
        if (data.motives.length < 2) {
            throw new Error('Not enough motives.');
        }

        if (
            !data.motives.some(
                (motive) => motive.id === solution.motiveId
            )
        ) {
            throw new Error('Solution references unknown motive.');
        }
    } else {
        if (solution.motiveId !== null) {
            throw new Error('Unexpected solution motive.');
        }

        if (data.motives.length !== 0) {
            throw new Error('Unexpected motive options.');
        }
    }

    if (
        solution.evidenceIds.length !==
        rules.requiredEvidenceCount
    ) {
        throw new Error('Incorrect solution evidence count.');
    }

    if (
        new Set(solution.evidenceIds).size !==
        solution.evidenceIds.length
    ) {
        throw new Error('Duplicate solution evidence.');
    }

    for (const evidenceId of solution.evidenceIds) {
        if (
            !data.evidence.some(
                (evidence) => evidence.id === evidenceId
            )
        ) {
            throw new Error('Solution references unknown evidence.');
        }
    }

    const pointValues = [
        scoring.suspectPoints,
        scoring.motivePoints,
        scoring.evidencePointsPerItem,
    ];

    if (
        pointValues.some(
            (points) =>
                !Number.isSafeInteger(points) || points < 0
        )
    ) {
        throw new Error('Invalid scoring values.');
    }

    if (
        scoring.suspectPoints === 0 ||
        scoring.evidencePointsPerItem === 0 ||
        (rules.requiresMotive && scoring.motivePoints === 0)
    ) {
        throw new Error('Required selections must award points.');
    }

    const maximum = calculateMaximumScore(gameCase);

    if (
        !Number.isSafeInteger(maximum) ||
        maximum <= 0 ||
        data.maxScore !== maximum
    ) {
        throw new Error('Maximum score mismatch.');
    }

    if (
        solution.explanation.length === 0 ||
        solution.explanation.some((text) => !text.trim())
    ) {
        throw new Error('Missing solution explanation.');
    }
}
