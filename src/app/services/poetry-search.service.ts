import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, from, of, firstValueFrom, forkJoin, BehaviorSubject, Subject } from 'rxjs';
import { map, tap, switchMap, catchError, mergeMap, takeUntil } from 'rxjs/operators';
import { PoetryStorageService } from './poetry-storage.service';
import { PoetrySearchIndexService } from './poetry-search-index.service';
import { PoetryDbService } from './poetry-db.service';
import { Poem } from '../models/poetry.models';

interface AuthorSearchResult {
  author: string;
  rank: number;
  matchType: 'exact' | 'startsWith' | 'contains';
}

interface AuthorMatch {
  author: string;
  score: number;  // Combined score of ranking and match quality
  baseRanking: number;  // Original ranking from POET_RANKINGS
}

@Injectable({
  providedIn: 'root'
})
export class PoetrySearchService {
  private readonly POET_RANKINGS = new Map([
    ['William Shakespeare', 1],
    ['Oscar Wilde', 2],
    ['Emily Dickinson', 3],
    ['Edgar Allan Poe', 4],
    ['Walt Whitman', 5],
    ['Robert Burns', 6],
    ['Elizabeth Barrett Browning', 7],
    ['William Blake', 8],
    ['Lord Alfred Tennyson', 9],
    ['Percy Bysshe Shelley', 10],
    ['John Keats', 11],
    ['Christina Rossetti', 12],
    ['William Wordsworth', 13],
    ['Robert Browning', 14],
    ['Emily Bronte', 15],
    ['Gerard Manley Hopkins', 16],
    ['Ralph Waldo Emerson', 17],
    ['John Milton', 18],
    ['Edmund Spenser', 19],
    ['Andrew Marvell', 20]
  ]);

  private readonly ALL_AUTHORS = new Set([
    "Adam Lindsay Gordon", "Alan Seeger", "Alexander Pope", "Algernon Charles Swinburne",
    "Ambrose Bierce", "Amy Levy", "Andrew Marvell", "Ann Taylor", "Anne Bradstreet",
    "Anne Bronte", "Anne Killigrew", "Anne Kingsmill Finch", "Annie Louisa Walker",
    "Arthur Hugh Clough", "Ben Jonson", "Charles Kingsley", "Charles Sorley",
    "Charlotte Bronte", "Charlotte Smith", "Christina Rossetti", "Christopher Marlowe",
    "Christopher Smart", "Coventry Patmore", "Edgar Allan Poe", "Edmund Spenser",
    "Edward Fitzgerald", "Edward Lear", "Edward Taylor", "Edward Thomas", "Eliza Cook",
    "Elizabeth Barrett Browning", "Emily Bronte", "Emily Dickinson", "Emma Lazarus",
    "Ernest Dowson", "Eugene Field", "Francis Thompson", "Geoffrey Chaucer",
    "George Eliot", "George Gordon, Lord Byron", "George Herbert", "George Meredith",
    "Gerard Manley Hopkins", "Helen Hunt Jackson", "Henry David Thoreau",
    "Henry Vaughan", "Henry Wadsworth Longfellow", "Hugh Henry Brackenridge",
    "Isaac Watts", "James Henry Leigh Hunt", "James Thomson", "James Whitcomb Riley",
    "Jane Austen", "Jane Taylor", "John Clare", "John Donne", "John Dryden",
    "John Greenleaf Whittier", "John Keats", "John McCrae", "John Milton",
    "John Trumbull", "John Wilmot", "Jonathan Swift", "Joseph Warton", "Joyce Kilmer",
    "Julia Ward Howe", "Jupiter Hammon", "Katherine Philips", "Lady Mary Chudleigh",
    "Lewis Carroll", "Lord Alfred Tennyson", "Louisa May Alcott",
    "Major Henry Livingston, Jr.", "Mark Twain", "Mary Elizabeth Coleridge",
    "Matthew Arnold", "Matthew Prior", "Michael Drayton", "Oliver Goldsmith",
    "Oliver Wendell Holmes", "Oscar Wilde", "Paul Laurence Dunbar",
    "Percy Bysshe Shelley", "Philip Freneau", "Phillis Wheatley",
    "Ralph Waldo Emerson", "Richard Crashaw", "Richard Lovelace", "Robert Browning",
    "Robert Burns", "Robert Herrick", "Robert Louis Stevenson", "Robert Southey",
    "Robinson", "Rupert Brooke", "Samuel Coleridge", "Samuel Johnson",
    "Sarah Flower Adams", "Sidney Lanier", "Sir John Suckling", "Sir Philip Sidney",
    "Sir Thomas Wyatt", "Sir Walter Raleigh", "Sir Walter Scott", "Stephen Crane",
    "Thomas Campbell", "Thomas Chatterton", "Thomas Flatman", "Thomas Gray",
    "Thomas Hood", "Thomas Moore", "Thomas Warton", "Walt Whitman",
    "Walter Savage Landor", "Wilfred Owen", "William Allingham", "William Barnes",
    "William Blake", "William Browne", "William Cowper", "William Cullen Bryant",
    "William Ernest Henley", "William Lisle Bowles", "William Morris",
    "William Shakespeare", "William Topaz McGonagall", "William Vaughn Moody",
    "William Wordsworth"
  ]);

