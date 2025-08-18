# Pokemon Team Evaluator

A web app for evaluating and optimizing Pokemon Showdown teams.

![Pokemon Team Evaluator](https://img.shields.io/badge/Pokemon-Team%20Evaluator-blue)

## Features

- **Team Import & Builder**: Paste teams from Pokemon Showdown or build them directly in the app
- **Archetype Detection**: Automatically classifies teams (Hyper Offense, Balance, Stall, etc.)
- **Battle Simulation**: Tests your team against Smogon sample teams
- **Type Coverage Analysis**: Comprehensive offensive and defensive type coverage ratings
- **Meta Coverage**: Analyzes how well your team handles highly used pokemon
- **Team Utilities**: Checks for essential moves like hazards, removal, and priority

## Getting Started

### Option 1: Docker Compose (Recommended)

```bash
# Start the application
docker-compose up

# Visit http://localhost:3000
```

### Option 2: Node.js

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Visit http://localhost:3000
```

Note: Without Redis, the Meta Coverage section will not load.

## Technical Notes

### Usage Statistics

The app fetches usage statistics from Smogon and caches them in Redis to:
- Minimize server load on Smogon
- Provide fast, reliable access to meta-game data

Docker Compose handles the Redis setup automatically, making it easy to get started without manual configuration. Stats are updated via the `update-usage-stats` script in `/src/scripts/`.

### AI & ML

The battle simulator uses a heuristic scoring AI to greedily choose the best move at a certain point. It's a precursor to minimax, which I plan to implement later (or [Expectiminimax](https://en.wikipedia.org/wiki/Expectiminimax) more precisely).

The archetype classifier leverages weighted feature analysis to find optimal team classifications. If I find enough labeled team data, or decide to create synthetic data, I can expand this with logistic regression or a gradient boosting classifier.

## Project Structure

```
src/
├── app/              # Next.js app directory
├── components/       # React components
├── lib/              # Core logic
│   ├── analysis/     # Team analysis algorithms
│   ├── battle/       # Battle simulation engine
│   ├── pokemon/      # Pokemon data handling
│   └── redis/        # Redis client and caching
├── data/             # Data like sample teams
├── scripts/          # Utility scripts
└── types/            # TypeScript definitions
```


## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](https://opensource.org/licenses/MIT).