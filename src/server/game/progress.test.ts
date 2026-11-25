
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type {
    InvestigationProgress,
} from '../../shared/progress';

import {
    validateProgress,
    createSavedProgress,
    serializeProgress,
    deserializeProgress,
} from './progress.ts';

import {
    ADVANCED_TEST_CASE,
} from './fixtures/advanced-case.ts';

import { CASE_001 } from './cases/case-001.ts';

const gameCase = ADVANCED_TEST_CASE.public;

const now = new Date('2026-11-25T12:00:00.000Z');

function makeProgress(): InvestigationProgress {
    return {
        version: 1,
        caseId: gameCase.id,

        notebook: {
            version: 1,
            caseId: gameCase.id,
            notes: 'Investigate the conflicting statements.',
            pinnedEvidenceIds: ['clue-a'],
            suspectStatuses: {
                'suspect-a': 'suspicious',
            },
        },

        selections: {
            suspectId: '',
            motiveId: null,
            evidenceIds: [],
        },

        activeTab: 'notebook',
        screen: 'investigate',
    };
}

void test('accepts valid unfinished progress', () => {
    assert.equal(
        validateProgress(gameCase, makeProgress()),
        true
    );
});

void test('accepts empty notebook', () => {
    const progress = makeProgress();

    progress.notebook.notes = '';
    progress.notebook.pinnedEvidenceIds = [];
    progress.notebook.suspectStatuses = {};

    assert.equal(
        validateProgress(gameCase, progress),
        true
    );
});

void test('accepts incomplete verdict selections', () => {
    const progress = makeProgress();

    progress.selections.suspectId = 'suspect-a';
    progress.selections.evidenceIds = ['clue-a'];

    assert.equal(
        validateProgress(gameCase, progress),
        true
    );
});

void test('rejects null progress', () => {
    assert.equal(
        validateProgress(gameCase, null),
        false
    );
});

void test('rejects unsupported progress version', () => {
    assert.equal(
        validateProgress(gameCase, {
            ...makeProgress(),
            version: 999,
        }),
        false
    );
});

void test('rejects incorrect case ID', () => {
    const progress = makeProgress();

    progress.caseId = 'different-case';

    assert.equal(
        validateProgress(gameCase, progress),
        false
    );
});

void test('rejects notebook from another case', () => {
    const progress = makeProgress();

    progress.notebook.caseId = 'different-case';

    assert.equal(
        validateProgress(gameCase, progress),
        false
    );
});

void test('rejects unsupported notebook version', () => {
    const progress = makeProgress();

    assert.equal(
        validateProgress(gameCase, {
            ...progress,
            notebook: {
                ...progress.notebook,
                version: 999,
            },
        }),
        false
    );
});

void test('rejects invalid investigation tab', () => {
    assert.equal(
        validateProgress(gameCase, {
            ...makeProgress(),
            activeTab: 'admin',
        }),
        false
    );
});

void test('rejects results screen', () => {
    assert.equal(
        validateProgress(gameCase, {
            ...makeProgress(),
            screen: 'results',
        }),
        false
    );
});

void test('accepts maximum notes length', () => {
    const progress = makeProgress();

    progress.notebook.notes = 'a'.repeat(5000);

    assert.equal(
        validateProgress(gameCase, progress),
        true
    );
});

void test('rejects oversized notes', () => {
    const progress = makeProgress();

    progress.notebook.notes = 'a'.repeat(5001);

    assert.equal(
        validateProgress(gameCase, progress),
        false
    );
});

void test('rejects unknown pinned evidence', () => {
    const progress = makeProgress();

    progress.notebook.pinnedEvidenceIds = [
        'fake-clue',
    ];

    assert.equal(
        validateProgress(gameCase, progress),
        false
    );
});

void test('rejects duplicate pinned evidence', () => {
    const progress = makeProgress();

    progress.notebook.pinnedEvidenceIds = [
        'clue-a',
        'clue-a',
    ];

    assert.equal(
        validateProgress(gameCase, progress),
        false
    );
});

void test('rejects unknown tracked suspect', () => {
    const progress = makeProgress();

    progress.notebook.suspectStatuses = {
        'fake-suspect': 'suspicious',
    };

    assert.equal(
        validateProgress(gameCase, progress),
        false
    );
});

