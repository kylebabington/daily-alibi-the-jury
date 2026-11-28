
import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

import type {
    InvestigationProgress,
    SavedInvestigationProgress,
} from '../../shared/progress';

import {
    AUTOSAVE_DELAY_MS,
} from '../../shared/progress';

import {
    saveInvestigationProgress,
    ProgressApiError,
} from '../progress';

const MAX_AUTO_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 2000;

function isRetryableSaveError(error: unknown): boolean {
    if (error instanceof ProgressApiError) {
        return (
            error.status === 408 ||
            error.status === 429 ||
            error.status >= 500
        );
    }

    return error instanceof TypeError;
}

export type SaveStatus =
    | 'idle'
    | 'pending'
    | 'saving'
    | 'saved'
    | 'retrying'
    | 'error';

export function useInvestigationAutosave(
    progress: InvestigationProgress | null,
    enabled: boolean,
    restoredProgress: SavedInvestigationProgress | null = null
) {
    const [status, setStatus] =
        useState<SaveStatus>('idle');

    const [updatedAt, setUpdatedAt] =
        useState<string | null>(null);

    const [error, setError] =
        useState<string | null>(null);

    const [requiresReload, setRequiresReload] =
        useState(false);

    const [retryInfo, setRetryInfo] = useState<{
        attempt: number;
        delaySeconds: number;
    } | null>(null);

    const latestProgress =
        useRef<InvestigationProgress | null>(null);

    const lastSaved = useRef<string | null>(null);

    const inFlight = useRef(false);

    const reloadRequired = useRef(false);

    const enabledRef = useRef(enabled);

    const mounted = useRef(false);

    const timer = useRef<
        ReturnType<typeof setTimeout> | null
    >(null);

    const retryCount = useRef(0);

    const retryTimer = useRef<
        ReturnType<typeof setTimeout> | null
    >(null);

    const saveLatest = useCallback(async function runSave() {
        if (
            !mounted.current ||
            !enabledRef.current ||
            reloadRequired.current ||
            inFlight.current ||
            !latestProgress.current
        ) {
            return;
        }

        inFlight.current = true;

        try {
            while (
                mounted.current &&
                enabledRef.current &&
                latestProgress.current
            ) {
                const snapshot = latestProgress.current;
                const serialized = JSON.stringify(snapshot);

                if (serialized === lastSaved.current) {
                    setStatus('saved');
                    setError(null);
                    break;
                }

                setStatus('saving');
                setError(null);

                const response =
                    await saveInvestigationProgress(snapshot);

                retryCount.current = 0;

                setRetryInfo(null);

                if (retryTimer.current !== null) {
                    clearTimeout(retryTimer.current);
                    retryTimer.current = null;
                }

                lastSaved.current = serialized;

                if (
                    !mounted.current ||
                    !enabledRef.current
                ) {
                    break;
                }

                setUpdatedAt(response.updatedAt);

                if (
                    JSON.stringify(latestProgress.current) ===
                    serialized
                ) {
                    setStatus('saved');
                    break;
                }

                // Changes arrived during the request.
                // Save the newest snapshot next.
            }
        } catch (saveError) {
            if (mounted.current && enabledRef.current) {
                const needsReload =
                    saveError instanceof ProgressApiError &&
                    (
                        saveError.status === 401 ||
                        saveError.status === 403 ||
                        saveError.status === 409
                    );

                reloadRequired.current = needsReload;
                setRequiresReload(needsReload);

                setError(
                    saveError instanceof Error
                        ? saveError.message
                        : 'Unable to save investigation.'
                );

                if (
                    isRetryableSaveError(saveError) &&
                    retryCount.current < MAX_AUTO_RETRIES &&
                    retryTimer.current === null
                ) {
                    const delay =
                        RETRY_BASE_DELAY_MS *
                        Math.pow(2, retryCount.current);

                    retryCount.current += 1;

                    setRetryInfo({
                        attempt: retryCount.current,
                        delaySeconds: delay / 1000,
                    });

                    setStatus('retrying');

                    retryTimer.current = setTimeout(() => {
                        retryTimer.current = null;
                        void runSave();
                    }, delay);
                } else if (retryTimer.current === null || needsReload) {
                    if (retryTimer.current !== null) {
                        clearTimeout(retryTimer.current);
                        retryTimer.current = null;
                    }

                    setRetryInfo(null);
                    setStatus('error');
                }
            }
        } finally {
            inFlight.current = false;
        }
    }, []);

    useEffect(() => {
        mounted.current = true;

        return () => {
            mounted.current = false;

            if (timer.current !== null) {
                clearTimeout(timer.current);
                timer.current = null;
            }

            if (retryTimer.current !== null) {
                clearTimeout(retryTimer.current);
                retryTimer.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!restoredProgress) return;

        lastSaved.current = JSON.stringify({
            version: restoredProgress.version,
            caseId: restoredProgress.caseId,
            notebook: restoredProgress.notebook,
            selections: restoredProgress.selections,
            activeTab: restoredProgress.activeTab,
            screen: restoredProgress.screen,
        });
    }, [restoredProgress]);

    useEffect(() => {
        enabledRef.current = enabled;
        latestProgress.current = progress;

        if (timer.current !== null) {
            clearTimeout(timer.current);
            timer.current = null;
        }

        if (!enabled || !progress) {
            if (retryTimer.current !== null) {
                clearTimeout(retryTimer.current);
                retryTimer.current = null;
            }

            retryCount.current = 0;
            return;
        }

        // A permanent conflict requires a fresh game session.
        if (reloadRequired.current) {
            return;
        }

        // Preserve the scheduled retry and its backoff delay.
        // latestProgress already contains the player's newest edits.
        if (retryTimer.current !== null) {
            return;
        }

        const serialized = JSON.stringify(progress);

        if (serialized === lastSaved.current) {
            if (!inFlight.current) {
                setStatus('saved');
                setError(null);
            }

            return;
        }

        setStatus('pending');

        timer.current = setTimeout(() => {
            timer.current = null;
            void saveLatest();
        }, AUTOSAVE_DELAY_MS);

        return () => {
            if (timer.current !== null) {
                clearTimeout(timer.current);
                timer.current = null;
            }
        };
    }, [progress, enabled, saveLatest]);

    const retry = useCallback(() => {
        if (timer.current !== null) {
            clearTimeout(timer.current);
            timer.current = null;
        }

        if (retryTimer.current !== null) {
            clearTimeout(retryTimer.current);
            retryTimer.current = null;
        }

        retryCount.current = 0;

        void saveLatest();
    }, [saveLatest]);

    return {
        status:
            status === 'idle' && restoredProgress
                ? 'saved' as const
                : status,
        updatedAt:
            updatedAt ?? restoredProgress?.updatedAt ?? null,
        error,
        retry,
        retryInfo,
        maxRetries: MAX_AUTO_RETRIES,
        requiresReload,
    };
}
