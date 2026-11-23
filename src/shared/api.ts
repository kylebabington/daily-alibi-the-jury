export type InitResponse = {
  type: 'init';
  postId: string;
  count: number;
  username: string;
};

export type IncrementResponse = {
  type: 'increment';
  postId: string;
  count: number;
};

export type DecrementResponse = {
  type: 'decrement';
  postId: string;
  count: number;
};

/**
 * Daily Alibi: The Jury
 * Shared types used by both React and the server.
 */

export type VerdictRequest = {
  caseId: string;
  suspectId: string;
  evidenceId: string;
};

export type SavedVerdict = {
  caseId: string;
  suspectId: string;
  evidenceId: string;
  score: number;
  submittedAt: string;
};

export type CaseResponse = {
  type: 'case';
  caseId: string;
  username: string;
  verdict: SavedVerdict | null;
};

export type VerdictResponse = {
  type: 'verdict';
  verdict: SavedVerdict;
  alreadySubmitted: boolean;
};

export type GameErrorResponse = {
  status: 'error';
  message: string;
};
