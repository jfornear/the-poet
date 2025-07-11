import { Component, Input, OnInit } from '@angular/core';
import { Poem } from '../../models/poetry.models';

@Component({
  selector: 'app-poem-card',
  templateUrl: './poem-card.component.html',
  styleUrls: ['./poem-card.component.scss']
})
export class PoemCardComponent implements OnInit {
  @Input() poem!: Poem;
  @Input() relevanceScore?: number;
  showFullPoem: boolean = false;

  constructor() {}

  ngOnInit() {}

  toggleFullPoem() {
    this.showFullPoem = !this.showFullPoem;
  }

  get previewLines(): string[] {
    return this.showFullPoem ? this.poem.lines : this.poem.lines.slice(0, 4);
  }

  get hasMoreLines(): boolean {
    return this.poem.lines.length > 4;
  }

  get relevancePercentage(): number {
    if (!this.relevanceScore) return 0;
    return Math.round(this.relevanceScore * 100);
  }

  get relevanceClass(): string {
    const score = this.relevancePercentage;
    if (score >= 80) return 'high-relevance';
    if (score >= 50) return 'medium-relevance';
    return 'low-relevance';
  }
}
