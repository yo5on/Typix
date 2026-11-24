import type { DrillSpec, Lesson, StepSpec, Unit } from '../../core/learning/lessons';
import { CODE_TRACKS } from './code';

// The Learning course as data (US QWERTY). PLAN §5.2. Every lesson is always playable: no locks.

const drill = (style: DrillSpec['style'], extra: Partial<DrillSpec> = {}): DrillSpec => ({
  kind: 'drill',
  style,
  ...extra,
});

/** The usual new-keys lesson: watch, single keys, patterns, words, then a review of everything so far. */
const keyLesson = (
  newKeys: string,
  allowed: string,
  title: string,
  blurb: string,
): Omit<Lesson, 'id' | 'unit' | 'index'> => ({
  group: 'course',
  title,
  blurb,
  newKeys,
  allowed,
  scored: true,
  steps: [{ kind: 'demo', keys: newKeys }, drill('single'), drill('pairs'), drill('words'), drill('review')],
});

const HOME = 'asdfghjkl;';
const TOP = 'qwertyuiop';
const BOTTOM = 'zxcvbnm,./';
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const RIGHT_CAPS = 'YUIOPHJKLNM';
const LEFT_CAPS = 'QWERTASDFGZXCVB';

const ALPHA = HOME + TOP + BOTTOM + RIGHT_CAPS + LEFT_CAPS;
const PUNCT = `'"?!:-`;
const DIGITS = '0123456789';
const WITH_DIGITS = ALPHA + PUNCT + DIGITS;

type Draft = Omit<Lesson, 'id' | 'unit' | 'index'>;

/** Units 6–8: new punctuation, number or symbol keys, then words with those keys worked in. */
const symbolLesson = (newKeys: string, allowed: string, title: string, blurb: string): Draft => ({
  ...keyLesson(newKeys, allowed, title, blurb),
  steps: [
    { kind: 'demo', keys: newKeys },
    drill('single'),
    drill('pairs'),
    drill('mixed', { count: 14 }),
    drill('mixed', { count: 18 }),
  ],
});

/** The closing lesson of Units 6–8: no new keys, the whole unit's keys in context. */
const mixedLesson = (focus: string, allowed: string, title: string, blurb: string): Draft => ({
  group: 'course',
  title,
  blurb,
  newKeys: '',
  focus,
  allowed,
  scored: true,
  steps: [drill('mixed', { count: 18 }), drill('mixed', { count: 20 })],
});

function unit(id: number, title: string, blurb: string, lessons: Draft[]): Unit {
  return {
    id,
    title,
    blurb,
    lessons: lessons.map((l, i) => ({ ...l, id: `u${id}.l${i + 1}`, unit: id, index: i + 1 })),
  };
}

const orientation = (title: string, blurb: string, steps: StepSpec[], allowed = ''): Draft => ({
  group: 'course',
  title,
  blurb,
  newKeys: '',
  allowed,
  scored: false,
  steps,
});

