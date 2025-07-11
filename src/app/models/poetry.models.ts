export interface Poem {
  title: string;
  author: string;
  lines: string[];
  linecount?: number;
}

export interface SearchResult {
  poem: Poem;
  score: number;
}

export interface StorageMetadata {
  id?: string;
  lastUpdated: number;
  version: number;
  totalPoems: number;
  lastAuthorsFetch?: number;
}

export interface SearchState {
  isLoading: boolean;
  error: string | null;
  hasResults: boolean;
  isEmpty: boolean;
}

export interface PaginatedResults {
  results: SearchResult[];
  currentPage: number;
  totalPages: number;
  totalResults: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface CachedSearch {
  query: string;
  results: SearchResult[];
  timestamp: number;
  totalResults: number;
} 