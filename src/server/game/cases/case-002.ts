
import type { PrivateCase } from '../case';

export const CASE_002: PrivateCase = {
    public: {
        id: 'case-002',
        number: 2,
        title: 'The Empty Frame',
        location: 'Blackwood Museum',
        time: '9:15 PM',

        introduction: [
            'A priceless painting has vanished from a secured museum gallery during a private exhibition.',
            'Four employees had access to the building. The security system recorded every entrance.',
            'Someone thought they could outsmart the cameras.',
        ],

        maxScore: 150,

        suspects: [
            {
                id: 'victor',
                name: 'Victor Hale',
                role: 'Museum Director',
                statement:
                    'I was giving a speech in the reception hall. I never entered the gallery.',
            },
            {
                id: 'clara',
                name: 'Clara Monroe',
                role: 'Art Conservator',
                statement:
                    'I was working in the restoration laboratory. I did not leave during the exhibition.',
            },
            {
                id: 'owen',
                name: 'Owen Price',
                role: 'Security Officer',
                statement:
                    'I remained at the security desk throughout the evening.',
            },
            {
                id: 'iris',
                name: 'Iris Bell',
                role: 'Exhibition Coordinator',
                statement:
                    'I entered the gallery earlier to check the lighting, but I never touched the painting.',
            },
        ],

        evidence: [
            {
                id: 'frame-sensor',
                title: 'The Frame Sensor',
                category: 'TIMELINE',
                description:
                    'A sensor behind the painting recorded its removal at exactly 9:15 PM.',
            },
            {
                id: 'reception-recording',
                title: 'The Reception Recording',
                category: 'SURVEILLANCE',
                description:
                    'An uninterrupted recording shows Victor delivering his speech from 9:05 PM until 9:25 PM.',
            },
            {
                id: 'laboratory-camera',
                title: 'The Laboratory Camera',
                category: 'SURVEILLANCE',
                description:
                    'Laboratory footage shows Clara working at her restoration table continuously from 9:00 PM until 9:30 PM.',
            },
            {
                id: 'security-desk',
                title: 'The Security Desk',
                category: 'SURVEILLANCE',
                description:
                    'An independent camera records Owen at the security desk from 9:10 PM until 9:20 PM.',
            },
            {
                id: 'gallery-access',
                title: 'The Gallery Access Log',
                category: 'ACCESS',
                description:
                    'The gallery has one entrance and no other exits. Iris entered at 9:12 PM and left at 9:18 PM. No other person was inside during that interval.',
            },
            {
                id: 'transport-case',
                title: 'The Transport Case',
                category: 'INVENTORY',
                description:
                    'An empty art transport case was delivered to the exhibition preparation room earlier that afternoon. All four employees were authorized to use it.',
            },
        ],
    },

    solution: {
        suspectId: 'iris',
        evidenceId: 'gallery-access',

        explanation: [
            'Iris Bell removed the painting. The frame sensor establishes the exact time of the theft as 9:15 PM.',
            'The gallery access log proves that Iris was the only person inside the secured gallery when the painting was removed.',
            'Victor, Clara, and Owen were independently recorded elsewhere during the theft.',
            'The transport case was suspicious, but all four employees had access to it. It could not independently identify the culprit.',
        ],
    },
};
