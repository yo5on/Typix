import { useState } from 'preact/hooks';
import { Button, Segmented } from '../../ui/components/controls';
import { MAX_CUSTOM_LENGTH, normalizeCustomText } from '../../core/textgen/generate';
import { layout, TIME_OPTIONS, WORD_OPTIONS, type Source, type TestConfig } from './config';
import s from './practice.module.css';

type Kind = TestConfig['kind'];

export function Setup({
  config,
  onChange,
  onStart,
  error,
}: {
  config: TestConfig;
  onChange: (c: TestConfig) => void;
  onStart: (c: TestConfig) => void;
  error: string | null;
}) {
  const [raw, setRaw] = useState(config.kind === 'custom' ? config.text : '');
  const source: Source = 'source' in config ? config.source : 'yours';
  const custom = normalizeCustomText(raw, layout);

  function setKind(kind: Kind) {
    if (kind === 'time') onChange({ kind, seconds: 60, source });
    else if (kind === 'words') onChange({ kind, count: 50, source });
    else if (kind === 'weak') onChange({ kind });
    else onChange({ kind, text: custom.text });
  }

  const finalConfig: TestConfig = config.kind === 'custom' ? { kind: 'custom', text: custom.text } : config;

  return (
    <form
      class={s.setup}
      onSubmit={(e) => {
        e.preventDefault();
        onStart(finalConfig);
      }}
    >
      <div class={s.setupRow}>
        <span class={s.setupLabel} id="kind-label">
          Test
        </span>
        <Segmented
          id="kind"
          value={config.kind}
          options={[
            { value: 'time', label: 'Timed' },
            { value: 'words', label: 'Words' },
            { value: 'weak', label: 'Weak keys' },
            { value: 'custom', label: 'Custom text' },
          ]}
          onChange={setKind}
        />
      </div>

      {config.kind === 'time' && (
        <div class={s.setupRow}>
          <span class={s.setupLabel} id="seconds-label">
            Length
          </span>
          <Segmented
            id="seconds"
            value={config.seconds}
            options={TIME_OPTIONS.map((t) => ({ value: t, label: t < 60 ? `${t} s` : `${t / 60} min` }))}
            onChange={(seconds) => onChange({ ...config, seconds })}
          />
        </div>
      )}

      {config.kind === 'words' && (
        <div class={s.setupRow}>
          <span class={s.setupLabel} id="count-label">
            Length
          </span>
          <Segmented
            id="count"
            value={config.count}
            options={WORD_OPTIONS.map((n) => ({ value: n, label: `${n} words` }))}
            onChange={(count) => onChange({ ...config, count })}
          />
        </div>
      )}

      {(config.kind === 'time' || config.kind === 'words') && (
        <div class={s.setupRow}>
          <span class={s.setupLabel} id="source-label">
            Words from
          </span>
          <Segmented
            id="source"
            value={config.source}
            options={[
              { value: 'yours', label: 'Your keys' },
              { value: 'full', label: 'Full keyboard' },
            ]}
            onChange={(src) => onChange({ ...config, source: src })}
          />
          <p class={s.setupHint}>
            {config.source === 'yours'
              ? 'Only letters you already type well: the home row, plus keys you have mastered.'
              : 'Common English words using every letter.'}
          </p>
        </div>
      )}

      {config.kind === 'weak' && (
        <p class={s.setupHint}>
          A short drill built from the keys you miss most often across all your sessions.
        </p>
      )}

      {config.kind === 'custom' && (
        <div class={s.custom}>
          <label for="custom-text" class={s.setupLabel}>
            Your text
          </label>
          <textarea
            id="custom-text"
            class={s.textarea}
            value={raw}
            maxLength={MAX_CUSTOM_LENGTH * 2}
            placeholder="Paste or type anything: an article, notes, code…"
            onInput={(e) => setRaw(e.currentTarget.value)}
          />
          <p class={s.setupHint}>
            {custom.text.length} characters
            {custom.removed > 0 &&
              ` · ${custom.removed} character${custom.removed === 1 ? '' : 's'} a US keyboard can't type will be skipped`}
            {' · line breaks become spaces'}
          </p>
        </div>
      )}

      <div class={s.setupActions}>
        <Button variant="primary" type="submit" data-autofocus>
          Start
        </Button>
        <span class={s.setupHint}>
          The timer starts on your first key. <kbd>Tab</kbd> restarts, <kbd>Esc</kbd> stops.
        </span>
      </div>
      <p class={s.error} role="status">
        {error}
      </p>
    </form>
  );
}
