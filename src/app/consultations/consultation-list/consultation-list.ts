import { Component, OnInit, signal } from '@angular/core';
import Swal from 'sweetalert2';

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

  // =========================
  // LOAD DATA
  // =========================
  loadConsultations(): void {
    this.consultationService.getAll(this.searchQuery()).subscribe({
      next: (res) => {
        this.consultations.set(res.data);
        this.totalItems.set(res.count);
        this.applyPagination();
      },
      error: () => {
        Swal.fire('Error', 'Failed to load consultations', 'error');
      }
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

  // =========================
  // DELETE (SWEET ALERT)
  // =========================
  deleteConsultation(id: string): void {

    Swal.fire({
      title: 'Are you sure?',
      text: 'You will not be able to revert this!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {

      if (result.isConfirmed) {

        Swal.fire({
          title: 'Deleting...',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        this.consultationService.delete(id).subscribe({
          next: () => {

            Swal.fire({
              title: 'Deleted!',
              text: 'Consultation deleted successfully.',
              icon: 'success',
              timer: 2000,
              showConfirmButton: false
            });

            // تحديث البيانات بدون reload كامل
            this.consultations.update(list =>
              list.filter(c => c._id !== id)
            );

            this.totalItems.update(n => n - 1);
            this.applyPagination();
          },

          error: () => {
            Swal.fire('Error', 'Delete failed', 'error');
          }
        });

      }
    });
  }

  // =========================
  // HELPERS
  // =========================
  getPatientName(patient: any): string {
    if (typeof patient === 'object' && patient !== null) {
      return patient.name || patient._id || 'Unknown';
    }
    return patient || 'Unknown';
  }

  getUrgencyColor(level: string): string {
    const colors: Record<string, string> = {
      low: 'primary',
      medium: 'accent',
      critical: 'warn'
    };
    return colors[level] || 'primary';
  }
}
