
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    calculateMaximumScore,
    scoreAdvancedVerdict,
} from './scoring.ts';

import {
    ADVANCED_TEST_CASE,
} from './fixtures/advanced-case.ts';

import type {
    AdvancedVerdictRequest,
} from '../../shared/investigation';

import type { AdvancedPrivateCase } from './case';

function createVerdict(
    overrides: Partial<AdvancedVerdictRequest> = {}
): AdvancedVerdictRequest {
    return {
        caseId: 'test-advanced',
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

// Maximum score

void test('calculates maximum score correctly', () => {
    assert.equal(
        calculateMaximumScore(ADVANCED_TEST_CASE),
        300
    );
});

// Correct answers

void test('perfect verdict earns 300 points', () => {
    const result = scoreAdvancedVerdict(
        ADVANCED_TEST_CASE,
        createVerdict()
    );

    assert.deepEqual(result, {
        suspect: 100,
        motive: 50,
        evidence: 150,
        total: 300,
        maximum: 300,
    });
});

void test('wrong suspect earns 200 points', () => {
    const result = scoreAdvancedVerdict(
        ADVANCED_TEST_CASE,
        createVerdict({
            suspectId: 'suspect-b',
        })
    );

    assert.equal(result.suspect, 0);
    assert.equal(result.total, 200);
});

void test('wrong motive earns 250 points', () => {
    const result = scoreAdvancedVerdict(
        ADVANCED_TEST_CASE,
        createVerdict({
            motiveId: 'revenge',
        })
    );

    assert.equal(result.motive, 0);
    assert.equal(result.total, 250);
});

void test('one incorrect clue earns 250 points', () => {
    const result = scoreAdvancedVerdict(
        ADVANCED_TEST_CASE,
        createVerdict({
            evidenceIds: [
                'clue-a',
                'clue-b',
                'clue-d',
            ],
        })
    );

    assert.equal(result.evidence, 100);
    assert.equal(result.total, 250);
});

void test('two incorrect clues earn 200 points', () => {
    const result = scoreAdvancedVerdict(
        ADVANCED_TEST_CASE,
        createVerdict({
            evidenceIds: [
                'clue-a',
                'clue-d',
                'clue-e',
            ],
        })
    );

    assert.equal(result.evidence, 50);
    assert.equal(result.total, 200);
});

void test('all incorrect clues earn 150 points', () => {
    const result = scoreAdvancedVerdict(
        ADVANCED_TEST_CASE,
        createVerdict({
            evidenceIds: [
                'clue-d',
                'clue-e',
                'clue-f',
            ],
        })
    );

    assert.equal(result.evidence, 0);
    assert.equal(result.total, 150);
});

void test('completely incorrect verdict earns zero points', () => {
    const result = scoreAdvancedVerdict(
        ADVANCED_TEST_CASE,
        createVerdict({
            suspectId: 'suspect-b',
            motiveId: 'revenge',
            evidenceIds: [
                'clue-d',
                'clue-e',
                'clue-f',
            ],
        })
    );

    assert.equal(result.total, 0);
});

void test('evidence selection order does not affect score', () => {
    const result = scoreAdvancedVerdict(
        ADVANCED_TEST_CASE,
        createVerdict({
            evidenceIds: [
                'clue-c',
                'clue-a',
                'clue-b',
            ],
        })
    );

    assert.equal(result.total, 300);
});

// Invalid submissions

void test('rejects duplicate evidence selections', () => {
    assert.throws(
        () => scoreAdvancedVerdict(
            ADVANCED_TEST_CASE,
            createVerdict({
                evidenceIds: [
                    'clue-a',
                    'clue-a',
                    'clue-a',
                ],
            })
        ),
        /Duplicate evidence selections/
    );
});

void test('rejects too many evidence selections', () => {
    assert.throws(
        () => scoreAdvancedVerdict(
            ADVANCED_TEST_CASE,
            createVerdict({
                evidenceIds: [
                    'clue-a',
                    'clue-b',
                    'clue-c',
                    'clue-d',
                ],
            })
        ),
        /Incorrect number of evidence selections/
    );
});

void test('rejects too few evidence selections', () => {
    assert.throws(
        () => scoreAdvancedVerdict(
            ADVANCED_TEST_CASE,
            createVerdict({
                evidenceIds: ['clue-a'],
            })
        ),
        /Incorrect number of evidence selections/
    );
});

void test('rejects unknown suspect IDs', () => {
    assert.throws(
        () => scoreAdvancedVerdict(
            ADVANCED_TEST_CASE,
            createVerdict({
                suspectId: 'unknown-suspect',
            })
        ),
        /Invalid suspect selection/
    );
});

void test('rejects unknown motive IDs', () => {
    assert.throws(
        () => scoreAdvancedVerdict(
            ADVANCED_TEST_CASE,
            createVerdict({
                motiveId: 'unknown-motive',
            })
        ),
        /Invalid motive selection/
    );
});

void test('rejects missing required motive', () => {
    assert.throws(
        () => scoreAdvancedVerdict(
            ADVANCED_TEST_CASE,
            createVerdict({
                motiveId: null,
            })
        ),
        /Invalid motive selection/
    );
});

void test('rejects unknown evidence IDs', () => {
    assert.throws(
        () => scoreAdvancedVerdict(
            ADVANCED_TEST_CASE,
            createVerdict({
                evidenceIds: [
                    'clue-a',
                    'clue-b',
                    'unknown-clue',
                ],
            })
        ),
        /Invalid evidence selection/
    );
});

void test('rejects incorrect case ID', () => {
    assert.throws(
        () => scoreAdvancedVerdict(
            ADVANCED_TEST_CASE,
            createVerdict({
                caseId: 'wrong-case',
            })
        ),
        /Incorrect case ID/
    );
});

// Optional motive support

function createCaseWithoutMotive(): AdvancedPrivateCase {
    return {
        public: {
            ...ADVANCED_TEST_CASE.public,
            maxScore: 250,
            motives: [],
            investigation: {
                ...ADVANCED_TEST_CASE.public.investigation,
                requiresMotive: false,
            },
        },
        solution: {
            ...ADVANCED_TEST_CASE.solution,
            motiveId: null,
        },
    };
}

void test('maximum score excludes optional motive points', () => {
    assert.equal(
        calculateMaximumScore(createCaseWithoutMotive()),
        250
    );
});

void test('supports mysteries without motive selection', () => {
    const result = scoreAdvancedVerdict(
        createCaseWithoutMotive(),
        createVerdict({
            motiveId: null,
        })
    );

    assert.equal(result.motive, 0);
    assert.equal(result.total, 250);
    assert.equal(result.maximum, 250);
});

void test('rejects motive when case does not require one', () => {
    assert.throws(
        () => scoreAdvancedVerdict(
            createCaseWithoutMotive(),
            createVerdict()
        ),
        /This case does not require a motive/
    );
});
