
import type { PublicCase } from '../shared/case';

import {
    MAX_NOTE_LENGTH,
    type DetectiveNotebook,
    type SuspectStatus,
} from '../shared/notebook';

export function createNotebook(
    caseId: string
): DetectiveNotebook {
    return {
        version: 1,
        caseId,
        notes: '',
        pinnedEvidenceIds: [],
        suspectStatuses: {},
    };
}

export function updateNotebookNotes(
    notebook: DetectiveNotebook,
    notes: string
): DetectiveNotebook {
    return {
        ...notebook,
        notes: notes.slice(0, MAX_NOTE_LENGTH),
    };
}

export function togglePinnedEvidence(
    notebook: DetectiveNotebook,
    gameCase: PublicCase,
    evidenceId: string
): DetectiveNotebook {
    if (notebook.caseId !== gameCase.id) {
        return notebook;
    }

    const exists = gameCase.evidence.some(
        (item) => item.id === evidenceId
    );

    if (!exists) {
        return notebook;
    }

    const alreadyPinned =
        notebook.pinnedEvidenceIds.includes(evidenceId);

    const pinnedEvidenceIds = alreadyPinned
        ? notebook.pinnedEvidenceIds.filter(
            (id) => id !== evidenceId
        )
        : [...notebook.pinnedEvidenceIds, evidenceId];

    return {
        ...notebook,
        pinnedEvidenceIds,
    };
}

export function updateSuspectStatus(
    notebook: DetectiveNotebook,
    gameCase: PublicCase,
    suspectId: string,
    status: SuspectStatus
): DetectiveNotebook {
    if (notebook.caseId !== gameCase.id) {
        return notebook;
    }

    const exists = gameCase.suspects.some(
        (suspect) => suspect.id === suspectId
    );

    if (!exists) {
        return notebook;
    }

    const suspectStatuses = {
        ...notebook.suspectStatuses,
    };

    if (status === 'unmarked') {
        delete suspectStatuses[suspectId];
    } else {
        suspectStatuses[suspectId] = status;
    }

    return {
        ...notebook,
        suspectStatuses,
    };
}

export function getSuspectStatus(
    notebook: DetectiveNotebook,
    suspectId: string
): SuspectStatus {
    return (
        notebook.suspectStatuses[suspectId] ??
        'unmarked'
    );
}

export function getPinnedEvidence(
    notebook: DetectiveNotebook,
    gameCase: PublicCase
): PublicCase['evidence'] {
    if (notebook.caseId !== gameCase.id) {
        return [];
    }

    return gameCase.evidence.filter(
        (item) =>
            notebook.pinnedEvidenceIds.includes(item.id)
    );
}
