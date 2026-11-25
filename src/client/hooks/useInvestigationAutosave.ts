
import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

import type {
    InvestigationProgress,
} from '../../shared/progress';

import {
    AUTOSAVE_DELAY_MS,
} from '../../shared/progress';

import {
    saveInvestigationProgress,
} from '../progress';

export type SaveStatus =
    | 'idle'
    | 'pending'
    | 'saving'
    | 'saved'
    | 'error';

export function useInvestigationAutosave(
    progress: InvestigationProgress | null,
    enabled: boolean
) {
    const [status, setStatus] =
        useState<SaveStatus>('idle');

    const [updatedAt, setUpdatedAt] =
        useState<string | null>(null);

    const [error, setError] =
        useState<string | null>(null);

    const latestProgress =
        useRef<InvestigationProgress | null>(null);

    const lastSaved = useRef<string | null>(null);

    const inFlight = useRef(false);

    const enabledRef = useRef(enabled);

    const mounted = useRef(false);

    const timer = useRef<
        ReturnType<typeof setTimeout> | null
    >(null);

    const saveLatest = useCallback(async () => {
        if (
            !mounted.current ||
            !enabledRef.current ||
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
                    break;
                }

                setStatus('saving');
                setError(null);

                const response =
                    await saveInvestigationProgress(snapshot);

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
            if (
                mounted.current &&
                enabledRef.current
            ) {
                setStatus('error');

                setError(
                    saveError instanceof Error
                        ? saveError.message
                        : 'Unable to save investigation.'
                );
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
            }
        };
    }, []);

    useEffect(() => {
        enabledRef.current = enabled;
        latestProgress.current = progress;

        if (timer.current !== null) {
            clearTimeout(timer.current);
            timer.current = null;
        }

        if (!enabled || !progress) {
            return;
        }

        const serialized = JSON.stringify(progress);

        if (serialized === lastSaved.current) {
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

        void saveLatest();
    }, [saveLatest]);

    return {
        status,
        updatedAt,
        error,
        retry,
    };
}
