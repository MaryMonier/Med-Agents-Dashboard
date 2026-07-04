import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentService } from '../services/payments';

@Component({
  selector: 'app-payments-list',
  imports: [CommonModule, DatePipe, FormsModule],
  templateUrl: './payments.html',
  styleUrl: './payments.css',
})
export class PaymentsList implements OnInit {
  private paymentService = inject(PaymentService);

  payments = signal<any[]>([]);
  isLoading = signal(false);
  searchQuery = signal('');
  statusFilter = signal('');

  currentPage = signal(1);
  totalPages = signal(0);
  totalPayments = signal(0);
  limit = 10;

  ngOnInit(): void {
    this.loadPayments();
  }

  loadPayments(): void {
    this.isLoading.set(true);

    this.paymentService
      .getAllPayments(this.searchQuery(), this.statusFilter(), this.currentPage(), this.limit)
      .subscribe({
        next: (res) => {
          this.payments.set(res.data);
          this.totalPages.set(res.pagination?.totalPages || 0);
          this.totalPayments.set(res.pagination?.total || res.data.length);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error(err);
          this.isLoading.set(false);
        },
      });
  }

  onSearchChange(value: string): void {
    this.searchQuery.set(value);
    this.currentPage.set(1);
    this.loadPayments();
  }

  onStatusChange(value: string): void {
    this.statusFilter.set(value);
    this.currentPage.set(1);
    this.loadPayments();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadPayments();
  }

  nextPage(): void {
    this.goToPage(this.currentPage() + 1);
  }
  prevPage(): void {
    this.goToPage(this.currentPage() - 1);
  }

  toEGP(amountCents: number): string {
    return (amountCents / 100).toFixed(2);
  }
}
