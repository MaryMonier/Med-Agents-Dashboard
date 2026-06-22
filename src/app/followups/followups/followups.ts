import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FollowupService } from '../../services/followup';
import { Followup } from '../../models/followup';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-followups',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './followups.html',
  styleUrl: './followups.css',
})
export class Followups implements OnInit {
  allFollowups = signal<Followup[]>([]);
  filteredFollowups = signal<Followup[]>([]);

  searchTerm = signal('');
  statusFilter = signal<'all' | 'pending' | 'confirmed' | 'cancelled'>('all');
  isLoading = signal(false);
  errorMessage = signal('');

  // Pagination
  pageIndex = signal(0);
  pageSize = signal(10);

  totalItems = computed(() => this.filteredFollowups().length);

  pagedFollowups = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filteredFollowups().slice(start, start + this.pageSize());
  });

  // Stats
  totalFollowups = computed(() => this.allFollowups().length);
  totalConfirmed = computed(
    () => this.allFollowups().filter((f) => f.status === 'confirmed').length,
  );
  totalPending = computed(() => this.allFollowups().filter((f) => f.status === 'pending').length);
  totalCancelled = computed(
    () => this.allFollowups().filter((f) => f.status === 'cancelled').length,
  );

  totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize()));
  pages = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i));
  startItem = computed(() => this.pageIndex() * this.pageSize() + 1);
  endItem = computed(() => Math.min((this.pageIndex() + 1) * this.pageSize(), this.totalItems()));

  constructor(private followupService: FollowupService) {}

  ngOnInit(): void {
    this.loadFollowups();
  }

  loadFollowups(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.followupService.getAllFollowups().subscribe({
      next: (res) => {
        this.allFollowups.set(res.data || []);
        this.applySearch();
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load follow-ups');
        this.isLoading.set(false);
      },
    });
  }

  applySearch(): void {
    const term = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();
    const all = this.allFollowups();

    let filtered = term
      ? all.filter((f) => {
          if (!f.patientId) return false;
          const patientId = (f.patientId as any)?._id;
          return patientId?.toLowerCase().includes(term);
        })
      : all;

    if (status !== 'all') {
      filtered = filtered.filter((f) => f.status === status);
    }

    if (term && filtered.length === 0) {
      this.errorMessage.set('No follow-ups found for this patient ID');
    } else {
      this.errorMessage.set('');
    }

    this.filteredFollowups.set(filtered);
    this.pageIndex.set(0);
  }

  onStatusFilterChange(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as any);
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

  clearSearch(): void {
    this.searchTerm.set('');
    this.statusFilter.set('all');
    this.applySearch();
  }

  // ─── Toggle Status ──────────────────────────────────────────────────────
  // لما تبقى confirmed الزرار يتعطل ومش هينفع ترجع pending تاني
  toggleStatus(followup: Followup): void {
    if (followup.status === 'confirmed') return;

    Swal.fire({
      title: 'Are you sure?',
      text: 'Mark this follow-up as confirmed?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3B5BDB',
      cancelButtonColor: '#e53e3e',
      confirmButtonText: 'Yes, mark as confirmed!',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (!result.isConfirmed) return;

      const newStatus: 'confirmed' = 'confirmed';
      const oldStatus = followup.status;

      // عدّل الـ UI فوراً (Optimistic Update) - signals بتحدث الشاشة فوراً
      this.allFollowups.update((list) =>
        list.map((f) => (f._id === followup._id ? { ...f, status: newStatus } : f)),
      );
      this.filteredFollowups.update((list) =>
        list.map((f) => (f._id === followup._id ? { ...f, status: newStatus } : f)),
      );

      // بعت للـ API في الخلفية
      this.followupService.updateStatus(followup._id, newStatus).subscribe({
        next: () => {
          Swal.fire('confirmed!', 'Follow-up marked as confirmed.', 'success');
        },
        error: () => {
          this.allFollowups.update((list) =>
            list.map((f) => (f._id === followup._id ? { ...f, status: oldStatus } : f)),
          );
          this.filteredFollowups.update((list) =>
            list.map((f) => (f._id === followup._id ? { ...f, status: oldStatus } : f)),
          );
          Swal.fire('Error!', 'Failed to update status.', 'error');
        },
      });
    });
  }

  isGenerating = signal<string | null>(null); // بيحفظ الـ id بتاع الفولو أب اللي شغال عليه

  // ─── Start Followup ─────────────────────────────────────────────────────
  // بيكال الـ agent ويجيب الـ instructions ويعملها patch على الفولو أب
  startFollowup(followup: Followup): void {
    if (followup.status !== 'pending') return;

    this.isGenerating.set(followup._id);
    this.errorMessage.set('');

    const consultationId = (followup.consultationId as any)?._id;

    this.followupService
      .generateFollowupPlan(consultationId, followup.scheduledDate, followup.language)
      .subscribe({
        next: (res) => {
          const instructions = res.data?.followupInstructions || '-';

          this.followupService.updateInstructions(followup._id, instructions).subscribe({
            next: () => {
              this.allFollowups.update((list) =>
                list.map((f) => (f._id === followup._id ? { ...f, instructions } : f)),
              );
              this.filteredFollowups.update((list) =>
                list.map((f) => (f._id === followup._id ? { ...f, instructions } : f)),
              );
              this.isGenerating.set(null);
            },
            error: () => {
              this.errorMessage.set('Failed to update follow-up instructions');
              this.isGenerating.set(null);
            },
          });
        },
        error: () => {
          this.errorMessage.set('Failed to generate follow-up instructions');
          this.isGenerating.set(null);
        },
      });
  }
  // بدل الحذف، بنغير الحالة لـ cancelled
  cancelFollowup(followup: Followup): void {
    if (followup.status === 'confirmed' || followup.status === 'cancelled') return;

    Swal.fire({
      title: 'Are you sure?',
      text: 'You will not be able to revert this!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e53e3e',
      cancelButtonColor: '#3B5BDB',
      confirmButtonText: 'Yes, cancel it!',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (!result.isConfirmed) return;

      const newStatus: 'cancelled' = 'cancelled';
      const oldStatus = followup.status;

      // عدّل الـ UI فوراً (Optimistic Update)
      this.allFollowups.update((list) =>
        list.map((f) => (f._id === followup._id ? { ...f, status: newStatus } : f)),
      );
      this.filteredFollowups.update((list) =>
        list.map((f) => (f._id === followup._id ? { ...f, status: newStatus } : f)),
      );

      // بعت للـ API في الخلفية
      this.followupService.updateStatus(followup._id, newStatus).subscribe({
        next: () => {
          Swal.fire('Cancelled!', 'Follow-up has been cancelled.', 'success');
        },
        error: () => {
          this.allFollowups.update((list) =>
            list.map((f) => (f._id === followup._id ? { ...f, status: oldStatus } : f)),
          );
          this.filteredFollowups.update((list) =>
            list.map((f) => (f._id === followup._id ? { ...f, status: oldStatus } : f)),
          );
          Swal.fire('Error!', 'Failed to cancel follow-up.', 'error');
        },
      });
    });
  }
}
