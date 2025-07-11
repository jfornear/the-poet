import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { PoetrySearchService } from '../../services/poetry-search.service';
import { Poem } from '../../services/poetry-storage.service';

@Component({
  selector: 'app-search-results',
  templateUrl: './search-results.component.html',
  styleUrls: ['./search-results.component.scss']
})
export class SearchResultsComponent implements OnInit, OnDestroy {
  poems: Poem[] = [];
  private subscription: Subscription | null = null;

  constructor(private searchService: PoetrySearchService) {}

  ngOnInit() {
    this.subscription = this.searchService.getSearchResults().subscribe(
      results => this.poems = results
    );
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  trackByTitle(index: number, poem: Poem): string {
    return poem.title;
  }
}
