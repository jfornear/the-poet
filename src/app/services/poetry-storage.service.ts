import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { Poem, StorageMetadata } from '../models/poetry.models';

@Injectable({
  providedIn: 'root'
})
export class PoetryStorageService {
  private readonly DB_NAME = 'poetry-db';
  private readonly DB_VERSION = 5; // Increment version to force clean upgrade
  private readonly POEMS_STORE = 'poems';
  private readonly METADATA_STORE = 'metadata';
  private readonly DATA_EXPIRY_DAYS = 7; // Data considered fresh for 7 days
  private readonly AUTHORS_REFRESH_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  
  private db: IDBDatabase | null = null;
  private dbInitialized = new BehaviorSubject<boolean>(false);
  private dataLoadedSubject = new BehaviorSubject<boolean>(false);
  private dataAvailableSubject = new BehaviorSubject<boolean>(false);
  private isBrowser: boolean;
  private initializationPromise: Promise<void> | null = null;
  private currentMetadata: StorageMetadata | null = null;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) {
      this.initializeDb().catch(error => {
        console.error('Failed to initialize database:', error);
      });
    } else {
      // For SSR, mark data as not available
      this.dataAvailableSubject.next(false);
      this.dataLoadedSubject.next(false);
      this.dbInitialized.next(false);
    }
  }

  // Public method to wait for DB initialization
  public async waitForInitialization(): Promise<void> {
    if (!this.isBrowser) {
      return; // Silently return for SSR
    }
    
    if (!this.initializationPromise) {
      this.initializationPromise = this.initializeDb();
    }
    
    return this.initializationPromise;
  }

  private async initializeDb(): Promise<void> {
    if (!this.isBrowser) {
      return; // Silently return for SSR
    }

    if (!window.indexedDB) {
      console.error('IndexedDB not supported');
      return;
    }

    return new Promise((resolve, reject) => {
      console.log('Opening database...');
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open database:', request.error);
        this.dbInitialized.next(false);
        reject(request.error);
      };

      request.onblocked = () => {
        console.warn('Database upgrade blocked. Please close other tabs and refresh.');
        reject(new Error('Database upgrade blocked'));
      };

      request.onupgradeneeded = (event) => {
        console.log('Database upgrade needed');
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Delete existing stores if they exist
        if (db.objectStoreNames.contains(this.POEMS_STORE)) {
          console.log('Deleting existing poems store');
          db.deleteObjectStore(this.POEMS_STORE);
        }
        if (db.objectStoreNames.contains(this.METADATA_STORE)) {
          console.log('Deleting existing metadata store');
          db.deleteObjectStore(this.METADATA_STORE);
        }

        // Create new stores
        console.log('Creating poems store');
        const poemsStore = db.createObjectStore(this.POEMS_STORE, { keyPath: ['author', 'title'] });
        poemsStore.createIndex('author', 'author', { unique: false });
        poemsStore.createIndex('title', 'title', { unique: false });

        console.log('Creating metadata store');
        const metadataStore = db.createObjectStore(this.METADATA_STORE, { keyPath: 'id' });

        // Initialize metadata
        const metadata: StorageMetadata = {
          id: 'metadata',
          lastUpdated: Date.now(),
          version: this.DB_VERSION,
          totalPoems: 0,
          lastAuthorsFetch: 0
        };

        metadataStore.add(metadata);
        console.log('Database upgrade completed');
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('Database opened successfully');
        
        // Handle connection closing
        this.db.onclose = () => {
          console.log('Database connection closed');
          this.db = null;
          this.dbInitialized.next(false);
        };

        // Handle version change
        this.db.onversionchange = () => {
          console.log('Database version changed in another tab');
          this.db?.close();
          this.db = null;
          this.dbInitialized.next(false);
        };

        this.dbInitialized.next(true);
        
        // Check data availability after stores are created
        this.checkDataAvailable().then(() => {
          resolve();
        }).catch(error => {
          console.error('Error checking data availability:', error);
          resolve(); // Resolve anyway to not block initialization
        });
      };
    });
  }

  private async checkDataAvailable(): Promise<void> {
    if (!this.isBrowser || !this.db) {
      console.log('checkDataAvailable: Not in browser or no DB');
      return;
    }

    try {
      // First check metadata
      this.currentMetadata = await this.getMetadata();
      console.log('Current metadata:', this.currentMetadata);
      
      if (!this.currentMetadata) {
        console.log('No metadata found');
        this.dataAvailableSubject.next(false);
        this.dataLoadedSubject.next(false);
        return;
      }

      // Check if data is stale
      const now = Date.now();
      const dataAge = now - this.currentMetadata.lastUpdated;
      const isStale = dataAge > (this.DATA_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

      if (isStale) {
        console.log('Data is stale, needs refresh');
        this.dataAvailableSubject.next(false);
        this.dataLoadedSubject.next(false);
        return;
      }

      // Check actual poem count
      const transaction = this.db.transaction([this.POEMS_STORE], 'readonly');
      const store = transaction.objectStore(this.POEMS_STORE);
      const countRequest = store.count();

      return new Promise((resolve) => {
        countRequest.onsuccess = () => {
          const hasData = countRequest.result > 0;
          const countMatches = countRequest.result === this.currentMetadata?.totalPoems;
          
          if (!countMatches) {
            console.log(`Poem count mismatch: ${countRequest.result} vs ${this.currentMetadata?.totalPoems}`);
          }
          
          const isAvailable = hasData && !isStale && countMatches;
          console.log(`Data availability check: ${isAvailable ? 'available' : 'not available'} (${countRequest.result} poems)`);
          
          this.dataAvailableSubject.next(isAvailable);
          this.dataLoadedSubject.next(isAvailable);
          resolve();
        };

        countRequest.onerror = () => {
          console.error('Error checking poem count:', countRequest.error);
          this.dataAvailableSubject.next(false);
          this.dataLoadedSubject.next(false);
          resolve();
        };
      });
    } catch (error) {
      console.error('Error checking data availability:', error);
      this.dataAvailableSubject.next(false);
      this.dataLoadedSubject.next(false);
    }
  }

  async getPoems(): Promise<Poem[]> {
    if (!this.isBrowser) {
      console.log('getPoems: Not in browser');
      return []; // Return empty array for SSR
    }

    await this.waitForInitialization();

    if (!this.db) {
      console.log('getPoems: No DB available');
      return []; // Return empty array if no DB
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([this.POEMS_STORE], 'readonly');
        const store = transaction.objectStore(this.POEMS_STORE);
        const request = store.getAll();

        request.onerror = () => {
          console.error('Error fetching poems:', request.error);
          resolve([]); // Resolve with empty array on error
        };

        request.onsuccess = () => {
          const poems = request.result;
          console.log(`Retrieved ${poems.length} poems from database`);
          if (poems.length > 0) {
            console.log('Sample poems:', poems.slice(0, 3).map(p => ({ title: p.title, author: p.author })));
          }
          resolve(poems);
        };
      } catch (error) {
        console.error('Transaction error:', error);
        resolve([]); // Resolve with empty array on error
      }
    });
  }

  async savePoems(poems: Poem[]): Promise<void> {
    if (!this.isBrowser) {
      console.log('savePoems: Not in browser');
      return;
    }

    if (!this.db) {
      console.warn('Cannot save poems: database not initialized');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        console.log(`Attempting to save ${poems.length} poems...`);
        const transaction = this.db!.transaction([this.POEMS_STORE, this.METADATA_STORE], 'readwrite');
        const store = transaction.objectStore(this.POEMS_STORE);
        const metadataStore = transaction.objectStore(this.METADATA_STORE);

        let completed = 0;
        let errors = 0;
        const validPoems = poems.filter(poem => poem.author && poem.title && poem.lines);

        if (validPoems.length === 0) {
          console.warn('No valid poems to save');
          reject(new Error('No valid poems to save'));
          return;
        }

        console.log(`Found ${validPoems.length} valid poems to save`);
        if (validPoems.length > 0) {
          console.log('Sample poems to save:', validPoems.slice(0, 3).map(p => ({ title: p.title, author: p.author })));
        }

        // Save all poems first
        validPoems.forEach(poem => {
          const request = store.put(poem);
          
          request.onsuccess = () => {
            completed++;
            if (completed === validPoems.length) {
              // All poems saved, update metadata
              const countRequest = store.count();
              countRequest.onsuccess = () => {
                const totalPoems = countRequest.result;
                const metadata: StorageMetadata = {
                  id: 'metadata',
                  lastUpdated: Date.now(),
                  version: this.DB_VERSION,
                  totalPoems,
                  lastAuthorsFetch: Date.now()
                };

                const metadataRequest = metadataStore.put(metadata);
                metadataRequest.onsuccess = () => {
                  this.currentMetadata = metadata;
                  console.log(`Successfully saved ${completed} poems. Total in store: ${totalPoems}`);
                };
              };
            }
          };
          
          request.onerror = (event) => {
            console.error('Error saving poem:', poem, (event.target as IDBRequest).error);
            errors++;
            completed++;
          };
        });

        transaction.oncomplete = () => {
          this.dataAvailableSubject.next(true);
          this.dataLoadedSubject.next(true);
          resolve();
        };

        transaction.onerror = () => {
          console.error('Transaction error:', transaction.error);
          reject(transaction.error);
        };
      } catch (error) {
        console.error('Error in savePoems:', error);
        reject(error);
      }
    });
  }

  private async getMetadata(): Promise<StorageMetadata | null> {
    if (!this.isBrowser || !this.db) {
      return null;
    }

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction([this.METADATA_STORE], 'readonly');
        const store = transaction.objectStore(this.METADATA_STORE);
        const request = store.get('metadata');

        request.onerror = () => {
          console.error('Error fetching metadata:', request.error);
          resolve(null);
        };

        request.onsuccess = () => {
          resolve(request.result || null);
        };
      } catch (error) {
        console.error('Error getting metadata:', error);
        resolve(null);
      }
    });
  }

  private async updateMetadata(metadata: StorageMetadata): Promise<void> {
    if (!this.isBrowser || !this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([this.METADATA_STORE], 'readwrite');
        const store = transaction.objectStore(this.METADATA_STORE);
        const request = store.put({ id: 'metadata', ...metadata });

        request.onerror = () => {
          console.error('Error updating metadata:', request.error);
          reject(request.error);
        };

        request.onsuccess = () => {
          resolve();
        };
      } catch (error) {
        console.error('Error updating metadata:', error);
        reject(error);
      }
    });
  }

  async shouldRefreshAuthors(): Promise<boolean> {
    const metadata = await this.getMetadata();
    if (!metadata) return true;

    const now = Date.now();
    const timeSinceLastFetch = now - (metadata.lastAuthorsFetch || 0);
    return timeSinceLastFetch > this.AUTHORS_REFRESH_INTERVAL;
  }

  isDataAvailable(): Observable<boolean> {
    return this.dataAvailableSubject.asObservable();
  }

  dataLoaded(): Observable<boolean> {
    return this.dataLoadedSubject.asObservable();
  }
}
