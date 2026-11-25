
import { useState } from 'react';

import type { PublicCase } from '../../shared/case';

import {
    MAX_NOTE_LENGTH,
    SUSPECT_STATUS_LABELS,
    type DetectiveNotebook as NotebookData,
    type SuspectStatus,
} from '../../shared/notebook';

import {
    getPinnedEvidence,
    getSuspectStatus,
    togglePinnedEvidence,
    updateNotebookNotes,
    updateSuspectStatus,
} from '../notebook';

type DetectiveNotebookProps = {
    gameCase: PublicCase;
    notebook: NotebookData;
    onChange: (notebook: NotebookData) => void;
};

const SUSPECT_STATUSES: SuspectStatus[] = [
    'unmarked',
    'investigate',
    'suspicious',
    'ruled-out',
];

const STATUS_COLORS: Record<SuspectStatus, string> = {
    unmarked: 'text-slate-400',
    investigate: 'text-amber-400',
    suspicious: 'text-red-400',
    'ruled-out': 'text-emerald-400',
};

export function DetectiveNotebook({
    gameCase,
    notebook,
    onChange,
}: DetectiveNotebookProps) {
    const [expandedEvidence, setExpandedEvidence] =
        useState<string | null>(null);

    const pinnedEvidence = getPinnedEvidence(
        notebook,
        gameCase
    );

    const markedSuspects = gameCase.suspects.filter(
        (suspect) =>
            getSuspectStatus(notebook, suspect.id) !==
            'unmarked'
    ).length;

    return (
        <div className="space-y-4">
            {/* Notebook heading */}
            <section className="rounded-xl border border-amber-500/30 bg-slate-800 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-amber-400">
                    Private investigation workspace
                </p>

                <h2 className="mt-2 text-xl font-black text-slate-100">
                    Detective Notebook
                </h2>

                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    Organize your evidence, record your theories,
                    and track your suspects. Your notebook does
                    not affect your official verdict.
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-slate-900 p-3 text-center">
                        <p className="text-2xl font-black text-amber-400">
                            {pinnedEvidence.length}
                        </p>

                        <p className="text-xs text-slate-400">
                            Pinned clues
                        </p>
                    </div>

                    <div className="rounded-lg bg-slate-900 p-3 text-center">
                        <p className="text-2xl font-black text-amber-400">
                            {markedSuspects}/{gameCase.suspects.length}
                        </p>

                        <p className="text-xs text-slate-400">
                            Marked suspects
                        </p>
                    </div>
                </div>
            </section>

            {/* Pinned evidence */}
            <section className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                <h3 className="font-bold text-slate-100">
                    Pinned Evidence
                </h3>

                <p className="mt-1 text-sm text-slate-400">
                    Keep important clues within reach.
                </p>

                {pinnedEvidence.length === 0 ? (
                    <div className="mt-4 rounded-lg border border-dashed border-slate-600 p-4 text-center">
                        <p className="text-sm text-slate-400">
                            No evidence pinned yet.
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                            Pin clues from the Evidence tab.
                        </p>
                    </div>
                ) : (
                    <div className="mt-4 space-y-3">
                        {pinnedEvidence.map((item) => {
                            const isExpanded =
                                expandedEvidence === item.id;

                            return (
                                <article
                                    key={item.id}
                                    className="rounded-lg border border-slate-700 bg-slate-900 p-3"
                                >
                                    <p className="text-xs uppercase tracking-wide text-amber-400">
                                        {item.category}
                                    </p>

                                    <button
                                        type="button"
                                        aria-expanded={isExpanded}
                                        onClick={() =>
                                            setExpandedEvidence(
                                                isExpanded ? null : item.id
                                            )
                                        }
                                        className="mt-1 flex w-full items-center justify-between gap-3 text-left"
                                    >
                                        <span className="font-semibold text-slate-100">
                                            {item.title}
                                        </span>

                                        <span
                                            aria-hidden="true"
                                            className="text-amber-400"
                                        >
                                            {isExpanded ? '−' : '+'}
                                        </span>
                                    </button>

                                    {isExpanded && (
                                        <p className="mt-3 text-sm leading-relaxed text-slate-300">
                                            {item.description}
                                        </p>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() =>
                                            onChange(
                                                togglePinnedEvidence(
                                                    notebook,
                                                    gameCase,
                                                    item.id
                                                )
                                            )
                                        }
                                        className="mt-3 rounded-md border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-amber-400"
                                    >
                                        Remove bookmark
                                    </button>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Personal notes */}
            <section className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                <label
                    htmlFor="detective-notes"
                    className="font-bold text-slate-100"
                >
                    Personal Notes
                </label>

                <p className="mt-1 text-sm text-slate-400">
                    Record contradictions, timelines, and theories.
                </p>

                <textarea
                    id="detective-notes"
                    value={notebook.notes}
                    maxLength={MAX_NOTE_LENGTH}
                    rows={6}
                    onChange={(event) =>
                        onChange(
                            updateNotebookNotes(
                                notebook,
                                event.target.value
                            )
                        )
                    }
                    placeholder="What have you discovered so far?"
                    className="mt-3 w-full resize-y rounded-lg border border-slate-600 bg-slate-900 p-3 text-sm leading-relaxed text-slate-100 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
                />

                <div className="mt-2 flex justify-between gap-2 text-xs text-slate-400">
                    <span>Current session only</span>

                    <span>
                        {notebook.notes.length}/{MAX_NOTE_LENGTH}
                    </span>
                </div>
            </section>

            {/* Suspect tracking */}
            <section className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                <h3 className="font-bold text-slate-100">
                    Suspect Tracking
                </h3>

                <p className="mt-1 text-sm text-slate-400">
                    Record your current assessment of each suspect.
                </p>

                <div className="mt-4 space-y-3">
                    {gameCase.suspects.map((suspect) => {
                        const status = getSuspectStatus(
                            notebook,
                            suspect.id
                        );

                        return (
                            <article
                                key={suspect.id}
                                className="rounded-lg border border-slate-700 bg-slate-900 p-3"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                        <p className="font-semibold text-slate-100">
                                            {suspect.name}
                                        </p>

                                        <p className="text-xs text-slate-400">
                                            {suspect.role}
                                        </p>
                                    </div>

                                    <span
                                        className={`text-xs font-bold ${STATUS_COLORS[status]}`}
                                    >
                                        {SUSPECT_STATUS_LABELS[status]}
                                    </span>
                                </div>

                                <div className="mt-3 grid grid-cols-2 gap-2">
                                    {SUSPECT_STATUSES.map((option) => (
                                        <button
                                            key={option}
                                            type="button"
                                            aria-pressed={status === option}
                                            onClick={() =>
                                                onChange(
                                                    updateSuspectStatus(
                                                        notebook,
                                                        gameCase,
                                                        suspect.id,
                                                        option
                                                    )
                                                )
                                            }
                                            className={`rounded-md border px-2 py-2 text-xs font-semibold transition-colors ${status === option
                                                ? 'border-amber-400 bg-amber-400/10 text-amber-400'
                                                : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500'
                                                }`}
                                        >
                                            {SUSPECT_STATUS_LABELS[option]}
                                        </button>
                                    ))}
                                </div>
                            </article>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}