void test('rejects invalid suspect status', () => {
    const progress = makeProgress();

    assert.equal(
        validateProgress(gameCase, {
            ...progress,
            notebook: {
                ...progress.notebook,
                suspectStatuses: {
                    'suspect-a': 'guilty',
                },
            },
        }),
        false
    );
});

void test('rejects unknown draft suspect', () => {
    const progress = makeProgress();

    progress.selections.suspectId = 'fake-suspect';

    assert.equal(
        validateProgress(gameCase, progress),
        false
    );
});

void test('rejects unknown draft motive', () => {
    const progress = makeProgress();

    progress.selections.motiveId = 'fake-motive';

    assert.equal(
        validateProgress(gameCase, progress),
        false
    );
});

void test('rejects unknown selected evidence', () => {
    const progress = makeProgress();

    progress.selections.evidenceIds = ['fake-clue'];

    assert.equal(
        validateProgress(gameCase, progress),
        false
    );
});

void test('rejects duplicate selected evidence', () => {
    const progress = makeProgress();

    progress.selections.evidenceIds = [
        'clue-a',
        'clue-a',
    ];

    assert.equal(
        validateProgress(gameCase, progress),
        false
    );
});

void test('rejects excessive selected evidence', () => {
    const progress = makeProgress();

    progress.selections.evidenceIds = [
        'clue-a',
        'clue-b',
        'clue-c',
        'clue-d',
    ];

    assert.equal(
        validateProgress(gameCase, progress),
        false
    );
});

void test('uses server timestamp', () => {
    const saved = createSavedProgress(
        gameCase,
        {
            ...makeProgress(),
            updatedAt: 'fake-timestamp',
        },
        now
    );

    assert.equal(
        saved.updatedAt,
        now.toISOString()
    );
});

void test('discards unauthorized extra fields', () => {
    const saved = createSavedProgress(
        gameCase,
        {
            ...makeProgress(),
            score: 300,
            userId: 'another-user',
            solution: 'fake-solution',
        },
        now
    );

    assert.equal('score' in saved, false);
    assert.equal('userId' in saved, false);
    assert.equal('solution' in saved, false);
});

void test('normalizes unmarked suspect statuses', () => {
    const progress = makeProgress();

    progress.notebook.suspectStatuses = {
        'suspect-a': 'unmarked',
    };

    const saved = createSavedProgress(
        gameCase,
        progress,
        now
    );

    assert.deepEqual(
        saved.notebook.suspectStatuses,
        {}
    );
});

void test('serializes and restores saved progress', () => {
    const saved = createSavedProgress(
        gameCase,
        makeProgress(),
        now
    );

    const restored = deserializeProgress(
        gameCase,
        serializeProgress(saved)
    );

    assert.deepEqual(restored, saved);
});

void test('rejects invalid stored JSON', () => {
    assert.throws(() =>
        deserializeProgress(gameCase, '{invalid')
    );
});

void test('rejects invalid stored timestamp', () => {
    assert.throws(() =>
        deserializeProgress(
            gameCase,
            JSON.stringify({
                ...makeProgress(),
                updatedAt: 'invalid-date',
            })
        )
    );
});

void test('rejects invalid stored case ID', () => {
    assert.throws(() =>
        deserializeProgress(
            gameCase,
            JSON.stringify({
                ...makeProgress(),
                caseId: 'another-case',
                updatedAt: now.toISOString(),
            })
        )
    );
});

void test('accepts legacy case progress', () => {
    const legacyCase = CASE_001.public;

    const progress: InvestigationProgress = {
        version: 1,
        caseId: legacyCase.id,

        notebook: {
            version: 1,
            caseId: legacyCase.id,
            notes: '',
            pinnedEvidenceIds: [],
            suspectStatuses: {},
        },

        selections: {
            suspectId: '',
            motiveId: null,
            evidenceIds: [],
        },

        activeTab: 'evidence',
        screen: 'investigate',
    };

    assert.equal(
        validateProgress(legacyCase, progress),
        true
    );

    progress.selections.motiveId = 'financial';

    assert.equal(
        validateProgress(legacyCase, progress),
        false
    );
});
