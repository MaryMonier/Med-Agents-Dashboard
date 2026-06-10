import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FollowupService } from '../../services/followup';
import { Followup } from '../../models/followup';

@Component({
  selector: 'app-followups',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './followups.html',
  styleUrl: './followups.css',
})
export class Followups implements OnInit {
  allFollowups: Followup[] = [];
  filteredFollowups: Followup[] = [];
  pagedFollowups: Followup[] = [];

  searchTerm = signal('');
  isLoading = signal(false);
  errorMessage = signal('');

  // Pagination
  pageIndex = 0;
  pageSize = 10;
  totalItems = 0;

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize);
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i);
  }

  get startItem(): number {
    return this.pageIndex * this.pageSize + 1;
  }

  get endItem(): number {
    return Math.min((this.pageIndex + 1) * this.pageSize, this.totalItems);
  }

  constructor(private followupService: FollowupService) {}

  ngOnInit(): void {
    this.loadFollowups();
  }

  loadFollowups(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.followupService.getAllFollowups().subscribe({
      next: (res) => {
        this.allFollowups = res.data || [];
        console.log('sample:', JSON.stringify(this.allFollowups[0]?.patientId));
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
    const filtered = term
      ? this.allFollowups.filter((f) => {
          if (!f.patientId) return false;
          const patientId =
            typeof f.patientId === 'object' ? (f.patientId as any)?._id : f.patientId;
          return patientId?.toLowerCase().includes(term);
        })
      : this.allFollowups;

    if (term && filtered.length === 0) {
      this.errorMessage.set('No follow-ups found for this patient ID');
    } else {
      this.errorMessage.set('');
    }

    this.filteredFollowups = filtered;
    this.totalItems = filtered.length;
    this.pageIndex = 0;
    this.updatePage();
  }

  updatePage(): void {
    const start = this.pageIndex * this.pageSize;
    this.pagedFollowups = this.filteredFollowups.slice(start, start + this.pageSize);
  }

  goToPage(index: number): void {
    if (index < 0 || index >= this.totalPages) return;
    this.pageIndex = index;
    this.updatePage();
  }

  onPageSizeChange(event: Event): void {
    this.pageSize = Number((event.target as HTMLSelectElement).value);
    this.pageIndex = 0;
    this.updatePage();
  }

  clearSearch(): void {
    this.searchTerm.set('');
    this.applySearch();
  }

  toggleStatus(followup: Followup): void {
    const newStatus = followup.status === 'pending' ? 'done' : 'pending';
    const oldStatus = followup.status;

    this.pagedFollowups = this.pagedFollowups.map((f) =>
      f._id === followup._id ? { ...f, status: newStatus } : f,
    );
    this.allFollowups = this.allFollowups.map((f) =>
      f._id === followup._id ? { ...f, status: newStatus } : f,
    );

    this.followupService.updateStatus(followup._id, newStatus).subscribe({
      error: () => {
        this.pagedFollowups = this.pagedFollowups.map((f) =>
          f._id === followup._id ? { ...f, status: oldStatus } : f,
        );
        this.allFollowups = this.allFollowups.map((f) =>
          f._id === followup._id ? { ...f, status: oldStatus } : f,
        );
        this.errorMessage.set('Failed to update status');
      },
    });
  }

  deleteFollowup(id: string): void {
    if (!confirm('Are you sure you want to delete this follow-up?')) return;

    // احذف من الـ UI فوراً
    const deleted = this.allFollowups.find((f) => f._id === id);
    this.pagedFollowups = this.pagedFollowups.filter((f) => f._id !== id);
    this.allFollowups = this.allFollowups.filter((f) => f._id !== id);
    this.filteredFollowups = this.filteredFollowups.filter((f) => f._id !== id);
    this.totalItems = this.filteredFollowups.length;

    this.followupService.deleteFollowup(id).subscribe({
      error: () => {
        if (deleted) {
          this.allFollowups.push(deleted);
          this.filteredFollowups.push(deleted);
          this.totalItems = this.filteredFollowups.length;
          this.updatePage();
        }
        this.errorMessage.set('Failed to delete follow-up');
      },
    });
  }
}
