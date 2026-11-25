
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CASE_003 } from './case-003.ts';
import { validateAdvancedCase } from '../integrity.ts';
import {
    calculateMaximumScore,
    scoreAdvancedVerdict,
} from '../scoring.ts';

import {
    createSavedVerdict,
    readSavedVerdict,
} from '../submission.ts';

import { serializeVerdict } from '../verdict.ts';

import type {
    AdvancedVerdictRequest,
} from '../../../shared/investigation';

function perfectRequest(): AdvancedVerdictRequest {
    return {
        caseId: 'case-003',
        suspectId: 'marcus',
        motiveId: 'financial-fraud',
        evidenceIds: [
            'clock-calibration',
            'library-access',
            'audit-memorandum',
        ],
    };
}

void test('Case 003 passes integrity validation', () => {
    assert.doesNotThrow(() => {
        validateAdvancedCase(CASE_003);
    });
});

void test('Case 003 has the expected case ID', () => {
    assert.equal(CASE_003.public.id, 'case-003');
});

void test('Case 003 uses advanced case format', () => {
    assert.equal(CASE_003.public.version, 2);
});

void test('Case 003 contains six suspects', () => {
    assert.equal(CASE_003.public.suspects.length, 6);
});

void test('Case 003 contains sixteen evidence items', () => {
    assert.equal(CASE_003.public.evidence.length, 16);
});

void test('Case 003 contains six possible motives', () => {
    assert.equal(CASE_003.public.motives.length, 6);
});

void test('Case 003 requires three evidence selections', () => {
    assert.equal(
        CASE_003.public.investigation.requiredEvidenceCount,
        3
    );
});

void test('Case 003 requires a motive', () => {
    assert.equal(
        CASE_003.public.investigation.requiresMotive,
        true
    );
});

void test('Case 003 has a maximum score of 300', () => {
    assert.equal(
        calculateMaximumScore(CASE_003),
        300
    );

    assert.equal(CASE_003.public.maxScore, 300);
});

void test('Case 003 perfect verdict earns 300 points', () => {
    const result = scoreAdvancedVerdict(
        CASE_003,
        perfectRequest()
    );

    assert.deepEqual(result, {
        suspect: 100,
        motive: 50,
        evidence: 150,
        total: 300,
        maximum: 300,
    });
});

void test('Case 003 incorrect suspect loses 100 points', () => {
    const result = scoreAdvancedVerdict(
        CASE_003,
        {
            ...perfectRequest(),
            suspectId: 'julian',
        }
    );

    assert.equal(result.suspect, 0);
    assert.equal(result.total, 200);
});

void test('Case 003 incorrect motive loses 50 points', () => {
    const result = scoreAdvancedVerdict(
        CASE_003,
        {
            ...perfectRequest(),
            motiveId: 'inheritance',
        }
    );

    assert.equal(result.motive, 0);
    assert.equal(result.total, 250);
});

void test('Case 003 incorrect evidence loses 50 points', () => {
    const result = scoreAdvancedVerdict(
        CASE_003,
        {
            ...perfectRequest(),
            evidenceIds: [
                'clock-calibration',
                'library-access',
                'estate-will',
            ],
        }
    );

    assert.equal(result.evidence, 100);
    assert.equal(result.total, 250);
});

void test('Case 003 completely incorrect verdict earns zero', () => {
    const result = scoreAdvancedVerdict(
        CASE_003,
        {
            caseId: 'case-003',
            suspectId: 'eleanor',
            motiveId: 'inheritance',
            evidenceIds: [
                'estate-will',
                'billiard-room',
                'legal-draft',
            ],
        }
    );

    assert.equal(result.total, 0);
});

void test('Case 003 evidence order does not affect score', () => {
    const request = perfectRequest();

    const result = scoreAdvancedVerdict(
        CASE_003,
        {
            ...request,
            evidenceIds: [...request.evidenceIds].reverse(),
        }
    );

    assert.equal(result.total, 300);
});

void test('Case 003 rejects duplicate evidence', () => {
    assert.throws(() => {
        scoreAdvancedVerdict(CASE_003, {
            ...perfectRequest(),
            evidenceIds: [
                'clock-calibration',
                'clock-calibration',
                'audit-memorandum',
            ],
        });
    });
});

void test('Case 003 rejects insufficient evidence', () => {
    assert.throws(() => {
        scoreAdvancedVerdict(CASE_003, {
            ...perfectRequest(),
            evidenceIds: ['clock-calibration'],
        });
    });
});

void test('Case 003 rejects a missing motive', () => {
    assert.throws(() => {
        scoreAdvancedVerdict(CASE_003, {
            ...perfectRequest(),
            motiveId: null,
        });
    });
});

void test('Case 003 saves a version two verdict', () => {
    const verdict = createSavedVerdict(
        CASE_003,
        perfectRequest()
    );

    assert.equal(verdict.version, 2);
    assert.equal(verdict.score, 300);
});

void test('Case 003 saved verdict survives serialization', () => {
    const verdict = createSavedVerdict(
        CASE_003,
        perfectRequest(),
        new Date('2026-11-25T00:00:00.000Z')
    );

    const serialized = serializeVerdict(verdict);

    const restored = readSavedVerdict(
        CASE_003,
        serialized
    );

    assert.deepEqual(restored, verdict);
});
