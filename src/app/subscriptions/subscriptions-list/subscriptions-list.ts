import { Component, OnInit, inject, signal,computed } from '@angular/core';
import { CommonModule, DatePipe,  } from '@angular/common';
import { SubscriptionService } from '../../services/subscription';
import Swal from 'sweetalert2';
@Component({
  selector: 'app-subscriptions-list',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './subscriptions-list.html',
  styleUrl: './subscriptions-list.css',
})
export class SubscriptionsList implements OnInit {

  private subscriptionService = inject(SubscriptionService);

  doctors = signal<any[]>([]);
searchTerm = signal('');

  ngOnInit(): void {
    this.loadDoctors();
  }

  filteredDoctors = computed(() => {

  const search = this.searchTerm().trim().toLowerCase();

  if (!search) return this.doctors();

  return this.doctors().filter((doctor) =>
    doctor.name.toLowerCase().includes(search) ||
    doctor.email.toLowerCase().includes(search) ||
    doctor.specialty.toLowerCase().includes(search)
  );

});

  loadDoctors() {
    this.subscriptionService.getDoctorsSubscriptions().subscribe({
      next: (res) => {
        this.doctors.set(res.data);
      },
      error: (err) => console.error(err),
    });
  }



renewSubscription(doctor: any) {

  Swal.fire({
    title: `Renew Subscription`,
  html: `
  <div style="text-align:left">

    <label style="font-weight:600">
      Subscription Duration
    </label>

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

  const months = Number(
    (document.getElementById('months') as HTMLSelectElement).value
  );

  return { months };
}

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
            showConfirmButton: false
          });

          this.loadDoctors();
        },

        error: (err) => {

          Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: err.error?.message || 'Something went wrong'
          });

        }

      });

  });

}
}
