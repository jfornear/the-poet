# The Poet

A modern poetry exploration application built with Angular, featuring server-side rendering (SSR), offline-first architecture, and fast search capabilities.

## Features

- Unified search across poems and poets
- Server-side rendering for improved SEO and initial load
- Responsive, modern interface with Material Design
- Fast, client-side search with Lunr.js
- Offline support with IndexedDB
- Ranked search results with author prioritization
- Real-time search suggestions
- Direct poem URL sharing

## Search Functionality

The application uses a sophisticated multi-stage search system that combines author matching and full-text search:

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

### Search Rankings

The system maintains a ranking of prominent poets to ensure their works appear higher in search results when relevant. Current top-ranked poets include:

1. William Shakespeare
2. Oscar Wilde
3. Emily Dickinson
4. Edgar Allan Poe
5. Walt Whitman

### Technical Implementation

The search functionality is implemented using:

- Lunr.js for full-text search capabilities
- Custom author matching algorithm
- Weighted multi-field search
- Background data refresh
- Client-side caching with IndexedDB
- Server-side rendering support

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm (v9 or later)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/the-poet.git
   cd the-poet
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open your browser and navigate to `http://localhost:4200`

## Architecture

The application uses a modern Angular architecture focused on performance and user experience:

- Angular 17+ with standalone components
- Server-side rendering (SSR) for improved initial load
- Client-side search index using Lunr.js
- IndexedDB for offline storage
- Progressive data loading with background refresh
- Material Design UI components

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
└── environments/      # Environment configuration
```

## Development

### Development server

Run `npm start` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

### Build

Run `npm run build` to build the project. The build artifacts will be stored in the `dist/` directory.

### SSR Build

Run `npm run build:ssr` to build the project with server-side rendering support.

### Running SSR

Run `npm run serve:ssr` to start the SSR server.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [PoetryDB](https://poetrydb.org/) for providing the poetry API
- The Angular team for the excellent framework and SSR support
- Material Design team for the UI components
