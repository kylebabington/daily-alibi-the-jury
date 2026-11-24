
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { validateAdvancedCase } from './integrity.ts';

import {
    ADVANCED_TEST_CASE,
} from './fixtures/advanced-case.ts';

function createCase() {
    return structuredClone(ADVANCED_TEST_CASE);
}

void test('accepts a valid advanced case', () => {
    assert.doesNotThrow(() => {
        validateAdvancedCase(createCase());
    });
});

void test('rejects invalid case identifier', () => {
    const gameCase = createCase();

    gameCase.public.id = '';

    assert.throws(
        () => validateAdvancedCase(gameCase),
        /Invalid case identifier/
    );
});

void test('rejects insufficient suspects', () => {
    const gameCase = createCase();

    gameCase.public.suspects = [];

    assert.throws(
        () => validateAdvancedCase(gameCase),
        /Not enough suspects/
    );
});

void test('rejects duplicate suspect identifiers', () => {
    const gameCase = createCase();

    gameCase.public.suspects.push(
        ...gameCase.public.suspects
    );

    assert.throws(
        () => validateAdvancedCase(gameCase),
        /Duplicate suspect identifiers/
    );
});

void test('rejects duplicate evidence identifiers', () => {
    const gameCase = createCase();

    gameCase.public.evidence.push(
        ...gameCase.public.evidence
    );

    assert.throws(
        () => validateAdvancedCase(gameCase),
        /Duplicate evidence identifiers/
    );
});

void test('rejects duplicate motive identifiers', () => {
    const gameCase = createCase();

    gameCase.public.motives.push(
        ...gameCase.public.motives
    );

    assert.throws(
        () => validateAdvancedCase(gameCase),
        /Duplicate motive identifiers/
    );
});

void test('rejects impossible evidence requirements', () => {
    const gameCase = createCase();

    gameCase.public.investigation.requiredEvidenceCount = 99;

    assert.throws(
        () => validateAdvancedCase(gameCase),
        /Invalid required evidence count/
    );
});

void test('rejects zero required evidence', () => {
    const gameCase = createCase();

    gameCase.public.investigation.requiredEvidenceCount = 0;

    assert.throws(
        () => validateAdvancedCase(gameCase),
        /Invalid required evidence count/
    );
});

void test('rejects unknown solution suspect', () => {
    const gameCase = createCase();

    gameCase.solution.suspectId = 'unknown';

    assert.throws(
        () => validateAdvancedCase(gameCase),
        /Solution references unknown suspect/
    );
});

void test('rejects unknown solution motive', () => {
    const gameCase = createCase();

    gameCase.solution.motiveId = 'unknown';

    assert.throws(
        () => validateAdvancedCase(gameCase),
        /Solution references unknown motive/
    );
});

void test('rejects unknown solution evidence', () => {
    const gameCase = createCase();

    gameCase.solution.evidenceIds = [
        'clue-a',
        'clue-b',
        'unknown',
    ];

    assert.throws(
        () => validateAdvancedCase(gameCase),
        /Solution references unknown evidence/
    );
});

void test('rejects duplicate solution evidence', () => {
    const gameCase = createCase();

    gameCase.solution.evidenceIds = [
        'clue-a',
        'clue-a',
        'clue-a',
    ];

    assert.throws(
        () => validateAdvancedCase(gameCase),
        /Duplicate solution evidence/
    );
});

void test('rejects incorrect solution evidence count', () => {
    const gameCase = createCase();

    gameCase.solution.evidenceIds = ['clue-a'];

    assert.throws(
        () => validateAdvancedCase(gameCase),
        /Incorrect solution evidence count/
    );
});

void test('rejects negative scoring values', () => {
    const gameCase = createCase();

    gameCase.public.scoring.suspectPoints = -100;

    assert.throws(
        () => validateAdvancedCase(gameCase),
        /Invalid scoring values/
    );
});

void test('rejects incorrect maximum score', () => {
    const gameCase = createCase();

    gameCase.public.maxScore = 999;

    assert.throws(
        () => validateAdvancedCase(gameCase),
        /Maximum score mismatch/
    );
});

void test('rejects missing solution explanation', () => {
    const gameCase = createCase();

    gameCase.solution.explanation = [];

    assert.throws(
        () => validateAdvancedCase(gameCase),
        /Missing solution explanation/
    );
});

void test('rejects missing introduction', () => {
    const gameCase = createCase();

    gameCase.public.introduction = [];

    assert.throws(
        () => validateAdvancedCase(gameCase),
        /Invalid case introduction/
    );
});

void test('accepts a case without motives', () => {
    const gameCase = createCase();

    gameCase.public.investigation.requiresMotive = false;
    gameCase.public.motives = [];
    gameCase.public.maxScore = 250;
    gameCase.solution.motiveId = null;

    assert.doesNotThrow(() => {
        validateAdvancedCase(gameCase);
    });
});

void test('rejects insufficient motive options', () => {
    const gameCase = createCase();

    gameCase.public.motives = [];

    assert.throws(
        () => validateAdvancedCase(gameCase),
        /Not enough motives/
    );
});

void test('rejects invalid investigation duration', () => {
    const gameCase = createCase();

    gameCase.public.investigation.estimatedMinutes = -5;

    assert.throws(
        () => validateAdvancedCase(gameCase),
        /Invalid estimated investigation time/
    );
});
