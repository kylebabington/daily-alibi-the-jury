
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    createSavedVerdict,
    readSavedVerdict,
    SubmissionError,
} from './submission.ts';

import { serializeVerdict } from './verdict.ts';

import { CASE_001 } from './cases/case-001.ts';
import { CASE_002 } from './cases/case-002.ts';

import {
    ADVANCED_TEST_CASE,
} from './fixtures/advanced-case.ts';

const TEST_DATE = new Date(
    '2026-11-24T12:00:00.000Z'
);

function legacyRequest() {
    return {
        caseId: 'case-001',
        suspectId: 'nina',
        evidenceId: 'key-cabinet',
    };
}

function advancedRequest() {
    return {
        caseId: 'test-advanced',
        suspectId: 'suspect-a',
        motiveId: 'financial',
        evidenceIds: [
            'clue-a',
            'clue-b',
            'clue-c',
        ],
    };
}

void test('creates a perfect legacy verdict', () => {
    const verdict = createSavedVerdict(
        CASE_001,
        legacyRequest(),
        TEST_DATE
    );

    assert.equal(verdict.version, 1);
    assert.equal(verdict.score, 150);
    assert.equal(verdict.caseId, 'case-001');
});

void test('creates a perfect Case 002 verdict', () => {
    const verdict = createSavedVerdict(
        CASE_002,
        {
            caseId: 'case-002',
            suspectId: 'iris',
            evidenceId: 'gallery-access',
        },
        TEST_DATE
    );

    assert.equal(verdict.version, 1);
    assert.equal(verdict.score, 150);
});

void test('creates a perfect advanced verdict', () => {
    const verdict = createSavedVerdict(
        ADVANCED_TEST_CASE,
        advancedRequest(),
        TEST_DATE
    );

    assert.equal(verdict.version, 2);
    assert.equal(verdict.score, 300);
});

void test('awards partial credit for legacy verdicts', () => {
    const verdict = createSavedVerdict(
        CASE_001,
        {
            ...legacyRequest(),
            evidenceId: 'key-register',
        },
        TEST_DATE
    );

    assert.equal(verdict.score, 100);
});

void test('awards partial credit for advanced verdicts', () => {
    const verdict = createSavedVerdict(
        ADVANCED_TEST_CASE,
        {
            ...advancedRequest(),
            motiveId: 'revenge',
        },
        TEST_DATE
    );

    assert.equal(verdict.score, 250);
});

void test('rejects a null submission', () => {
    assert.throws(
        () => createSavedVerdict(CASE_001, null),
        {
            name: 'SubmissionError',
            status: 400,
        }
    );
});

void test('rejects a missing case ID', () => {
    assert.throws(
        () => createSavedVerdict(CASE_001, {}),
        {
            name: 'SubmissionError',
            status: 400,
        }
    );
});

void test('rejects a stale case submission', () => {
    assert.throws(
        () => createSavedVerdict(
            CASE_002,
            legacyRequest()
        ),
        {
            name: 'SubmissionError',
            status: 409,
        }
    );
});

void test('rejects an invalid legacy suspect', () => {
    assert.throws(
        () => createSavedVerdict(
            CASE_001,
            {
                ...legacyRequest(),
                suspectId: 'unknown',
            }
        ),
        {
            name: 'SubmissionError',
            status: 400,
        }
    );
});

void test('rejects invalid legacy evidence', () => {
    assert.throws(
        () => createSavedVerdict(
            CASE_001,
            {
                ...legacyRequest(),
                evidenceId: 'unknown',
            }
        ),
        {
            name: 'SubmissionError',
            status: 400,
        }
    );
});

void test('rejects malformed advanced submissions', () => {
    assert.throws(
        () => createSavedVerdict(
            ADVANCED_TEST_CASE,
            {
                ...advancedRequest(),
                evidenceIds: 'clue-a',
            }
        ),
        {
            name: 'SubmissionError',
            status: 400,
        }
    );
});

void test('rejects unknown advanced suspects', () => {
    assert.throws(
        () => createSavedVerdict(
            ADVANCED_TEST_CASE,
            {
                ...advancedRequest(),
                suspectId: 'unknown',
            }
        ),
        SubmissionError
    );
});

