import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Poem } from '../../models/poetry.models';
import { PoetrySearchService } from '../../services/poetry-search.service';
import { PoetryStorageService } from '../../services/poetry-storage.service';
import { PoetryDbService } from '../../services/poetry-db.service';
import { SearchComponent } from '../search/search.component';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-poem-detail',
  templateUrl: './poem-detail.component.html',
  styleUrls: ['./poem-detail.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    SearchComponent,
    MatProgressSpinnerModule
  ]
})
export class PoemDetailComponent implements OnInit {
  poem: Poem | null = null;
  searchTerm: string = '';
  error: string | null = null;
  isLoadingPoem = false;
  public isBrowser: boolean;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private poetrySearchService: PoetrySearchService,
    private poetryStorageService: PoetryStorageService,
    private poetryDbService: PoetryDbService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    
    // Get the poem from router state if available
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state?.['poem']) {
      this.poem = navigation.extras.state['poem'];
    }
  }

  ngOnInit() {
    // Get the search term from URL
    this.route.queryParams.subscribe(params => {
      this.searchTerm = params['q'] || '';
    });

    // If we don't have the poem from router state, try to find it by title
    if (!this.poem) {
      const title = decodeURIComponent(this.route.snapshot.params['title']);
      if (title) {
        if (this.isBrowser) {
          this.findPoemByTitle(title);
        } else {
          // For SSR, just set loading state
          this.isLoadingPoem = true;
        }
      }
    }
  }

  private async findPoemByTitle(title: string) {
    if (!this.isBrowser) {
      console.log('findPoemByTitle: Not in browser');
      return;
    }

    this.isLoadingPoem = true;
    this.error = null;
    this.poem = null;

    console.log('Finding poem by title:', title);

    try {
      // First ensure DB is initialized and data is loaded
      console.log('Initializing DB...');
      await this.poetryDbService.initialize();
      await this.poetryStorageService.waitForInitialization();
      
      // Wait for data to be fully available
      let retries = 0;
      const maxRetries = 5;
      let dataAvailable = false;
      
      while (retries < maxRetries) {
        dataAvailable = await firstValueFrom(this.poetryStorageService.isDataAvailable());
        console.log(`Data available check (attempt ${retries + 1}):`, dataAvailable);
        
        if (dataAvailable) {
          break;
        }
        
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
      }
      
      if (dataAvailable) {
        // Try to get poems directly from storage first
        console.log('Getting poems from storage...');
        const poems = await this.poetryStorageService.getPoems();
        console.log(`Found ${poems.length} poems in storage`);
        
        let match = this.findMatchingPoem(poems, title);
        console.log('Storage match result:', match?.title);
        
        if (match) {
          console.log('Found poem in storage:', match.title);
          this.poem = match;
          this.isLoadingPoem = false;
          return;
        }
      }

      // If no match found in storage or no data available, try search service
      console.log('No match in storage, trying search service...');
      
      // Wait for search index to be ready
      await this.poetrySearchService.waitForInitialization();
      
      this.poetrySearchService.search(title).subscribe({
        next: (poems) => {
          console.log(`Search service returned ${poems.length} poems`);
          let match = this.findMatchingPoem(poems, title);
          console.log('Search service match result:', match?.title);
          
          if (match) {
            console.log('Found poem in search results:', match.title);
            this.poem = match;
          } else {
            // Only show error if we've exhausted both storage and search options
            console.log('No poem found in either storage or search');
            this.error = `Could not find poem: "${title}"`;
          }
          this.isLoadingPoem = false;
        },
        error: (err) => {
          console.error('Error finding poem:', err);
          this.error = 'Error loading poem. Please try again.';
          this.isLoadingPoem = false;
        }
      });
    } catch (error) {
      console.error('Error accessing storage:', error);
      this.error = 'Error loading poem. Please try again.';
      this.isLoadingPoem = false;
    }
  }

  private findMatchingPoem(poems: Poem[], title: string): Poem | undefined {
    console.log('Attempting to match title:', title);
    
    // Try exact match first
    let match = poems.find(p => p.title === title);
    if (match) {
      console.log('Found exact match');
      return match;
    }
    
    // If no exact match, try case-insensitive match
    match = poems.find(p => p.title.toLowerCase() === title.toLowerCase());
    if (match) {
      console.log('Found case-insensitive match');
      return match;
    }
    
    // If still no match, try removing special characters and comparing
    const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '');
    console.log('Normalized search title:', normalizedTitle);
    
    match = poems.find(p => {
      const normalizedPoemTitle = p.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      console.log('Comparing with:', p.title, '(normalized:', normalizedPoemTitle, ')');
      return normalizedPoemTitle === normalizedTitle;
    });
    
    if (match) {
      console.log('Found normalized match');
    } else {
      console.log('No match found');
    }

    return match;
  }

  onSearchResultSelected(poem: Poem) {
    // Update URL with new poem and maintain search term
    this.router.navigate(['/poem', poem.title], {
      queryParams: { q: this.searchTerm },
      state: { poem }
    });
    // Update the current poem
    this.poem = poem;
    this.error = null;
  }
} 