import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatOptionModule } from '@angular/material/core';
import { MatRippleModule } from '@angular/material/core';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, tap, switchMap, catchError, finalize } from 'rxjs/operators';
import { Poem } from '../../models/poetry.models';
import { PoetrySearchService } from '../../services/poetry-search.service';
import { PoetryStorageService } from '../../services/poetry-storage.service';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatAutocompleteModule,
    MatOptionModule,
    MatRippleModule
  ]
})
export class SearchComponent implements OnInit, OnDestroy {
  @Input() initialSearchTerm: string = '';
  @Output() poemSelected = new EventEmitter<Poem>();

  searchForm: FormGroup;
  searchResults$ = new BehaviorSubject<Poem[]>([]);
  isLoading$ = new BehaviorSubject<boolean>(false);
  error$ = new BehaviorSubject<string | null>(null);
  isAutocompleteOpen = false;

  private destroy$ = new Subject<void>();
  private minSearchLength = 2;

  constructor(
    private formBuilder: FormBuilder,
    private poetrySearchService: PoetrySearchService,
    private storageService: PoetryStorageService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.searchForm = this.formBuilder.group({
      searchTerm: ['']
    });

    // Subscribe to search term changes
    this.searchForm.get('searchTerm')!.valueChanges.pipe(
      takeUntil(this.destroy$),
      tap(() => {
        this.error$.next(null);
      }),
      debounceTime(300),
      distinctUntilChanged(),
      tap(term => {
        console.log('Search term changed:', term);
      }),
      switchMap(term => {
        // If term is a Poem object (selected from autocomplete), don't perform a new search
        if (typeof term === 'object') {
          if (term === null || term === undefined) {
            this.searchForm.patchValue({ searchTerm: '' }, { emitEvent: false });
          }
          this.isLoading$.next(false);
          return of([]);
        }

        // Handle string search terms
        const searchTerm = String(term || '').trim();
        if (!searchTerm || searchTerm.length < this.minSearchLength) {
          this.isLoading$.next(false);
          this.searchResults$.next([]);
          return of([]);
        }

        this.isLoading$.next(true);
        return this.poetrySearchService.search(searchTerm).pipe(
          tap(results => {
            console.log('Search results:', results);
            this.searchResults$.next(results);
          }),
          catchError(err => {
            console.error('Search error:', err);
            this.storageService.isDataAvailable().subscribe(available => {
              const errorMsg = available
                ? 'An error occurred while searching. Please try again.'
                : 'Still loading poems, please try again in a moment...';
              this.error$.next(errorMsg);
              this.searchResults$.next([]);
              this.cdr.detectChanges();
            });
            return of([]);
          }),
          finalize(() => {
            this.isLoading$.next(false);
            this.cdr.detectChanges();
          })
        );
      })
    ).subscribe();
  }

  ngOnInit() {
    if (this.initialSearchTerm) {
      this.searchForm.patchValue({ searchTerm: this.initialSearchTerm });
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.isLoading$.complete();
    this.error$.complete();
    this.searchResults$.complete();
  }

  displayFn(poem: Poem | null | undefined): string {
    if (!poem) return '';
    if (typeof poem !== 'object') return String(poem);
    if (!poem.title || !poem.author) return '';
    return `${poem.title} by ${poem.author}`;
  }

  clearSearch() {
    this.searchForm.patchValue({ searchTerm: '' });
    this.error$.next(null);
    this.isLoading$.next(false);
    this.searchResults$.next([]);
    this.isAutocompleteOpen = false;
    this.cdr.detectChanges();
  }

  onAutocompleteOpened() {
    this.isAutocompleteOpen = true;
    this.cdr.detectChanges();
  }

  onAutocompleteClosed() {
    this.isAutocompleteOpen = false;
    this.cdr.detectChanges();
  }

  onOptionSelected(poem: Poem) {
    if (!poem?.title) return;
    this.poemSelected.emit(poem);
    this.router.navigate(['/poem', poem.title], { state: { poem } });
  }
} 