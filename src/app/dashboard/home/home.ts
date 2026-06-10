import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, signal } from '@angular/core';
import { RouterModule } from '@angular/router';


@Component({
  selector: 'app-home',
  imports: [CommonModule,RouterModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  totalPatients = signal(0);
  totalConsultation = signal(0);
  totalWarnings = signal(0);
  totalFollowups=signal(0);

    private apiUrl = 'http://localhost:5000/api';

constructor (private http : HttpClient){}

  ngOnInit() {
 this.loadStats();
  }
  loadStats(){
    this.http.get<any>(`${this.apiUrl}/patients`).subscribe({
      next: (res)=> this.totalPatients.set(res.data?.length || 0),
      error: ()=> this.totalPatients.set(0)
    });

  this.http.get<any>(`${this.apiUrl}/consultations`).subscribe({
      next: (res) => this.totalConsultation.set(res.data?.length || 0),
      error: () => this.totalConsultation.set(0)
    });

    // Followups
    this.http.get<any>(`${this.apiUrl}/followups`).subscribe({
      next: (res) => this.totalFollowups.set(res.count || res.data?.length || 0),
      error: () => this.totalFollowups.set(0)
    });

    // Drug Warnings - من الـ prescriptions
    this.http.get<any>(`${this.apiUrl}/prescriptions`).subscribe({
      next: (res) => {
        const warnings = res.data?.filter((p: any) => p.warnings?.length > 0).length || 0;
        this.totalWarnings.set(warnings);
      },
      error: () => this.totalWarnings.set(0)
    });
  }
}

