
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

export type PublicCase = {
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
