
import type {
    InvestigationProgress,
    SavedInvestigationProgress,
    ProgressResponse,
    SaveProgressResponse,
} from '../shared/progress';

export class ProgressApiError extends Error {
    constructor(
        message: string,
        public readonly status: number
    ) {
        super(message);
        this.name = 'ProgressApiError';
    }
}

async function readError(
    response: Response
): Promise<string> {
    try {
        const data: unknown = await response.json();

        if (
            typeof data === 'object' &&
            data !== null &&
            'message' in data &&
            typeof data.message === 'string'
        ) {
            return data.message;
        }
    } catch {
        // Use fallback message.
    }

    return `Request failed (${response.status}).`;
}

export async function loadInvestigationProgress(
    caseId: string,
    signal?: AbortSignal
): Promise<SavedInvestigationProgress | null> {
    const response = await fetch(
        `/api/progress?caseId=${encodeURIComponent(caseId)}`,
        {
            cache: 'no-store',
            ...(signal ? { signal } : {}),
        }
    );

    if (!response.ok) {
        throw new ProgressApiError(
            await readError(response),
            response.status
        );
    }

    const data =
        (await response.json()) as ProgressResponse;

    if (data.type !== 'progress') {
        throw new Error('Unexpected progress response.');
    }

    return data.progress;
}

export async function saveInvestigationProgress(
    progress: InvestigationProgress
): Promise<SaveProgressResponse> {
    const response = await fetch('/api/progress', {
        method: 'POST',

        headers: {
            'Content-Type': 'application/json',
        },

        body: JSON.stringify(progress),
    });

    if (!response.ok) {
        throw new ProgressApiError(
            await readError(response),
            response.status
        );
    }

    const data =
        (await response.json()) as SaveProgressResponse;

    if (
        data.type !== 'progress-saved' ||
        typeof data.updatedAt !== 'string'
    ) {
        throw new Error('Unexpected save response.');
    }

    return data;
}
