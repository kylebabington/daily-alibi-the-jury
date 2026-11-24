
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    createAdvancedSavedVerdict,
    isAdvancedSavedVerdict,
    serializeVerdict,
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
