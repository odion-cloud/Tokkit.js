## Issues

### Creating a new issue
Before creating a new issue, search for similar or related issues to avoid duplication. If you can't find one, create a new issue using a relevant form and describe the issue as clearly as possible.

### Solving an issue
Browse existing issues to find one that interests you. Simple documentation updates and grammar fixes are welcome too.

## Making Changes

1. Fork the repository on GitHub.
2. Ensure you have Node.js 18+ installed.
3. Run `npm install` to install dependencies.
4. Create a working branch and start making changes!

### Development

```bash
# Build
npm run build

# Watch mode
npm run dev

# Run tests
npm test

# Type check only
npx tsc --noEmit
```

### Project Structure

```
src/
├── TokKit.ts          # Main facade (entry point)
├── core/
│   ├── Session.ts     # Cookie/identity management
│   ├── Actions.ts     # SSR extraction + API calls
│   └── mixins/
│       └── CursorFeed.ts  # Cursor-based pagination
├── parser/
│   ├── helpers.ts     # TokNode, ObservedArray, Maybe
│   ├── TokParser.ts   # JSON → TokNode mapper
│   ├── nodes/         # Data model classes
│   └── views/         # High-level view classes
└── utils/
    ├── Constants.ts   # All endpoints and categories
    ├── HTTPClient.ts  # Fetch wrapper + CookieJar
    ├── Log.ts         # Leveled logger
    └── Utils.ts       # Error classes + helpers
```

### Adding a New Node Class

1. Create a new file in `src/parser/nodes/YourNode.ts`
2. Extend `TokNode` and map all fields from the raw API data
3. Export it from `src/parser/nodes/index.ts`
4. Add a parser method in `TokParser.ts` if needed

### Adding a New View

1. Create a new file in `src/parser/views/YourView.ts`
2. Use `CursorFeed<T>` for paginated feeds or create a standalone view class
3. Export it from `src/parser/views/index.ts`
4. Add a method in `TokKit.ts` facade

### Committing Your Changes

We follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification:

```
feat: add hashtag feed support
fix: handle WAF retry for profile pages
docs: update API reference
```

### Creating a Pull Request

1. Use the pull request template to fill in details.
2. Link the PR to any related issue.
3. Ensure `npm run build` passes with zero errors.
4. Run `npm test` and verify results.
