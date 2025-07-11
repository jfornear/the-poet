import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, firstValueFrom, combineLatest } from 'rxjs';
import { distinctUntilChanged, debounceTime, filter } from 'rxjs/operators';
import lunr from 'lunr';
import { PoetryStorageService } from './poetry-storage.service';
import { PoetryDbService } from './poetry-db.service';
import { Poem, SearchResult } from '../models/poetry.models';

@Injectable({
  providedIn: 'root'
})
export class PoetrySearchIndexService {
  private searchIndex: lunr.Index | null = null;
  private poemMap = new Map<string, Poem>();
  private indexReadySubject = new BehaviorSubject<boolean>(false);
  private indexingInProgress = false;
  private lastIndexTime = 0;
  private readonly INDEX_REFRESH_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

  constructor(
    private storageService: PoetryStorageService,
    private poetryDbService: PoetryDbService
  ) {
    // Combine data availability and background loading status
    combineLatest([
      this.storageService.isDataAvailable(),
      this.poetryDbService.backgroundLoading$
    ]).pipe(
      // Wait for any rapid changes to settle
      debounceTime(1000),
      // Only emit when values actually change
      distinctUntilChanged((prev, curr) => 
        prev[0] === curr[0] && prev[1] === curr[1]
      ),
      // Only proceed when data is available and not loading
      filter(([available, loading]) => available && !loading)
    ).subscribe(async () => {
      await this.initializeIndex();
    });
  }

  private shouldRefreshIndex(): boolean {
    return !this.searchIndex || 
           Date.now() - this.lastIndexTime > this.INDEX_REFRESH_INTERVAL;
  }

  async initializeIndex(): Promise<void> {
    // Prevent multiple concurrent indexing operations
    if (this.indexingInProgress) {
      return;
    }

    this.indexingInProgress = true;

    try {
      const poems = await this.storageService.getPoems();
      
      // Only skip if we have a valid index and it's not time to refresh
      if (!poems.length) {
        console.log('No poems available for indexing');
        this.indexReadySubject.next(false);
        return;
      }

      // Always rebuild if we have poems but no index
      if (!this.searchIndex || this.shouldRefreshIndex()) {
        console.log('Initializing search index with poems:', poems);
        this.poemMap.clear();

        // Store poems in map before building the index
        poems.forEach(poem => {
          const id = `${poem.author}-${poem.title}`.toLowerCase().replace(/[^a-z0-9]/g, '-');
          this.poemMap.set(id, poem);
        });

        // Build the index with improved configuration
        this.searchIndex = lunr(function(this: lunr.Builder) {
          // Enable wildcard searches (e.g., "shake*" matches "shakespeare")
          this.pipeline.remove(lunr.stemmer);
          this.searchPipeline.remove(lunr.stemmer);
          
          // Add fields with appropriate boosts
          this.field('author', { 
            boost: 10,
            extractor: (doc: any) => {
              // Split author name into parts and add variations for better matching
              const name = doc.author.toLowerCase();
              const parts = name.split(/\s+/);
              // Include full name, individual parts, and first+last combinations
              const variations = [
                name,
                ...parts,
                parts[0] + ' ' + parts[parts.length - 1]
              ];
              return variations.join(' ');
            }
          });

          // Enhanced title field with higher boost and position-based weighting
          this.field('exactTitle', {
            boost: 25,  // Highest boost for exact title matches
            extractor: (doc: any) => doc.title.toLowerCase()
          });
          
          this.field('titleStart', {
            boost: 20,  // High boost for words at start of title
            extractor: (doc: any) => {
              const words = doc.title.toLowerCase().split(/\s+/);
              return words.slice(0, Math.min(3, words.length)).join(' ');
            }
          });
          
          this.field('title', { 
            boost: 15,  // General title matches
            extractor: (doc: any) => {
              const title = doc.title.toLowerCase();
              const words = title.split(/\s+/);
              // Add individual words and bigrams to preserve some word order
              return [
                title,
                ...words,
                ...words.slice(0, -1).map((w: string, i: number) => `${w} ${words[i + 1]}`)
              ].join(' ');
            }
          });
          
          this.field('lines', { boost: 1 });
          
          this.ref('id');

          // Add documents to the index
          poems.forEach((poem: Poem) => {
            const id = `${poem.author}-${poem.title}`.toLowerCase().replace(/[^a-z0-9]/g, '-');
            const doc = {
              id: id,
              title: poem.title || '',
              exactTitle: poem.title || '',
              titleStart: poem.title || '',
              author: poem.author || '',
              lines: poem.lines ? poem.lines.join(' ') : ''
            };
            this.add(doc);
          });
        });

        this.lastIndexTime = Date.now();
        console.log('Search index initialized');
        console.log('Sample indexed documents:', Array.from(this.poemMap.values()).slice(0, 3).map(p => ({
          title: p.title,
          author: p.author
        })));
      } else {
        console.log('Using existing search index');
      }
      
      this.indexReadySubject.next(true);
    } catch (error) {
      console.error('Error initializing search index:', error);
      this.indexReadySubject.next(false);
    } finally {
      this.indexingInProgress = false;
    }
  }

  async search(query: string): Promise<SearchResult[]> {
    if (!query.trim()) {
      console.log('Empty search query');
      return [];
    }

    // If index isn't ready, try to initialize it
    if (!this.searchIndex) {
      console.log('Search index not ready, checking data availability...');
      const dataAvailable = await firstValueFrom(this.storageService.isDataAvailable());
      if (dataAvailable) {
        console.log('Data available, initializing index...');
        await this.initializeIndex();
      } else {
        console.log('Cannot search - no data available');
        return [];
      }
    }

    if (!this.searchIndex) {
      console.log('Search index still not ready after initialization attempt');
      return [];
    }

    try {
      // Prepare search terms
      const searchTerms = query.toLowerCase().split(/\s+/);
      const wildcardTerms = searchTerms.map(term => {
        // Add wildcards for terms longer than 2 characters
        if (term.length > 2) {
          return `${term}*`;
        }
        return term;
      });
      const searchQuery = wildcardTerms.join(' ');
      
      console.log('Performing search with query:', searchQuery);
      const results = this.searchIndex.search(searchQuery);
      console.log('Raw search results:', results.map(r => ({
        ref: r.ref,
        score: r.score,
        matchData: r.matchData
      })));

      const searchResults = results
        .map(result => {
          const poem = this.poemMap.get(result.ref);
          if (!poem) {
            console.log('Poem not found for ref:', result.ref);
            return null;
          }
          return {
            poem,
            score: result.score
          };
        })
        .filter((result): result is SearchResult => result !== null)
        .sort((a, b) => b.score - a.score);

      console.log('Final search results:', searchResults.map(r => ({
        title: r.poem.title,
        author: r.poem.author,
        score: r.score
      })));
      
      // Log poem map size and sample entries
      console.log('Poem map size:', this.poemMap.size);
      if (this.poemMap.size > 0) {
        const sampleKeys = Array.from(this.poemMap.keys()).slice(0, 3);
        console.log('Sample poem map entries:', sampleKeys.map(key => ({
          key,
          poem: this.poemMap.get(key)
        })));
      }

      return searchResults;
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }

  isIndexReady(): Observable<boolean> {
    return this.indexReadySubject.asObservable();
  }
} 