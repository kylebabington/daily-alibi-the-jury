
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    createAdvancedSavedVerdict,
    isAdvancedSavedVerdict,
    serializeVerdict,
    deserializeVerdict,
} from './verdict.ts';

import {
    ADVANCED_TEST_CASE,
} from './fixtures/advanced-case.ts';

import type {
    AdvancedVerdictRequest,
} from '../../shared/investigation';

import type { SavedVerdict } from '../../shared/api';

function createRequest(): AdvancedVerdictRequest {
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

function createLegacyVerdict(): SavedVerdict {
    return {
        caseId: 'case-001',
        suspectId: 'nina',
        evidenceId: 'key-cabinet',
        score: 150,
        submittedAt: '2026-11-24T12:00:00.000Z',
    };
}

void test('creates a version 2 verdict', () => {
    const verdict = createAdvancedSavedVerdict(
        ADVANCED_TEST_CASE,
        createRequest()
    );

    assert.equal(verdict.version, 2);
    assert.equal(verdict.caseId, 'test-advanced');
});

void test('stores the server-calculated score', () => {
    const verdict = createAdvancedSavedVerdict(
        ADVANCED_TEST_CASE,
        createRequest()
    );

    assert.equal(verdict.score, 300);
    assert.equal(verdict.breakdown.total, 300);
    assert.equal(verdict.breakdown.maximum, 300);
});

void test('stores partial credit correctly', () => {
    const request = createRequest();

    request.motiveId = 'revenge';

    const verdict = createAdvancedSavedVerdict(
        ADVANCED_TEST_CASE,
        request
    );

    assert.equal(verdict.score, 250);
    assert.equal(verdict.breakdown.motive, 0);
});

void test('stores the server submission timestamp', () => {
    const now = new Date(
        '2026-11-24T12:00:00.000Z'
    );

    const verdict = createAdvancedSavedVerdict(
        ADVANCED_TEST_CASE,
        createRequest(),
        now
    );

    assert.equal(
        verdict.submittedAt,
        '2026-11-24T12:00:00.000Z'
    );
});

void test('copies submitted evidence selections', () => {
    const request = createRequest();

    const verdict = createAdvancedSavedVerdict(
        ADVANCED_TEST_CASE,
        request
    );

    request.evidenceIds.push('clue-d');

    assert.equal(verdict.evidenceIds.length, 3);
});

void test('recognizes an advanced saved verdict', () => {
    const verdict = createAdvancedSavedVerdict(
        ADVANCED_TEST_CASE,
        createRequest()
    );

    assert.equal(
        isAdvancedSavedVerdict(verdict),
        true
    );
});

void test('recognizes an unversioned legacy verdict', () => {
    assert.equal(
        isAdvancedSavedVerdict(createLegacyVerdict()),
        false
    );
});

void test('recognizes an explicit version 1 verdict', () => {
    const verdict = createLegacyVerdict();

    verdict.version = 1;

    assert.equal(
        isAdvancedSavedVerdict(verdict),
        false
    );
});

void test('serializes an advanced verdict correctly', () => {
    const verdict = createAdvancedSavedVerdict(
        ADVANCED_TEST_CASE,
        createRequest()
    );

    assert.deepEqual(
        JSON.parse(serializeVerdict(verdict)),
        verdict
    );
});

void test('serializes a legacy verdict correctly', () => {
    const verdict = createLegacyVerdict();

    assert.deepEqual(
        JSON.parse(serializeVerdict(verdict)),
        verdict
    );
});

void test('rejects invalid verdicts before persistence', () => {
    const request = createRequest();

    request.evidenceIds = [
        'clue-a',
        'clue-a',
        'clue-a',
    ];

    assert.throws(
        () => createAdvancedSavedVerdict(
            ADVANCED_TEST_CASE,
            request
        ),
        /Duplicate evidence selections/
    );
});


void test('deserializes an advanced verdict', () => {
    const verdict = createAdvancedSavedVerdict(
        ADVANCED_TEST_CASE,
        createRequest()
    );

    assert.deepEqual(
        deserializeVerdict(serializeVerdict(verdict)),
        verdict
    );
});

void test('deserializes an unversioned legacy verdict', () => {
    const verdict = createLegacyVerdict();

    assert.deepEqual(
        deserializeVerdict(serializeVerdict(verdict)),
        {
            ...verdict,
            version: 1,
        }
    );
});

void test('deserializes an explicit version 1 verdict', () => {
    const verdict = createLegacyVerdict();

    verdict.version = 1;

    assert.deepEqual(
        deserializeVerdict(serializeVerdict(verdict)),
        verdict
    );
});

void test('rejects malformed stored JSON', () => {
    assert.throws(
        () => deserializeVerdict('{invalid'),
        SyntaxError
    );
});

void test('rejects a null stored verdict', () => {
    assert.throws(
        () => deserializeVerdict('null'),
        /Invalid stored verdict/
    );
});

void test('rejects unsupported verdict versions', () => {
    const verdict = {
        ...createLegacyVerdict(),
        version: 99,
    };

    assert.throws(
        () => deserializeVerdict(JSON.stringify(verdict)),
        /Unsupported verdict version/
    );
});

void test('rejects negative stored scores', () => {
    const verdict = createLegacyVerdict();

    verdict.score = -100;

    assert.throws(
        () => deserializeVerdict(JSON.stringify(verdict)),
        /Invalid stored verdict fields/
    );
});

void test('rejects invalid stored timestamps', () => {
    const verdict = createLegacyVerdict();

    verdict.submittedAt = 'invalid-date';

    assert.throws(
        () => deserializeVerdict(JSON.stringify(verdict)),
        /Invalid stored verdict fields/
    );
});

void test('rejects impossible legacy scores', () => {
    const verdict = createLegacyVerdict();

    verdict.score = 999;

    assert.throws(
        () => deserializeVerdict(JSON.stringify(verdict)),
        /Invalid legacy verdict/
    );
});

void test('rejects inconsistent advanced scores', () => {
    const verdict = createAdvancedSavedVerdict(
        ADVANCED_TEST_CASE,
        createRequest()
    );

    verdict.score = 999;

    assert.throws(
        () => deserializeVerdict(JSON.stringify(verdict)),
        /Inconsistent stored score/
    );
});

void test('rejects scores exceeding the maximum', () => {
    const verdict = createAdvancedSavedVerdict(
        ADVANCED_TEST_CASE,
        createRequest()
    );

    verdict.breakdown.maximum = 100;

    assert.throws(
        () => deserializeVerdict(JSON.stringify(verdict)),
        /Inconsistent stored score/
    );
});

void test('rejects duplicate stored evidence', () => {
    const verdict = createAdvancedSavedVerdict(
        ADVANCED_TEST_CASE,
        createRequest()
    );

    verdict.evidenceIds = [
        'clue-a',
        'clue-a',
        'clue-a',
    ];

    assert.throws(
        () => deserializeVerdict(JSON.stringify(verdict)),
        /Invalid advanced verdict selections/
    );
});

void test('rejects missing score breakdown', () => {
    const verdict = {
        ...createAdvancedSavedVerdict(
            ADVANCED_TEST_CASE,
            createRequest()
        ),
        breakdown: null,
    };

    assert.throws(
        () => deserializeVerdict(JSON.stringify(verdict)),
        /Invalid score breakdown/
    );
});

void test('rejects inconsistent breakdown totals', () => {
    const verdict = createAdvancedSavedVerdict(
        ADVANCED_TEST_CASE,
        createRequest()
    );

    verdict.breakdown.evidence = 0;

    assert.throws(
        () => deserializeVerdict(JSON.stringify(verdict)),
        /Inconsistent stored score/
    );
});

