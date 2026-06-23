import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartOptions, Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterModule, BaseChartDirective],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  totaldoctors = signal(0);
  totalPatients = signal(0);
  totalConsultation = signal(0);
  totalWarnings = signal(0);
  totalFollowups = signal(0);

  recentDoctors = signal<any[]>([]);
recentPatients = signal<any[]>([]);

  criticalConsultations = signal<any[]>([]);
  pendingFollowups = signal<any[]>([]);

  barChartData: ChartData<'bar'> = {
    labels: ['Doctors', 'Patients', 'Consultations', 'Follow-ups'],
    datasets: [{
      data: [0, 0, 0, 0],
      backgroundColor: ['#185FA5', '#1D9E75', '#E67E22', '#8E44AD'],
      borderRadius: 6,
      label: 'Overview'
    }]
  };

  barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } }
  };

  pieChartData: ChartData<'pie'> = {
    labels: ['Patients', 'Consultations', 'Follow-ups', 'Drug Warnings'],
    datasets: [{
      data: [0, 0, 0, 0],
      backgroundColor: ['#185FA5', '#1D9E75', '#E67E22', '#E74C3C'],
    }]
  };

  pieChartOptions: ChartOptions<'pie'> = {
    responsive: true,
    plugins: { legend: { position: 'bottom' } }
  };

  private apiUrl = 'http://localhost:5000/api';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadStats();
  }

  loadStats() {
    this.http.get<any>(`${this.apiUrl}/auth/doctors`).subscribe({
      next: (res) => {
        this.totaldoctors.set(res.data?.length || 0);
        this.recentDoctors.set(res.data?.slice(-5).reverse() || []);
        this.updateCharts();
      },
      error: () => this.totaldoctors.set(0)
    });

   this.http.get<any>(`${this.apiUrl}/patients`).subscribe({
  next: (res) => {
    this.totalPatients.set(res.data?.length || 0);
    this.recentPatients.set(res.data?.slice(-5).reverse() || []); // ← هنا
    this.updateCharts();
  },
  error: () => this.totalPatients.set(0)
});

    this.http.get<any>(`${this.apiUrl}/consultations`).subscribe({
      next: (res) => {
        this.totalConsultation.set(res.data?.length || 0);
        const critical = res.data?.filter((c: any) => c.urgencyLevel === 'critical').slice(-5).reverse() || [];
        this.criticalConsultations.set(critical);
        this.updateCharts();
      },
      error: () => this.totalConsultation.set(0)
    });

    this.http.get<any>(`${this.apiUrl}/followups`).subscribe({
      next: (res) => {
        this.totalFollowups.set(res.data?.length || 0);
        const pending = res.data?.filter((f: any) => f.status === 'pending').slice(-5).reverse() || [];
        this.pendingFollowups.set(pending);
        this.updateCharts();
      },
      error: () => this.totalFollowups.set(0)
    });

    this.http.get<any>(`${this.apiUrl}/prescriptions`).subscribe({
      next: (res) => {
        const warnings = res.data?.filter((p: any) => p.warnings?.length > 0).length || 0;
        this.totalWarnings.set(warnings);
        this.updateCharts();
      },
      error: () => this.totalWarnings.set(0)
    });
  }

  updateCharts() {
    this.barChartData = {
      ...this.barChartData,
      datasets: [{
        ...this.barChartData.datasets[0],
        data: [this.totaldoctors(), this.totalPatients(), this.totalConsultation(), this.totalFollowups()]
      }]
    };

    this.pieChartData = {
      ...this.pieChartData,
      datasets: [{
        ...this.pieChartData.datasets[0],
        data: [this.totalPatients(), this.totalConsultation(), this.totalFollowups(), this.totalWarnings()]
      }]
    };
  }
}