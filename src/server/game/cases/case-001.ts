
import type { PrivateCase } from '../case';

export const CASE_001: PrivateCase = {
    public: {
        id: 'case-001',
        number: 1,
        title: 'Last Train Out',
        location: 'Union Station',
        time: '11:42 PM',

        introduction: [
            "A rare silver pocket watch vanished from the station manager's locked office.",
            'The theft occurred between 11:40 and 11:43 PM. Four people were inside the station.',
            'One of them is lying.',
        ],

        maxScore: 150,

        suspects: [
            {
                id: 'arthur',
                name: 'Arthur Vale',
                role: 'Station Manager',
                statement:
                    'I was in the control room reviewing the departure log. I never returned to my office.',
            },
            {
                id: 'mara',
                name: 'Mara Chen',
                role: 'Train Conductor',
                statement:
                    'I was on Platform 2 checking the final train until it departed at 11:45.',
            },
            {
                id: 'elias',
                name: 'Elias Reed',
                role: 'Maintenance Technician',
                statement:
                    'I was repairing the signal cabinet in the east tunnel.',
            },
            {
                id: 'nina',
                name: 'Nina Brooks',
                role: 'Passenger',
                statement:
                    "I was waiting in the main hall. I never went near the manager's office.",
            },
        ],

        evidence: [
            {
                id: 'key-register',
                title: 'The Key Register',
                category: 'ACCESS',
                description:
                    "Only two keys open the manager's office. Key A remained on Arthur's secured key ring in the control room. Key B was stored in the emergency cabinet.",
            },
            {
                id: 'departure-log',
                title: 'The Departure Log',
                category: 'TIMELINE',
                description:
                    'Continuous control-room footage places Arthur there from 11:35 PM through 11:45 PM.',
            },
            {
                id: 'platform-camera',
                title: 'Camera 2B',
                category: 'SURVEILLANCE',
                description:
                    'Continuous footage places Mara on Platform 2 from 11:36 PM until the train departed at 11:45 PM.',
            },
            {
                id: 'signal-repair',
                title: 'The Signal Repair',
                category: 'MAINTENANCE',
                description:
                    'Continuous tunnel footage places Elias at the east signal cabinet from 11:34 PM through 11:57 PM.',
            },
            {
                id: 'hall-camera',
                title: 'The Waiting Hall',
                category: 'SURVEILLANCE',
                description:
                    "Nina appears on camera at 11:35 PM and 11:46 PM. The corridor to the office is outside the camera's view.",
            },
            {
                id: 'key-cabinet',
                title: 'The Emergency Key',
                category: 'ACCESS',
                description:
                    'Cabinet footage shows Nina removing Key B at 11:39 PM, returning it at 11:44 PM, and replacing the numbered security seal.',
            },
        ],
    },

    solution: {
        suspectId: 'nina',
        evidenceId: 'key-cabinet',

        explanation: [
            'Nina Brooks stole the watch. She took the emergency office key at 11:39 PM and returned it at 11:44 PM. The security recording directly contradicts her claim that she remained in the waiting hall.',
            'Arthur, Mara, and Elias were continuously recorded elsewhere during the theft window.',
        ],
    },
};
