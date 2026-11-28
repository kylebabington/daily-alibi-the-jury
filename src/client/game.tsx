
import './index.css';

import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

import type { PublicCase } from '../shared/case';
import type { DetectiveNotebook as NotebookData } from '../shared/notebook';
import { DetectiveNotebook } from './components/DetectiveNotebook';
import { createNotebook, getSuspectStatus, togglePinnedEvidence } from './notebook';

import type {
  AnyCaseResponse,
  AnyCaseSolution,
  AnySavedVerdict,
  AnyVerdictResponse,
  GameErrorResponse,
} from '../shared/api';

import {
  isAdvancedPublicCase,
  createEmptySelections,
  getRequiredEvidenceCount,
  requiresMotive,
  toggleEvidence,
  canSubmitVerdict,
  buildVerdictRequest,
  restoreSelections,
} from './gameplay';

import type {
  InvestigationProgress,
  SavedInvestigationProgress,
} from '../shared/progress';

import {
  loadInvestigationProgress,
} from './progress';

import {
  useInvestigationAutosave,
} from './hooks/useInvestigationAutosave';

type Screen = 'intro' | 'investigate' | 'verdict' | 'results';
type Tab = 'evidence' | 'suspects' | 'notebook';

export function App() {
  const [gameCase, setGameCase] = useState<PublicCase | null>(null);

  const [screen, setScreen] = useState<Screen>('intro');
  const [tab, setTab] = useState<Tab>('evidence');
  const [notebook, setNotebook] = useState<NotebookData | null>(null);

  const [progressReady, setProgressReady] =
    useState(false);

  const [progressLoadError, setProgressLoadError] =
    useState<string | null>(null);

  const [restoredProgress, setRestoredProgress] =
    useState<SavedInvestigationProgress | null>(null);

  const [selections, setSelections] =
    useState(createEmptySelections);

  const [expandedEvidence, setExpandedEvidence] =
    useState<string | null>(null);

  const [expandedSuspect, setExpandedSuspect] =
    useState<string | null>(null);

  const [savedVerdict, setSavedVerdict] =
    useState<AnySavedVerdict | null>(null);

  const [solution, setSolution] =
    useState<AnyCaseSolution | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suspects = gameCase?.suspects ?? [];
  const evidence = gameCase?.evidence ?? [];

  const caseNumber = gameCase
    ? String(gameCase.number).padStart(3, '0')
    : '---';

  const advancedCase =
    gameCase && isAdvancedPublicCase(gameCase)
      ? gameCase
      : null;

  const requiredEvidenceCount = gameCase
    ? getRequiredEvidenceCount(gameCase)
    : 1;

  const motiveRequired = gameCase
    ? requiresMotive(gameCase)
    : false;

  const readyToSubmit =
    gameCase !== null &&
    canSubmitVerdict(gameCase, selections);

  const isCorrect =
    savedVerdict !== null &&
    solution !== null &&
    savedVerdict.suspectId === solution.suspectId;

  const score = savedVerdict?.score ?? 0;

  const isPerfect =
    savedVerdict !== null &&
    gameCase !== null &&
    score === gameCase.maxScore;

  const investigationProgress =
    useMemo<InvestigationProgress | null>(() => {
      if (
        !gameCase ||
        !notebook ||
        notebook.caseId !== gameCase.id ||
        screen === 'results'
      ) {
        return null;
      }

      return {
        version: 1,
        caseId: gameCase.id,
        notebook,
        selections,
        activeTab: tab,
        screen,
      };
    }, [
      gameCase,
      notebook,
      selections,
      tab,
      screen,
    ]);

  const autosave = useInvestigationAutosave(
    investigationProgress,
    progressReady &&
    !loading &&
    !savedVerdict &&
    !submitting &&
    !progressLoadError &&
    !error,
    restoredProgress
  );


  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadCase() {
      try {
        const response = await fetch('/api/case', {
          signal: controller.signal,
          cache: 'no-store',
        });

        if (!response.ok) {
          const failure =
            await response.json() as GameErrorResponse;

          throw new Error(
            failure.message || 'Unable to load case.'
          );
        }

        const data =
          await response.json() as AnyCaseResponse;

        if (cancelled) return;

        setGameCase(data.publicCase);
        setNotebook(createNotebook(data.publicCase.id));

        if (data.verdict) {
          setSavedVerdict(data.verdict);
          setSolution(data.solution);
          setSelections(
            restoreSelections(data.verdict)
          );
          setScreen('results');
          return;
        }

        try {
          const progress =
            await loadInvestigationProgress(
              data.publicCase.id,
              controller.signal
            );

          if (cancelled) return;

          if (progress) {
            if (
              progress.caseId !== data.publicCase.id ||
              progress.notebook.caseId !== data.publicCase.id
            ) {
              throw new Error(
                'Saved progress belongs to another case.'
              );
            }

            setRestoredProgress(progress);
            setNotebook(progress.notebook);
            setSelections(progress.selections);
            setTab(progress.activeTab);
            setScreen(progress.screen);
          }

          setProgressReady(true);
        } catch (progressError) {
          if (!cancelled) {
            setProgressLoadError(
              progressError instanceof Error
                ? progressError.message
                : 'Unable to restore your investigation.'
            );
          }
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
      controller.abort();
    };
  }, []);

  async function submitVerdict() {
    if (
      !gameCase ||
      !readyToSubmit ||
      submitting ||
      savedVerdict ||
      loading
    ) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const request = buildVerdictRequest(
        gameCase,
        selections
      );

      const response = await fetch('/api/verdict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const failure =
          await response.json() as GameErrorResponse;

        throw new Error(
          failure.message || 'Unable to submit verdict.'
        );
      }

      const data =
        await response.json() as AnyVerdictResponse;

      setSavedVerdict(data.verdict);
      setSolution(data.solution);
      setSelections(
        restoreSelections(data.verdict)
      );
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

        {!loading && gameCase && !savedVerdict && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-lg border border-slate-700 bg-[#1c2731] px-3 py-2 text-xs"
          >
            {progressLoadError ? (
              <div className="space-y-2">
                <p className="font-semibold text-red-400">
                  Unable to restore investigation
                </p>

                <p className="text-slate-400">
                  {progressLoadError}
                </p>

                <p className="text-slate-400">
                  Autosave is disabled to protect existing progress.
                </p>

                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="font-bold text-amber-400 underline"
                >
                  Reload investigation
                </button>
              </div>
            ) : autosave.status === 'retrying' ? (
              <div className="space-y-2">
                <p className="font-semibold text-amber-400">
                  Unable to save — retrying automatically
                </p>

                {autosave.retryInfo && (
                  <p className="text-sm text-slate-400">
                    Retry {autosave.retryInfo.attempt} of{' '}
                    {autosave.maxRetries} scheduled after{' '}
                    {autosave.retryInfo.delaySeconds} seconds.
                  </p>
                )}

                <p className="text-slate-400">
                  Your changes are still in memory.
                  Keep the game open until saving succeeds.
                </p>

                <button
                  type="button"
                  onClick={autosave.retry}
                  className="font-bold text-amber-400 underline"
                >
                  Retry now
                </button>
              </div>
            ) : autosave.status === 'error' ? (
              <div className="space-y-2">
                <p className="font-semibold text-red-400">
                  Investigation not saved
                </p>

                <p className="text-slate-400">
                  {autosave.error}
                </p>

                <button
                  type="button"
                  onClick={
                    autosave.requiresReload
                      ? () => window.location.reload()
                      : autosave.retry
                  }
                  className="font-bold text-amber-400 underline"
                >
                  {autosave.requiresReload
                    ? 'Reload investigation'
                    : 'Retry save'}
                </button>
              </div>
            ) : autosave.status === 'saving' ? (
              <p className="text-slate-400">
                Saving investigation...
              </p>
            ) : autosave.status === 'pending' ? (
              <p className="text-amber-400">
                Changes pending...
              </p>
            ) : autosave.status === 'saved' ? (
              <p className="font-semibold text-emerald-400">
                Investigation saved
                {autosave.updatedAt && (
                  <span className="ml-2 font-normal text-slate-400">
                    {new Date(
                      autosave.updatedAt
                    ).toLocaleTimeString()}
                  </span>
                )}
              </p>
            ) : (
              <p className="text-slate-400">
                {progressReady
                  ? 'Investigation ready'
                  : 'Restoring investigation...'}
              </p>
            )}
          </div>
        )}

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

        {!loading &&
          !error &&
          !progressLoadError &&
          !autosave.requiresReload &&
          gameCase &&
          screen === 'intro' && (
            <section className="flex flex-col gap-5">

              <div className="rounded-2xl border border-amber-500/30 bg-[#1c2731] p-5">
                <p className="mb-2 text-xs uppercase tracking-widest text-amber-400">
                  {gameCase.location} {'\u00B7'} {gameCase.time}
                </p>

                <h2 className="mb-3 text-3xl font-black uppercase">
                  {gameCase.title}
                </h2>

                {advancedCase && (
                  <div className="mb-4 flex flex-wrap gap-2">

                    <span className="rounded-lg border border-amber-500/40 bg-amber-400/10 px-3 py-1 text-xs font-bold uppercase text-amber-400">
                      {advancedCase.investigation.difficulty}
                    </span>

                    <span className="rounded-lg bg-[#263440] px-3 py-1 text-xs text-slate-300">
                      ~{advancedCase.investigation.estimatedMinutes} min
                    </span>

                    <span className="rounded-lg bg-[#263440] px-3 py-1 text-xs text-slate-300">
                      {gameCase.maxScore} points
                    </span>

                  </div>
                )}

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
                {' '}
                {motiveRequired && 'Determine their motive. '}
                {requiredEvidenceCount === 1
                  ? 'Select the clue that proves your accusation.'
                  : `Build your case by selecting exactly ${requiredEvidenceCount} pieces of evidence.`}
              </p>

              <button
                className={buttonClass}
                onClick={() => setScreen('investigate')}
              >
                OPEN CASE FILE
              </button>

            </section>
          )}

        {!loading &&
          !error &&
          !progressLoadError &&
          !autosave.requiresReload &&
          gameCase &&
          screen === 'investigate' && (
            <section className="flex flex-col gap-4">

              <div>
                <h2 className="text-2xl font-black">
                  Investigation
                </h2>

                <p className="text-sm text-slate-400">
                  Examine the evidence before making your accusation.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(['evidence', 'suspects', 'notebook'] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
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
                      {notebook && (
                        <div className="border-t border-slate-700 px-4 pb-3 pt-2">
                          <button
                            type="button"
                            aria-pressed={notebook.pinnedEvidenceIds.includes(item.id)}
                            onClick={() => setNotebook((current) => current
                              ? togglePinnedEvidence(current, gameCase, item.id)
                              : current)}
                            className="rounded-lg border border-amber-500/40 px-3 py-2 text-xs font-semibold text-amber-400 hover:bg-amber-400/10"
                          >
                            {notebook.pinnedEvidenceIds.includes(item.id) ? 'Remove bookmark' : 'Bookmark clue'}
                          </button>
                        </div>
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
                            {notebook && getSuspectStatus(notebook, person.id) !== 'unmarked' && (
                              <p className="mt-1 text-xs font-semibold text-amber-400">
                                {getSuspectStatus(notebook, person.id) === 'ruled-out'
                                  ? 'Ruled out'
                                  : getSuspectStatus(notebook, person.id) === 'suspicious'
                                    ? 'Suspicious'
                                    : 'Investigate'}
                              </p>
                            )}
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

              {tab === 'notebook' && notebook && (
                <DetectiveNotebook
                  gameCase={gameCase}
                  notebook={notebook}
                  onChange={setNotebook}
                />
              )}

              <button
                className={buttonClass}
                onClick={() => setScreen('verdict')}
              >
                DELIVER VERDICT
              </button>

            </section>
          )}


        {!loading &&
          !progressLoadError &&
          !autosave.requiresReload &&
          gameCase &&
          screen === 'verdict' && (
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
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${selections.suspectId === person.id
                      ? 'border-amber-400 bg-amber-400/10'
                      : 'border-slate-700 bg-[#1c2731]'
                      }`}
                  >
                    <input
                      type="radio"
                      name="suspect"
                      value={person.id}
                      checked={selections.suspectId === person.id}
                      onChange={() =>
                        setSelections((previous) => ({
                          ...previous,
                          suspectId: person.id,
                        }))
                      }
                      className="accent-amber-400"
                    />

                    <div>
                      <p className="font-bold">{person.name}</p>
                      <p className="text-xs text-slate-400">
                        {person.role}
                      </p>
                    </div>
                  </label>
                ))}
              </fieldset>

              {advancedCase && motiveRequired && (
                <fieldset
                  disabled={submitting}
                  className="flex flex-col gap-2"
                >
                  <legend className="mb-2 font-bold">
                    What was the motive?
                  </legend>

                  {advancedCase.motives.map((motive) => (
                    <label
                      key={motive.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${selections.motiveId === motive.id
                        ? 'border-amber-400 bg-amber-400/10'
                        : 'border-slate-700 bg-[#1c2731]'
                        }`}
                    >
                      <input
                        type="radio"
                        name="motive"
                        value={motive.id}
                        checked={selections.motiveId === motive.id}
                        onChange={() =>
                          setSelections((previous) => ({
                            ...previous,
                            motiveId: motive.id,
                          }))
                        }
                        className="mt-1 accent-amber-400"
                      />

                      <div>
                        <p className="font-bold">
                          {motive.title}
                        </p>

                        <p className="mt-1 text-sm text-slate-400">
                          {motive.description}
                        </p>
                      </div>
                    </label>
                  ))}
                </fieldset>
              )}

              <fieldset
                disabled={submitting}
                className="flex flex-col gap-2"
              >
                <legend className="mb-2 font-bold">
                  {requiredEvidenceCount === 1
                    ? 'Which clue proves your accusation?'
                    : 'Build your evidence chain'}
                </legend>

                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">
                    Select exactly {requiredEvidenceCount}
                  </span>

                  <span
                    aria-live="polite"
                    className="font-bold text-amber-400"
                  >
                    {selections.evidenceIds.length}
                    {' / '}
                    {requiredEvidenceCount}
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-700">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all"
                    style={{
                      width: `${selections.evidenceIds.length /
                        requiredEvidenceCount * 100
                        }%`,
                    }}
                  />
                </div>

                {evidence.map((item) => {
                  const selected =
                    selections.evidenceIds.includes(item.id);

                  const limitReached =
                    requiredEvidenceCount > 1 &&
                    selections.evidenceIds.length >=
                    requiredEvidenceCount &&
                    !selected;

                  return (
                    <label
                      key={item.id}
                      className={`flex items-center gap-3 rounded-xl border p-3 ${selected
                        ? 'border-amber-400 bg-amber-400/10'
                        : 'border-slate-700 bg-[#1c2731]'
                        } ${limitReached
                          ? 'cursor-not-allowed opacity-50'
                          : 'cursor-pointer'
                        }`}
                    >
                      <input
                        type={
                          requiredEvidenceCount === 1
                            ? 'radio'
                            : 'checkbox'
                        }
                        name="evidence"
                        value={item.id}
                        checked={selected}
                        disabled={limitReached}
                        onChange={() =>
                          setSelections((previous) => ({
                            ...previous,
                            evidenceIds: toggleEvidence(
                              previous.evidenceIds,
                              item.id,
                              requiredEvidenceCount
                            ),
                          }))
                        }
                        className="accent-amber-400"
                      />

                      <div>
                        <p className="font-bold">{item.title}</p>

                        <p className="text-xs text-slate-400">
                          {item.category}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </fieldset>

              <div className="rounded-xl bg-[#1c2731] p-4">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-400">
                    Maximum possible score
                  </span>

                  <span className="font-black text-amber-400">
                    {gameCase.maxScore}
                  </span>
                </div>
              </div>

              <button
                className={`${buttonClass} disabled:cursor-not-allowed disabled:opacity-50`}
                disabled={!readyToSubmit || submitting}
                onClick={() => void submitVerdict()}
              >
                {submitting
                  ? 'SAVING VERDICT...'
                  : 'LOCK IN ACCUSATION'}
              </button>

              <button
                disabled={submitting}
                className="py-2 text-sm text-slate-400 underline disabled:opacity-50"
                onClick={() => {
                  setError(null);
                  setScreen('investigate');
                }}
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
                {isPerfect
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
                {isPerfect
                  ? 'Your investigation was flawless.'
                  : isCorrect
                    ? 'You identified the culprit, but your investigation was incomplete.'
                    : 'The evidence points to a different suspect.'}
              </p>
            </div>

            {savedVerdict?.version === 2 && advancedCase && (
              <div className="rounded-xl border border-slate-700 bg-[#1c2731] p-4">

                <h3 className="mb-4 font-bold">
                  Investigation Breakdown
                </h3>

                {[
                  {
                    label: 'Suspect',
                    earned: savedVerdict.breakdown.suspect,
                    maximum: advancedCase.scoring.suspectPoints,
                  },
                  ...(motiveRequired
                    ? [{
                      label: 'Motive',
                      earned: savedVerdict.breakdown.motive,
                      maximum: advancedCase.scoring.motivePoints,
                    }]
                    : []),
                  {
                    label: 'Evidence',
                    earned: savedVerdict.breakdown.evidence,
                    maximum:
                      advancedCase.scoring.evidencePointsPerItem *
                      requiredEvidenceCount,
                  },
                ].map((item) => (
                  <div key={item.label} className="mb-4">

                    <div className="mb-2 flex justify-between text-sm">
                      <span>{item.label}</span>

                      <span className="font-bold text-amber-400">
                        {item.earned} / {item.maximum}
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-slate-700">
                      <div
                        className="h-full rounded-full bg-amber-400"
                        style={{
                          width: `${item.maximum > 0
                            ? item.earned / item.maximum * 100
                            : 0
                            }%`,
                        }}
                      />
                    </div>

                  </div>
                ))}

              </div>
            )}

            {savedVerdict && (
              <div className="rounded-xl border border-slate-700 bg-[#1c2731] p-4">

                <p className="mb-4 text-xs font-bold tracking-widest text-amber-400">
                  YOUR OFFICIAL VERDICT
                </p>

                <p className="text-sm text-slate-400">
                  Accused suspect
                </p>

                <p className="font-bold text-white">
                  {suspects.find(
                    (person) =>
                      person.id === savedVerdict.suspectId
                  )?.name ?? 'Unknown suspect'}
                </p>

                {savedVerdict.version === 2 && motiveRequired && (
                  <div className="mt-4">

                    <p className="text-sm text-slate-400">
                      Selected motive
                    </p>

                    <p className="font-bold text-white">
                      {advancedCase?.motives.find(
                        (motive) =>
                          motive.id === savedVerdict.motiveId
                      )?.title ?? 'Unknown motive'}
                    </p>

                  </div>
                )}

                <p className="mb-2 mt-4 text-sm text-slate-400">
                  Selected evidence
                </p>

                {(savedVerdict.version === 2
                  ? savedVerdict.evidenceIds
                  : [savedVerdict.evidenceId]
                ).map((evidenceId) => (
                  <div
                    key={evidenceId}
                    className="mb-2 rounded-lg bg-[#263440] p-3 text-sm font-semibold"
                  >
                    {evidence.find(
                      (item) => item.id === evidenceId
                    )?.title ?? 'Unknown evidence'}
                  </div>
                ))}

                <p className="mt-4 text-xs text-slate-500">
                  Submitted:{' '}
                  {new Date(
                    savedVerdict.submittedAt
                  ).toLocaleString()}
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
