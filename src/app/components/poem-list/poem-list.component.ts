import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { Poem } from '../../models/poetry.models';

@Component({
  selector: 'app-poem-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatExpansionModule,
    MatDividerModule
  ],
  templateUrl: './poem-list.component.html',
  styleUrls: ['./poem-list.component.scss']
})
export class PoemListComponent {
  @Input() poems: Poem[] = [];
} 