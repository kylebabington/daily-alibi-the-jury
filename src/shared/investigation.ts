
export type Difficulty =
    | 'rookie'
    | 'detective'
    | 'inspector'
    | 'mastermind';

export type Motive = {
    id: string;
    title: string;
    description: string;
};

export type InvestigationRules = {
    difficulty: Difficulty;
    estimatedMinutes: number;
    requiredEvidenceCount: number;
    requiresMotive: boolean;
};

export type ScoringRules = {
    suspectPoints: number;
    motivePoints: number;
    evidencePointsPerItem: number;
};

export type AdvancedVerdictRequest = {
    caseId: string;
    suspectId: string;
    motiveId: string | null;
    evidenceIds: string[];
};

export type AdvancedCaseSolution = {
    suspectId: string;
    motiveId: string | null;
    evidenceIds: string[];
    explanation: string[];
};

export type ScoreBreakdown = {
    suspect: number;
    motive: number;
    evidence: number;
    total: number;
    maximum: number;
};

export type AdvancedSavedVerdict = {
    version: 2;
    caseId: string;
    suspectId: string;
    motiveId: string | null;
    evidenceIds: string[];
    score: number;
    breakdown: ScoreBreakdown;
    submittedAt: string;
};
