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
    'suggestedSpecialist', 'status', 'followUpDate', 'actions'
  ];

  constructor(private consultationService: ConsultationService) {}

  ngOnInit(): void {
    this.loadConsultations();
  }

  loadConsultations(): void {
    this.consultationService.getAll().subscribe({
      next: (res) => {
        this.consultations.set(res.data);
        this.totalItems.set(res.count);
        this.filterLocally();
      },
      error: () => {
        Swal.fire('Error', 'Failed to load consultations', 'error');
      }
    });
  }

  filterLocally(): void {
    const query = this.searchQuery().toLowerCase().trim();

    if (!query) {
      const start = this.pageIndex() * this.pageSize();
      this.filteredConsultations.set(
        this.consultations().slice(start, start + this.pageSize())
      );
      this.totalItems.set(this.consultations().length);
      return;
    }

    const filtered = this.consultations().filter(c => {
      const patientName = this.getPatientName(c.patientId).toLowerCase();
      const symptoms = c.symptoms.join(', ').toLowerCase();
      const specialist = (c.suggestedSpecialist || '').toLowerCase();
      const status = (c.status || '').toLowerCase();
      const urgency = (c.urgencyLevel || '').toLowerCase();

      return patientName.includes(query) ||
             symptoms.includes(query) ||
             specialist.includes(query) ||
             status.includes(query) ||
             urgency.includes(query);
    });

    const start = this.pageIndex() * this.pageSize();
    this.filteredConsultations.set(
      filtered.slice(start, start + this.pageSize())
    );
    this.totalItems.set(filtered.length);
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
    this.filterLocally();
  }

  onSearch(value: string): void {
    this.searchQuery.set(value);
    this.pageIndex.set(0);
    this.filterLocally();
  }

  viewConsultation(c: Consultations): void {
    Swal.fire({
      title: 'Consultation Details',
      html: `
        <div style="text-align:left">
          <p><b>Patient:</b> ${this.getPatientName(c.patientId)}</p>
          <p><b>Symptoms:</b> ${c.symptoms.join(', ')}</p>
          <p><b>Diagnosis:</b> ${c.diagnosis || '—'}</p>
          <p><b>Structured Note:</b> ${c.structuredNote || '—'}</p>
          <p><b>Specialist:</b> ${c.suggestedSpecialist || '—'}</p>
          <p><b>Urgency:</b> ${c.urgencyLevel}</p>
          <p><b>Status:</b> ${c.status}</p>
          <p><b>Follow-up:</b> ${c.followUpDate || '—'}</p>
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'Close'
    });
  }

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
          didOpen: () => Swal.showLoading()
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
            this.consultations.update(list =>
              list.filter(c => c._id !== id)
            );
            this.totalItems.update(n => n - 1);
            this.filterLocally();
          },
          error: () => {
            Swal.fire('Error', 'Delete failed', 'error');
          }
        });
      }
    });
  }

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
