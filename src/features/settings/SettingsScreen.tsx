import { useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { navigate } from '../../app/router';
import { settings, systemReduced, updateSettings } from '../../app/state';
import { defaultSettings, type Settings } from '../../core/store/schema';
import { Screen } from '../../ui/components/Screen';
import { Button, Field, Segmented, Slider, Toggle } from '../../ui/components/controls';
import { DataSection } from './DataSection';
import s from './SettingsScreen.module.css';

const categories = ['General', 'Accessibility', 'Audio', 'Learning', 'Fight', 'Data'] as const;
type Category = (typeof categories)[number];

/** Which settings each category's "Reset to defaults" restores. */
const categoryKeys: Record<Exclude<Category, 'Data'>, (keyof Settings)[]> = {
  General: ['textSize', 'layout'],
  Accessibility: ['reducedMotion', 'shake', 'flash', 'fingerLabels', 'colorBlindFingers'],
  Audio: ['sfx', 'music', 'ticks'],
  Learning: ['errorMode', 'showHands', 'handTone', 'guidanceOverride'],
  Fight: ['guardWindowBoost'],
};

function resetCategory(cat: Exclude<Category, 'Data'>) {
  const d = defaultSettings();
  updateSettings(Object.fromEntries(categoryKeys[cat].map((k) => [k, d[k]])));
}

export function SettingsScreen() {
  const [cat, setCat] = useState<Category>('General');
  const v = settings.value;

  return (
    <Screen title="Settings" onBack={() => navigate('menu')}>
      <div class={s.layout}>
        <nav class={s.nav} aria-label="Settings categories">
          {categories.map((c, i) => (
            <button
              type="button"
              key={c}
              class={s.navItem}
              aria-current={c === cat ? 'page' : undefined}
              onClick={() => setCat(c)}
              data-autofocus={i === 0 ? true : undefined}
            >
              {c}
            </button>
          ))}
        </nav>

        <section class={s.panel} aria-labelledby="settings-heading">
          <div class={s.panelHead}>
            <h2 id="settings-heading" class={s.heading}>
              {cat}
            </h2>
            {cat !== 'Data' && (
              <Button variant="ghost" icon="reset" onClick={() => resetCategory(cat)}>
                Reset to defaults
              </Button>
            )}
          </div>

          {cat === 'General' && (
            <Group>
              <Field
                id="textSize"
                label="Typing text size"
                hint="Size of the text you type in lessons and tests."
              >
                <Segmented
                  id="textSize"
                  value={v.textSize}
                  options={(['S', 'M', 'L', 'XL'] as const).map((x) => ({ value: x, label: x }))}
                  onChange={(textSize) => updateSettings({ textSize })}
                />
              </Field>
              <Field
                id="layout"
                label="Keyboard layout"
                hint="Other layouts are planned. Typix expects a physical US keyboard for now."
              >
                <span class={s.static}>US QWERTY</span>
              </Field>
            </Group>
          )}

          {cat === 'Accessibility' && (
            <Group>
              <Field
                id="reducedMotion"
                label="Reduce motion"
                hint={`Replaces movement with fades. "System" follows your OS, which is set to ${
                  systemReduced.value ? 'reduced' : 'full'
                } motion.`}
              >
                <Segmented
                  id="reducedMotion"
                  value={v.reducedMotion}
                  options={[
                    { value: 'system', label: 'System' },
                    { value: 'on', label: 'On' },
                    { value: 'off', label: 'Off' },
                  ]}
                  onChange={(reducedMotion) => updateSettings({ reducedMotion })}
                />
              </Field>
              <Field id="shake" label="Screen shake" hint="Camera shake on heavy hits in Fight.">
                <Slider id="shake" value={v.shake} onChange={(shake) => updateSettings({ shake })} />
              </Field>
              <Field
                id="flash"
                label="Flash intensity"
                hint="Hit flashes in Fight. Never faster than 3 per second."
              >
                <Slider id="flash" value={v.flash} onChange={(flash) => updateSettings({ flash })} />
              </Field>
              <Field
                id="fingerLabels"
                label="Finger labels"
                hint="Adds a finger label (such as L4) to keys, so finger colours are not the only cue."
              >
                <Toggle
                  id="fingerLabels"
                  checked={v.fingerLabels}
                  onChange={(fingerLabels) => updateSettings({ fingerLabels })}
                />
              </Field>
              <Field
                id="colorBlindFingers"
                label="Colour-blind finger colours"
                hint="Four colours that stay distinct with red-green and blue-yellow colour blindness (one per finger, the same on both hands), and a striped pattern on the key to press."
              >
                <Toggle
                  id="colorBlindFingers"
                  checked={v.colorBlindFingers}
                  onChange={(colorBlindFingers) => updateSettings({ colorBlindFingers })}
                />
              </Field>
            </Group>
          )}

          {cat === 'Audio' && (
            <Group>
              <Field id="sfx" label="Sound effects">
                <Slider id="sfx" value={v.sfx} onChange={(sfx) => updateSettings({ sfx })} />
              </Field>
              <Field id="music" label="Music">
                <Slider id="music" value={v.music} onChange={(music) => updateSettings({ music })} />
              </Field>
              <Field id="ticks" label="Keystroke sounds" hint="A soft tick on every key press.">
                <Toggle id="ticks" checked={v.ticks} onChange={(ticks) => updateSettings({ ticks })} />
              </Field>
            </Group>
          )}

          {cat === 'Learning' && (
            <Group>
              <Field
                id="errorMode"
                label="On a typo"
                hint="Wait: the cursor stays until you press the right key. Continue: the mistake is marked and you carry on."
              >
                <Segmented
                  id="errorMode"
                  value={v.errorMode}
                  options={[
                    { value: 'stop', label: 'Wait' },
                    { value: 'continue', label: 'Continue' },
                  ]}
                  onChange={(errorMode) => updateSettings({ errorMode })}
                />
              </Field>
              <Field id="showHands" label="Show hands" hint="Animated hands over the on-screen keyboard.">
                <Toggle
                  id="showHands"
                  checked={v.showHands}
                  onChange={(showHands) => updateSettings({ showHands })}
                />
              </Field>
              <Field id="handTone" label="Hand style">
                <Segmented
                  id="handTone"
                  value={v.handTone}
                  options={[
                    { value: 'light', label: 'Light' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'tan', label: 'Tan' },
                    { value: 'deep', label: 'Deep' },
                    { value: 'ghost', label: 'Outline' },
                  ]}
                  onChange={(handTone) => updateSettings({ handTone })}
                />
              </Field>
              <Field
                id="guidanceOverride"
                label="Guidance level"
                hint="Auto fades hints one key at a time as you master it. Pick a level to fix it for every key."
              >
                <Segmented
                  id="guidanceOverride"
                  value={v.guidanceOverride}
                  options={[
                    { value: 'auto', label: 'Auto' },
                    { value: 3, label: 'Full' },
                    { value: 2, label: 'Key' },
                    { value: 1, label: 'On pause' },
                    { value: 0, label: 'None' },
                  ]}
                  onChange={(guidanceOverride) => updateSettings({ guidanceOverride })}
                />
              </Field>
            </Group>
          )}

          {cat === 'Fight' && (
            <Group>
              <Field
                id="guardWindowBoost"
                label="Longer guard windows"
                hint="Gives 50% more time to answer guard prompts, on every difficulty."
              >
                <Toggle
                  id="guardWindowBoost"
                  checked={v.guardWindowBoost}
                  onChange={(guardWindowBoost) => updateSettings({ guardWindowBoost })}
                />
              </Field>
            </Group>
          )}

          {cat === 'Data' && <DataSection />}
        </section>
      </div>
    </Screen>
  );
}

function Group({ children }: { children: ComponentChildren }) {
  return <div class={s.group}>{children}</div>;
}
