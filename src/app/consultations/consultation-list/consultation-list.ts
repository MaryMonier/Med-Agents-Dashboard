import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, computed } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import Swal from 'sweetalert2';

import { ConsultationService } from '../../services/consultation';
import { Consultations } from '../../models/consultations';

@Component({
  selector: 'app-consultation-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './consultation-list.html',
  styleUrl: './consultation-list.css',
})
export class ConsultationListComponent implements OnInit {
  consultations = signal<Consultations[]>([]);
  filteredConsultations = signal<Consultations[]>([]);

  searchQuery = signal('');
  pageSize = signal(10);
  pageIndex = signal(0);
  isLoading = signal(false);

  // Pagination
  totalItems = computed(() => this.filteredConsultations().length);

  pagedConsultations = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filteredConsultations().slice(start, start + this.pageSize());
  });

  totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize()));
  pages = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i));
  startItem = computed(() => this.pageIndex() * this.pageSize() + 1);
  endItem = computed(() => Math.min((this.pageIndex() + 1) * this.pageSize(), this.totalItems()));

  constructor(private consultationService: ConsultationService) {}

  ngOnInit(): void {
    this.loadConsultations();
  }

  loadConsultations(): void {
    this.isLoading.set(true);
    this.consultationService.getAll().subscribe({
      next: (res) => {
        const consultations = res?.data || [];
        this.consultations.set(consultations);
        this.filterLocally();
        this.isLoading.set(false);
      },
      error: () => {
        Swal.fire('Error', 'Failed to load consultations', 'error');
        this.isLoading.set(false);
      },
    });
  }

  filterLocally(): void {
    const query = this.searchQuery().toLowerCase().trim();
    let filtered = this.consultations();

    if (query) {
      filtered = this.consultations().filter((consultation) => {
        const patientName = this.getPatientName(consultation.patientId).toLowerCase();
        return patientName.includes(query);
      });
    }

    this.filteredConsultations.set(filtered);
    this.pageIndex.set(0);
  }

  goToPage(index: number): void {
    if (index < 0 || index >= this.totalPages()) return;
    this.pageIndex.set(index);
  }

  onPageSizeChange(event: Event): void {
    this.pageSize.set(Number((event.target as HTMLSelectElement).value));
    this.pageIndex.set(0);
  }

  applySearch(): void {
    this.filterLocally();
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.filterLocally();
  }

  deleteConsultation(id: string): void {
    Swal.fire({
      title: 'Are you sure?',
      text: 'This consultation, and any follow-up visits and prescriptions linked to it (including the whole follow-up chain), will be deleted permanently.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (!result.isConfirmed) return;

      Swal.fire({
        title: 'Deleting...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      this.consultationService.delete(id).subscribe({
        next: () => {
          this.consultations.update((list) =>
            list.filter((consultation) => this.getConsultationId(consultation) !== id),
          );
          this.filterLocally();
          Swal.fire({
            title: 'Deleted!',
            text: 'Consultation deleted successfully.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
          });
        },
        error: () => {
          Swal.fire('Error', 'Failed to delete consultation', 'error');
        },
      });
    });
  }

  getPatientName(patient: any): string {
    if (!patient) return 'Unknown';
    if (typeof patient === 'string') {
      return patient;
    }
    return patient.name || patient._id || 'Unknown';
  }

  getDoctorName(doctor: any): string {
    if (!doctor) return '—';
    if (typeof doctor === 'string') return '—';
    return doctor.name || '—';
  }

  getSpecialistShortName(specialist: string | null | undefined): string {
    if (!specialist) return '—';
    // بناخد كل حاجة قبل أول ( أو , أو " for " أو " should "
    const short = specialist.split(/[\(,]| for | should | may /i)[0].trim();
    return short || '—';
  }

  getId(value: any): string {
    if (!value) return '';
    if (typeof value === 'string') {
      return value;
    }
    if (value._id) {
      return this.getId(value._id);
    }
    if (value.id) {
      return this.getId(value.id);
    }
    if (value.$oid) {
      return value.$oid;
    }
    return '';
  }

  getConsultationId(consultation: any): string {
    return this.getId(consultation?._id);
  }

  getPatientId(consultation: any): string {
    return this.getId(consultation?.patientId || consultation?.patient);
  }
}
