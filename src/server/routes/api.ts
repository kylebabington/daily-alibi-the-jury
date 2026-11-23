import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import type {
  DecrementResponse,
  IncrementResponse,
  InitResponse,
  CaseResponse,
  GameErrorResponse,
  SavedVerdict,
  VerdictRequest,
  VerdictResponse,
} from '../../shared/api';

import {
  CASE_ID,
  calculateScore,
  isValidEvidence,
  isValidSuspect,
} from '../game/case';

type ErrorResponse = {
  status: 'error';
  message: string;
};

export const api = new Hono();

api.get('/init', async (c) => {
  const { postId } = context;

  if (!postId) {
    console.error('API Init Error: postId not found in devvit context');
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'postId is required but missing from context',
      },
      400
    );
  }

  try {
    const [count, username] = await Promise.all([
      redis.get('count'),
      reddit.getCurrentUsername(),
    ]);

    return c.json<InitResponse>({
      type: 'init',
      postId: postId,
      count: count ? parseInt(count) : 0,
      username: username ?? 'anonymous',
    });
  } catch (error) {
    console.error(`API Init Error for post ${postId}:`, error);
    let errorMessage = 'Unknown error during initialization';
    if (error instanceof Error) {
      errorMessage = `Initialization failed: ${error.message}`;
    }
    return c.json<ErrorResponse>(
      { status: 'error', message: errorMessage },
      400
    );
  }
});

api.post('/increment', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'postId is required',
      },
      400
    );
  }

  const count = await redis.incrBy('count', 1);
  return c.json<IncrementResponse>({
    count,
    postId,
    type: 'increment',
  });
});

api.post('/decrement', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'postId is required',
      },
      400
    );
  }

  const count = await redis.incrBy('count', -1);
  return c.json<DecrementResponse>({
    count,
    postId,
    type: 'decrement',
  });
});

const VERDICTS_KEY = `daily-alibi:${CASE_ID}:verdicts`;

api.get('/case', async (c) => {
  const userId = context.userId;

  if (!userId) {
    return c.json<GameErrorResponse>(
      {
        status: 'error',
        message: 'Sign in to Reddit to play.',
      },
      401
    );
  }

  try {
    const [username, saved] = await Promise.all([
      reddit.getCurrentUsername(),
      redis.hGet(VERDICTS_KEY, userId),
    ]);

    const verdict: SavedVerdict | null = saved
      ? (JSON.parse(saved) as SavedVerdict)
      : null;

    return c.json<CaseResponse>({
      type: 'case',
      caseId: CASE_ID,
      username: username ?? 'unknown',
      verdict,
    });
  } catch (error) {
    console.error('Failed to load case:', error);
    return c.json<GameErrorResponse>(
      {
        status: 'error',
        message: 'Unable to load your case progress.',
      },
      500
    );
  }
});

api.post('/verdict', async (c) => {
  const userId = context.userId;

  if (!userId) {
    return c.json<GameErrorResponse>(
      {
        status: 'error',
        message: 'Sign in to Reddit to submit a verdict.',
      },
      401
    );
  }

  let body: VerdictRequest;

  try {
    body = await c.req.json<VerdictRequest>();
  } catch {
    return c.json<GameErrorResponse>(
      {
        status: 'error',
        message: 'Invalid JSON request.',
      },
      400
    );
  }

  if (
    body.caseId !== CASE_ID ||
    !isValidSuspect(body.suspectId) ||
    !isValidEvidence(body.evidenceId)
  ) {
    return c.json<GameErrorResponse>(
      {
        status: 'error',
        message: 'Invalid case, suspect, or evidence selection.',
      },
      400
    );
  }

  try {
    const verdict: SavedVerdict = {
      caseId: CASE_ID,
      suspectId: body.suspectId,
      evidenceId: body.evidenceId,
      score: calculateScore(body.suspectId, body.evidenceId),
      submittedAt: new Date().toISOString(),
    };

    const inserted = await redis.hSetNX(
      VERDICTS_KEY,
      userId,
      JSON.stringify(verdict)
    );

    if (inserted === 1) {
      return c.json<VerdictResponse>({
        type: 'verdict',
        verdict,
        alreadySubmitted: false,
      });
    }

    const saved = await redis.hGet(VERDICTS_KEY, userId);

    if (!saved) {
      throw new Error('Existing verdict could not be retrieved.');
    }

    return c.json<VerdictResponse>({
      type: 'verdict',
      verdict: JSON.parse(saved) as SavedVerdict,
      alreadySubmitted: true,
    });
  } catch (error) {
    console.error('Failed to submit verdict:', error);

    return c.json<GameErrorResponse>(
      {
        status: 'error',
        message: 'Unable to save your verdict. Please try again.',
      },
      500
    );
  }
});

