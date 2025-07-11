import { Routes } from '@angular/router';
import { PoemDetailComponent } from './components/poem-detail/poem-detail.component';
import { SearchComponent } from './components/search/search.component';

export const routes: Routes = [
  { path: '', component: SearchComponent },
  { 
    path: 'poem/:title',
    component: PoemDetailComponent,
    data: { 
      poem: null // This will be populated by the router state
    }
  }
];
