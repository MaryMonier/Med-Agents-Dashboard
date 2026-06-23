import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PrescriptionService } from '../services/prescription';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-prescriptions-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './prescriptions-list.html',
  styleUrl: './prescriptions-list.css',
})
export class PrescriptionsList implements OnInit {
  allPrescriptions = signal<any[]>([]);
  filteredPrescriptions = signal<any[]>([]);

  searchTerm = signal('');
  isLoading = signal(false);
  errorMessage = signal('');

  // Pagination
  pageIndex = signal(0);
  pageSize = signal(10);

  totalItems = computed(() => this.filteredPrescriptions().length);

  pagedPrescriptions = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filteredPrescriptions().slice(start, start + this.pageSize());
  });

  totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize()));
  pages = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i));
  startItem = computed(() => this.pageIndex() * this.pageSize() + 1);
  endItem = computed(() => Math.min((this.pageIndex() + 1) * this.pageSize(), this.totalItems()));

  constructor(private prescriptionService: PrescriptionService) {}

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.prescriptionService.getAllPrescriptions().subscribe({
      next: (res) => {
        this.allPrescriptions.set(res.data || []);
        this.applySearch();
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load prescriptions');
        this.isLoading.set(false);
      },
    });
  }

  applySearch(): void {
    const term = this.searchTerm().trim().toLowerCase();
    const filtered = term
      ? this.allPrescriptions().filter((p) => {
          const patientName = p.patientId?.name?.toLowerCase() || '';
          return patientName.includes(term);
        })
      : this.allPrescriptions();

    if (term && filtered.length === 0) {
      this.errorMessage.set('No prescriptions found for this patient');
    } else {
      this.errorMessage.set('');
    }

    this.filteredPrescriptions.set(filtered);
    this.pageIndex.set(0);
  }

  clearSearch(): void {
    this.searchTerm.set('');
    this.applySearch();
  }

  goToPage(index: number): void {
    if (index < 0 || index >= this.totalPages()) return;
    this.pageIndex.set(index);
  }

  onPageSizeChange(event: Event): void {
    this.pageSize.set(Number((event.target as HTMLSelectElement).value));
    this.pageIndex.set(0);
  }

  async deletePrescription(id: string): Promise<void> {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This prescription will be deleted permanently.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e53e3e',
      cancelButtonColor: '#3B5BDB',
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) return;

    const deleted = this.allPrescriptions().find((p) => p._id === id);
    this.allPrescriptions.update((list) => list.filter((p) => p._id !== id));
    this.filteredPrescriptions.update((list) => list.filter((p) => p._id !== id));

    this.prescriptionService.deletePrescription(id).subscribe({
      next: () => {
        Swal.fire({
          title: 'Deleted!',
          text: 'Prescription deleted successfully.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
        });
      },
      error: () => {
        if (deleted) {
          this.allPrescriptions.update((list) => [...list, deleted]);
          this.filteredPrescriptions.update((list) => [...list, deleted]);
        }
        Swal.fire({ title: 'Error', text: 'Failed to delete prescription.', icon: 'error' });
      },
    });
  }
}
