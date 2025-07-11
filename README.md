# The Poet

A modern poetry exploration application built with Angular 19, featuring server-side rendering (SSR), offline-first architecture, and fast search capabilities.

## Features

- Unified search across poems and poets
- Server-side rendering for improved SEO and initial load
- Responsive, modern interface with Angular Material
- Fast, client-side search with Lunr.js
- Offline support with IndexedDB
- Ranked search results with author prioritization
- Real-time search suggestions
- Direct poem URL sharing

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm (v9 or later)
- Angular CLI (`npm install -g @angular/cli`)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd the-poet
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Environment Setup:
   ```bash
   # Copy the environment template
   cp src/environments/environment.template.ts src/environments/environment.ts
   ```

### Development Commands

```bash
# Start development server
ng serve

# Build for production
ng build

# Build and run with SSR
npm run build:ssr
npm run serve:ssr

# Run tests
ng test          # Unit tests
ng e2e           # End-to-end tests
```

## Search Functionality

### Author-Focused Search

When you search for poems by a specific author (e.g., "winter robert burns"), the system:

1. First identifies author names in your search query using:
   - Exact name matches
   - Consecutive word matches (e.g., "robert burns")
   - Individual name part matches
   - Author ranking system that prioritizes well-known poets

2. Extracts non-author terms from your search (e.g., "winter")

3. Prioritizes results by:
   - Poems by the matched author (1,000,000 base score)
   - Poems with search terms in their titles (+10,000 score)
   - Additional ranking based on poet prominence

### Title and Content Search

For general searches, the system:
- Performs full-text search across all poems
- Adds wildcards for terms longer than 2 characters
- Combines results from storage and search index
- Ranks results by relevance score

### Search Examples

- `winter robert burns` - Finds poems by Robert Burns about winter
- `sonnet shakespeare` - Finds Shakespeare's sonnets
- `death emily dickinson` - Finds Emily Dickinson's poems about death
- `love` - Finds all poems about love, ranked by author prominence and relevance

## Architecture

The application uses a modern Angular architecture focused on performance and user experience:

- Angular 19 with standalone components
- Server-side rendering (SSR) for improved initial load
- Client-side search index using Lunr.js
- IndexedDB for offline storage
- Progressive data loading with background refresh
- Angular Material UI components

## Project Structure

```
src/
├── app/
│   ├── components/      # UI components
│   │   ├── poem-card/   # Individual poem display
│   │   ├── poem-detail/ # Full poem view
│   │   ├── poem-list/   # List of poems
│   │   ├── search/      # Search interface
│   │   └── search-results/ # Search results display
│   ├── services/        # Core services
│   │   ├── poetry-db/   # API interaction
│   │   ├── poetry-search/ # Search functionality
│   │   ├── poetry-storage/ # IndexedDB management
│   │   └── poetry-search-index/ # Lunr.js integration
│   └── models/         # TypeScript interfaces
├── assets/            # Static assets and icons
│   └── search/       # Search data files
└── environments/      # Environment configuration
```

## Performance Features

- Server-side rendering for fast initial load
- Lazy-loaded routes
- Preloading strategies
- Image optimization
- IndexedDB for local data storage
- Optimized bundle size

## Common Issues

See [Setup Guide](src/docs/setup.md#common-issues) for solutions to common problems.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [PoetryDB](https://poetrydb.org/) for providing the poetry API
- The Angular team for the excellent framework and SSR support
- Angular Material team for the UI components
