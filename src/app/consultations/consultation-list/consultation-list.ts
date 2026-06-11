import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ConsultationService } from '../../services/consultation';
import { Consultations } from '../../models/consultations';

@Component({
  selector: 'app-consultation-list',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule,
    MatTableModule, MatPaginatorModule,
    MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule,
    MatChipsModule, MatSelectModule
  ],
  templateUrl: './consultation-list.html',
  styleUrl: './consultation-list.css'
})
export class ConsultationListComponent implements OnInit {

  // ✅ signals بدل properties عادية
  consultations = signal<Consultations[]>([]);
  filteredConsultations = signal<Consultations[]>([]);
  searchQuery = signal('');
  pageSize = signal(10);
  pageIndex = signal(0);
  totalItems = signal(0);

  displayedColumns = [
    'patientName', 'symptoms', 'urgencyLevel',
    'suggestedSpecialist', 'status', 'actions'
  ];

  constructor(private consultationService: ConsultationService) {}

  ngOnInit(): void {
    this.loadConsultations();
  }

  loadConsultations(): void {
    this.consultationService.getAll(this.searchQuery()).subscribe({
      next: (res) => {
        this.consultations.set(res.data);
        this.totalItems.set(res.count);
        this.applyPagination();
      },
      error: (err) => console.error(err)
    });
  }

  applyPagination(): void {
    const start = this.pageIndex() * this.pageSize();
    this.filteredConsultations.set(
      this.consultations().slice(start, start + this.pageSize())
    );
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.applyPagination();
  }

  onSearch(value: string): void {
    this.searchQuery.set(value);
    this.pageIndex.set(0);
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

  // ✅ delete بيعمل reload تلقائي
  deleteConsultation(id: string): void {
    if (confirm('Are you sure you want to delete this consultation?')) {
      this.consultationService.delete(id).subscribe({
        next: () => {
          // بيشيل العنصر من الـ signal مباشرة من غير reload
          this.consultations.update(list => list.filter(c => c._id !== id));
          this.totalItems.update(n => n - 1);
          this.applyPagination();
        },
        error: (err) => console.error(err)
      });
    }
  }

  // ✅ بيعرض اسم المريض مش الـ object
  getPatientName(patient: any): string {
    if (typeof patient === 'object' && patient !== null) {
      return patient.name || patient._id || 'Unknown';
    }
    return patient || 'Unknown';
  }
}