export const UNITS: Unit[] = [
  unit(0, 'Orientation', 'Posture, the F and J bumps, and the home position. Nothing is scored.', [
    orientation('Sit ready', 'How to sit so typing stays comfortable.', [
      {
        kind: 'intro',
        title: 'Touch typing means typing without looking',
        body: [
          'Each finger looks after its own keys. Once your fingers know where the keys are, your eyes can stay on the screen.',
          'This course teaches one or two keys at a time. You never need to rush: there are no timers here, and accuracy matters far more than speed.',
        ],
      },
      {
        kind: 'intro',
        title: 'Sit comfortably',
        body: [
          'Sit up straight with both feet on the floor and your shoulders relaxed.',
          'Keep your elbows close to your body, bent at about a right angle, and your wrists straight: they float just above the desk, they do not rest on it while you type.',
          'Put the screen about an arm’s length away, with the top of it at eye level.',
        ],
      },
    ]),
    orientation('Find F and J', 'The two small bumps that guide your hands home.', [
      {
        kind: 'intro',
        title: 'Feel for the bumps',
        body: [
          'Look at your keyboard: the F and J keys each have a small raised bump or line.',
          'Your index fingers rest on these two keys. You can find them by touch, without looking, every time your hands come back to the keyboard.',
        ],
      },
      { kind: 'find', title: 'Rest your left index finger on F, and press it', keys: 'f' },
      { kind: 'find', title: 'Rest your right index finger on J, and press it', keys: 'j' },
      { kind: 'find', title: 'Now without looking down: F, J, F, J', keys: 'fjfj' },
    ]),
    orientation('Home position', 'Where all eight fingers rest.', [
      {
        kind: 'intro',
        title: 'The home row',
        body: [
          'With your index fingers on F and J, let the other fingers fall on the keys next to them.',
          'Left hand: pinky on A, ring finger on S, middle finger on D, index on F. Right hand: index on J, middle on K, ring on L, pinky on the semicolon (;).',
          'Curve your fingers gently, as if holding a small ball. This is the home position: every key is a short reach from here.',
        ],
      },
      { kind: 'find', title: 'Press each home key with its own finger, left to right', keys: 'asdfjkl;' },
      { kind: 'find', title: 'And back again, right to left', keys: ';lkjfdsa' },
    ]),
    orientation(
      'Space and coming home',
      'Tap space with a thumb, and always return to the home row.',
      [
        {
          kind: 'intro',
          title: 'The thumbs and the space bar',
          body: [
            'Either thumb taps the space bar. Pick the one that feels natural; the other one simply rests.',
            'After every key, your finger goes back to its home key. This habit is what makes touch typing work.',
          ],
        },
        { kind: 'find', title: 'Tap the space bar with your thumb', keys: ' ' },
        { kind: 'drill', style: 'fixed', text: 'f j f j ff jj fj jf' },
      ],
      'fj',
    ),
  ]),

  unit(1, 'Home row', 'Eight fingers, eight keys, one finger pair at a time.', [
    keyLesson('fj', 'fj', 'F and J', 'Your index fingers on their home keys.'),
    keyLesson('dk', 'fjdk', 'D and K', 'Middle fingers join in.'),
    keyLesson('sl', 'fjdksl', 'S and L', 'Ring fingers join in.'),
    keyLesson('a;', 'fjdksla;', 'A and ;', 'The pinkies complete the home row.'),
    keyLesson('gh', HOME, 'G and H', 'Index fingers stretch in toward the middle.'),
    {
      group: 'course',
      title: 'Home-row words',
      blurb: 'Real words using the whole home row: sad, flask, glad.',
      newKeys: '',
      focus: 'asdfghjkl',
      allowed: HOME,
      scored: true,
      steps: [drill('words', { count: 14 }), drill('review', { count: 18 })],
    },
  ]),

  unit(2, 'Top row', 'Each lesson adds one finger’s reach up.', [
    keyLesson('ei', HOME + 'ei', 'E and I', 'Middle fingers reach up.'),
    keyLesson('ru', HOME + 'eiru', 'R and U', 'Index fingers reach up.'),
    keyLesson('ty', HOME + 'eiruty', 'T and Y', 'Index fingers reach up and in.'),
    keyLesson('wo', HOME + 'eirutywo', 'W and O', 'Ring fingers reach up.'),
    keyLesson('qp', HOME + TOP, 'Q and P', 'Pinkies reach up.'),
    {
      group: 'course',
      title: 'Top and home words',
      blurb: 'Words using the top and home rows together.',
      newKeys: '',
      focus: TOP,
      allowed: HOME + TOP,
      scored: true,
      steps: [drill('words', { count: 16 }), drill('review', { count: 18 })],
    },
    {
      group: 'course',
      title: 'First sentences',
      blurb: 'Short sentences, no capitals yet.',
      newKeys: '',
      focus: HOME + TOP,
      allowed: HOME + TOP,
      scored: true,
      steps: [drill('sentences', { count: 3 }), drill('sentences', { count: 3 })],
    },
  ]),

  unit(3, 'Bottom row', 'Curl the fingers down. B and N come last because they are the most confused.', [
    keyLesson('vm', HOME + TOP + 'vm', 'V and M', 'Index fingers curl down.'),
    keyLesson('c,', HOME + TOP + 'vmc,', 'C and comma', 'Middle fingers curl down.'),
    keyLesson('x.', HOME + TOP + 'vmc,x.', 'X and period', 'Ring fingers curl down.'),
    keyLesson('z/', HOME + TOP + 'vmc,x.z/', 'Z and slash', 'Pinkies curl down.'),
    keyLesson('bn', HOME + TOP + BOTTOM, 'B and N', 'Index fingers curl down and in.'),
    {
      group: 'course',
      title: 'The whole alphabet',
      blurb: 'Words from every letter, and sentences with commas and periods.',
      newKeys: '',
      focus: 'zxcvbnm',
      allowed: HOME + TOP + BOTTOM,
      scored: true,
      steps: [
        drill('words', { count: 16 }),
        drill('sentences', { count: 3 }),
        drill('review', { count: 18 }),
      ],
    },
  ]),

  unit(4, 'Capitals', 'Shift with the pinky of the opposite hand.', [
    {
      ...keyLesson(
        'JHKLUM',
        HOME + TOP + BOTTOM + RIGHT_CAPS,
        'Left Shift',
        'Capitals on the right hand: left pinky holds Shift.',
      ),
      steps: [{ kind: 'demo', keys: 'JK' }, drill('single'), drill('words', { capitalize: 0.6, count: 14 })],
    },
    {
      ...keyLesson(
        'FDSAER',
        HOME + TOP + BOTTOM + LEFT_CAPS,
        'Right Shift',
        'Capitals on the left hand: right pinky holds Shift.',
      ),
      steps: [{ kind: 'demo', keys: 'FD' }, drill('single'), drill('words', { capitalize: 0.6, count: 14 })],
    },
    {
      group: 'course',
      title: 'Capitalised words',
      blurb: 'Both Shift keys, mixed.',
      newKeys: '',
      focus: RIGHT_CAPS + LEFT_CAPS,
      allowed: HOME + TOP + BOTTOM + RIGHT_CAPS + LEFT_CAPS,
      scored: true,
      steps: [
        drill('words', { capitalize: 0.5, count: 16 }),
        drill('review', { capitalize: 0.4, count: 16 }),
      ],
    },
    {
      group: 'course',
      title: 'Sentence starts',
      blurb: 'Capital at the start, period at the end.',
      newKeys: '',
      focus: LOWER,
      allowed: HOME + TOP + BOTTOM + RIGHT_CAPS + LEFT_CAPS,
      scored: true,
      steps: [drill('sentences', { count: 3 }), drill('sentences', { count: 4 })],
    },
  ]),

  unit(5, 'Sentences and flow', 'Common words and letter groups, typed with a steady rhythm.', [
    ...(
      [
        [
          'Common words',
          'The words you will type most often.',
          [drill('words', { count: 20 }), drill('review', { count: 20 })],
        ],
        [
          'Frequent pairs',
          'Letter pairs like th, he, in, er and an.',
          [
            drill('words', { contains: ['th', 'he', 'in', 'er', 'an'], count: 18 }),
            drill('review', { count: 16 }),
          ],
        ],
        [
          'Common endings',
          'Endings like -ing, -tion, -ed and -ly.',
          [
            drill('words', { contains: ['ing', 'tion', 'ed', 'ly', 'er'], count: 18 }),
            drill('review', { count: 16 }),
          ],
        ],
        [
          'Short sentences',
          'Full sentences with capitals and punctuation.',
          [drill('sentences', { count: 4 }), drill('sentences', { count: 4 })],
        ],
        [
          'Steady rhythm',
          'Keep an even beat. Steadiness counts more than speed.',
          [drill('words', { count: 24 }), drill('sentences', { count: 5 })],
        ],
      ] as [string, string, StepSpec[]][]
    ).map(([title, blurb, steps]): Draft => ({
      group: 'course',
      title,
      blurb,
      newKeys: '',
      focus: LOWER,
      allowed: ALPHA,
      scored: true,
      steps,
    })),
  ]),

  unit(6, 'Punctuation', 'Quotes, question marks, colons and dashes, mostly on the right pinky.', [
    symbolLesson(
      `'"`,
      ALPHA + `'"`,
      'Apostrophe and quotes',
      `Right pinky, one key right of ;. Shift gives ".`,
    ),
    symbolLesson('?!', ALPHA + `'"?!`, 'Question and exclamation', 'Shift + slash, and Shift + 1.'),
    symbolLesson(':', ALPHA + `'"?!:`, 'Colon', 'Shift + semicolon, right pinky.'),
    symbolLesson('-', ALPHA + PUNCT, 'Hyphen and dashes', 'Right pinky reaches up to the number row.'),
    mixedLesson(PUNCT + ',.', ALPHA + PUNCT, 'Punctuated text', 'Every punctuation mark so far, mixed.'),
  ]),

  unit(7, 'Numbers', 'The number row, from the middle out. Each finger reaches up from its home key.', [
    symbolLesson('4567', ALPHA + PUNCT + '4567', '4 5 6 7', 'Index fingers reach up two rows.'),
    symbolLesson('38', ALPHA + PUNCT + '345678', '3 and 8', 'Middle fingers reach up.'),
    symbolLesson('29', ALPHA + PUNCT + '23456789', '2 and 9', 'Ring fingers reach up.'),
    symbolLesson('10', WITH_DIGITS, '1 and 0', 'Pinkies reach up.'),
    mixedLesson(DIGITS, WITH_DIGITS, 'Numbers in text', 'Prices, dates and counts between words.'),
  ]),

  unit(8, 'Symbols', 'Brackets, operators and the rest, grouped by the finger that types them.', [
    symbolLesson(
      '()',
      WITH_DIGITS + '()',
      'Parentheses',
      'Shift + 9 and Shift + 0: right ring finger and pinky.',
    ),
    symbolLesson('[]{}', WITH_DIGITS + '()[]{}', 'Brackets and braces', 'Right pinky, above the quote key.'),
    symbolLesson(
      '=+<>',
      WITH_DIGITS + '()[]{}=+<>',
      'Equals, plus, less and greater',
      'Right pinky, then Shift + comma and period.',
    ),
    symbolLesson(
      '_*&',
      WITH_DIGITS + '()[]{}=+<>_*&',
      'Underscore, star and ampersand',
      'Shifted number-row keys on the right hand.',
    ),
    symbolLesson(
      '@#$%^',
      WITH_DIGITS + '()[]{}=+<>_*&@#$%^',
      'At, hash, dollar, percent, caret',
      'Shifted number-row keys on the left hand.',
    ),
    symbolLesson(
      '~`|\\',
      WITH_DIGITS + '()[]{}=+<>_*&@#$%^~`|\\',
      'Tilde, backtick, pipe, backslash',
      'The corner keys, pinkies only.',
    ),
  ]),
];

