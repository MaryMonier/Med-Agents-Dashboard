import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, switchMap, tap } from 'rxjs/operators';
import { PatientService, Patient, ConsultationHistory, PrescriptionInfo } from '../../services/patient';

export interface ReportPatient extends Patient {
  id: string;
  dob: string;
  mrn: string;
}

export interface ReportConsultation {
  id: string;
  date: string;
  diagnosis: string;
}

export interface ReportEntry {
  id: string;
  date: string;
  diagnosis: string;
  symptoms: string[];
  urgencyLevel: string;
  suggestedSpecialist: string | null;
  structuredNote: string | null;
  isFollowup: boolean;
  prescription: PrescriptionInfo | null;
}

interface ScopeOption {
  value: 'year' | 'month' | 'consultation';
  label: string;
}

interface MonthOption {
  value: number;
  label: string;
}

@Component({
  selector: 'app-reports-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reports-list.html',
  styleUrl: './reports-list.css',
})
export class ReportsList implements OnInit, OnDestroy {
  reportForm: FormGroup;

  patientResults: ReportPatient[] = [];
  selectedPatient: ReportPatient | null = null;

  // الـ Signals الأساسية المتحكمة في الـ Spinners والقوائم
  showPatientDropdown = signal<boolean>(false);
  isSearchingPatients = signal<boolean>(false);
  isLoadingConsultations = signal<boolean>(false);
  isGeneratingReport = signal<boolean>(false);

  consultations: ReportConsultation[] = [];
  consultationsError = '';
  generateError = '';

  generatedReport: {
    patientName: string;
    mrn: string;
    dob: string;
    scopeLabel: string;
    rangeLabel: string;
    generatedAt: Date;
    entries: ReportEntry[];
  } | null = null;

  scopeOptions: ScopeOption[] = [
    { value: 'year', label: 'Yearly Report' },
    { value: 'month', label: 'Monthly Report' },
    { value: 'consultation', label: 'Specific Consultation' },
  ];

  monthOptions: MonthOption[] = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  yearOptions: number[] = [];

  private searchSub?: Subscription;
  private scopeSub?: Subscription;
  private blurTimeout?: ReturnType<typeof setTimeout>;

  constructor(
    private fb: FormBuilder,
    private patientService: PatientService,
  ) {
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= currentYear - 9; y--) {
      this.yearOptions.push(y);
    }

