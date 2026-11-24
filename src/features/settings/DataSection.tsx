import { useRef, useState } from 'preact/hooks';
import { progress, replaceProgress, settings } from '../../app/state';
import { defaultProgress } from '../../core/store/schema';
import {
  buildExport,
  exportFileName,
  MAX_IMPORT_BYTES,
  parseImport,
  type ImportResult,
} from '../../core/store/export-import';
import { Button, ConfirmDialog } from '../../ui/components/controls';
import s from './SettingsScreen.module.css';

function downloadBackup() {
  const json = JSON.stringify(buildExport(progress.value, settings.value), null, 2);
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = exportFileName();
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

type Pending = { kind: 'reset' } | { kind: 'import'; result: Extract<ImportResult, { ok: true }> };

export function DataSection() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  async function onFile(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // allow choosing the same file again
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) return setMessage({ text: 'That file is too large.', error: true });
    const result = parseImport(await file.text());
    if (!result.ok) return setMessage({ text: result.error, error: true });
    setPending({ kind: 'import', result });
  }

  function confirm() {
    if (!pending) return;
    downloadBackup(); // always keep a copy of what is about to be replaced
    if (pending.kind === 'reset') {
      replaceProgress(defaultProgress());
      setMessage({ text: 'Progress reset. A backup of your old progress was downloaded.' });
    } else {
      replaceProgress(pending.result.progress);
      settings.value = pending.result.settings;
      setMessage({ text: 'Progress imported. A backup of your previous progress was downloaded.' });
    }
    setPending(null);
  }

  const p = progress.value;
  const lessons = Object.values(p.lessons).filter((l) => l.completed).length;

  return (
    <div class={s.group}>
      <p class={s.dataIntro}>
        Your progress is stored only in this browser: {lessons} lessons completed, {p.sessions.length}{' '}
        sessions recorded. Export a file to keep a backup or move to another browser.
      </p>
      <div class={s.dataRow}>
        <div>
          <h3 class={s.dataTitle}>Export progress</h3>
          <p class={s.dataHint}>Downloads a JSON file with your progress and settings.</p>
        </div>
        <Button icon="download" onClick={downloadBackup}>
          Export
        </Button>
      </div>
      <div class={s.dataRow}>
        <div>
          <h3 class={s.dataTitle}>Import progress</h3>
          <p class={s.dataHint}>Replaces current progress with an exported file. You'll confirm first.</p>
        </div>
        <Button icon="upload" onClick={() => fileRef.current?.click()}>
          Import…
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          class="visually-hidden"
          tabIndex={-1}
          aria-hidden="true"
          onChange={onFile}
        />
      </div>
      <div class={s.dataRow}>
        <div>
          <h3 class={s.dataTitle}>Reset progress</h3>
          <p class={s.dataHint}>Starts over. Settings are kept, and a backup downloads first.</p>
        </div>
        <Button variant="danger" icon="reset" onClick={() => setPending({ kind: 'reset' })}>
          Reset…
        </Button>
      </div>

      <p class={message?.error ? s.messageError : s.message} role="status">
        {message?.text}
      </p>

      <ConfirmDialog
        open={pending !== null}
        title={pending?.kind === 'reset' ? 'Reset all progress?' : 'Replace your progress?'}
        confirmLabel={pending?.kind === 'reset' ? 'Reset progress' : 'Import and replace'}
        danger={pending?.kind === 'reset'}
        onConfirm={confirm}
        onCancel={() => setPending(null)}
      >
        {pending?.kind === 'import' ? (
          <p>
            The file from {new Date(pending.result.summary.exportedAt).toLocaleDateString()} has{' '}
            {pending.result.summary.lessonsCompleted} completed lessons, {pending.result.summary.sessions}{' '}
            sessions and {pending.result.summary.fights} fights. It will replace your current progress and
            settings. A backup of your current progress downloads first.
          </p>
        ) : (
          <p>
            Lessons, stats and fight records will be cleared. A backup file downloads first so you can import
            it again later.
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}
