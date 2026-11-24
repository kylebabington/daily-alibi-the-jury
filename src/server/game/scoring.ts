
import type { AdvancedPrivateCase } from './case';

import type {
    AdvancedVerdictRequest,
    ScoreBreakdown,
} from '../../shared/investigation';

export function calculateMaximumScore(
    gameCase: AdvancedPrivateCase
): number {
    const { investigation, scoring } = gameCase.public;

    return (
        scoring.suspectPoints +
        (investigation.requiresMotive ? scoring.motivePoints : 0) +
        investigation.requiredEvidenceCount *
        scoring.evidencePointsPerItem
    );
}

export function scoreAdvancedVerdict(
    gameCase: AdvancedPrivateCase,
    verdict: AdvancedVerdictRequest
): ScoreBreakdown {
    const { investigation, scoring } = gameCase.public;
    const { solution } = gameCase;

    if (verdict.caseId !== gameCase.public.id) {
        throw new Error('Incorrect case ID.');
    }

    if (
        !gameCase.public.suspects.some(
            (person) => person.id === verdict.suspectId
        )
    ) {
        throw new Error('Invalid suspect selection.');
    }

    if (investigation.requiresMotive) {
        if (
            !gameCase.public.motives.some(
                (motive) => motive.id === verdict.motiveId
            )
        ) {
            throw new Error('Invalid motive selection.');
        }
    } else if (verdict.motiveId !== null) {
        throw new Error('This case does not require a motive.');
    }

    if (
        verdict.evidenceIds.length !==
        investigation.requiredEvidenceCount
    ) {
        throw new Error('Incorrect number of evidence selections.');
    }

    const selectedEvidence = new Set(verdict.evidenceIds);

    if (selectedEvidence.size !== verdict.evidenceIds.length) {
        throw new Error('Duplicate evidence selections.');
    }

    const validEvidence = new Set(
        gameCase.public.evidence.map((item) => item.id)
    );

    for (const evidenceId of selectedEvidence) {
        if (!validEvidence.has(evidenceId)) {
            throw new Error('Invalid evidence selection.');
        }
    }

    const correctEvidence = new Set(solution.evidenceIds);

    const suspect =
        verdict.suspectId === solution.suspectId
            ? scoring.suspectPoints
            : 0;

    const motive =
        investigation.requiresMotive &&
            verdict.motiveId === solution.motiveId
            ? scoring.motivePoints
            : 0;

    let evidence = 0;

    for (const evidenceId of selectedEvidence) {
        if (correctEvidence.has(evidenceId)) {
            evidence += scoring.evidencePointsPerItem;
        }
    }

    const total = suspect + motive + evidence;
    const maximum = calculateMaximumScore(gameCase);

    return {
        suspect,
        motive,
        evidence,
        total,
        maximum,
    };
}
