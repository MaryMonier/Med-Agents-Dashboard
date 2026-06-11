import {
  Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

import { ReportService, ReportData } from '../services/report.service';
import { ConsultationService } from '../services/consultation';
import { Consultations } from '../models/consultations';

// ─── helpers ────────────────────────────────────────────────────────────────
const fmtDate = (d: string) =>
  d ? new Date(d).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'}) : '—';
const timeAgo = (d: string) => {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
};
// naive AI confidence: higher for completed + critical
const aiScore = (c: Consultations): number => {
  let s = 72;
  if (c.status === 'completed') s += 12;
  if (c.urgencyLevel === 'critical') s += 10;
  if (c.urgencyLevel === 'medium')   s += 5;
  if (c.diagnosis?.length > 20)      s += 6;
  return Math.min(s, 98);
};

// ─── component ──────────────────────────────────────────────────────────────
@Component({
  selector: 'app-reports',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.html',
  styleUrls: ['./reports.css'],
})
export class ReportsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private search$  = new Subject<string>();

  // ── list state ────────────────────────────────────────────────
  allConsultations: Consultations[]      = [];
  filtered:         Consultations[]      = [];
  listLoading = true;
  listError   = false;

  searchQuery   = '';
  filterStatus  = '';
  filterUrgency = '';

  // ── selection + generation ────────────────────────────────────
  selected:       Consultations | null = null;
  report:         ReportData    | null = null;
  generatedAt     = '';
  language:       'en' | 'ar' = 'en';
  generating      = false;
  generateError   = '';
  confidenceScore = 0;

  // ── computed stats ────────────────────────────────────────────
  get totalReports():   number { return this.allConsultations.filter(c => c.status === 'completed').length; }
  get pendingReports(): number { return this.allConsultations.filter(c => c.status === 'pending').length; }
  get criticalReports():number { return this.allConsultations.filter(c => c.urgencyLevel === 'critical').length; }
  get todayReports():   number {
    const today = new Date().toDateString();
    return this.allConsultations.filter(c => new Date(c.createdAt).toDateString() === today).length;
  }

  constructor(
    private reportSvc:       ReportService,
    private consultationSvc: ConsultationService,
    private cdr:             ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.search$.pipe(
      debounceTime(260), distinctUntilChanged(), takeUntil(this.destroy$),
    ).subscribe(() => this._applyFilters());
    this.loadList();
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  // ── load ──────────────────────────────────────────────────────
  loadList(): void {
    this.listLoading = true; this.listError = false;
    this.consultationSvc.getAll().pipe(takeUntil(this.destroy$)).subscribe({
     next: (res: any) => {
        this.allConsultations = res.data ?? [];
        this._applyFilters();
        this.listLoading = false; this.cdr.markForCheck();
      },
      error: () => {
        this.listError = true; this.listLoading = false; this.cdr.markForCheck();
      },
    });
  }

  // ── filtering ─────────────────────────────────────────────────
  onSearch(): void { this.search$.next(this.searchQuery); }
  onFilterChange(): void { this._applyFilters(); }

  private _applyFilters(): void {
    const q = this.searchQuery.trim().toLowerCase();
    this.filtered = this.allConsultations.filter(c => {
      const matchQ = !q ||
        c.diagnosis?.toLowerCase().includes(q) ||
        c.urgencyLevel.toLowerCase().includes(q) ||
        c.status.toLowerCase().includes(q) ||
        c._id.toLowerCase().includes(q);
      const matchStatus  = !this.filterStatus  || c.status === this.filterStatus;
      const matchUrgency = !this.filterUrgency || c.urgencyLevel === this.filterUrgency;
      return matchQ && matchStatus && matchUrgency;
    });
    this.cdr.markForCheck();
  }

  clearFilters(): void {
    this.searchQuery = ''; this.filterStatus = ''; this.filterUrgency = '';
    this._applyFilters();
  }

  // ── select ────────────────────────────────────────────────────
  select(c: Consultations): void {
    this.selected = c;
    this.report   = null;
    this.generateError = '';
    this.cdr.markForCheck();
  }

  // ── generate ──────────────────────────────────────────────────
  generate(): void {
    if (!this.selected || this.generating) return;
    this.generating = true; this.generateError = ''; this.report = null;
    this.reportSvc.generate(this.selected._id, this.language)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.report    = res.data;
          this.generatedAt    = new Date().toLocaleString('en-US',{
            year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit',
          });
          this.confidenceScore = aiScore(this.selected!);
          this.generating = false; this.cdr.markForCheck();
        },
        error: err => {
          this.generateError = err?.error?.message ?? 'Report generation failed. Please try again.';
          this.generating = false; this.cdr.markForCheck();
        },
      });
  }

  // ── actions ───────────────────────────────────────────────────
  printReport(): void { window.print(); }

  downloadTxt(): void {
    if (!this.report) return;
    this.reportSvc.downloadAsText(this.report, `med-report-${this.selected!._id}-${Date.now()}.txt`);
  }

  // ── display helpers ───────────────────────────────────────────
  urgencyLabel = (u: string) => ({low:'Low',medium:'Moderate',critical:'Critical'}as any)[u]??u;
  fmtDate      = fmtDate;
  timeAgo      = timeAgo;
  aiScore      = (c: Consultations) => aiScore(c);
  trackById    = (_: number, c: Consultations) => c._id;

  get scoreColor(): string {
    if (this.confidenceScore >= 90) return '#059669';
    if (this.confidenceScore >= 75) return '#D97706';
    return '#DC2626';
  }
  get scoreBg(): string {
    if (this.confidenceScore >= 90) return '#DCFCE7';
    if (this.confidenceScore >= 75) return '#FEF9C3';
    return '#FEE2E2';
  }
}
