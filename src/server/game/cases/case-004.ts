
import type { AdvancedPrivateCase } from '../case';

export const CASE_004: AdvancedPrivateCase = {
    public: {
        version: 2,
        id: 'case-004',
        number: 4,
        title: 'Notebook Test Case',
        location: 'Ashford Manor',
        time: '12:07 AM',

        introduction: [
            'A private dinner at Ashford Manor has ended in tragedy. Edmund Ashford, a wealthy estate owner and businessman, has been discovered dead in his study.',

            'Six people remained inside the manor after dinner. A storm had made the surrounding roads impassable, and the estate security system recorded no unauthorized visitors.',

            'The preliminary examination indicates that Edmund died from a fatal injury sustained during a confrontation. However, the time of the incident remains disputed.',

            'Three clocks tell different stories. Several witnesses insist their accounts are accurate, yet their statements cannot all be true.',

            'Reconstruct the timeline, separate deception from guilt, and determine who killed Edmund Ashford and why.',
        ],

        maxScore: 300,

        investigation: {
            difficulty: 'inspector',
            estimatedMinutes: 12,
            requiredEvidenceCount: 3,
            requiresMotive: true,
        },

        scoring: {
            suspectPoints: 100,
            motivePoints: 50,
            evidencePointsPerItem: 50,
        },

        suspects: [
            {
                id: 'eleanor',
                name: 'Eleanor Ashford',
                role: 'Wife',
                statement:
                    'Edmund and I argued after dinner, but that was nothing unusual. I went to the conservatory at approximately 11:45 and remained there until Clara came looking for me. I had no reason to enter his study.',
            },
            {
                id: 'julian',
                name: 'Julian Ashford',
                role: 'Son',
                statement:
                    'I was in the billiard room from 11:40 until midnight. My father and I disagreed about money, but I would never hurt him. I heard nothing unusual.',
            },
            {
                id: 'evelyn',
                name: 'Dr. Evelyn Shaw',
                role: 'Family physician',
                statement:
                    'I was attending to a telephone consultation in the guest lounge. Edmund had recently threatened to make a complaint against me, but the matter was purely professional.',
            },
            {
                id: 'marcus',
                name: 'Marcus Vale',
                role: 'Business partner',
                statement:
                    'Edmund wanted to discuss our company accounts. We spoke earlier in the evening. I spent the period from 11:50 until midnight alone in the library, reading.',
            },
            {
                id: 'clara',
                name: 'Clara Whitmore',
                role: 'Estate manager',
                statement:
                    'I was supervising the kitchen cleanup. At seven minutes past midnight, I entered the study to collect Edmund’s dinner notes. That was when I discovered him.',
            },
            {
                id: 'sebastian',
                name: 'Sebastian Reed',
                role: 'Family attorney',
                statement:
                    'I was on a confidential telephone call in the west office from 11:50 until midnight. Edmund had requested several legal documents, but I had already delivered them before dinner.',
            },
        ],

        motives: [
            {
                id: 'inheritance',
                title: 'Inheritance',
                description:
                    'Prevent an unfavorable change to Edmund’s estate and secure a financial inheritance.',
            },
            {
                id: 'personal-debt',
                title: 'Personal debt',
                description:
                    'Escape mounting financial obligations and pressure from Edmund.',
            },
            {
                id: 'professional-scandal',
                title: 'Professional scandal',
                description:
                    'Prevent the disclosure of damaging professional misconduct.',
            },
            {
                id: 'financial-fraud',
                title: 'Financial fraud',
                description:
                    'Prevent an investigation into missing company funds.',
            },
            {
                id: 'dismissal',
                title: 'Threatened dismissal',
                description:
                    'Retaliate against Edmund for threatening someone’s employment.',
            },
            {
                id: 'legal-concealment',
                title: 'Concealed legal misconduct',
                description:
                    'Prevent the discovery of unauthorized alterations to legal documents.',
            },
        ],

        evidence: [
            {
                id: 'study-clock',
                title: 'The Stopped Study Clock',
                category: 'PHYSICAL',
                description:
                    'A damaged mechanical clock lies beside Edmund’s desk. Its hands stopped at 11:51 PM. Investigators believe it was damaged during the confrontation. The clock has no automatic time synchronization.',
            },
            {
                id: 'hall-clock',
                title: 'The Grandfather Clock',
                category: 'OBSERVATION',
                description:
                    'The entrance hall clock displayed 12:07 AM when Clara discovered Edmund. Its chimes had been unreliable since a maintenance visit earlier that week.',
            },
            {
                id: 'clock-calibration',
                title: 'The Clockmaker’s Service Report',
                category: 'DOCUMENT',
                description:
                    'A service report completed at 11:30 PM records the study clock as exactly six minutes slow and the entrance hall clock as exactly four minutes fast. Neither clock was adjusted because replacement components were required. The estate’s digital security system was independently synchronized to network time.',
            },
            {
                id: 'medical-report',
                title: 'Preliminary Medical Examination',
                category: 'FORENSIC',
                description:
                    'Edmund sustained a fatal injury during a confrontation. The injury is consistent with the disturbance around his desk. The preliminary examination places the incident between 11:50 PM and midnight, but cannot establish an exact minute.',
            },
            {
                id: 'conservatory-recording',
                title: 'Conservatory Security Recording',
                category: 'SECURITY',
                description:
                    'Continuous network-timestamped footage shows Eleanor in the conservatory from 11:46 PM until 12:02 AM. The recording covers both exits, and she does not leave during that interval.',
            },
            {
                id: 'estate-will',
                title: 'The Revised Will',
                category: 'DOCUMENT',
                description:
                    'An unsigned revision to Edmund’s will would significantly reduce Eleanor’s inheritance. A handwritten note indicates that Edmund intended to discuss the revision with his attorney the following morning.',
            },
            {
                id: 'billiard-room',
                title: 'The Billiard Room Photograph',
                category: 'PHOTOGRAPH',
                description:
                    'A photograph taken by a member of staff at 11:43 PM shows Julian alone beside the billiard table. The photograph confirms his presence at that moment, but does not establish where he spent the remainder of the evening.',
            },
            {
                id: 'julian-message',
                title: 'Julian’s Deleted Messages',
                category: 'DIGITAL',
                description:
                    'Recovered messages reveal that Julian secretly met an estate employee in the greenhouse. He asked the employee not to tell his father. The messages suggest that his billiard-room statement conceals a personal relationship.',
            },
            {
                id: 'greenhouse-recording',
                title: 'Greenhouse Camera Footage',
                category: 'SECURITY',
                description:
                    'Continuous footage shows Julian and the estate employee inside the greenhouse from 11:49 PM until 12:01 AM. Both remain visible throughout the recording.',
            },
            {
                id: 'medical-complaint',
                title: 'The Physician’s Complaint File',
                category: 'DOCUMENT',
                description:
                    'Edmund had prepared a formal complaint concerning an incorrect medical diagnosis. The complaint could damage Dr. Shaw’s professional reputation. It had not yet been submitted.',
            },
            {
                id: 'consultation-recording',
                title: 'Guest Lounge Consultation',
                category: 'DIGITAL',
                description:
                    'A recorded video consultation shows Dr. Shaw continuously visible in the guest lounge between 11:48 PM and 12:02 AM. The consultation provider independently verified its timestamps.',
            },
            {
                id: 'kitchen-recording',
                title: 'Kitchen Security Recording',
                category: 'SECURITY',
                description:
                    'Continuous kitchen footage shows Clara supervising staff from 11:44 PM until 12:01 AM. She leaves at 12:01 AM and proceeds toward the study. The footage uses synchronized network time.',
            },
            {
                id: 'office-call',
                title: 'West Office Telephone Record',
                category: 'DIGITAL',
                description:
                    'The west office telephone registered an outgoing call beginning at 11:50 PM and ending at midnight. The recipient confirms that Sebastian remained in conversation throughout. Continuous office security footage independently confirms that he did not leave.',
            },
            {
                id: 'legal-draft',
                title: 'The Unapproved Legal Draft',
                category: 'DOCUMENT',
                description:
                    'A draft property transfer contains alterations made without Edmund’s written approval. Sebastian prepared the draft. Correspondence indicates that Edmund had demanded an explanation, but the transfer had never been executed.',
            },
            {
                id: 'library-access',
                title: 'Library and Study Access Records',
                category: 'SECURITY',
                description:
                    'The library’s only doorway is monitored by a synchronized security camera. Marcus leaves at 11:53 PM and returns at 11:59 PM. A separate recording shows a person wearing the same distinctive dinner jacket entering the study corridor. The face is obscured. All other routes into the study remained continuously monitored, with no additional visitors recorded during this interval.',
            },
            {
                id: 'audit-memorandum',
                title: 'The Confidential Audit Memorandum',
                category: 'FINANCIAL',
                description:
                    'An independent auditor identified substantial unauthorized transfers from Edmund’s company into an account controlled by Marcus. Edmund had scheduled a private confrontation for that evening and intended to submit the findings to investigators the following morning. Marcus had received a copy of the memorandum before dinner.',
            },
        ],
    },

    solution: {
        suspectId: 'marcus',
        motiveId: 'financial-fraud',

        evidenceIds: [
            'clock-calibration',
            'library-access',
            'audit-memorandum',
        ],

        explanation: [
            'Marcus Vale was responsible for Edmund Ashford’s death. His motive was to prevent the disclosure of financial fraud.',

            'The damaged study clock stopped at 11:51 PM. According to the clockmaker’s service report, it was six minutes slow. The confrontation therefore occurred at approximately 11:57 PM in synchronized network time.',

            'The entrance hall clock was four minutes fast. Clara’s reported discovery at 12:07 AM actually occurred at approximately 12:03 AM. Her statement was consistent with the faulty clock rather than an attempt to deceive investigators.',

            'At 11:57 PM, Eleanor was in the conservatory, Julian was in the greenhouse, Dr. Shaw was attending a video consultation, Clara was supervising the kitchen, and Sebastian was in the west office. Their locations were independently corroborated.',

            'Marcus claimed that he remained in the library from 11:50 PM until midnight. The synchronized access records contradict his statement: he left at 11:53 PM and returned at 11:59 PM. The study corridor recording places someone matching his clothing near the study during that interval.',

            'The confidential audit memorandum establishes the motive. Marcus controlled the account that received unauthorized company transfers. Edmund intended to expose the misconduct the following morning.',

            'Julian lied to conceal a personal relationship. Eleanor, Dr. Shaw, and Sebastian all had reasons to fear Edmund, but their independently verified alibis excluded them from the confrontation.',

            'The decisive evidence chain is the clockmaker’s service report, the library and study access records, and the confidential audit memorandum. Together, they establish the corrected timeline, contradict Marcus’s alibi, and explain his motive.',
        ],
    },
};
