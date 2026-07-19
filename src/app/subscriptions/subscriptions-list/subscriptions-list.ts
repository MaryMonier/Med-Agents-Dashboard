import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SubscriptionService } from '../../services/subscription';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-subscriptions-list',
  imports: [CommonModule, DatePipe, FormsModule],
  templateUrl: './subscriptions-list.html',
  styleUrl: './subscriptions-list.css',
})
export class SubscriptionsList implements OnInit {
  private subscriptionService = inject(SubscriptionService);

  doctors = signal<any[]>([]);
  isLoading = signal(false);
  searchQuery = signal('');
  statusFilter = signal('');
  planFilter = signal('');

  currentPage = signal(1);
  totalPages = signal(0);
  totalDoctors = signal(0);
  limit = 10;

  ngOnInit(): void {
    this.loadDoctors();
  }

  loadDoctors(): void {
    this.isLoading.set(true);

    this.subscriptionService
      .getDoctorsSubscriptions(
        this.searchQuery(),
        this.statusFilter(),
        this.planFilter(),
        this.currentPage(),
        this.limit
      )
      .subscribe({
        next: (res) => {
          this.doctors.set(res.data);
          this.totalPages.set(res.pagination?.totalPages || 0);
          this.totalDoctors.set(res.pagination?.totalDoctors || res.data.length);
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
    this.loadDoctors();
  }

  onStatusFilterChange(value: string): void {
    this.statusFilter.set(value);
    this.currentPage.set(1);
    this.loadDoctors();
  }

  onPlanFilterChange(value: string): void {
    this.planFilter.set(value);
    this.currentPage.set(1);
    this.loadDoctors();
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.statusFilter.set('');
    this.planFilter.set('');
    this.currentPage.set(1);
    this.loadDoctors();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadDoctors();
  }

  nextPage(): void {
    this.goToPage(this.currentPage() + 1);
  }
  prevPage(): void {
    this.goToPage(this.currentPage() - 1);
  }

  renewSubscription(doctor: any) {
    Swal.fire({
      title: `Renew Subscription`,
      html: `
        <div style="text-align:left; display:flex; flex-direction:column;gap-15px;">

          <label style="font-weight:600">Plan</label>
          <select id="plan" class="swal2-select">
            <option value="Basic" ${doctor.subscription.plan === 'Basic' ? 'selected' : ''}>Basic</option>
            <option value="Pro" ${doctor.subscription.plan === 'Pro' ? 'selected' : ''}>Pro</option>
          </select>

          <label style="font-weight:600">Subscription Duration</label>
          <select id="months" class="swal2-select">
            <option value="1">1 Month</option>
            <option value="3">3 Months</option>
            <option value="6">6 Months</option>
            <option value="12">12 Months</option>
          </select>

        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Renew',
      cancelButtonText: 'Cancel',

      preConfirm: () => {
        const plan = (document.getElementById('plan') as HTMLSelectElement).value;
        const months = Number(
          (document.getElementById('months') as HTMLSelectElement).value
        );
        return { plan, months };
      },
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.subscriptionService
        .renewSubscription(doctor._id, result.value)
        .subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Done!',
              text: 'Subscription renewed successfully.',
              timer: 1500,
              showConfirmButton: false,
            });

            this.loadDoctors();
          },
          error: (err) => {
            Swal.fire({
              icon: 'error',
              title: 'Oops...',
              text: err.error?.message || 'Something went wrong',
            });
          },
        });
    });
  }

  unsubscribeDoctor(doctor: any) {
    Swal.fire({
      title: 'Cancel Subscription?',
      text: `Are you sure you want to cancel ${doctor.name}'s subscription? This will revoke their access immediately.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, cancel it',
      cancelButtonText: 'No, keep it',
      confirmButtonColor: '#dc2626',
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.subscriptionService.unsubscribeDoctor(doctor._id).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Cancelled',
            text: 'Subscription has been cancelled.',
            timer: 1500,
            showConfirmButton: false,
          });

          this.loadDoctors();
        },
        error: (err) => {
          Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: err.error?.message || 'Something went wrong',
          });
        },
      });
    });
  }
}
