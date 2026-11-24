// House icon set: 24 px grid, 1.5 px stroke, round caps. Add new icons here so every icon matches.
const paths = {
  back: 'M15 5l-7 7 7 7',
  chevron: 'M9 5l7 7-7 7',
  settings:
    'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19.4 13.5l1.6 1.2-2 3.4-1.9-.7a7.6 7.6 0 0 1-1.9 1.1L14.9 21h-3.8l-.3-2.5a7.6 7.6 0 0 1-1.9-1.1l-1.9.7-2-3.4 1.6-1.2a7.7 7.7 0 0 1 0-3L3 9.3l2-3.4 1.9.7a7.6 7.6 0 0 1 1.9-1.1L9.1 3h3.8l.3 2.5c.7.3 1.3.6 1.9 1.1l1.9-.7 2 3.4-1.6 1.2a7.7 7.7 0 0 1 0 3z',
  learn: 'M3 7h18v11H3zM6 10h1M9 10h1M12 10h1M15 10h1M18 10h0M7 14h10',
  fight: 'M5 19l9-9M14 4l6 0 0 6M10 14l-5 5M4 4l16 16M9 19l-4-4',
  practice: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01',
  stats: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  upload: 'M12 20V9M7 14l5-5 5 5M5 4h14',
  reset: 'M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4',
  alert: 'M12 3l10 18H2L12 3zM12 10v5M12 18h.01',
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[name]} />
    </svg>
  );
}
