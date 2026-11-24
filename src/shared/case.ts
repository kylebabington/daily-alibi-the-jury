
import type {
    InvestigationRules,
    Motive,
    ScoringRules,
} from './investigation';

export type Suspect = {
    id: string;
    name: string;
    role: string;
    statement: string;
};

export type Evidence = {
    id: string;
    title: string;
    category: string;
    description: string;
};

export type BasePublicCase = {
    id: string;
    number: number;
    title: string;
    location: string;
    time: string;
    introduction: string[];
    suspects: Suspect[];
    evidence: Evidence[];
    maxScore: number;
};

export type LegacyPublicCase = BasePublicCase & {
    version?: 1;
};

export type AdvancedPublicCase = BasePublicCase & {
    version: 2;
    investigation: InvestigationRules;
    scoring: ScoringRules;
    motives: Motive[];
};

export type PublicCase =
    | LegacyPublicCase
    | AdvancedPublicCase;
