import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConsultationService } from '../../services/consultation';
import { Consultations } from '../../models/consultations';

@Component({
  selector: 'app-consultation-list',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule,
    MatTableModule, MatPaginatorModule,
    MatInputModule, MatButtonModule,
    MatIconModule, MatChipsModule, MatDialogModule
  ],
  templateUrl: './consultation-list.component.html',
  styleUrl: './consultation-list.component.css'
})
export class ConsultationListComponent implements OnInit {

  consultations: Consultation[] = [];
  filteredConsultations: Consultation[] = [];
  searchQuery = '';
  pageSize = 10;
  pageIndex = 0;
  totalItems = 0;

  displayedColumns = [
    'patientId', 'symptoms', 'urgencyLevel',
    'suggestedSpecialist', 'status', 'actions'
  ];

  constructor(
    private consultationService: ConsultationService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadConsultations();
  }

  loadConsultations(): void {
    this.consultationService.getAll(this.searchQuery).subscribe({
      next: (res) => {
        this.consultations = res.data;
        this.totalItems = res.count;
        this.applyPagination();
      },
      error: (err) => console.error(err)
    });
  }

  applyPagination(): void {
    const start = this.pageIndex * this.pageSize;
    this.filteredConsultations = this.consultations.slice(start, start + this.pageSize);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.applyPagination();
  }

  onSearch(): void {
    this.pageIndex = 0;
    this.loadConsultations();
  }

  getUrgencyColor(level: string): string {
    const colors: Record<string, string> = {
      low: 'primary',
      medium: 'accent',
      critical: 'warn'
    };
    return colors[level] || 'primary';
  }

  deleteConsultation(id: string): void {
    if (confirm('Are you sure you want to delete this consultation?')) {
      this.consultationService.delete(id).subscribe(() => {
        this.loadConsultations();
      });
    }
  }
}
