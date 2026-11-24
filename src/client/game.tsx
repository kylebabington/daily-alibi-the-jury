
import './index.css';

import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

import type { PublicCase } from '../shared/case';

import type {
  CaseResponse,
  CaseSolution,
  GameErrorResponse,
  SavedVerdict,
  VerdictResponse,
} from '../shared/api';

type Screen = 'intro' | 'investigate' | 'verdict' | 'results';
type Tab = 'evidence' | 'suspects';

export function App() {
  const [gameCase, setGameCase] = useState<PublicCase | null>(null);

  const [screen, setScreen] = useState<Screen>('intro');
  const [tab, setTab] = useState<Tab>('evidence');

  const [suspect, setSuspect] = useState('');
  const [clue, setClue] = useState('');

  const [expandedEvidence, setExpandedEvidence] =
    useState<string | null>(null);

  const [expandedSuspect, setExpandedSuspect] =
    useState<string | null>(null);

  const [savedVerdict, setSavedVerdict] =
    useState<SavedVerdict | null>(null);

  const [solution, setSolution] =
    useState<CaseSolution | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suspects = gameCase?.suspects ?? [];
  const evidence = gameCase?.evidence ?? [];

  const caseNumber = gameCase
    ? String(gameCase.number).padStart(3, '0')
    : '---';

  const isCorrect =
    savedVerdict !== null &&
    solution !== null &&
    savedVerdict.suspectId === solution.suspectId;

  const isEvidenceCorrect =
    savedVerdict !== null &&
    solution !== null &&
    savedVerdict.evidenceId === solution.evidenceId;

  const score = savedVerdict?.score ?? 0;

  useEffect(() => {
    let cancelled = false;

    async function loadCase() {
      try {
        const response = await fetch('/api/case');

        if (!response.ok) {
          const failure =
            await response.json() as GameErrorResponse;

          throw new Error(
            failure.message || 'Unable to load case.'
          );
        }

        const data =
          await response.json() as CaseResponse;

        if (cancelled) return;

        setGameCase(data.publicCase);

        if (data.verdict) {
          setSavedVerdict(data.verdict);
          setSolution(data.solution);
          setSuspect(data.verdict.suspectId);
          setClue(data.verdict.evidenceId);
          setScreen('results');
        }
      } catch (error) {
        if (!cancelled) {
          setError(
            error instanceof Error
              ? error.message
              : 'Unable to load case.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadCase();

    return () => {
      cancelled = true;
    };
  }, []);

  async function submitVerdict() {
    if (
      !gameCase ||
      !suspect ||
      !clue ||
      submitting ||
      savedVerdict ||
      loading ||
      error
    ) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/verdict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          caseId: gameCase.id,
          suspectId: suspect,
          evidenceId: clue,
        }),
      });

      if (!response.ok) {
        const failure =
          await response.json() as GameErrorResponse;

        throw new Error(
          failure.message || 'Unable to submit verdict.'
        );
      }

      const data =
        await response.json() as VerdictResponse;

      setSavedVerdict(data.verdict);
      setSolution(data.solution);
      setSuspect(data.verdict.suspectId);
      setClue(data.verdict.evidenceId);
      setScreen('results');
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to submit verdict.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  const buttonClass =
    'w-full rounded-xl bg-amber-400 px-5 py-3 font-bold text-slate-950 transition hover:bg-amber-300 active:scale-[0.98]';

  return (
    <div className="min-h-screen bg-[#101820] px-4 py-5 text-slate-100">
      <div className="mx-auto flex max-w-lg flex-col gap-5">

        <header className="flex items-center justify-between border-b border-slate-700 pb-3">
          <div>
            <p className="text-xs font-bold tracking-[0.25em] text-amber-400">
              DAILY ALIBI
            </p>

            <h1 className="text-xl font-black">
              THE JURY
            </h1>
          </div>

          <span className="rounded-lg border border-slate-600 px-3 py-1 text-xs">
            CASE {caseNumber}
          </span>
        </header>

        {loading && (
          <div
            role="status"
            className="rounded-xl bg-[#1c2731] p-5 text-center text-slate-300"
          >
            Loading your case file...
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/40 bg-[#1c2731] p-4"
          >
            <p className="font-bold text-red-300">
              Something went wrong
            </p>

            <p className="mt-2 text-sm text-slate-300">
              {error}
            </p>

            <button
              className="mt-3 text-sm font-bold text-amber-400 underline"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && gameCase && screen === 'intro' && (
          <section className="flex flex-col gap-5">

            <div className="rounded-2xl border border-amber-500/30 bg-[#1c2731] p-5">
              <p className="mb-2 text-xs uppercase tracking-widest text-amber-400">
                {gameCase.location} {'\u00B7'} {gameCase.time}
              </p>

              <h2 className="mb-3 text-3xl font-black uppercase">
                {gameCase.title}
              </h2>

              {gameCase.introduction.map((paragraph, index) => (
                <p
                  key={index}
                  className={
                    index === gameCase.introduction.length - 1
                      ? 'mt-3 font-semibold text-amber-300'
                      : 'mt-3 leading-7 text-slate-300'
                  }
                >
                  {paragraph}
                </p>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                [String(suspects.length), 'SUSPECTS'],
                [String(evidence.length), 'CLUES'],
                ['1', 'CULPRIT'],
              ].map(([number, label]) => (
                <div
                  key={label}
                  className="rounded-xl bg-[#1c2731] p-3"
                >
                  <div className="text-2xl font-black text-amber-400">
                    {number}
                  </div>

                  <div className="text-[10px] tracking-wider text-slate-400">
                    {label}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-sm text-slate-400">
              Investigate the evidence. Identify the culprit.
              Select the clue that proves your accusation.
            </p>

            <button
              className={buttonClass}
              onClick={() => setScreen('investigate')}
            >
              OPEN CASE FILE
            </button>

          </section>
        )}

        {!loading && !error && gameCase && screen === 'investigate' && (
          <section className="flex flex-col gap-4">

            <div>
              <h2 className="text-2xl font-black">
                Investigation
              </h2>

              <p className="text-sm text-slate-400">
                Examine the evidence before making your accusation.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(['evidence', 'suspects'] as const).map((item) => (
                <button
                  key={item}
                  onClick={() => setTab(item)}
                  aria-pressed={tab === item}
                  className={`rounded-xl px-4 py-3 font-bold capitalize ${tab === item
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-[#263440] text-slate-300'
                    }`}
                >
                  {item}
                </button>
              ))}
            </div>

            {tab === 'evidence' && (
              <div className="flex flex-col gap-3">

                {evidence.map((item, index) => (
                  <div
                    key={item.id}
                    className="overflow-hidden rounded-xl border border-slate-700 bg-[#1c2731]"
                  >
                    <button
                      className="w-full p-4 text-left"
                      aria-expanded={expandedEvidence === item.id}
                      onClick={() =>
                        setExpandedEvidence(
                          expandedEvidence === item.id
                            ? null
                            : item.id
                        )
                      }
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs text-amber-400">
                            EVIDENCE {String(index + 1).padStart(2, '0')}
                            {' \u00B7 '}
                            {item.category}
                          </p>

                          <h3 className="mt-1 font-bold">
                            {item.title}
                          </h3>
                        </div>

                        <span
                          aria-hidden="true"
                          className="text-amber-400"
                        >
                          {expandedEvidence === item.id ? '-' : '+'}
                        </span>
                      </div>
                    </button>

                    {expandedEvidence === item.id && (
                      <p className="border-t border-slate-700 p-4 leading-7 text-slate-300">
                        {item.description}
                      </p>
                    )}
                  </div>
                ))}

              </div>
            )}

            {tab === 'suspects' && (
              <div className="flex flex-col gap-3">

                {suspects.map((person) => (
                  <div
                    key={person.id}
                    className="rounded-xl border border-slate-700 bg-[#1c2731]"
                  >
                    <button
                      className="w-full p-4 text-left"
                      aria-expanded={expandedSuspect === person.id}
                      onClick={() =>
                        setExpandedSuspect(
                          expandedSuspect === person.id
                            ? null
                            : person.id
                        )
                      }
                    >
                      <div className="flex justify-between gap-3">
                        <div>
                          <h3 className="font-bold">
                            {person.name}
                          </h3>

                          <p className="text-xs text-slate-400">
                            {person.role}
                          </p>
                        </div>

                        <span
                          aria-hidden="true"
                          className="text-amber-400"
                        >
                          {expandedSuspect === person.id ? '-' : '+'}
                        </span>
                      </div>
                    </button>

                    {expandedSuspect === person.id && (
                      <p className="border-t border-slate-700 p-4 italic leading-7 text-slate-300">
                        &ldquo;{person.statement}&rdquo;
                      </p>
                    )}
                  </div>
                ))}

              </div>
            )}

            <button
              className={buttonClass}
              onClick={() => setScreen('verdict')}
            >
              DELIVER VERDICT
            </button>

          </section>
        )}

        {!loading && !error && gameCase && screen === 'verdict' && (
          <section className="flex flex-col gap-5">

            <div>
              <h2 className="text-2xl font-black">
                Your Verdict
              </h2>

              <p className="text-sm text-slate-400">
                Choose carefully. Your accusation is final.
              </p>
            </div>

            <fieldset
              disabled={submitting}
              className="flex flex-col gap-2"
            >
              <legend className="mb-2 font-bold">
                Who is responsible?
              </legend>

              {suspects.map((person) => (
                <label
                  key={person.id}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-700 bg-[#1c2731] p-3"
                >
                  <input
                    type="radio"
                    name="suspect"
                    value={person.id}
                    checked={suspect === person.id}
                    onChange={() => setSuspect(person.id)}
                    className="accent-amber-400"
                  />

                  {person.name}
                </label>
              ))}
            </fieldset>

            <fieldset
              disabled={submitting}
              className="flex flex-col gap-2"
            >
              <legend className="mb-2 font-bold">
                Which clue proves your accusation?
              </legend>

              {evidence.map((item) => (
                <label
                  key={item.id}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-700 bg-[#1c2731] p-3"
                >
                  <input
                    type="radio"
                    name="evidence"
                    value={item.id}
                    checked={clue === item.id}
                    onChange={() => setClue(item.id)}
                    className="accent-amber-400"
                  />

                  {item.title}
                </label>
              ))}
            </fieldset>

            <button
              className={`${buttonClass} disabled:cursor-not-allowed disabled:opacity-50`}
              disabled={!suspect || !clue || submitting}
              onClick={() => void submitVerdict()}
            >
              {submitting
                ? 'SAVING VERDICT...'
                : 'LOCK IN ACCUSATION'}
            </button>

            <button
              disabled={submitting}
              className="py-2 text-sm text-slate-400 underline disabled:opacity-50"
              onClick={() => setScreen('investigate')}
            >
              Review evidence
            </button>

          </section>
        )}

        {!loading && !error && gameCase && screen === 'results' && (
          <section className="flex flex-col gap-5">

            <div className="rounded-2xl border border-amber-500/30 bg-[#1c2731] p-6 text-center">
              <p className="text-xs tracking-widest text-amber-400">
                CASE CLOSED
              </p>

              <h2 className="mt-3 text-3xl font-black">
                {isCorrect && isEvidenceCorrect
                  ? 'Perfect Verdict'
                  : isCorrect
                    ? 'Correct Suspect'
                    : 'Incorrect Verdict'}
              </h2>

              <div className="my-5 text-5xl font-black text-amber-400">
                {score}

                <span className="text-lg text-slate-400">
                  {' / '}{gameCase.maxScore}
                </span>
              </div>

              <p className="text-slate-300">
                {isCorrect && isEvidenceCorrect
                  ? 'You identified the culprit and the decisive evidence.'
                  : isCorrect
                    ? 'You identified the culprit, but missed the decisive evidence.'
                    : 'The evidence points to a different suspect.'}
              </p>
            </div>

            {savedVerdict && (
              <div className="rounded-xl border border-slate-700 bg-[#1c2731] p-4">
                <p className="mb-2 text-xs font-bold tracking-widest text-amber-400">
                  YOUR OFFICIAL VERDICT
                </p>

                <p className="text-sm text-slate-300">
                  Suspect:{' '}

                  <span className="font-bold text-white">
                    {suspects.find(
                      (person) => person.id === savedVerdict.suspectId
                    )?.name ?? 'Unknown suspect'}
                  </span>
                </p>

                <p className="mt-2 text-sm text-slate-300">
                  Evidence:{' '}

                  <span className="font-bold text-white">
                    {evidence.find(
                      (item) => item.id === savedVerdict.evidenceId
                    )?.title ?? 'Unknown evidence'}
                  </span>
                </p>

                <p className="mt-3 text-xs text-slate-500">
                  Submitted:{' '}
                  {new Date(savedVerdict.submittedAt).toLocaleString()}
                </p>
              </div>
            )}

            {solution && (
              <div className="rounded-xl bg-[#1c2731] p-5">

                <h3 className="mb-3 text-xl font-bold">
                  The Truth
                </h3>

                {solution.explanation.map((paragraph, index) => (
                  <p
                    key={index}
                    className="mt-3 leading-7 text-slate-300"
                  >
                    {paragraph}
                  </p>
                ))}

              </div>
            )}

            <p className="text-center text-xs text-slate-500">
              Your verdict is saved to your Reddit account for this case.
            </p>

          </section>
        )}

        <footer className="border-t border-slate-700 pt-3 text-center text-xs text-slate-500">
          DAILY ALIBI: THE JURY {'\u00B7'} CASE {caseNumber}
        </footer>

      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
