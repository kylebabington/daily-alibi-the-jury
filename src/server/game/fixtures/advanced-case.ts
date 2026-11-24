
import type { AdvancedPrivateCase } from '../case';

export const ADVANCED_TEST_CASE: AdvancedPrivateCase = {
    public: {
        version: 2,
        id: 'test-advanced',
        number: 999,
        title: 'Advanced Test Case',
        location: 'Test Location',
        time: '10:00 PM',

        introduction: [
            'This case exists exclusively for automated testing.',
        ],

        maxScore: 300,

        investigation: {
            difficulty: 'detective',
            estimatedMinutes: 5,
            requiredEvidenceCount: 3,
            requiresMotive: true,
        },

        scoring: {
            suspectPoints: 100,
            motivePoints: 50,
            evidencePointsPerItem: 50,
        },

        suspects: ['a', 'b', 'c', 'd'].map((id) => ({
            id: `suspect-${id}`,
            name: `Suspect ${id.toUpperCase()}`,
            role: 'Test suspect',
            statement: 'Test statement.',
        })),

        evidence: ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({
            id: `clue-${id}`,
            title: `Clue ${id.toUpperCase()}`,
            category: 'TEST',
            description: 'Test evidence description.',
        })),

        motives: [
            {
                id: 'financial',
                title: 'Financial gain',
                description: 'Test financial motive.',
            },
            {
                id: 'revenge',
                title: 'Revenge',
                description: 'Test revenge motive.',
            },
            {
                id: 'jealousy',
                title: 'Jealousy',
                description: 'Test jealousy motive.',
            },
        ],
    },

    solution: {
        suspectId: 'suspect-a',
        motiveId: 'financial',
        evidenceIds: [
            'clue-a',
            'clue-b',
            'clue-c',
        ],
        explanation: [
            'This is the official test solution.',
        ],
    },
};
