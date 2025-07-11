import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { PoetryStorageService } from './poetry-storage.service';
import { Poem } from '../models/poetry.models';

@Injectable({
  providedIn: 'root'
})
export class PoetryDbService {
  public readonly API_URL = 'https://poetrydb.org';
  private readonly INITIAL_AUTHORS = [
    'William Shakespeare',
    'Oscar Wilde',
    'Emily Dickinson',
    'Edgar Allan Poe',
    'Walt Whitman',
  ];

  private dataLoadedSubject = new BehaviorSubject<boolean>(false);
  private backgroundLoadingSubject = new BehaviorSubject<boolean>(false);
  private initializationPromise: Promise<void> | null = null;
  private isBrowser: boolean;
  public dataLoaded$ = this.dataLoadedSubject.asObservable();
  public backgroundLoading$ = this.backgroundLoadingSubject.asObservable();

  constructor(
    public readonly http: HttpClient,
    private storageService: PoetryStorageService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) {
      this.initialize();
    }
  }

  public async initialize(): Promise<void> {
    if (!this.isBrowser) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      try {
        // Wait for database initialization
        await this.storageService.waitForInitialization();
        
        // Check if we have any data available
        const dataAvailable = await firstValueFrom(this.storageService.isDataAvailable());
        
        if (dataAvailable) {
          // Load existing poems to verify data
          const poems = await this.storageService.getPoems();
          if (poems.length > 0) {
            console.log(`Found ${poems.length} poems in storage`);
            this.dataLoadedSubject.next(true);
            
            // Check if we should refresh in background
            const shouldRefresh = await this.storageService.shouldRefreshAuthors();
            if (shouldRefresh) {
              console.log('Data needs refresh, updating in background...');
              this.loadInitialData(true).catch(error => {
                console.error('Background data refresh failed:', error);
              });
            }
            return;
          }
        }

        // No valid data available, load initial data
        console.log('No data found, fetching from API...');
        await this.loadInitialData(false);
        this.dataLoadedSubject.next(true);
      } catch (error) {
        console.error('Error during initialization:', error);
        this.dataLoadedSubject.next(false);
        throw error;
      }
    })();

    return this.initializationPromise;
  }

  private async loadInitialData(isBackground: boolean = false): Promise<void> {
    if (!this.isBrowser) {
      return;
    }

    if (isBackground) {
      this.backgroundLoadingSubject.next(true);
    }

    try {
      let totalPoems = 0;
      const batchSize = 2; // Load authors in smaller batches
      const batches = this.chunkArray(this.INITIAL_AUTHORS, batchSize);

      // Process batches sequentially to avoid overwhelming IndexedDB
      for (const batch of batches) {
        const batchResults = await Promise.all(batch.map(async (author) => {
          try {
            console.log(`Fetching poems for ${author}`);
            const poems = await this.fetchPoemsByAuthor(author);
            if (poems.length > 0 && this.isBrowser) {
              await this.storageService.savePoems(poems);
              totalPoems += poems.length;
              console.log(`Saved ${poems.length} poems by ${author}`);
              return poems.length;
            } else {
              console.warn(`No poems found for ${author}`);
              return 0;
            }
          } catch (error) {
            console.error(`Error loading poems for ${author}:`, error);
            return 0;
          }
        }));

        // Sum up the batch results
        const batchTotal = batchResults.reduce((sum, count) => sum + count, 0);
        console.log(`Batch complete. Added ${batchTotal} poems`);

        // Small delay between batches to prevent overwhelming the API and IndexedDB
        if (batches.indexOf(batch) < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (totalPoems === 0) {
        throw new Error('No poems were loaded from any author');
      }

      if (this.isBrowser) {
        // Wait a moment for IndexedDB to settle
        await new Promise(resolve => setTimeout(resolve, 500));

        // Verify final state
        const finalPoems = await this.storageService.getPoems();
        console.log(`Verifying final state: ${finalPoems.length} poems in storage`);
        
        if (finalPoems.length === 0) {
          throw new Error('No poems found in storage after loading');
        }

        // Double check data availability
        const dataAvailable = await firstValueFrom(this.storageService.isDataAvailable());
        if (!dataAvailable) {
          console.error('Data availability check failed after loading poems');
          throw new Error('Data not properly saved to storage');
        }

        console.log(`Successfully loaded and verified ${finalPoems.length} total poems`);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      throw error;
    } finally {
      if (isBackground) {
        this.backgroundLoadingSubject.next(false);
      }
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private async fetchPoemsByAuthor(author: string): Promise<Poem[]> {
    try {
      const url = `${this.API_URL}/author/${encodeURIComponent(author)}`;
      console.log('Fetching from:', url);
      const poems = await firstValueFrom(this.http.get<Poem[]>(url));
      
      if (!Array.isArray(poems)) {
        console.error('Invalid response format for author:', author, poems);
        return [];
      }

      console.log(`Fetched ${poems.length} poems by ${author}`);
      return poems.map(poem => ({
        ...poem,
        author: author // Ensure consistent author name
      }));
    } catch (error) {
      console.error(`Error fetching poems for ${author}:`, error);
      return [];
    }
  }

  // Public method to search for any author's poems
  public async searchAuthor(author: string): Promise<Poem[]> {
    try {
      // Wait for database initialization
      await this.storageService.waitForInitialization();

      // First check if we have the poems locally
      const localPoems = await this.storageService.getPoems();
      const authorPoems = localPoems.filter(poem => 
        poem.author.toLowerCase().includes(author.toLowerCase())
      );

      if (authorPoems.length > 0) {
        console.log(`Found ${authorPoems.length} local poems for ${author}`);
        return authorPoems;
      }

      // If not found locally, fetch from API
      console.log(`Fetching poems for ${author} from API`);
      const poems = await this.fetchPoemsByAuthor(author);
      
      if (poems.length > 0) {
        // Save to local storage
        await this.storageService.savePoems(poems);
        console.log(`Saved ${poems.length} new poems by ${author}`);
      }

      return poems;
    } catch (error) {
      console.error(`Error searching for author ${author}:`, error);
      return [];
    }
  }
} 