void test('rejects unknown advanced motives', () => {
    assert.throws(
        () => createSavedVerdict(
            ADVANCED_TEST_CASE,
            {
                ...advancedRequest(),
                motiveId: 'unknown',
            }
        ),
        {
            name: 'SubmissionError',
            status: 400,
        }
    );
});

void test('rejects incorrect evidence counts', () => {
    assert.throws(
        () => createSavedVerdict(
            ADVANCED_TEST_CASE,
            {
                ...advancedRequest(),
                evidenceIds: ['clue-a'],
            }
        ),
        {
            name: 'SubmissionError',
            status: 400,
        }
    );
});

void test('ignores client-supplied scores', () => {
    const verdict = createSavedVerdict(
        ADVANCED_TEST_CASE,
        {
            ...advancedRequest(),
            score: 999999,
        },
        TEST_DATE
    );

    assert.equal(verdict.score, 300);
});

void test('ignores client-supplied timestamps', () => {
    const verdict = createSavedVerdict(
        CASE_001,
        {
            ...legacyRequest(),
            submittedAt: '2000-01-01T00:00:00.000Z',
        },
        TEST_DATE
    );

    assert.equal(
        verdict.submittedAt,
        TEST_DATE.toISOString()
    );
});

void test('restores a stored legacy verdict', () => {
    const verdict = createSavedVerdict(
        CASE_001,
        legacyRequest(),
        TEST_DATE
    );

    assert.deepEqual(
        readSavedVerdict(
            CASE_001,
            serializeVerdict(verdict)
        ),
        verdict
    );
});

void test('restores an unversioned legacy verdict', () => {
    const raw = JSON.stringify({
        ...legacyRequest(),
        score: 150,
        submittedAt: TEST_DATE.toISOString(),
    });

    const verdict = readSavedVerdict(CASE_001, raw);

    assert.equal(verdict.version, 1);
    assert.equal(verdict.score, 150);
});

void test('restores a stored advanced verdict', () => {
    const verdict = createSavedVerdict(
        ADVANCED_TEST_CASE,
        advancedRequest(),
        TEST_DATE
    );

    assert.deepEqual(
        readSavedVerdict(
            ADVANCED_TEST_CASE,
            serializeVerdict(verdict)
        ),
        verdict
    );
});

void test('rejects stored verdicts from another case', () => {
    const verdict = createSavedVerdict(
        CASE_001,
        legacyRequest(),
        TEST_DATE
    );

    assert.throws(
        () => readSavedVerdict(
            CASE_002,
            serializeVerdict(verdict)
        ),
        /Stored verdict belongs to a different case/
    );
});

void test('rejects manipulated stored legacy scores', () => {
    const verdict = createSavedVerdict(
        CASE_001,
        legacyRequest(),
        TEST_DATE
    );

    verdict.score = 50;

    assert.throws(
        () => readSavedVerdict(
            CASE_001,
            serializeVerdict(verdict)
        ),
        /Stored verdict score does not match case/
    );
});

void test('rejects manipulated stored advanced scores', () => {
    const verdict = createSavedVerdict(
        ADVANCED_TEST_CASE,
        advancedRequest(),
        TEST_DATE
    );

    if (verdict.version !== 2) {
        throw new Error('Expected advanced verdict.');
    }

    verdict.breakdown.suspect = 0;
    verdict.breakdown.total = 200;
    verdict.score = 200;

    assert.throws(
        () => readSavedVerdict(
            ADVANCED_TEST_CASE,
            serializeVerdict(verdict)
        ),
        /Stored verdict score does not match case/
    );
});

void test('rejects mismatched stored verdict versions', () => {
    const raw = JSON.stringify({
        version: 1,
        caseId: ADVANCED_TEST_CASE.public.id,
        suspectId: 'suspect-a',
        evidenceId: 'clue-a',
        score: 150,
        submittedAt: TEST_DATE.toISOString(),
    });

    assert.throws(
        () => readSavedVerdict(
            ADVANCED_TEST_CASE,
            raw
        ),
        /Stored verdict version does not match case/
    );
});

void test('rejects invalid stored suspect selections', () => {
    const raw = JSON.stringify({
        ...legacyRequest(),
        suspectId: 'unknown',
        score: 150,
        submittedAt: TEST_DATE.toISOString(),
    });

    assert.throws(
        () => readSavedVerdict(CASE_001, raw),
        /Stored verdict contains invalid selections/
    );
});
