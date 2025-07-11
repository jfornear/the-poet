import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnifiedSearchComponent } from './unified-search.component';

describe('UnifiedSearchComponent', () => {
  let component: UnifiedSearchComponent;
  let fixture: ComponentFixture<UnifiedSearchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UnifiedSearchComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UnifiedSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
