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
  isCaseSuspect,
  isCaseEvidence,
  scoreCase,
} from '../game/case';

import {
  getDailyCase,
  getNextReset,
  getVerdictsKey,
} from '../game/daily';

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


api.get('/case', async (c) => {
  c.header('Cache-Control', 'no-store');

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
    const now = new Date();
    const gameCase = getDailyCase(now);
    const caseId = gameCase.public.id;
    const verdictsKey = getVerdictsKey(caseId);

    const [username, saved] = await Promise.all([
      reddit.getCurrentUsername(),
      redis.hGet(verdictsKey, userId),
    ]);

    const verdict: SavedVerdict | null = saved
      ? (JSON.parse(saved) as SavedVerdict)
      : null;

    return c.json<CaseResponse>({
      type: 'case',
      caseId,
      username: username ?? 'unknown',
      publicCase: gameCase.public,
      nextResetAt: getNextReset(now),
      verdict,
      solution: verdict ? gameCase.solution : null,
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
  c.header('Cache-Control', 'no-store');

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
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    typeof body.caseId !== 'string'
  ) {
    return c.json<GameErrorResponse>(
      {
        status: 'error',
        message: 'Invalid verdict request.',
      },
      400
    );
  }

  try {
    const now = new Date();
    const gameCase = getDailyCase(now);
    const caseId = gameCase.public.id;

    if (body.caseId !== caseId) {
      return c.json<GameErrorResponse>(
        {
          status: 'error',
          message: 'The daily case has changed. Reload to investigate the new case.',
        },
        409
      );
    }

    if (
      !isCaseSuspect(gameCase, body.suspectId) ||
      !isCaseEvidence(gameCase, body.evidenceId)
    ) {
      return c.json<GameErrorResponse>(
        {
          status: 'error',
          message: 'Invalid suspect or evidence selection.',
        },
        400
      );
    }

    const verdictsKey = getVerdictsKey(caseId);

    const verdict: SavedVerdict = {
      caseId,
      suspectId: body.suspectId,
      evidenceId: body.evidenceId,
      score: scoreCase(
        gameCase,
        body.suspectId,
        body.evidenceId
      ),
      submittedAt: now.toISOString(),
    };

    const inserted = await redis.hSetNX(
      verdictsKey,
      userId,
      JSON.stringify(verdict)
    );

    if (inserted === 1) {
      return c.json<VerdictResponse>({
        type: 'verdict',
        verdict,
        solution: gameCase.solution,
        alreadySubmitted: false,
      });
    }

    const saved = await redis.hGet(
      verdictsKey,
      userId
    );

    if (!saved) {
      throw new Error(
        'Existing verdict could not be retrieved.'
      );
    }

    return c.json<VerdictResponse>({
      type: 'verdict',
      verdict: JSON.parse(saved) as SavedVerdict,
      solution: gameCase.solution,
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