/** Finger Gym: one drill per finger, plus one per hand. Recommendations find them by id (`gym.l2`). */
const FINGER_KEYS: [string, string, string][] = [
  ['L5', 'Left pinky', 'qaz'],
  ['L4', 'Left ring finger', 'wsx'],
  ['L3', 'Left middle finger', 'edc'],
  ['L2', 'Left index finger', 'rtfgvb'],
  ['R2', 'Right index finger', 'yuhjnm'],
  ['R3', 'Right middle finger', 'ik,'],
  ['R4', 'Right ring finger', 'ol.'],
  ['R5', 'Right pinky', 'p;/'],
];

export const GYM: Unit = {
  id: 9,
  title: 'Finger Gym',
  blurb: 'Short drills for one finger or one hand. Use them whenever a key feels shaky.',
  lessons: [
    ...FINGER_KEYS.map(([finger, title, keys], i): Lesson => ({
      id: `gym.${finger.toLowerCase()}`,
      group: 'gym',
      unit: 9,
      index: i + 1,
      title,
      blurb: `Keys ${[...keys].map((c) => c.toUpperCase()).join(' ')}`,
      newKeys: keys,
      allowed: LOWER + keys,
      scored: true,
      steps: [
        { kind: 'demo', keys },
        drill('single'),
        drill('pairs', { count: 14 }),
        drill('words', { count: 16 }),
      ],
    })),
    ...(
      [
        ['left', 'Left hand', 'qwertasdfgzxcvb'],
        ['right', 'Right hand', 'yuiophjklnm'],
      ] as const
    ).map(([id, title, keys], i): Lesson => ({
      id: `gym.${id}`,
      group: 'gym',
      unit: 9,
      index: FINGER_KEYS.length + i + 1,
      title,
      blurb: `Words typed with the ${id} hand only.`,
      newKeys: '',
      focus: keys,
      allowed: keys,
      scored: true,
      steps: [drill('words', { count: 16 }), drill('words', { count: 16 })],
    })),
  ],
};

/** Course lessons in order, then the code tracks, then the gym. */
export const LESSONS: readonly Lesson[] = [...UNITS, ...CODE_TRACKS, GYM].flatMap((u) => u.lessons);

export const findLesson = (id: string) => LESSONS.find((l) => l.id === id);

export { CODE_TRACKS };
