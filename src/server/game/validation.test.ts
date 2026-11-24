
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    isAdvancedVerdictRequest,
} from './validation.ts';

function createRequest(
    overrides: Record<string, unknown> = {}
): Record<string, unknown> {
    return {
        caseId: 'case-003',
        suspectId: 'suspect-a',
        motiveId: 'financial',
        evidenceIds: [
            'clue-a',
            'clue-b',
            'clue-c',
        ],
        ...overrides,
    };
}

void test('accepts a valid advanced verdict', () => {
    assert.equal(
        isAdvancedVerdictRequest(createRequest()),
        true
    );
});

void test('accepts a null motive', () => {
    assert.equal(
        isAdvancedVerdictRequest(
            createRequest({ motiveId: null })
        ),
        true
    );
});

void test('rejects null request', () => {
    assert.equal(
        isAdvancedVerdictRequest(null),
        false
    );
});

void test('rejects undefined request', () => {
    assert.equal(
        isAdvancedVerdictRequest(undefined),
        false
    );
});

void test('rejects array request', () => {
    assert.equal(
        isAdvancedVerdictRequest([]),
        false
    );
});

void test('rejects string request', () => {
    assert.equal(
        isAdvancedVerdictRequest('invalid'),
        false
    );
});

void test('rejects empty object', () => {
    assert.equal(
        isAdvancedVerdictRequest({}),
        false
    );
});

void test('rejects numeric case ID', () => {
    assert.equal(
        isAdvancedVerdictRequest(
            createRequest({ caseId: 123 })
        ),
        false
    );
});

void test('rejects empty suspect ID', () => {
    assert.equal(
        isAdvancedVerdictRequest(
            createRequest({ suspectId: '' })
        ),
        false
    );
});

void test('rejects missing motive property', () => {
    const request = createRequest();

    delete request.motiveId;

    assert.equal(
        isAdvancedVerdictRequest(request),
        false
    );
});

void test('rejects numeric motive ID', () => {
    assert.equal(
        isAdvancedVerdictRequest(
            createRequest({ motiveId: 123 })
        ),
        false
    );
});

void test('rejects evidence supplied as a string', () => {
    assert.equal(
        isAdvancedVerdictRequest(
            createRequest({ evidenceIds: 'clue-a' })
        ),
        false
    );
});

void test('rejects null evidence', () => {
    assert.equal(
        isAdvancedVerdictRequest(
            createRequest({ evidenceIds: null })
        ),
        false
    );
});

void test('rejects empty evidence array', () => {
    assert.equal(
        isAdvancedVerdictRequest(
            createRequest({ evidenceIds: [] })
        ),
        false
    );
});

void test('rejects numeric evidence IDs', () => {
    assert.equal(
        isAdvancedVerdictRequest(
            createRequest({
                evidenceIds: ['clue-a', 123],
            })
        ),
        false
    );
});

void test('rejects duplicate evidence IDs', () => {
    assert.equal(
        isAdvancedVerdictRequest(
            createRequest({
                evidenceIds: [
                    'clue-a',
                    'clue-a',
                    'clue-a',
                ],
            })
        ),
        false
    );
});

void test('rejects oversized evidence arrays', () => {
    assert.equal(
        isAdvancedVerdictRequest(
            createRequest({
                evidenceIds: Array.from(
                    { length: 25 },
                    (_, index) => `clue-${index}`
                ),
            })
        ),
        false
    );
});

void test('rejects oversized identifiers', () => {
    assert.equal(
        isAdvancedVerdictRequest(
            createRequest({
                suspectId: 'a'.repeat(101),
            })
        ),
        false
    );
});

void test('rejects identifiers containing whitespace', () => {
    assert.equal(
        isAdvancedVerdictRequest(
            createRequest({
                suspectId: 'suspect a',
            })
        ),
        false
    );
});

void test('rejects identifiers containing markup', () => {
    assert.equal(
        isAdvancedVerdictRequest(
            createRequest({
                suspectId: '<script>alert(1)</script>',
            })
        ),
        false
    );
});
