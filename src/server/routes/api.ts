import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import type {
  DecrementResponse,
  IncrementResponse,
  InitResponse,
  GameErrorResponse,
  AnyCaseResponse,
  AnyVerdictResponse,
} from '../../shared/api';

import { isAdvancedCase } from '../game/case';

import {
  createSavedVerdict,
  readSavedVerdict,
  SubmissionError,
} from '../game/submission';

import { serializeVerdict } from '../game/verdict';

import {
  getDailyCase,
  getNextReset,
  getVerdictsKey,
  getProgressKey,
} from '../game/daily';

import type {
  ProgressResponse,
  SaveProgressResponse,
} from '../../shared/progress';

import {
  createSavedProgress,
  deserializeProgress,
  serializeProgress,
  validateProgress,
} from '../game/progress';

type ErrorResponse = {
  status: 'error';
  message: string;
};

export const api = new Hono();


api.get('/init', async (c) => {
  const { postId } = context;

  if (!postId) {
    console.error(
      'API Init Error: postId not found in devvit context'
    );

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
      postId,
      count: count ? parseInt(count) : 0,
      username: username ?? 'anonymous',
    });
  } catch (error) {
    console.error(
      `API Init Error for post ${postId}:`,
      error
    );

    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'Initialization failed.',
      },
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

    const verdict = saved == null
      ? null
      : readSavedVerdict(gameCase, saved);

    const common = {
      type: 'case' as const,
      caseId,
      username: username ?? 'unknown',
      nextResetAt: getNextReset(now),
    };

    if (isAdvancedCase(gameCase)) {
      if (verdict && verdict.version !== 2) {
        throw new Error('Unexpected verdict version.');
      }

      return c.json<AnyCaseResponse>({
        ...common,
        publicCase: gameCase.public,
        verdict,
        solution: verdict ? gameCase.solution : null,
      });
    }

    if (verdict?.version === 2) {
      throw new Error('Unexpected verdict version.');
    }

    return c.json<AnyCaseResponse>({
      ...common,
      publicCase: gameCase.public,
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

  let body: unknown;

  try {
    body = await c.req.json<unknown>();
  } catch {
    return c.json<GameErrorResponse>(
      {
        status: 'error',
        message: 'Invalid JSON request.',
      },
      400
    );
  }

  try {
    const now = new Date();
    const gameCase = getDailyCase(now);
    const caseId = gameCase.public.id;

    const candidate = createSavedVerdict(
      gameCase,
      body,
      now
    );

    const verdictsKey = getVerdictsKey(caseId);

    const inserted = await redis.hSetNX(
      verdictsKey,
      userId,
      serializeVerdict(candidate)
    );

    const alreadySubmitted = inserted !== 1;

    let verdict = candidate;

    if (alreadySubmitted) {
      const saved = await redis.hGet(
        verdictsKey,
        userId
      );

      if (saved == null) {
        throw new Error(
          'Existing verdict could not be retrieved.'
        );
      }

      verdict = readSavedVerdict(gameCase, saved);
    }

    if (isAdvancedCase(gameCase)) {
      if (verdict.version !== 2) {
        throw new Error('Unexpected verdict version.');
      }

      return c.json<AnyVerdictResponse>({
        type: 'verdict',
        verdict,
        solution: gameCase.solution,
        alreadySubmitted,
      });
    }

    if (verdict.version === 2) {
      throw new Error('Unexpected verdict version.');
    }

    return c.json<AnyVerdictResponse>({
      type: 'verdict',
      verdict,
      solution: gameCase.solution,
      alreadySubmitted,
    });
  } catch (error) {
    if (error instanceof SubmissionError) {
      return c.json<GameErrorResponse>(
        {
          status: 'error',
          message: error.message,
        },
        error.status
      );
    }

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


api.get('/progress', async (c) => {
  c.header('Cache-Control', 'no-store');

  const userId = context.userId;

  if (!userId) {
    return c.json<GameErrorResponse>(
      {
        status: 'error',
        message: 'Sign in to retrieve your investigation.',
      },
      401
    );
  }

  try {
    const gameCase = getDailyCase();
    const caseId = gameCase.public.id;

    const requestedCaseId = c.req.query('caseId');

    if (!requestedCaseId) {
      return c.json<GameErrorResponse>(
        {
          status: 'error',
          message: 'A case ID is required.',
        },
        400
      );
    }

    if (requestedCaseId !== caseId) {
      return c.json<GameErrorResponse>(
        {
          status: 'error',
          message:
            'The daily case has changed. Reload the game to continue.',
        },
        409
      );
    }

    const [savedVerdict, savedProgress] =
      await Promise.all([
        redis.hGet(
          getVerdictsKey(caseId),
          userId
        ),
        redis.hGet(
          getProgressKey(caseId),
          userId
        ),
      ]);

    // A completed verdict always takes priority.
    if (savedVerdict != null) {
      return c.json<GameErrorResponse>(
        {
          status: 'error',
          message:
            'This investigation is already complete. Reload the game to view your verdict.',
        },
        409
      );
    }

    const progress =
      savedProgress == null
        ? null
        : deserializeProgress(
          gameCase.public,
          savedProgress
        );

    return c.json<ProgressResponse>({
      type: 'progress',
      progress,
    });
  } catch (error) {
    console.error(
      'Failed to retrieve investigation progress:',
      error
    );

    return c.json<GameErrorResponse>(
      {
        status: 'error',
        message: 'Unable to retrieve your investigation.',
      },
      500
    );
  }
});


api.post('/progress', async (c) => {
  c.header('Cache-Control', 'no-store');

  const userId = context.userId;

  if (!userId) {
    return c.json<GameErrorResponse>(
      {
        status: 'error',
        message: 'Sign in to save your investigation.',
      },
      401
    );
  }

  let body: unknown;

  try {
    const raw = await c.req.text();

    if (
      new TextEncoder().encode(raw).byteLength >
      65536
    ) {
      return c.json<GameErrorResponse>(
        {
          status: 'error',
          message: 'Investigation progress is too large.',
        },
        413
      );
    }

    body = JSON.parse(raw) as unknown;
  } catch {
    return c.json<GameErrorResponse>(
      {
        status: 'error',
        message: 'Invalid JSON request.',
      },
      400
    );
  }

  try {
    const gameCase = getDailyCase();
    const caseId = gameCase.public.id;

    if (
      typeof body === 'object' &&
      body !== null &&
      'caseId' in body &&
      typeof body.caseId === 'string' &&
      body.caseId !== caseId
    ) {
      return c.json<GameErrorResponse>(
        {
          status: 'error',
          message:
            'The daily case has changed. Reload the game to continue.',
        },
        409
      );
    }

    if (!validateProgress(gameCase.public, body)) {
      return c.json<GameErrorResponse>(
        {
          status: 'error',
          message: 'Invalid investigation progress.',
        },
        400
      );
    }

    const savedVerdict = await redis.hGet(
      getVerdictsKey(caseId),
      userId
    );

    if (savedVerdict != null) {
      return c.json<GameErrorResponse>(
        {
          status: 'error',
          message: 'This investigation is already complete.',
        },
        409
      );
    }

    const progress = createSavedProgress(
      gameCase.public,
      body
    );

    await redis.hSet(
      getProgressKey(caseId),
      {
        [userId]: serializeProgress(progress),
      }
    );

    return c.json<SaveProgressResponse>({
      type: 'progress-saved',
      updatedAt: progress.updatedAt,
    });
  } catch (error) {
    console.error(
      'Failed to save investigation progress:',
      error
    );

    return c.json<GameErrorResponse>(
      {
        status: 'error',
        message: 'Unable to save your investigation.',
      },
      500
    );
  }
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





