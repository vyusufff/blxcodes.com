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
  // Almost every game is marked featured in the JSON corpus, so the old flag
  // produced a static "most codes" list. Prefer pages Google and players can
  // treat as live: recent updates with working codes still available.
  return [...games]
    .filter((game) => activeCodeCount(game) > 0)
    .sort((a, b) => {
      const byDate = b.data.updatedAt.valueOf() - a.data.updatedAt.valueOf();
      if (byDate !== 0) return byDate;
      const byActive = activeCodeCount(b) - activeCodeCount(a);
      if (byActive !== 0) return byActive;
      return a.data.gameName.localeCompare(b.data.gameName);
    })
    .slice(0, limit);
}

const RELATED_STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'game',
  'of',
  'roblox',
  'simulator',
  'the',
  'to',
  'tycoon',
]);

function gameNameTokens(game: GameEntry): Set<string> {
  return new Set(
    game.data.gameName
      .toLowerCase()
      .match(/[a-z0-9]+/g)
      ?.filter((token) => token.length >= 3 && !RELATED_STOP_WORDS.has(token)) ?? [],
  );
}

/**
 * Build useful crawl paths between games with genuinely related names (anime,
 * tower defense, soccer, etc.). When no close matches exist, favor recently
 * updated pages with working codes rather than returning an empty dead end.
 */
export function getRelatedGames(
  current: GameEntry,
  games: GameEntry[],
  limit = 6,
): GameEntry[] {
  const currentTokens = gameNameTokens(current);
  return games
    .filter((game) => game.id !== current.id)
    .map((game) => {
      const shared = [...gameNameTokens(game)].filter((token) => currentTokens.has(token)).length;
      const active = Math.min(activeCodeCount(game), 20);
      const ageDays = Math.max(
        0,
        (Date.now() - game.data.updatedAt.valueOf()) / (24 * 60 * 60 * 1000),
      );
      const freshness = Math.max(0, 30 - ageDays);
      return { game, score: shared * 1000 + active * 2 + freshness };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.game.data.updatedAt.valueOf() - a.game.data.updatedAt.valueOf() ||
        a.game.data.gameName.localeCompare(b.game.data.gameName),
    )
    .slice(0, limit)
    .map(({ game }) => game);
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