  // Pre-built author search index
  private readonly authorSearchIndex: Map<string, string[]> = new Map();
  private readonly prefetchedAuthors = new Set<string>();
  private currentPrefetch?: Subject<void>;
  private isBrowser: boolean;

  constructor(
    private storageService: PoetryStorageService,
    private searchIndexService: PoetrySearchIndexService,
    private poetryDbService: PoetryDbService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.initializeAuthorIndex();
  }

  public async waitForInitialization(): Promise<void> {
    if (!this.isBrowser) {
      console.log('waitForInitialization: Not in browser');
      return;
    }

    // Wait for DB service to initialize
    await this.poetryDbService.initialize();
    
    // Wait for storage to be ready
    await this.storageService.waitForInitialization();
    
    // Wait for data to be available
    let retries = 0;
    const maxRetries = 5;
    
    while (retries < maxRetries) {
      const dataAvailable = await firstValueFrom(this.storageService.isDataAvailable());
      console.log(`Search service data check (attempt ${retries + 1}):`, dataAvailable);
      
      if (dataAvailable) {
        // Initialize search index
        await this.searchIndexService.initializeIndex();
        return;
      }
      
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 100));
      retries++;
    }
  }

  private initializeAuthorIndex() {
    // Index authors by first letter for quick lookup
    for (const author of this.ALL_AUTHORS) {
      const firstLetter = author[0].toLowerCase();
      let authors = this.authorSearchIndex.get(firstLetter) || [];
      authors.push(author);
      this.authorSearchIndex.set(firstLetter, authors);
    }

    // Sort each letter's authors by ranking
    for (const [letter, authors] of this.authorSearchIndex) {
      authors.sort((a, b) => {
        const rankA = this.POET_RANKINGS.get(a) || Number.MAX_SAFE_INTEGER;
        const rankB = this.POET_RANKINGS.get(b) || Number.MAX_SAFE_INTEGER;
        return rankA - rankB;
      });
    }
  }

  private prefetchAuthorsStartingWith(letter: string) {
    // Cancel any ongoing prefetch
    if (this.currentPrefetch) {
      this.currentPrefetch.next();
      this.currentPrefetch.complete();
    }

    // Get authors starting with this letter
    const authors = this.authorSearchIndex.get(letter.toLowerCase()) || [];
    const unprefetchedAuthors = authors.filter(author => !this.prefetchedAuthors.has(author));
    
    if (unprefetchedAuthors.length === 0) {
      console.log(`All authors starting with '${letter}' already prefetched`);
      return;
    }

    console.log(`Prefetching poems for ${unprefetchedAuthors.length} authors starting with '${letter}'`);
    
    // Create a new cancel subject
    this.currentPrefetch = new Subject<void>();

    // Fetch poems for each author in sequence
    from(unprefetchedAuthors).pipe(
      takeUntil(this.currentPrefetch),
      mergeMap(
        author => 
          from(this.poetryDbService.searchAuthor(author)).pipe(
            tap(poems => {
              console.log(`Prefetched ${poems.length} poems by ${author}`);
              this.prefetchedAuthors.add(author);
            }),
            catchError(err => {
              console.error(`Error prefetching poems for ${author}:`, err);
              return of([]);
            })
          ),
        2 // Limit concurrent requests
      )
    ).subscribe({
      complete: () => {
        console.log(`Completed prefetching for letter '${letter}'`);
        this.currentPrefetch = undefined;
      }
    });
  }

  private findMatchingAuthors(term: string): string[] {
    if (!term) return [];

    const termLower = term.toLowerCase().trim();
    const searchTerms = termLower.split(/\s+/);  // Split on whitespace
    
    // Try each term as a potential first letter
    let candidates = new Set<string>();
    for (const term of searchTerms) {
      const firstLetter = term[0];
      const termCandidates = this.authorSearchIndex.get(firstLetter) || [];
      termCandidates.forEach(author => candidates.add(author));
    }
    
    // Score and filter matches
    const matches: AuthorMatch[] = Array.from(candidates)
      .map(author => {
        const authorLower = author.toLowerCase();
        const baseRanking = this.POET_RANKINGS.get(author) || Number.MAX_SAFE_INTEGER;
        
        // Calculate match score
        let score = 0;
        const authorWords = authorLower.split(/\s+/);
        
        // Look for consecutive matches of author name parts
        for (let i = 0; i < searchTerms.length - 1; i++) {
          const twoTerms = searchTerms.slice(i, i + 2).join(' ');
          // Check if any two consecutive author name parts match
          for (let j = 0; j < authorWords.length - 1; j++) {
            const authorPair = authorWords.slice(j, j + 2).join(' ');
            if (authorPair === twoTerms) {
              score += 100000;  // High score for consecutive name matches
            }
          }
        }
        
        // Check individual word matches
        let matchedWords = 0;
        for (const word of authorWords) {
          if (searchTerms.includes(word)) {
            matchedWords++;
            score += 10000;
          }
        }
        
        // Bonus if we matched all author name parts
        if (matchedWords === authorWords.length) {
          score += 500000;
        }
        
        // If no significant matches found, return null
        if (score < 10000) return null;
        
        // Combine score with base ranking (inverted so lower rankings score higher)
        const finalScore = score + (1000000 - baseRanking);
        
        return {
          author,
          score: finalScore,
          baseRanking
        };
      })
      .filter((match): match is AuthorMatch => match !== null)
      .sort((a, b) => {
        // First sort by score (higher is better)
        const scoreDiff = b.score - a.score;
        if (scoreDiff !== 0) return scoreDiff;
        
        // If scores are equal, use base ranking
        return a.baseRanking - b.baseRanking;
      });

    // Debug log the matches and scores
    console.log('Search terms:', searchTerms);
    console.log('Author matches:', matches.map(m => ({
      author: m.author,
      score: m.score,
      baseRanking: m.baseRanking,
      ranking: this.POET_RANKINGS.get(m.author)
    })));

    return matches.map(match => match.author);
  }

  search(term: string): Observable<Poem[]> {
    if (!this.isBrowser) {
      console.log('search: Not in browser');
      return of([]); // Return empty array for SSR
    }

    console.log('PoetrySearchService: Searching for term:', term);

    // Start prefetching if it's a single letter
    if (term.length === 1) {
      this.prefetchAuthorsStartingWith(term);
    }

    // Find matching authors
    const matchingAuthors = this.findMatchingAuthors(term);
    const termLower = term.toLowerCase().trim();
    const searchTerms = termLower.split(/\s+/);

    // Check if this is an author-specific search
    const hasAuthorMatch = matchingAuthors.length > 0;
    
    // If we have author matches, first get their poems
    if (hasAuthorMatch) {
      console.log('Found matching authors:', matchingAuthors);

      // Get non-author search terms
      const authorWords = matchingAuthors[0].toLowerCase().split(/\s+/);
      const nonAuthorTerms = searchTerms.filter(term => 
        !authorWords.includes(term)
      );

      console.log('Non-author search terms:', nonAuthorTerms);

      // Fetch poems for matching authors
      return forkJoin(
        matchingAuthors.map(author => 
          from(this.poetryDbService.searchAuthor(author)).pipe(
            tap(poems => {
              console.log(`Found ${poems.length} poems by ${author} (${this.prefetchedAuthors.has(author) ? 'from cache' : 'from API'})`);
              if (!this.prefetchedAuthors.has(author)) {
                this.prefetchedAuthors.add(author);
              }
            }),
            catchError(err => {
              console.error(`Error fetching poems for ${author}:`, err);
              return of([]);
            })
          )
        )
      ).pipe(
        mergeMap(authorPoemsArrays => {
          // If we have additional search terms, do a full text search
          if (nonAuthorTerms.length > 0) {
            const textSearchTerm = nonAuthorTerms.join(' ');
            console.log('Searching for additional terms:', textSearchTerm);
            return from(this.searchIndexService.search(textSearchTerm)).pipe(
              map(results => {
                const combinedResults = this.combineAndRankResults(
                  authorPoemsArrays.flat(),
                  results.map(r => r.poem),
                  matchingAuthors[0],
                  textSearchTerm
                );
                console.log('Combined search results:', combinedResults.map(p => ({ title: p.title, author: p.author })));
                return combinedResults;
              })
            );
          }

          // If no additional terms, just return author poems
          const results = this.removeDuplicatesAndSort(authorPoemsArrays.flat());
          console.log('Author-only search results:', results.map(p => ({ title: p.title, author: p.author })));
          return of(results);
        }),
        tap(poems => {
          if (poems.length > 0) {
            // Trigger index rebuild in background if we found new poems
            this.searchIndexService.initializeIndex();
          }
        })
      );
    }

    // If no author matches, try the full-text search index
    console.log('No author matches found, performing full text search');
    return from(this.searchIndexService.search(term)).pipe(
      map(results => {
        const poems = results.map(r => r.poem);
        console.log('Full text search results:', poems.map(p => ({ title: p.title, author: p.author })));
        return poems;
      })
    );
  }

  private combineAndRankResults(authorPoems: Poem[], textSearchPoems: Poem[], matchedAuthor: string, searchTerm: string): Poem[] {
    // Create a scoring map for the poems
    const poemScores = new Map<Poem, number>();

    // Score author poems highly - use much higher base score
    authorPoems.forEach(poem => {
      let score = 1000000; // Massive base score for being by the matched author
      
      // Additional score if title contains search terms
      if (searchTerm && poem.title.toLowerCase().includes(searchTerm.toLowerCase())) {
        score += 10000;
      }
      
      poemScores.set(poem, score);
    });

    // Score text search poems
    textSearchPoems.forEach(poem => {
      let score = 100; // Base score for matching text
      
      // Massive boost score if it's by the matched author
      if (poem.author === matchedAuthor) {
        score += 1000000;
      }
      
      // Additional score if title contains search terms
      if (searchTerm && poem.title.toLowerCase().includes(searchTerm.toLowerCase())) {
        score += 10000;
      }

      // Use the higher score if the poem was found in both searches
      const existingScore = poemScores.get(poem) || 0;
      poemScores.set(poem, Math.max(score, existingScore));
    });

    // Sort poems by score and remove duplicates
    const uniquePoems = Array.from(poemScores.entries())
      .sort((a, b) => {
        const scoreDiff = b[1] - a[1];
        if (scoreDiff !== 0) return scoreDiff;
        
        // If scores are equal, use author ranking
        const rankA = this.POET_RANKINGS.get(a[0].author) || Number.MAX_SAFE_INTEGER;
        const rankB = this.POET_RANKINGS.get(b[0].author) || Number.MAX_SAFE_INTEGER;
        return rankA - rankB;
      })
      .map(([poem]) => poem);

    // Debug log the scores
    console.log('Poem scores:', uniquePoems.map(poem => ({
      title: poem.title,
      author: poem.author,
      score: poemScores.get(poem)
    })));

    return uniquePoems;
  }

  private removeDuplicatesAndSort(poems: Poem[]): Poem[] {
    // Remove duplicates
    const seen = new Set<string>();
    const uniquePoems = poems.filter(poem => {
      const key = `${poem.author}-${poem.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by author ranking
    return uniquePoems.sort((a, b) => {
      const rankA = this.POET_RANKINGS.get(a.author) || Number.MAX_SAFE_INTEGER;
      const rankB = this.POET_RANKINGS.get(b.author) || Number.MAX_SAFE_INTEGER;
      return rankA - rankB;
    });
  }
}
