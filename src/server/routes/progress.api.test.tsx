// @vitest-environment node

import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import type {
    InvestigationProgress,
} from '../../shared/progress';

import {
    ADVANCED_TEST_CASE,
} from '../game/fixtures/advanced-case';

import {
    createSavedProgress,
    serializeProgress,
} from '../game/progress';

const mocks = vi.hoisted(() => ({
    context: {
        userId: 't2_test-user' as string | undefined,
    },
    hGet: vi.fn(),
    hSet: vi.fn(),
}));

vi.mock('@devvit/web/server', () => ({
    context: mocks.context,
    redis: {
        hGet: mocks.hGet,
        hSet: mocks.hSet,
    },
    reddit: {},
}));

vi.mock('../game/daily', async (importOriginal) => {
    const actual =
        await importOriginal<
            typeof import('../game/daily')
        >();

    const { ADVANCED_TEST_CASE } =
        await import('../game/fixtures/advanced-case');

    return {
        ...actual,
        getDailyCase: () => ADVANCED_TEST_CASE,
    };
});

import { api } from './api';

const CASE_ID = ADVANCED_TEST_CASE.public.id;

const USER_ID = 't2_test-user';

const VERDICTS_KEY =
    `daily-alibi:${CASE_ID}:verdicts`;

const PROGRESS_KEY =
    `daily-alibi:${CASE_ID}:progress`;

