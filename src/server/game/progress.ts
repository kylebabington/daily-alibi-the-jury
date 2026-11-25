
import type { PublicCase } from '../../shared/case';

import type {
    InvestigationProgress,
    SavedInvestigationProgress,
} from '../../shared/progress';

import {
    MAX_NOTE_LENGTH,
    type SuspectStatus,
} from '../../shared/notebook.ts';

import { isRecord } from './validation.ts';

const VALID_STATUSES: ReadonlySet<string> = new Set([
    'unmarked',
    'investigate',
    'suspicious',
    'ruled-out',
]);

const VALID_TABS: ReadonlySet<string> = new Set([
    'evidence',
    'suspects',
    'notebook',
]);

const VALID_SCREENS: ReadonlySet<string> = new Set([
    'intro',
    'investigate',
    'verdict',
]);

export function validateProgress(
    gameCase: PublicCase,
    value: unknown
): value is InvestigationProgress {
    if (!isRecord(value)) return false;

    if (value.version !== 1) return false;

    if (value.caseId !== gameCase.id) return false;

    if (
        typeof value.activeTab !== 'string' ||
        !VALID_TABS.has(value.activeTab)
    ) {
        return false;
    }

    if (
        typeof value.screen !== 'string' ||
        !VALID_SCREENS.has(value.screen)
    ) {
        return false;
    }

    const validSuspects = new Set(
        gameCase.suspects.map((item) => item.id)
    );

    const validEvidence = new Set(
        gameCase.evidence.map((item) => item.id)
    );

    const notebook = value.notebook;

    if (!isRecord(notebook)) return false;

    if (notebook.version !== 1) return false;

    if (notebook.caseId !== gameCase.id) return false;

    if (
        typeof notebook.notes !== 'string' ||
        notebook.notes.length > MAX_NOTE_LENGTH
    ) {
        return false;
    }

    const pinned = notebook.pinnedEvidenceIds;

    if (!Array.isArray(pinned)) return false;

    if (pinned.length > validEvidence.size) {
        return false;
    }

    if (
        !pinned.every(
            (id: unknown) =>
                typeof id === 'string' &&
                validEvidence.has(id)
        )
    ) {
        return false;
    }

    if (new Set(pinned).size !== pinned.length) {
        return false;
    }

    const statuses = notebook.suspectStatuses;

    if (!isRecord(statuses)) return false;

    if (
        Object.keys(statuses).length >
        validSuspects.size
    ) {
        return false;
    }

    for (const [id, status] of Object.entries(statuses)) {
        if (!validSuspects.has(id)) return false;

        if (
            typeof status !== 'string' ||
            !VALID_STATUSES.has(status)
        ) {
            return false;
        }
    }

    const selections = value.selections;

    if (!isRecord(selections)) return false;

    if (typeof selections.suspectId !== 'string') {
        return false;
    }

    if (
        selections.suspectId !== '' &&
        !validSuspects.has(selections.suspectId)
    ) {
        return false;
    }

    const advanced = gameCase.version === 2;

    const motiveRequired =
        advanced && gameCase.investigation.requiresMotive;

    if (selections.motiveId !== null) {
        if (!advanced || !motiveRequired) return false;

        if (
            !gameCase.motives.some(
                (motive) => motive.id === selections.motiveId
            )
        ) {
            return false;
        }
    }

    const selectedEvidence = selections.evidenceIds;

    if (!Array.isArray(selectedEvidence)) {
        return false;
    }

    const maximumEvidence = advanced
        ? gameCase.investigation.requiredEvidenceCount
        : 1;

    if (selectedEvidence.length > maximumEvidence) {
        return false;
    }

    if (
        !selectedEvidence.every(
            (id: unknown) =>
                typeof id === 'string' &&
                validEvidence.has(id)
        )
    ) {
        return false;
    }

    if (
        new Set(selectedEvidence).size !==
        selectedEvidence.length
    ) {
        return false;
    }

    return true;
}

export function createSavedProgress(
    gameCase: PublicCase,
    value: unknown,
    now: Date = new Date()
): SavedInvestigationProgress {
    if (!validateProgress(gameCase, value)) {
        throw new Error('Invalid investigation progress.');
    }

    const suspectStatuses: Record<string, SuspectStatus> =
        Object.fromEntries(
            Object.entries(value.notebook.suspectStatuses)
                .filter(([, status]) => status !== 'unmarked')
        );

    return {
        version: 1,
        caseId: gameCase.id,

        notebook: {
            version: 1,
            caseId: gameCase.id,
            notes: value.notebook.notes,
            pinnedEvidenceIds: [
                ...value.notebook.pinnedEvidenceIds,
            ],
            suspectStatuses,
        },

        selections: {
            suspectId: value.selections.suspectId,
            motiveId: value.selections.motiveId,
            evidenceIds: [
                ...value.selections.evidenceIds,
            ],
        },

        activeTab: value.activeTab,
        screen: value.screen,
        updatedAt: now.toISOString(),
    };
}

export function serializeProgress(
    progress: SavedInvestigationProgress
): string {
    return JSON.stringify(progress);
}

export function deserializeProgress(
    gameCase: PublicCase,
    raw: string
): SavedInvestigationProgress {
    const value: unknown = JSON.parse(raw);

    if (!isRecord(value)) {
        throw new Error('Invalid stored progress.');
    }

    if (typeof value.updatedAt !== 'string') {
        throw new Error('Invalid progress timestamp.');
    }

    const timestamp = new Date(value.updatedAt);

    if (
        Number.isNaN(timestamp.getTime()) ||
        timestamp.toISOString() !== value.updatedAt
    ) {
        throw new Error('Invalid progress timestamp.');
    }

    return createSavedProgress(
        gameCase,
        value,
        timestamp
    );
}
