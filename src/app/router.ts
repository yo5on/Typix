import { signal } from '@preact/signals';

/** 'fight-lab' is a development-only test bench: it resolves to the menu in production builds. */
export const ROUTES = ['menu', 'learn', 'fight', 'practice', 'stats', 'settings', 'fight-lab'] as const;
export type Route = (typeof ROUTES)[number];

function parse(hash: string): Route {
  const name = hash.replace(/^#\/?/, '');
  if (name === 'fight-lab' && !import.meta.env.DEV) return 'menu';
  return (ROUTES as readonly string[]).includes(name) ? (name as Route) : 'menu';
}

/** Hash routing keeps the app working on any static host with no server rewrites. */
export const route = signal<Route>(parse(location.hash));

addEventListener('hashchange', () => (route.value = parse(location.hash)));

export function navigate(to: Route) {
  location.hash = to === 'menu' ? '/' : `/${to}`;
}