function makeProgress(): InvestigationProgress {
    return {
        version: 1,
        caseId: CASE_ID,

        notebook: {
            version: 1,
            caseId: CASE_ID,
            notes: 'Investigate conflicting statements.',
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

function getProgress(caseId = CASE_ID) {
    return api.request(
        `/progress?caseId=${encodeURIComponent(caseId)}`
    );
}

function postProgress(body: unknown) {
    return api.request('/progress', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
}

beforeEach(() => {
    mocks.context.userId = USER_ID;

    mocks.hGet.mockReset();
    mocks.hSet.mockReset();

    mocks.hGet.mockResolvedValue(undefined);
    mocks.hSet.mockResolvedValue(1);
});

describe('GET /progress', () => {
    it('returns null when no progress exists', async () => {
        const response = await getProgress();

        expect(response.status).toBe(200);

        expect(await response.json()).toEqual({
            type: 'progress',
            progress: null,
        });

        expect(response.headers.get('Cache-Control'))
            .toBe('no-store');

        expect(mocks.hGet).toHaveBeenCalledWith(
            VERDICTS_KEY,
            USER_ID
        );

        expect(mocks.hGet).toHaveBeenCalledWith(
            PROGRESS_KEY,
            USER_ID
        );
    });

    it('returns previously saved progress', async () => {
        const saved = createSavedProgress(
            ADVANCED_TEST_CASE.public,
            makeProgress()
        );

        mocks.hGet.mockImplementation(
            async (key: string) =>
                key === PROGRESS_KEY
                    ? serializeProgress(saved)
                    : undefined
        );

        const response = await getProgress();

        expect(response.status).toBe(200);

        expect(await response.json()).toEqual({
            type: 'progress',
            progress: saved,
        });
    });

    it('rejects a missing case ID', async () => {
        const response =
            await api.request('/progress');

        expect(response.status).toBe(400);

        expect(await response.json()).toEqual({
            status: 'error',
            message: 'A case ID is required.',
        });

        expect(mocks.hGet).not.toHaveBeenCalled();
        expect(mocks.hSet).not.toHaveBeenCalled();
    });

    it('rejects an outdated case before accessing Redis', async () => {
        const response =
            await getProgress('outdated-case');

        expect(response.status).toBe(409);

        expect(await response.json()).toEqual({
            status: 'error',
            message:
                'The daily case has changed. Reload the game to continue.',
        });

        expect(mocks.hGet).not.toHaveBeenCalled();
        expect(mocks.hSet).not.toHaveBeenCalled();
    });

    it('rejects progress retrieval after completion', async () => {
        mocks.hGet.mockImplementation(
            async (key: string) =>
                key === VERDICTS_KEY
                    ? 'existing-verdict'
                    : undefined
        );

        const response = await getProgress();

        expect(response.status).toBe(409);

        expect(await response.json()).toEqual({
            status: 'error',
            message:
                'This investigation is already complete. Reload the game to view your verdict.',
        });

        expect(mocks.hSet).not.toHaveBeenCalled();
    });

    it('rejects unauthenticated retrieval', async () => {
        mocks.context.userId = undefined;

        const response = await getProgress();

        expect(response.status).toBe(401);

        expect(mocks.hGet).not.toHaveBeenCalled();
        expect(mocks.hSet).not.toHaveBeenCalled();
    });
});

describe('POST /progress', () => {
    it('successfully saves valid investigation progress', async () => {
        const progress = makeProgress();

        const response = await postProgress(progress);

        expect(response.status).toBe(200);

        const body = await response.json();

        expect(body).toEqual({
            type: 'progress-saved',
            updatedAt: expect.any(String),
        });

        expect(response.headers.get('Cache-Control'))
            .toBe('no-store');

        expect(mocks.hSet).toHaveBeenCalledTimes(1);

        const saved = createSavedProgress(
            ADVANCED_TEST_CASE.public,
            progress,
            new Date(body.updatedAt)
        );

        expect(mocks.hSet).toHaveBeenCalledWith(
            PROGRESS_KEY,
            {
                [USER_ID]: serializeProgress(saved),
            }
        );
    });

    it('rejects outdated progress before accessing Redis', async () => {
        const progress = makeProgress();

        progress.caseId = 'outdated-case';
        progress.notebook.caseId = 'outdated-case';

        const response = await postProgress(progress);

        expect(response.status).toBe(409);

        expect(await response.json()).toEqual({
            status: 'error',
            message:
                'The daily case has changed. Reload the game to continue.',
        });

        expect(mocks.hGet).not.toHaveBeenCalled();
        expect(mocks.hSet).not.toHaveBeenCalled();
    });

    it('rejects malformed JSON without accessing Redis', async () => {
        const response = await api.request('/progress', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: '{invalid-json',
        });

        expect(response.status).toBe(400);

        expect(await response.json()).toEqual({
            status: 'error',
            message: 'Invalid JSON request.',
        });

        expect(mocks.hGet).not.toHaveBeenCalled();
        expect(mocks.hSet).not.toHaveBeenCalled();
    });

    it('rejects invalid investigation progress', async () => {
        const progress = makeProgress();

        progress.notebook.pinnedEvidenceIds = [
            'nonexistent-evidence',
        ];

        const response = await postProgress(progress);

        expect(response.status).toBe(400);

        expect(await response.json()).toEqual({
            status: 'error',
            message: 'Invalid investigation progress.',
        });

        expect(mocks.hGet).not.toHaveBeenCalled();
        expect(mocks.hSet).not.toHaveBeenCalled();
    });

    it('rejects saving after a verdict has been submitted', async () => {
        mocks.hGet.mockImplementation(
            async (key: string) =>
                key === VERDICTS_KEY
                    ? 'existing-verdict'
                    : undefined
        );

        const response = await postProgress(
            makeProgress()
        );

        expect(response.status).toBe(409);

        expect(await response.json()).toEqual({
            status: 'error',
            message:
                'This investigation is already complete.',
        });

        expect(mocks.hGet).toHaveBeenCalledWith(
            VERDICTS_KEY,
            USER_ID
        );

        expect(mocks.hSet).not.toHaveBeenCalled();
    });

    it('rejects unauthenticated progress saves', async () => {
        mocks.context.userId = undefined;

        const response = await postProgress(
            makeProgress()
        );

        expect(response.status).toBe(401);

        expect(await response.json()).toEqual({
            status: 'error',
            message:
                'Sign in to save your investigation.',
        });

        expect(mocks.hGet).not.toHaveBeenCalled();
        expect(mocks.hSet).not.toHaveBeenCalled();
    });

    it('rejects oversized request bodies', async () => {
        const progress = makeProgress();

        progress.notebook.notes = 'a'.repeat(70000);

        const response = await postProgress(progress);

        expect(response.status).toBe(413);

        expect(await response.json()).toEqual({
            status: 'error',
            message:
                'Investigation progress is too large.',
        });

        expect(mocks.hGet).not.toHaveBeenCalled();
        expect(mocks.hSet).not.toHaveBeenCalled();
    });

    it('returns a server error when Redis cannot save progress', async () => {
        const consoleError = vi
            .spyOn(console, 'error')
            .mockImplementation(() => { });

        mocks.hSet.mockRejectedValueOnce(
            new Error('Redis unavailable')
        );

        const response = await postProgress(
            makeProgress()
        );

        expect(response.status).toBe(500);

        expect(await response.json()).toEqual({
            status: 'error',
            message:
                'Unable to save your investigation.',
        });

        expect(mocks.hSet).toHaveBeenCalledTimes(1);
        expect(consoleError).toHaveBeenCalled();
    });

    it('does not write progress when the verdict lookup fails', async () => {
        vi.spyOn(console, 'error')
            .mockImplementation(() => { });

        mocks.hGet.mockRejectedValueOnce(
            new Error('Redis unavailable')
        );

        const response = await postProgress(
            makeProgress()
        );

        expect(response.status).toBe(500);

        expect(await response.json()).toEqual({
            status: 'error',
            message:
                'Unable to save your investigation.',
        });

        expect(mocks.hSet).not.toHaveBeenCalled();
    });
});

describe('GET /progress failure handling', () => {
    it('returns a server error when Redis is unavailable', async () => {
        vi.spyOn(console, 'error')
            .mockImplementation(() => { });

        mocks.hGet.mockRejectedValue(
            new Error('Redis unavailable')
        );

        const response = await getProgress();

        expect(response.status).toBe(500);

        expect(await response.json()).toEqual({
            status: 'error',
            message:
                'Unable to retrieve your investigation.',
        });

        expect(mocks.hSet).not.toHaveBeenCalled();
    });

    it('rejects corrupted stored progress instead of returning an empty investigation', async () => {
        vi.spyOn(console, 'error')
            .mockImplementation(() => { });

        mocks.hGet.mockImplementation(
            async (key: string) =>
                key === PROGRESS_KEY
                    ? '{corrupted-json'
                    : undefined
        );

        const response = await getProgress();

        expect(response.status).toBe(500);

        expect(await response.json()).toEqual({
            status: 'error',
            message:
                'Unable to retrieve your investigation.',
        });

        expect(mocks.hSet).not.toHaveBeenCalled();
    });
});