import { useId, useRef, useState } from 'react';
import { Check, ClipboardCopy, Eye, ListOrdered, TriangleAlert } from 'lucide-react';
import { CUSTOM_LIMITS, CUSTOM_TEMPLATE, DESSERT_TIERS } from '@workspace/scoop-rules';
import type { CustomImportIssue, CustomImportResult } from '@workspace/scoop-rules';
import './custom-game-setup.css';

export type CustomGameSetupProps = {
  custom: boolean;
  onMode: (custom: boolean) => void;
  draft: string;
  onDraft: (draft: string) => void;
  preview?: CustomImportResult;
  onPreview: () => void;
  busy: boolean;
  issues?: readonly CustomImportIssue[];
};

export function CustomGameSetup({ custom, onMode, draft, onDraft, preview, onPreview, busy, issues }: CustomGameSetupProps) {
  const id = useId();
  const [copied, setCopied] = useState<'idle' | 'done' | 'manual'>('idle');
  const fallbackRef = useRef<HTMLTextAreaElement>(null);
  const list = issues ?? preview?.issues ?? [];
  const hasIssues = list.length > 0;
  const rowIssues = list.filter(i => i.row != null).slice().sort((a, b) => (a.row ?? 0) - (b.row ?? 0));
  const generalIssues = list.filter(i => i.row == null);

  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error('no clipboard');
      await navigator.clipboard.writeText(CUSTOM_TEMPLATE);
      setCopied('done');
      window.setTimeout(() => setCopied(c => (c === 'done' ? 'idle' : c)), 2200);
    } catch {
      setCopied('manual');
      window.setTimeout(() => { fallbackRef.current?.focus(); fallbackRef.current?.select(); }, 0);
    }
  };

  return <fieldset className="cgs" disabled={busy}>
    <legend className="cgs-legend">Question menu</legend>
    <div className="cgs-modes">
      <label className={`cgs-mode ${!custom ? 'on' : ''}`}>
        <input type="radio" name={`${id}-mode`} checked={!custom} onChange={() => onMode(false)} data-testid="radio-game-party"/>
        <span className="cgs-dot" aria-hidden/>
        <span className="cgs-mode-text"><strong>Party game</strong><small>The house set of mango-sago prompts</small></span>
      </label>
      <label className={`cgs-mode ${custom ? 'on' : ''}`}>
        <input type="radio" name={`${id}-mode`} checked={custom} onChange={() => onMode(true)} data-testid="radio-game-custom"/>
        <span className="cgs-dot" aria-hidden/>
        <span className="cgs-mode-text"><strong>Custom game</strong><small>Paste your own rows from a spreadsheet</small></span>
      </label>
    </div>

    {custom && <div className="cgs-body">
      <section className="cgs-recipe" aria-labelledby={`${id}-how`}>
        <p className="g-kicker" id={`${id}-how`}>How to write the menu</p>
        <ol className="cgs-steps">
          <li>One row per answer, columns separated by tabs: <b>Question</b>, <b>Answer</b>, <b>Dessert tier</b>. Use a tier name shown below.</li>
          <li>Leave <b>Question</b> blank to add more answers to the question above it.</li>
          <li>The header row is optional. Copying straight from Sheets or Excel keeps the tabs.</li>
        </ol>
        <p className="cgs-limits">Up to {CUSTOM_LIMITS.rounds} questions, {CUSTOM_LIMITS.answersPerRound} answers each, and {CUSTOM_LIMITS.rows} rows or {CUSTOM_LIMITS.text.toLocaleString('en-US')} characters total.</p>
        <ul className="cgs-tiers" aria-label="Depth tiers and points">
          {DESSERT_TIERS.map((tier, i) => <li key={String(tier)} style={{ ['--d' as string]: i }}>
            <span className="cgs-tier-depth">{i + 1}</span><span className="cgs-tier-name">{String(tier)}</span><b>{(i + 1) * 20} pts</b>
          </li>)}
        </ul>
        <div className="cgs-template-row">
          <button type="button" className="cgs-ghost" onClick={copy} data-testid="button-copy-template">
            {copied === 'done' ? <><Check size={14}/> Template copied</> : <><ClipboardCopy size={14}/> Copy spreadsheet template</>}
          </button>
          <span className="cgs-live" aria-live="polite">{copied === 'manual' ? 'Clipboard unavailable. Select the template below and copy it.' : ''}</span>
        </div>
        {copied === 'manual' && <>
          <label className="cgs-sr" htmlFor={`${id}-tpl`}>Template text</label>
          <textarea id={`${id}-tpl`} ref={fallbackRef} className="cgs-fallback" readOnly value={CUSTOM_TEMPLATE} rows={4} onFocus={e => e.currentTarget.select()} data-testid="text-custom-template"/>
        </>}
      </section>

      <div className="cgs-field">
        <label htmlFor={`${id}-bank`}>Your questions <small>tab-separated rows</small></label>
        <textarea id={`${id}-bank`} className="cgs-bank" value={draft} rows={8} spellCheck={false} wrap="off"
          placeholder={CUSTOM_TEMPLATE}
          aria-invalid={hasIssues || undefined} aria-describedby={hasIssues ? `${id}-errs` : undefined}
          onChange={e => onDraft(e.target.value)} data-testid="input-custom-bank"/>
      </div>

      <button type="button" className="g-btn g-btn-soft cgs-preview-btn" onClick={onPreview} disabled={busy || !draft.trim()} data-testid="button-preview-custom">
        <Eye size={16}/> Preview questions
      </button>

      {hasIssues && <div className="cgs-errors" id={`${id}-errs`} role="alert" data-testid="custom-bank-errors">
        <p className="cgs-errors-head"><TriangleAlert size={16}/> <strong>{list.length === 1 ? '1 thing to fix' : `${list.length} things to fix`}</strong> before this menu can be served</p>
        <ul>
          {generalIssues.map((i, n) => <li key={`g${n}`}><span className="cgs-row-tag is-general">Menu</span>{i.message}</li>)}
          {rowIssues.map((i, n) => <li key={`r${n}`}><span className="cgs-row-tag">Row {i.row}</span>{i.message}</li>)}
        </ul>
      </div>}

      {preview && !hasIssues && preview.questions.length > 0 && <section className="cgs-preview" aria-label="Question preview" data-testid="custom-bank-preview">
        <header><ListOrdered size={15}/> <strong>{preview.questions.length} {preview.questions.length === 1 ? 'question' : 'questions'}</strong>, {preview.questions.reduce((s, q) => s + q.answers.length, 0)} answers, in play order</header>
        <ol>
          {preview.questions.map((q, n) => <li key={n} style={{ ['--d' as string]: Math.min(n, 8) }}>
            <span className="cgs-q-num">{n + 1}</span>
            <span className="cgs-q-text">{q.prompt}</span>
            <span className="cgs-q-count">{q.answers.length} {q.answers.length === 1 ? 'answer' : 'answers'}</span>
          </li>)}
        </ol>
      </section>}
    </div>}
  </fieldset>;
}