    this.reportForm = this.fb.group({
      patientSearch: ['', Validators.required],
      patientId: ['', Validators.required],
      scope: ['year', Validators.required],
      year: [currentYear],
      month: [new Date().getMonth() + 1],
      consultationId: [''],
    });
  }

  get f() {
    return this.reportForm.controls;
  }

  get isYearScope(): boolean {
    return this.reportForm.get('scope')?.value === 'year';
  }

  get isMonthScope(): boolean {
    return this.reportForm.get('scope')?.value === 'month';
  }

  get isSpecificConsultation(): boolean {
    return this.reportForm.get('scope')?.value === 'consultation';
  }

  ngOnInit(): void {
    this.watchPatientSearch();
    this.watchScopeChanges();
    this.applyScopeValidators('year');
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
    this.scopeSub?.unsubscribe();
    if (this.blurTimeout) {
      clearTimeout(this.blurTimeout);
    }
  }

  watchPatientSearch(): void {
    const patientSearchControl = this.reportForm.get('patientSearch');
    if (!patientSearchControl) {
      return;
    }

    this.searchSub = patientSearchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap((value: string) => {
          if (this.selectedPatient && value !== this.selectedPatient.name) {
            this.selectedPatient = null;
            this.reportForm.get('patientId')?.setValue('', { emitEvent: false });
            this.consultations = [];
            this.consultationsError = '';
            this.generatedReport = null;
            this.reportForm.get('consultationId')?.setValue('');
          }
          this.isSearchingPatients.set(true);
        }),
        switchMap((value: string) =>
          this.patientService.getAll(value || '').pipe(
            map((res) => (res.data || []).map((patient) => this.mapToReportPatient(patient))),
            catchError(() => of([])),
          ),
        ),
      )
      .subscribe({
        next: (results) => {
          this.patientResults = results;
          this.isSearchingPatients.set(false);
        },
        error: () => {
          this.patientResults = [];
          this.isSearchingPatients.set(false);
        },
      });
  }

  watchScopeChanges(): void {
    const scopeControl = this.reportForm.get('scope');
    if (!scopeControl) {
      return;
    }

    this.scopeSub = scopeControl.valueChanges.subscribe((value: 'year' | 'month' | 'consultation') => {
      this.applyScopeValidators(value);
      this.generatedReport = null;

      if (value === 'consultation' && this.selectedPatient && this.consultations.length === 0 && !this.isLoadingConsultations()) {
        this.loadConsultations(this.selectedPatient.id);
      }
    });
  }

  private applyScopeValidators(scope: 'year' | 'month' | 'consultation'): void {
    const yearControl = this.reportForm.get('year');
    const monthControl = this.reportForm.get('month');
    const consultationIdControl = this.reportForm.get('consultationId');

    yearControl?.clearValidators();
    monthControl?.clearValidators();
    consultationIdControl?.clearValidators();

    if (scope === 'year') {
      yearControl?.setValidators([Validators.required]);
    } else if (scope === 'month') {
      yearControl?.setValidators([Validators.required]);
      monthControl?.setValidators([Validators.required]);
    } else if (scope === 'consultation') {
      consultationIdControl?.setValidators([Validators.required]);
    }

    yearControl?.updateValueAndValidity();
    monthControl?.updateValueAndValidity();
    consultationIdControl?.updateValueAndValidity();
  }

  private mapToReportPatient(patient: Patient): ReportPatient {
    return {
      ...patient,
      id: patient._id ?? '',
      dob: patient.dateOfBirth ? String(patient.dateOfBirth) : '',
      mrn: patient.nationalID ?? '',
    };
  }

  private mapToReportConsultation(consultation: ConsultationHistory): ReportConsultation {
    return {
      id: consultation.consultationId,
      date: consultation.date,
      diagnosis: consultation.diagnosis,
    };
  }

  private mapToReportEntry(consultation: ConsultationHistory): ReportEntry {
    return {
      id: consultation.consultationId,
      date: consultation.date,
      diagnosis: consultation.diagnosis || 'No diagnosis recorded',
      symptoms: consultation.symptoms || [],
      urgencyLevel: consultation.urgencyLevel || 'unknown',
      suggestedSpecialist: consultation.suggestedSpecialist,
      structuredNote: consultation.structuredNote,
      isFollowup: !!consultation.isFollowup,
      prescription: consultation.prescription,
    };
  }

  loadConsultations(patientId: string): void {
    this.isLoadingConsultations.set(true);
    this.consultations = [];
    this.consultationsError = '';

    if (!patientId) {
      this.isLoadingConsultations.set(false);
      this.consultationsError = 'This patient has no valid ID.';
      return;
    }

    this.patientService
      .getHistory(patientId)
      .pipe(
        map((res) => (res.data?.history || []).map((c) => this.mapToReportConsultation(c))),
        catchError((err) => {
          console.error('Failed to load consultations:', err);
          this.consultationsError = 'Failed to load consultations. Check the server connection.';
          return of([]);
        }),
      )
      .subscribe({
        next: (consultations) => {
          this.consultations = consultations;
          this.isLoadingConsultations.set(false);
        },
        error: () => {
          this.consultations = [];
          this.isLoadingConsultations.set(false);
        },
      });
  }

  onPatientSearchFocus(): void {
    if (this.blurTimeout) {
      clearTimeout(this.blurTimeout);
    }
    this.showPatientDropdown.set(true);
  }

  onPatientSearchBlur(): void {
    this.blurTimeout = setTimeout(() => {
      this.showPatientDropdown.set(false);
    }, 150);
  }

  selectPatient(patient: ReportPatient): void {
    this.selectedPatient = patient;
    this.reportForm.patchValue({
      patientId: patient.id,
      patientSearch: patient.name,
    });
    this.patientResults = [];
    this.showPatientDropdown.set(false);
    this.consultations = [];
    this.consultationsError = '';
    this.generatedReport = null;
    this.reportForm.get('consultationId')?.setValue('');

    this.loadConsultations(patient.id);
  }

  selectConsultation(consultation: ReportConsultation): void {
    this.reportForm.get('consultationId')?.setValue(consultation.id);
  }

  formatConsultationDate(dateValue: string): string {
    if (!dateValue) {
      return '';
    }
    const parsed = new Date(dateValue);
    if (isNaN(parsed.getTime())) {
      return dateValue;
    }
    return parsed.toLocaleDateString();
  }

  resetForm(): void {
    const currentYear = new Date().getFullYear();
    this.reportForm.reset({
      patientSearch: '',
      patientId: '',
      scope: 'year',
      year: currentYear,
      month: new Date().getMonth() + 1,
      consultationId: '',
    });
    this.applyScopeValidators('year');
    this.selectedPatient = null;
    this.patientResults = [];
    this.consultations = [];
    this.consultationsError = '';
    this.showPatientDropdown.set(false);
    this.isSearchingPatients.set(false);
    this.isLoadingConsultations.set(false);
    this.generatedReport = null;
    this.generateError = '';
  }

  generateReport(): void {
    const patientId = this.reportForm.get('patientId')?.value;
    if (!patientId || !this.selectedPatient) {
      this.generateError = 'Please select a patient first.';
      return;
    }

    this.isGeneratingReport.set(true);
    this.generateError = '';
    this.generatedReport = null;

    const scope = this.reportForm.get('scope')?.value as 'year' | 'month' | 'consultation';
    const year = this.reportForm.get('year')?.value;
    const month = this.reportForm.get('month')?.value;
    const consultationId = this.reportForm.get('consultationId')?.value;

    this.patientService
      .getHistory(patientId)
      .pipe(
        map((res) => res.data?.history || []),
        catchError((err) => {
          console.error('Failed to generate report:', err);
          this.generateError = 'Failed to load patient data for the report. Check the server connection.';
          return of(null);
        }),
      )
      .subscribe((history) => {
        this.isGeneratingReport.set(false);

        if (history === null) {
          return;
        }

        let filtered: ConsultationHistory[] = [];
        let scopeLabel = '';
        let rangeLabel = '';

        if (scope === 'year') {
          filtered = history.filter((c) => new Date(c.date).getFullYear() === Number(year));
          scopeLabel = 'Yearly Report';
          rangeLabel = `Year ${year}`;
        } else if (scope === 'month') {
          filtered = history.filter((c) => {
            const d = new Date(c.date);
            return d.getFullYear() === Number(year) && d.getMonth() + 1 === Number(month);
          });
          scopeLabel = 'Monthly Report';
          const monthLabel = this.monthOptions.find((m) => m.value === Number(month))?.label || month;
          rangeLabel = `${monthLabel} ${year}`;
        } else if (scope === 'consultation') {
          filtered = history.filter((c) => c.consultationId === consultationId);
          scopeLabel = 'Specific Consultation';
          rangeLabel = filtered.length
            ? `${filtered[0].diagnosis || 'No diagnosis recorded'} — ${this.formatConsultationDate(filtered[0].date)}`
            : 'Selected consultation';
        }

        filtered = [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        this.generatedReport = {
          patientName: this.selectedPatient?.name || '',
          mrn: this.selectedPatient?.mrn || '',
          dob: this.selectedPatient?.dob || '',
          scopeLabel,
          rangeLabel,
          generatedAt: new Date(),
          entries: filtered.map((c) => this.mapToReportEntry(c)),
        };
      });
  }

  printReport(): void {
    window.print();
  }
}
