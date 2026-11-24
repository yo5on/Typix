import { expect, type Page } from '@playwright/test';

/** A fresh profile; `onboarded` skips the first-launch question. */
export async function freshStart(page: Page, { onboarded = false } = {}) {
  await page.addInitScript((skip) => {
    if (sessionStorage.getItem('e2e-init')) return; // only on the first load of the test
    sessionStorage.setItem('e2e-init', '1');
    localStorage.clear();
    // Hands and motion off: they cost a lot of rendering per key press in headless engines, and are not under test.
    localStorage.setItem(
      'typix.settings',
      JSON.stringify({ onboarded: skip, showHands: false, reducedMotion: 'on' }),
    );
  }, onboarded);
  await page.goto('./');
}

const keyName = (c: string) => (c === ' ' ? 'Space' : c);

/** Types the rest of the current drill text, one real key press per character. */
export async function typeDrill(page: Page) {
  const box = page.locator('[data-target]');
  const target = (await box.getAttribute('data-target'))!;
  const pos = Number(await box.getAttribute('data-pos'));
  // A small delay keeps WPM finite and realistic; keyboard.type sends real keydown events per character.
  await page.keyboard.type(target.slice(pos), { delay: 5 });
}

/** Identifies the current step: its kind plus its text to type, keys to find, or wording. 'none' on the summary. */
function stepSignature() {
  const el = document.querySelector('[data-step]');
  if (!el) return 'none';
  const detail =
    el.querySelector('[data-target]')?.getAttribute('data-target') ??
    el.getAttribute('data-keys') ??
    el.textContent;
  return `${el.getAttribute('data-step')}|${detail}`;
}

/** Plays whatever lesson is on screen through to its summary, answering every step from the DOM. */
export async function playLesson(page: Page) {
  const summary = page.getByRole('heading', { name: /^Lesson (complete|mastered)$/ });
  for (let guard = 0; guard < 80; guard++) {
    await expect(summary.or(page.locator('[data-step]'))).toBeVisible();
    const before = await page.evaluate(stepSignature);
    if (before === 'none') {
      if (await summary.isVisible()) return;
      continue;
    }
    const kind = before.slice(0, before.indexOf('|'));
    if (kind === 'intro' || kind === 'demo') await page.keyboard.press('Space');
    else if (kind === 'find') for (const c of before.slice(5)) await page.keyboard.press(keyName(c));
    else if (kind === 'drill') await typeDrill(page);
    await expect.poll(() => page.evaluate(stepSignature)).not.toBe(before);
  }
  throw new Error('lesson did not finish');
}
