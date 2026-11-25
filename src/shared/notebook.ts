
export type SuspectStatus =
    | 'unmarked'
    | 'investigate'
    | 'suspicious'
    | 'ruled-out';

export type DetectiveNotebook = {
    version: 1;
    caseId: string;
    notes: string;
    pinnedEvidenceIds: string[];
    suspectStatuses: Record<string, SuspectStatus>;
};

export const MAX_NOTE_LENGTH = 5000;

export const SUSPECT_STATUS_LABELS: Record<
    SuspectStatus,
    string
> = {
    unmarked: 'Unmarked',
    investigate: 'Investigate',
    suspicious: 'Suspicious',
    'ruled-out': 'Ruled out',
};
