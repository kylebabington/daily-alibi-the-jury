
import type { DetectiveNotebook } from './notebook';

export type InvestigationTab =
    | 'evidence'
    | 'suspects'
    | 'notebook';

export type InvestigationScreen =
    | 'intro'
    | 'investigate'
    | 'verdict';

export type DraftVerdict = {
    suspectId: string;
    motiveId: string | null;
    evidenceIds: string[];
};

export type InvestigationProgress = {
    version: 1;
    caseId: string;
    notebook: DetectiveNotebook;
    selections: DraftVerdict;
    activeTab: InvestigationTab;
    screen: InvestigationScreen;
};

export type SavedInvestigationProgress =
    InvestigationProgress & {
        updatedAt: string;
    };

export type ProgressResponse = {
    type: 'progress';
    progress: SavedInvestigationProgress | null;
};

export type SaveProgressResponse = {
    type: 'progress-saved';
    updatedAt: string;
};

export const PROGRESS_VERSION = 1;
export const AUTOSAVE_DELAY_MS = 750;
