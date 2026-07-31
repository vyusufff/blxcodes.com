import type { APIRoute } from 'astro';
import { activeCodeCount, getAllGames } from '../lib/games';

export const GET: APIRoute = async () => {
  const games = await getAllGames();
  const payload = games.map((game) => ({
    id: game.id,
    gameName: game.data.gameName,
    description: game.data.description,
    updatedAt: game.data.updatedAt.toISOString(),
    activeCount: activeCodeCount(game),
    cover: game.data.cover ?? null,
  }));

  return new Response(JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
};
