import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface MedicalReport {
  id: string;
  patientName: string;
  diagnosis: string;
  urgency: 'Low' | 'Medium' | 'Critical';
  status: 'Generated' | 'Pending';
  date: string;
  symptoms: string[];
  clinicalSummary: string;
  recommendedActions: string[];
  followUpPlan: string;
  confidenceScore: number;
}

export interface ReportStats {
  totalReports: number;
  generatedToday: number;
  pendingReports: number;
  criticalCases: number;
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.html',
  styleUrls: ['./reports.css']
})
export class ReportsComponent implements OnInit {
  isLoading = true;
  isError = false;
  isEmpty = false;

  searchQuery: string = '';
  selectedStatus: string = 'All';
  selectedUrgency: string = 'All';

  stats!: ReportStats;
  allReports: MedicalReport[] = [];
  filteredReports: MedicalReport[] = [];
  selectedReport!: MedicalReport | null;

  constructor() {}

  ngOnInit(): void {
    this.fetchReportsDataset();
  }

  fetchReportsDataset(): void {
    this.isLoading = true;
    this.isError = false;

    setTimeout(() => {
      try {
        this.stats = {
          totalReports: 148,
          generatedToday: 14,
          pendingReports: 6,
          criticalCases: 3
        };

        this.allReports = [
          {
            id: 'REP-01',
            patientName: 'Sarah Jenkins',
            diagnosis: 'Hypertension Management',
            urgency: 'Medium',
            status: 'Generated',
            date: '2026-06-22',
            symptoms: ['Persistent Headaches', 'Intermittent Dizziness', 'Elevated Systolic BP'],
            clinicalSummary: 'Patient presents with a consistent trend of Stage 2 Hypertension. Cardiovascular tracking indicates elevated systemic vascular resistance. Requires calibration of Beta-Blocker therapy.',
            recommendedActions: ['Increase Losartan dosage to 50mg daily', 'Initiate low-sodium dietary protocols', 'Schedule arterial ultrasound check'],
            followUpPlan: 'Weekly blood pressure tracking checkups via telehealth to monitor baseline stabilization.',
            confidenceScore: 94
          },
          {
            id: 'REP-02',
            patientName: 'Michael Chang',
            diagnosis: 'Type 2 Diabetes Review',
            urgency: 'Critical',
            status: 'Generated',
            date: '2026-06-22',
            symptoms: ['Polyuria', 'Unexplained Fatigue', 'Severe HbA1c Elevation'],
            clinicalSummary: 'Evaluated HbA1c levels recorded at 8.7%. Glucose control threshold exceeded repeatedly over past 30 days. Intervention required to mitigate microvascular risks.',
            recommendedActions: ['Introduce long-acting basal insulin dosage', 'Deploy Continuous Glucose Monitor (CGM)', 'Immediate referral to clinical dietitian specialist'],
            followUpPlan: 'In-clinic evaluation visit scheduled within 7 business days.',
            confidenceScore: 97
          },
          {
            id: 'REP-03',
            patientName: 'Amira Ryan',
            diagnosis: 'Acute Bronchitis Evaluation',
            urgency: 'Low',
            status: 'Pending',
            date: '2026-06-21',
            symptoms: ['Productive Cough', 'Low-grade Fever', 'Mild Wheezing'],
            clinicalSummary: 'Respiratory review shows lungs clear bilaterally with acute upper bronchial congestion. No asthmatic pathways detected.',
            recommendedActions: ['Prescribe bronchodilators and hydration fluid therapy', 'Maintain oral hydration over 2.5L daily', 'Enforce complete bed rest'],
            followUpPlan: 'Follow up with clinic help desk if symptoms persist beyond Day 5.',
            confidenceScore: 89
          }
        ];

        this.applyFilters();
        this.isLoading = false;
      } catch (err) {
        this.isError = true;
        this.isLoading = false;
      }
    }, 1000);
  }

  applyFilters(): void {
    this.filteredReports = this.allReports.filter(report => {
      const matchesSearch = report.patientName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                            report.diagnosis.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                            report.id.toLowerCase().includes(this.searchQuery.toLowerCase());

      const matchesStatus = this.selectedStatus === 'All' || report.status === this.selectedStatus;
      const matchesUrgency = this.selectedUrgency === 'All' || report.urgency === this.selectedUrgency;

      return matchesSearch && matchesStatus && matchesUrgency;
    });

    this.isEmpty = this.filteredReports.length === 0;

    if (this.filteredReports.length > 0) {
      this.selectReportCard(this.filteredReports[0]);
    } else {
      this.selectedReport = null;
    }
  }

  selectReportCard(report: MedicalReport): void {
    this.selectedReport = report;
  }

  exportAsPDF(): void {
    if (!this.selectedReport) return;
    alert(`Downloading medical secure PDF report for Transaction: ${this.selectedReport.id}`);
  }

  exportAsTXT(): void {
    if (!this.selectedReport) return;
    alert(`Exporting plaintext medical summary note for Patient: ${this.selectedReport.patientName}`);
  }
}
