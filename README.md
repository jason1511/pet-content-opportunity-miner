# Pet Growth Platform

An AI-assisted pet growth engineering project that connects internal opportunity research with customer-facing utility tools.

## Product areas

### Growth workspace

- Live search autocomplete signals
- AI-generated customer questions
- Strict opportunity scoring and recommendations
- Structured landing-page briefs
- Automated output QA
- Single-keyword and batch workflows

### Customer tools

- Australian Pet Vet Cost Estimator
- Input validation and seven-day Cloudflare KV caching
- Clear planning disclaimer and estimate assumptions
- Direct navigation between the research and customer experiences

The estimator was consolidated from the original [web5](https://github.com/jason1511/web5) prototype. The original repository is retained for history while this project becomes the canonical combined application.

## Architecture

The Cloudflare Worker serves static assets and three API workflows:

- `GET /api/autocomplete`
- `POST /api/questions`
- `POST /api/mine`
- `POST /api/estimate`

OpenAI powers question generation and opportunity analysis. Vet-cost ranges are calculated deterministically from published Australian provider prices plus transparent model adjustments. Cloudflare KV caches repeated estimate combinations for seven days.

## Local development

```bash
npm install
npx wrangler secret put OPENAI_API_KEY
npm run dev
```

Open the local Wrangler URL. The platform homepage is at `/`, the research workspace at `/research.html`, batch analysis at `/batch.html`, and the estimator at `/tools/vet-cost/`.

## Quality checks

```bash
npm run check
```

The smoke check verifies all public routes, local links, required assets, Worker API routes, and absence of generated or legacy files.

## Deployment

```bash
npm run deploy
```

## Important limitation

Vet-cost results are indicative planning estimates, not clinic quotes or medical advice. Each result lists its published Australian price anchors, calculation method, model assumptions, and pricing-data review date.

## Author

Jason Leonard — Bachelor of ICT (Software Technology)
