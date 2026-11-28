import { act, renderHook, cleanup } from '@testing-library/react';

import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { useInvestigationAutosave } from './useInvestigationAutosave';

import { saveInvestigationProgress, ProgressApiError, } from '../progress';

import type {
    InvestigationProgress,
    SavedInvestigationProgress,
    SaveProgressResponse,
} from '../../shared/progress';

import {
    AUTOSAVE_DELAY_MS,
} from '../../shared/progress';

vi.mock('../progress', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('../progress')>();

    return {
        ...actual,
        saveInvestigationProgress: vi.fn(),
    };
});

const SAVED_AT = '2026-11-27T15:00:00.000Z';

function createTestProgress(
    notes = ''
): InvestigationProgress {
    return {
        version: 1,
        caseId: 'case-004',
        notebook: {
            version: 1,
            caseId: 'case-004',
            notes,
            pinnedEvidenceIds: [],
            suspectStatuses: {},
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

function createRestoredProgress(
    notes = ''
): SavedInvestigationProgress {
    return {
        ...createTestProgress(notes),
        updatedAt: SAVED_AT,
    };
}

const mockSave = vi.mocked(saveInvestigationProgress);

function createDeferredSave() {
    let resolve!: (value: SaveProgressResponse) => void;

    const promise = new Promise<SaveProgressResponse>(
        (resolvePromise) => {
            resolve = resolvePromise;
        }
    );

    return {
        promise,
        resolve,
    };
}

async function advanceTime(milliseconds: number) {
    await act(async () => {
        await vi.advanceTimersByTimeAsync(milliseconds);
    });
}

beforeEach(() => {
    vi.useFakeTimers();

    mockSave.mockReset();

    mockSave.mockResolvedValue({
        type: 'progress-saved',
        updatedAt: SAVED_AT,
    });
});

afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
});

describe('useInvestigationAutosave', () => {
    it('starts idle when no investigation is available', () => {
        const { result } = renderHook(() =>
            useInvestigationAutosave(null, false)
        );

        expect(result.current.status).toBe('idle');
        expect(result.current.updatedAt).toBeNull();
        expect(result.current.error).toBeNull();
        expect(result.current.retryInfo).toBeNull();
        expect(result.current.requiresReload).toBe(false);
        expect(result.current.maxRetries).toBe(3);

        expect(
            saveInvestigationProgress
        ).not.toHaveBeenCalled();
    });

    it('does not save when autosave is disabled', async () => {
        const progress = createTestProgress('Test notes');

        renderHook(() =>
            useInvestigationAutosave(progress, false)
        );

        await act(async () => {
            await vi.advanceTimersByTimeAsync(10000);
        });

        expect(mockSave).not.toHaveBeenCalled();
    });

    it('waits for the autosave delay before saving', async () => {
        const progress = createTestProgress('New notes');

        const { result } = renderHook(() =>
            useInvestigationAutosave(progress, true)
        );

        expect(result.current.status).toBe('pending');

        await act(async () => {
            await vi.advanceTimersByTimeAsync(
                AUTOSAVE_DELAY_MS - 1
            );
        });

        expect(mockSave).not.toHaveBeenCalled();

        await act(async () => {
            await vi.advanceTimersByTimeAsync(1);
        });

        expect(mockSave).toHaveBeenCalledTimes(1);
        expect(mockSave).toHaveBeenCalledWith(progress);
        expect(result.current.status).toBe('saved');
    });

    it('reports the timestamp returned by the server', async () => {
        const progress = createTestProgress('Saved notes');

        const { result } = renderHook(() =>
            useInvestigationAutosave(progress, true)
        );

        await act(async () => {
            await vi.advanceTimersByTimeAsync(
                AUTOSAVE_DELAY_MS
            );
        });

        expect(result.current.status).toBe('saved');
        expect(result.current.updatedAt).toBe(SAVED_AT);
        expect(result.current.error).toBeNull();
        expect(result.current.retryInfo).toBeNull();
    });

    it('does not resave unchanged restored progress', async () => {
        const progress = createTestProgress('Existing notes');

        const restored =
            createRestoredProgress('Existing notes');

        const { result } = renderHook(() =>
            useInvestigationAutosave(
                progress,
                true,
                restored
            )
        );

        await act(async () => {
            await vi.advanceTimersByTimeAsync(10000);
        });

        expect(mockSave).not.toHaveBeenCalled();
        expect(result.current.status).toBe('saved');
        expect(result.current.updatedAt).toBe(SAVED_AT);
    });

    it('saves changes made after restoration', async () => {
        const restored =
            createRestoredProgress('Original notes');

        const { result, rerender } = renderHook(
            ({ progress }) =>
                useInvestigationAutosave(
                    progress,
                    true,
                    restored
                ),
            {
                initialProps: {
                    progress:
                        createTestProgress('Original notes'),
                },
            }
        );

        expect(mockSave).not.toHaveBeenCalled();

        const updated =
            createTestProgress('Updated notes');

        rerender({
            progress: updated,
        });

        await act(async () => {
            await vi.advanceTimersByTimeAsync(
                AUTOSAVE_DELAY_MS
            );
        });

        expect(mockSave).toHaveBeenCalledTimes(1);
        expect(mockSave).toHaveBeenCalledWith(updated);
        expect(result.current.status).toBe('saved');
    });

    it('debounces rapid edits and saves the latest snapshot', async () => {
        const { result, rerender } = renderHook(
            ({ progress }) =>
                useInvestigationAutosave(progress, true),
            {
                initialProps: {
                    progress: createTestProgress('First'),
                },
            }
        );

        await act(async () => {
            await vi.advanceTimersByTimeAsync(200);
        });

        rerender({
            progress: createTestProgress('Second'),
        });

        await act(async () => {
            await vi.advanceTimersByTimeAsync(200);
        });

        const latest = createTestProgress('Final notes');

        rerender({
            progress: latest,
        });

        expect(mockSave).not.toHaveBeenCalled();

        await act(async () => {
            await vi.advanceTimersByTimeAsync(
                AUTOSAVE_DELAY_MS
            );
        });

        expect(mockSave).toHaveBeenCalledTimes(1);
        expect(mockSave).toHaveBeenCalledWith(latest);
        expect(result.current.status).toBe('saved');
    });

    it('schedules an automatic retry after a network failure', async () => {
        mockSave.mockRejectedValueOnce(
            new TypeError('Failed to fetch')
        );

        const progress = createTestProgress('Network test');

        const { result } = renderHook(() =>
            useInvestigationAutosave(progress, true)
        );

        await advanceTime(AUTOSAVE_DELAY_MS);

        expect(mockSave).toHaveBeenCalledTimes(1);
        expect(result.current.status).toBe('retrying');
        expect(result.current.retryInfo).toEqual({
            attempt: 1,
            delaySeconds: 2,
        });
        expect(result.current.updatedAt).toBeNull();
        expect(result.current.requiresReload).toBe(false);
    });

    it('automatically recovers after connectivity returns', async () => {
        mockSave.mockRejectedValueOnce(
            new TypeError('Failed to fetch')
        );

        const progress = createTestProgress('Recovery test');

        const { result } = renderHook(() =>
            useInvestigationAutosave(progress, true)
        );

        await advanceTime(AUTOSAVE_DELAY_MS);

        expect(result.current.status).toBe('retrying');

        await advanceTime(1999);

        expect(mockSave).toHaveBeenCalledTimes(1);

        await advanceTime(1);

        expect(mockSave).toHaveBeenCalledTimes(2);
        expect(mockSave).toHaveBeenLastCalledWith(progress);
        expect(result.current.status).toBe('saved');
        expect(result.current.error).toBeNull();
        expect(result.current.retryInfo).toBeNull();
        expect(result.current.updatedAt).toBe(SAVED_AT);
    });

    it('stops after three automatic retries', async () => {
        mockSave.mockRejectedValue(
            new TypeError('Failed to fetch')
        );

        const progress = createTestProgress('Offline test');

        const { result } = renderHook(() =>
            useInvestigationAutosave(progress, true)
        );

        await advanceTime(AUTOSAVE_DELAY_MS);

        expect(mockSave).toHaveBeenCalledTimes(1);
        expect(result.current.retryInfo).toEqual({
            attempt: 1,
            delaySeconds: 2,
        });

        await advanceTime(2000);

        expect(mockSave).toHaveBeenCalledTimes(2);
        expect(result.current.retryInfo).toEqual({
            attempt: 2,
            delaySeconds: 4,
        });

        await advanceTime(4000);

        expect(mockSave).toHaveBeenCalledTimes(3);
        expect(result.current.retryInfo).toEqual({
            attempt: 3,
            delaySeconds: 8,
        });

        await advanceTime(8000);

        expect(mockSave).toHaveBeenCalledTimes(4);
        expect(result.current.status).toBe('error');
        expect(result.current.retryInfo).toBeNull();
        expect(result.current.updatedAt).toBeNull();

        await advanceTime(60000);

        expect(mockSave).toHaveBeenCalledTimes(4);
    });

    it('allows manual recovery after retries are exhausted', async () => {
        mockSave.mockRejectedValue(
            new TypeError('Failed to fetch')
        );

        const progress = createTestProgress('Manual recovery');

        const { result } = renderHook(() =>
            useInvestigationAutosave(progress, true)
        );

        await advanceTime(AUTOSAVE_DELAY_MS);
        await advanceTime(2000);
        await advanceTime(4000);
        await advanceTime(8000);

        expect(result.current.status).toBe('error');
        expect(mockSave).toHaveBeenCalledTimes(4);

        mockSave.mockResolvedValue({
            type: 'progress-saved',
            updatedAt: SAVED_AT,
        });

        await act(async () => {
            result.current.retry();
        });

        expect(mockSave).toHaveBeenCalledTimes(5);
        expect(result.current.status).toBe('saved');
        expect(result.current.error).toBeNull();
        expect(result.current.retryInfo).toBeNull();
        expect(result.current.updatedAt).toBe(SAVED_AT);
    });

    it('requires a reload after a daily case conflict', async () => {
        const message =
            'The daily case has changed. Reload the game to continue.';

        mockSave.mockRejectedValue(
            new ProgressApiError(message, 409)
        );

        const progress = createTestProgress('Stale case');

        const { result } = renderHook(() =>
            useInvestigationAutosave(progress, true)
        );

        await advanceTime(AUTOSAVE_DELAY_MS);

        expect(result.current.status).toBe('error');
        expect(result.current.requiresReload).toBe(true);
        expect(result.current.error).toBe(message);
        expect(result.current.retryInfo).toBeNull();
        expect(result.current.updatedAt).toBeNull();

        await advanceTime(60000);

        expect(mockSave).toHaveBeenCalledTimes(1);
    });

    it('prevents manual retry after a permanent conflict', async () => {
        mockSave.mockRejectedValue(
            new ProgressApiError('Daily case changed', 409)
        );

        const progress = createTestProgress('Stale progress');

        const { result } = renderHook(() =>
            useInvestigationAutosave(progress, true)
        );

        await advanceTime(AUTOSAVE_DELAY_MS);

        expect(result.current.requiresReload).toBe(true);

        await act(async () => {
            result.current.retry();
        });

        await advanceTime(60000);

        expect(mockSave).toHaveBeenCalledTimes(1);
        expect(result.current.status).toBe('error');
        expect(result.current.requiresReload).toBe(true);
    });

    it('does not automatically retry invalid progress', async () => {
        mockSave.mockRejectedValue(
            new ProgressApiError(
                'Invalid investigation progress.',
                400
            )
        );

        const progress = createTestProgress('Invalid progress');

        const { result } = renderHook(() =>
            useInvestigationAutosave(progress, true)
        );

        await advanceTime(AUTOSAVE_DELAY_MS);

        expect(result.current.status).toBe('error');
        expect(result.current.requiresReload).toBe(false);
        expect(result.current.retryInfo).toBeNull();

        await advanceTime(60000);

        expect(mockSave).toHaveBeenCalledTimes(1);
    });

    it('automatically retries temporary server failures', async () => {
        mockSave.mockRejectedValueOnce(
            new ProgressApiError(
                'Service temporarily unavailable.',
                503
            )
        );

        const progress = createTestProgress('Server failure');

        const { result } = renderHook(() =>
            useInvestigationAutosave(progress, true)
        );

        await advanceTime(AUTOSAVE_DELAY_MS);

        expect(result.current.status).toBe('retrying');
        expect(result.current.requiresReload).toBe(false);

        await advanceTime(2000);

        expect(mockSave).toHaveBeenCalledTimes(2);
        expect(result.current.status).toBe('saved');
        expect(result.current.error).toBeNull();
    });

    it('saves the latest edits after an in-flight save completes', async () => {
        const deferred = createDeferredSave();

        mockSave.mockReturnValueOnce(deferred.promise);

        const original = createTestProgress('Original');

        const { result, rerender } = renderHook(
            ({ progress }) =>
                useInvestigationAutosave(progress, true),
            {
                initialProps: {
                    progress: original,
                },
            }
        );

        await advanceTime(AUTOSAVE_DELAY_MS);

        expect(mockSave).toHaveBeenCalledTimes(1);
        expect(result.current.status).toBe('saving');

        const latest = createTestProgress('Latest notes');

        rerender({
            progress: latest,
        });

        await advanceTime(AUTOSAVE_DELAY_MS);

        expect(mockSave).toHaveBeenCalledTimes(1);

        await act(async () => {
            deferred.resolve({
                type: 'progress-saved',
                updatedAt: SAVED_AT,
            });
        });

        expect(mockSave).toHaveBeenCalledTimes(2);
        expect(mockSave).toHaveBeenNthCalledWith(1, original);
        expect(mockSave).toHaveBeenNthCalledWith(2, latest);
        expect(result.current.status).toBe('saved');
    });

    it('cancels a pending autosave when unmounted', async () => {
        const progress = createTestProgress('Pending notes');

        const { unmount } = renderHook(() =>
            useInvestigationAutosave(progress, true)
        );

        await advanceTime(200);

        unmount();

        await advanceTime(10000);

        expect(mockSave).not.toHaveBeenCalled();
    });

    it('cancels automatic retries when unmounted', async () => {
        mockSave.mockRejectedValue(
            new TypeError('Failed to fetch')
        );

        const progress = createTestProgress('Offline notes');

        const { result, unmount } = renderHook(() =>
            useInvestigationAutosave(progress, true)
        );

        await advanceTime(AUTOSAVE_DELAY_MS);

        expect(result.current.status).toBe('retrying');
        expect(mockSave).toHaveBeenCalledTimes(1);

        unmount();

        await advanceTime(60000);

        expect(mockSave).toHaveBeenCalledTimes(1);
    });

    it('preserves the retry delay when the player edits during backoff', async () => {
        mockSave.mockRejectedValueOnce(
            new TypeError('Failed to fetch')
        );

        const { result, rerender } = renderHook(
            ({ progress }) =>
                useInvestigationAutosave(progress, true),
            {
                initialProps: {
                    progress: createTestProgress('Original'),
                },
            }
        );

        await advanceTime(AUTOSAVE_DELAY_MS);

        expect(result.current.status).toBe('retrying');

        const latest = createTestProgress('Edited while offline');

        rerender({
            progress: latest,
        });

        expect(result.current.status).toBe('retrying');

        await advanceTime(1999);

        expect(mockSave).toHaveBeenCalledTimes(1);

        await advanceTime(1);

        expect(mockSave).toHaveBeenCalledTimes(2);
        expect(mockSave).toHaveBeenLastCalledWith(latest);
        expect(result.current.status).toBe('saved');
    });

    it('preserves the reload requirement after additional edits', async () => {
        mockSave.mockRejectedValue(
            new ProgressApiError('Daily case changed', 409)
        );

        const { result, rerender } = renderHook(
            ({ progress }) =>
                useInvestigationAutosave(progress, true),
            {
                initialProps: {
                    progress: createTestProgress('Stale notes'),
                },
            }
        );

        await advanceTime(AUTOSAVE_DELAY_MS);

        expect(result.current.requiresReload).toBe(true);
        expect(result.current.status).toBe('error');

        rerender({
            progress: createTestProgress('Additional notes'),
        });

        await advanceTime(60000);

        expect(mockSave).toHaveBeenCalledTimes(1);
        expect(result.current.requiresReload).toBe(true);
        expect(result.current.status).toBe('error');
        expect(result.current.error).toBe('Daily case changed');
    });

    it('cancels automatic retries when autosave becomes disabled', async () => {
        mockSave.mockRejectedValue(
            new TypeError('Failed to fetch')
        );

        const progress = createTestProgress('Unsaved notes');

        const { result, rerender } = renderHook(
            ({ enabled }) =>
                useInvestigationAutosave(progress, enabled),
            {
                initialProps: {
                    enabled: true,
                },
            }
        );

        await advanceTime(AUTOSAVE_DELAY_MS);

        expect(result.current.status).toBe('retrying');
        expect(mockSave).toHaveBeenCalledTimes(1);

        rerender({
            enabled: false,
        });

        await advanceTime(60000);

        expect(mockSave).toHaveBeenCalledTimes(1);
    });
});