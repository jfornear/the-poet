import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';

import { AppComponent } from './app.component';
import { PoemCardComponent } from './components/poem-card/poem-card.component';
import { SearchResultsComponent } from './components/search-results/search-results.component';
import { SearchComponent } from './components/search/search.component';
import { PoemListComponent } from './components/poem-list/poem-list.component';

import { PoetryStorageService } from './services/poetry-storage.service';
import { PoetrySearchService } from './services/poetry-search.service';
import { PoetrySearchIndexService } from './services/poetry-search-index.service';
import { PoetryDbService } from './services/poetry-db.service';

@NgModule({
  declarations: [
    AppComponent,
    PoemCardComponent,
    SearchResultsComponent,
    SearchComponent,
    PoemListComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    ReactiveFormsModule,
    HttpClientModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatListModule,
    MatProgressSpinnerModule,
    MatExpansionModule,
    MatDividerModule
  ],
  providers: [
    PoetryStorageService,
    PoetrySearchService,
    PoetrySearchIndexService,
    PoetryDbService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { } 