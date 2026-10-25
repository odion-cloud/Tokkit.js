# Updating the Parser

This document explains how to update the TokKit parser when TikTok changes its API responses.

## Overview

TokKit extracts data from two sources:
1. **SSR (Server-Side Rendering)** — HTML pages with embedded `__UNIVERSAL_DATA_FOR_REHYDRATION__` JSON
2. **API endpoints** — JSON responses from `/api/*` paths

When TikTok changes field names, adds new fields, or restructures responses, the parser needs updating.

## How to Investigate Changes

### 1. Check SSR Data
Run the dev script to dump raw SSR data:

```bash
node dev-scripts/dump-ssr.mjs /@username
node dev-scripts/dump-ssr.mjs /foryou
node dev-scripts/dump-ssr.mjs /explore
```

### 2. Check API Responses
Run the API test script:

```bash
node dev-scripts/test-endpoints.mjs
```

### 3. Compare Field Changes
Compare the output against the existing node class to identify:
- New fields that should be added
- Renamed fields
- Removed fields
- Structural changes

## Updating a Node Class

1. Open the relevant node file in `src/parser/nodes/`
2. Add/modify the field declarations
3. Update the constructor to map the new fields
4. Rebuild and test

## Adding a New Endpoint

1. Add the endpoint path to `src/utils/Constants.ts` → `API_PATHS`
2. Test it with the dev script first
3. Create a parser method in `TokParser.ts`
4. Create a view class in `src/parser/views/`
5. Add a facade method in `TokKit.ts`
