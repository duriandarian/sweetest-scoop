# The Sweetest Scoop

A multiplayer shaved-ice party game for Daniel and Amy’s engagement party at Meet Fresh. Guests join a room without accounts, answer ten host-written questions, and watch rare answers dig deeper into the dessert.

The homepage introduces Bobi, a boba companion, in an automatic mango-sago photo tutorial. Increasingly niche example answers take guests deeper through relationship memories before the **Ready to play** action opens the game. These examples illustrate rarity; they do not calculate multiplayer scores.

## Setup

This project uses the Replit PostgreSQL database and the shared API server.

1. Install workspace dependencies with `pnpm install`.
2. Set the required environment variable `DATABASE_URL` for PostgreSQL. Replit provides it for the workspace database.
3. Apply the development schema with `pnpm --filter @workspace/db run push`.
4. Start the API server with `pnpm --filter @workspace/api-server run dev`.
5. Start the web app with `pnpm --filter @workspace/sweetest-scoop run dev`.

The web and API artifact workflows provide their own `PORT` and `BASE_PATH` values. Do not add database credentials to source control.

## Play

- Open the app and create a host room, or join using its six-character code.
- The host can edit the ten sample questions before starting.
- Guests answer on their own phones or computers. The host reveals a round before answers and scores appear.
- Use **Try Solo** to preview the excavation and all ten ingredient rewards without room scoring.

## Scoring

Answers are grouped after trimming, lowercasing, and collapsing repeated spaces. For `N` submitted answers and `C` players sharing an answer, points are `round(100 × (N − C + 1) / N)`. Scores map to five dessert tiers, with two ingredients per tier.

## Privacy

Guest and host sessions use random room tokens. Only token hashes are stored in the database. Room answer text is withheld from the room response until the host reveals it.
