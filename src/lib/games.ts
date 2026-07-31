import { getCollection, type CollectionEntry } from 'astro:content';

export type GameEntry = CollectionEntry<'games'>;

/** Hub page size — keep builds and HTML light as the catalog grows. */
export const GAMES_PER_PAGE = 24;

export function activeCodeCount(game: GameEntry): number {
  return game.data.codes.filter((c) => c.status === 'active').length;
}

export async function getAllGames(): Promise<GameEntry[]> {
  const games = await getCollection('games');
  return games.sort((a, b) => {
    const byDate = b.data.updatedAt.valueOf() - a.data.updatedAt.valueOf();
    if (byDate !== 0) return byDate;
    return a.data.gameName.localeCompare(b.data.gameName);
  });
}

export async function getFeaturedGames(limit = 8): Promise<GameEntry[]> {
  const games = await getAllGames();
  const byActive = (a: GameEntry, b: GameEntry) =>
    activeCodeCount(b) - activeCodeCount(a) || a.data.gameName.localeCompare(b.data.gameName);
  const featured = games.filter((g) => g.data.featured).sort(byActive);
  const rest = games.filter((g) => !g.data.featured).sort(byActive);
  const ordered = featured.length > 0 ? [...featured, ...rest] : games;
  return ordered.slice(0, limit);
}

export async function getGameBySlug(slug: string): Promise<GameEntry | undefined> {
  const games = await getAllGames();
  return games.find((g) => g.id === slug);
}

export function paginateGames(games: GameEntry[], page: number) {
  const total = games.length;
  const totalPages = Math.max(1, Math.ceil(total / GAMES_PER_PAGE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * GAMES_PER_PAGE;
  return {
    items: games.slice(start, start + GAMES_PER_PAGE),
    page: safePage,
    totalPages,
    total,
    hasPrev: safePage > 1,
    hasNext: safePage < totalPages,
  };
}

export function codesHref(page: number): string {
  return page <= 1 ? '/codes' : `/codes/page/${page}`;
}
