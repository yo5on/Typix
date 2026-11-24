import { expect, test, type Page } from '@playwright/test';
import { freshStart, playLesson, typeDrill } from './helpers';

test('first launch → Unit 0 and Unit 1, keyboard only @slow-on-windows-webkit', async ({ page }) => {
  test.setTimeout(240_000);
  await freshStart(page);
  await expect(page.getByRole('heading', { name: 'How do you type today?' })).toBeVisible();
  await page.keyboard.press('1'); // "I'm new to touch typing"
  await expect(page.getByRole('heading', { name: /0\.1 · Sit ready/i })).toBeVisible();

  // Unit 0 (4 lessons) and Unit 1 (6 lessons), each continued from its summary with Enter.
  for (let lesson = 0; lesson < 10; lesson++) {
    await playLesson(page);
    if (lesson < 9) {
      await expect(page.getByRole('button', { name: /^Continue to/ })).toBeFocused();
      await page.keyboard.press('Enter');
    }
  }
  await page.keyboard.press('Escape'); // summary → lesson list
  for (const id of ['1.1', '1.6'])
    await expect(
      page.getByRole('button', { name: new RegExp(`^${id.replace('.', '\\.')} ·.*(Completed|Mastered)$`) }),
    ).toBeVisible();
  await expect(page.getByRole('button', { name: /2\.1 · E and I/ }).first()).toBeVisible();
});

test('punctuation lesson: quotes and apostrophes type without browser shortcuts', async ({ page }) => {
  await freshStart(page, { onboarded: true });
  await page.goto('./#/learn');
  await page.getByRole('button', { name: /^6\.1 · Apostrophe and quotes/ }).click();
  await playLesson(page);
  await expect(page.getByRole('heading', { name: /^Lesson (complete|mastered)$/ })).toBeVisible();
});

test('a capital typed with the same-hand Shift gets a reminder', async ({ page }) => {
  await freshStart(page, { onboarded: true });
  await page.goto('./#/learn');
  await page.getByRole('button', { name: /^4\.1 · Left Shift/ }).click();
  await page.keyboard.press('Space'); // demo J
  await page.keyboard.press('Space'); // demo K
  const box = page.locator('[data-target]');
  await expect(box).toHaveAttribute('data-target', /^J/);
  // J is a right-hand letter: it needs the left Shift. Use the right one instead.
  await page.keyboard.down('ShiftRight');
  await page.keyboard.press('KeyJ');
  await page.keyboard.up('ShiftRight');
  await expect(page.getByText('Use the left Shift for this capital')).toBeVisible();
  await expect(box).toHaveAttribute('data-pos', '1'); // the character itself was right
  await typeDrill(page);
});

test('a Stats recommendation opens its lesson directly', async ({ page }) => {
  await freshStart(page, { onboarded: true });
  await page.goto('./#/stats');
  await page.getByRole('button', { name: /^Continue to 0\.1 · Sit ready/ }).click();
  await expect(page.locator('[data-step="intro"]')).toBeVisible();
  await expect(page).toHaveURL(/#\/learn$/);
});

async function startPlacement(page: Page) {
  await freshStart(page);
  await page.keyboard.press('2'); // "I can type, place me"
  await expect(page.getByRole('heading', { name: 'Placement test', level: 2 })).toBeVisible();
  await page.keyboard.press('Space');
  await expect(page.getByText(/Home row · stage 1 of 7/)).toBeVisible();
}

test('placement: a shaky first stage starts the course from the beginning', async ({ page }) => {
  await startPlacement(page);
  await page.keyboard.type('zzzzzzzz'); // wrong keys: accuracy drops below the pass mark
  await typeDrill(page);
  await expect(page.getByText('The course starts from the beginning', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: /^Start 0\.1 · Sit ready/ }).click();
  await expect(page.locator('[data-step="intro"]')).toBeVisible();
});

test('placement: pass the home row, fall short on the top row @slow-on-windows-webkit', async ({ page }) => {
  await startPlacement(page);
  await typeDrill(page);
  await expect(page.getByText(/Top row · stage 2 of 7/)).toBeVisible();
  await page.keyboard.type('zzzzzz');
  await typeDrill(page);
  await expect(page.getByText('Units 0–1 are marked completed.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: /^Start 2\.1 · E and I/ }).click();
  await expect(page.locator('[data-step]')).toBeVisible();
});
