# Cascade 🌊

A PLTL team game about putting things in order. Each team gets a sequence (the phases of mitosis, the steps of
balancing an equation, a titration...). Its steps are dealt to the team's phones as cards, and each phone sees only
its own cards. The team talks it out and whoever holds the next step plays it. A wrong card collapses the chain:
the cards are re-dealt and the team starts over. Finishing a sequence brings the next one.

Scoring: 100 points per finished sequence, minus 15 for each collapse on it (never below 20).

- `/` the leader: lobby (teams, students, subject and topics), the board on the projector, and the results
- `/join` students' phones
- `/submit` anyone: submit a sequence (subject, topic, title, steps in order)
- `/review` reviewers (same sign-in and reviewer list as the other PLTL sites)

Backend: the shared Supabase project (`cas-game`, `cas-play`, `cas-sequences`, `cas-review` Edge Functions,
`cas_*` tables). The game rules are in `supabase/functions/_shared/cascade.ts`.

## Run it

```
npm install
cp .env.example .env.local   # add the Supabase URL and publishable key
npm run dev
```
