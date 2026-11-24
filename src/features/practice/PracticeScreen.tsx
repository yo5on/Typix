import { useState } from 'preact/hooks';
import { navigate } from '../../app/router';
import { progress } from '../../app/state';
import { Screen } from '../../ui/components/Screen';
import { describeConfig, prepareTest, type PreparedTest, type TestConfig } from './config';
import { Setup } from './Setup';
import { TestView, type FinishedTest } from './TestView';
import { Results } from './Results';

type Phase =
  | { name: 'setup' }
  | { name: 'test'; test: PreparedTest; run: number }
  | { name: 'results'; result: FinishedTest };

/** Free Practice: choose a test, type it, see the results. No combat, no locks. */
export function PracticeScreen() {
  const [config, setConfig] = useState<TestConfig>({ kind: 'time', seconds: 60, source: 'yours' });
  const [phase, setPhase] = useState<Phase>({ name: 'setup' });
  const [error, setError] = useState<string | null>(null);

  function start(c: TestConfig = config) {
    const prepared = prepareTest(c, progress.value);
    if (!prepared.ok) return setError(prepared.reason);
    setError(null);
    setConfig(c);
    setPhase({ name: 'test', test: prepared.test, run: Date.now() });
  }

  const title = phase.name === 'setup' ? 'Free Practice' : `Free Practice · ${describeConfig(config)}`;

  return (
    <Screen
      title={title}
      onBack={() => (phase.name === 'setup' ? navigate('menu') : setPhase({ name: 'setup' }))}
    >
      {phase.name === 'setup' && <Setup config={config} onChange={setConfig} onStart={start} error={error} />}
      {phase.name === 'test' && (
        <TestView
          key={phase.run}
          config={config}
          test={phase.test}
          onRestart={() => start()}
          onExit={() => setPhase({ name: 'setup' })}
          onFinish={(result) => setPhase({ name: 'results', result })}
        />
      )}
      {phase.name === 'results' && (
        <Results
          result={phase.result}
          onNext={() => start()}
          onDrill={() => start({ kind: 'weak' })}
          onSetup={() => setPhase({ name: 'setup' })}
        />
      )}
    </Screen>
  );
}
