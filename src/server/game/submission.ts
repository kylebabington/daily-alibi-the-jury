
import type {
    AnySavedVerdict,
    SavedVerdict,
} from '../../shared/api';

import type { AnyPrivateCase } from './case.ts';

import {
    isAdvancedCase,
    isCaseSuspect,
    isCaseEvidence,
    scoreCase,
} from './case.ts';

import {
    isRecord,
    isAdvancedVerdictRequest,
} from './validation.ts';

import {
    createAdvancedSavedVerdict,
    deserializeVerdict,
} from './verdict.ts';

export class SubmissionError extends Error {
    public readonly status: 400 | 409;

    constructor(
        message: string,
        status: 400 | 409
    ) {
        super(message);
        this.name = 'SubmissionError';
        this.status = status;
    }
}
export function createSavedVerdict(
    gameCase: AnyPrivateCase,
    body: unknown,
    now: Date = new Date()
): AnySavedVerdict {
    if (
        !isRecord(body) ||
        typeof body.caseId !== 'string'
    ) {
        throw new SubmissionError(
            'Invalid verdict request.',
            400
        );
    }

    if (body.caseId !== gameCase.public.id) {
        throw new SubmissionError(
            'The daily case has changed. Reload to investigate the new case.',
            409
        );
    }

    if (isAdvancedCase(gameCase)) {
        if (!isAdvancedVerdictRequest(body)) {
            throw new SubmissionError(
                'Invalid advanced verdict request.',
                400
            );
        }

        try {
            return createAdvancedSavedVerdict(
                gameCase,
                body,
                now
            );
        } catch (error) {
            if (error instanceof Error) {
                throw new SubmissionError(
                    error.message,
                    400
                );
            }

            throw error;
        }
    }

    if (
        !isCaseSuspect(gameCase, body.suspectId) ||
        !isCaseEvidence(gameCase, body.evidenceId)
    ) {
        throw new SubmissionError(
            'Invalid suspect or evidence selection.',
            400
        );
    }

    const verdict: SavedVerdict = {
        version: 1,
        caseId: gameCase.public.id,
        suspectId: body.suspectId,
        evidenceId: body.evidenceId,
        score: scoreCase(
            gameCase,
            body.suspectId,
            body.evidenceId
        ),
        submittedAt: now.toISOString(),
    };

    return verdict;
}

export function readSavedVerdict(
    gameCase: AnyPrivateCase,
    raw: string
): AnySavedVerdict {
    const verdict = deserializeVerdict(raw);

    if (verdict.caseId !== gameCase.public.id) {
        throw new Error(
            'Stored verdict belongs to a different case.'
        );
    }

    if (isAdvancedCase(gameCase)) {
        if (verdict.version !== 2) {
            throw new Error(
                'Stored verdict version does not match case.'
            );
        }

        const expected = createAdvancedSavedVerdict(
            gameCase,
            verdict,
            new Date(verdict.submittedAt)
        );

        if (
            expected.score !== verdict.score ||
            expected.breakdown.suspect !==
            verdict.breakdown.suspect ||
            expected.breakdown.motive !==
            verdict.breakdown.motive ||
            expected.breakdown.evidence !==
            verdict.breakdown.evidence ||
            expected.breakdown.maximum !==
            verdict.breakdown.maximum
        ) {
            throw new Error(
                'Stored verdict score does not match case.'
            );
        }

        return verdict;
    }

    if (verdict.version === 2) {
        throw new Error(
            'Stored verdict version does not match case.'
        );
    }

    if (
        !isCaseSuspect(gameCase, verdict.suspectId) ||
        !isCaseEvidence(gameCase, verdict.evidenceId)
    ) {
        throw new Error(
            'Stored verdict contains invalid selections.'
        );
    }

    const expectedScore = scoreCase(
        gameCase,
        verdict.suspectId,
        verdict.evidenceId
    );

    if (expectedScore !== verdict.score) {
        throw new Error(
            'Stored verdict score does not match case.'
        );
    }

    return verdict;
}
