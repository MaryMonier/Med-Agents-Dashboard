import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { RouterModule } from '@angular/router';

import Swal from 'sweetalert2';

import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';

import { ConsultationService } from '../../services/consultation';
import { Consultations } from '../../models/consultations';

@Component({
  selector: 'app-consultation-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './consultation-list.html',
  styleUrl: './consultation-list.css',
})
export class ConsultationListComponent implements OnInit {
  consultations = signal<Consultations[]>([]);
  filteredConsultations = signal<Consultations[]>([]);

  searchQuery = signal('');
  pageSize = signal(10);
  pageIndex = signal(0);
  totalItems = signal(0);

  displayedColumns = [
    'patientName',
    'symptoms',
    'urgencyLevel',
    'suggestedSpecialist',
    'status',
    'followUpDate',
    'actions',
  ];

  constructor(private consultationService: ConsultationService) {}

  ngOnInit(): void {
    this.loadConsultations();
  }

  loadConsultations(): void {
    this.consultationService.getAll().subscribe({
      next: (res) => {
        const consultations = res?.data || [];

        this.consultations.set(consultations);
        this.totalItems.set(res?.count ?? consultations.length);
        this.filterLocally();
      },
      error: () => {
        Swal.fire('Error', 'Failed to load consultations', 'error');
      },
    });
  }

  filterLocally(): void {
    const query = this.searchQuery().toLowerCase().trim();

    let filtered = this.consultations();

    if (query) {
      filtered = this.consultations().filter((consultation) => {
        const patientName = this.getPatientName(consultation.patientId).toLowerCase();

        const symptoms = (consultation.symptoms || []).join(', ').toLowerCase();

        const specialist = (consultation.suggestedSpecialist || '').toLowerCase();

        const status = (consultation.status || '').toLowerCase();

        const urgency = (consultation.urgencyLevel || '').toLowerCase();

        return (
          patientName.includes(query) ||
          symptoms.includes(query) ||
          specialist.includes(query) ||
          status.includes(query) ||
          urgency.includes(query)
        );
      });
    }

    const start = this.pageIndex() * this.pageSize();

    this.filteredConsultations.set(filtered.slice(start, start + this.pageSize()));

    this.totalItems.set(filtered.length);
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

  deleteConsultation(id: string): void {
    Swal.fire({
      title: 'Are you sure?',
      text: 'This consultation, and its related follow-up and prescription, will be deleted permanently.',
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
