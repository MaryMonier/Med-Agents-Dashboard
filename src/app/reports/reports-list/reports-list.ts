import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription, of } from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  switchMap,
  tap,
} from 'rxjs/operators';
import { PatientService, Patient } from '../../services/patient';
import { ReportService, GeneratedReportData, ReportMeta } from '../../services/report';

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

  showPatientDropdown = signal<boolean>(false);
  isSearchingPatients = signal<boolean>(false);
  isLoadingConsultations = signal<boolean>(false);
  isGeneratingReport = signal<boolean>(false);

  // للـ scope = consultation بس — بنجيبها من الـ patient history عشان المستخدم يختار
  consultations: ReportConsultation[] = [];
  consultationsError = '';
  generateError = '';

  // الريبورت الـ AI اللي رجع من الـ agent
  generatedReport: {
    data: GeneratedReportData;
    meta: ReportMeta;
    patientName: string;
    mrn: string;
    dob: string;
    generatedAt: Date;
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
    private reportService: ReportService,
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
    if (this.blurTimeout) clearTimeout(this.blurTimeout);
  }

  watchPatientSearch(): void {
    const ctrl = this.reportForm.get('patientSearch');
    if (!ctrl) return;

    this.searchSub = ctrl.valueChanges
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
            map((res) => (res.data || []).map((p) => this.mapToReportPatient(p))),
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
    const ctrl = this.reportForm.get('scope');
    if (!ctrl) return;

    this.scopeSub = ctrl.valueChanges.subscribe((value: 'year' | 'month' | 'consultation') => {
      this.applyScopeValidators(value);
      this.generatedReport = null;

      // لو اختار كونسلتيشن محدد، نجيب القايمة من الهيستوري عشان يختار
      if (
        value === 'consultation' &&
        this.selectedPatient &&
        this.consultations.length === 0 &&
        !this.isLoadingConsultations()
      ) {
        this.loadConsultationsForPicker(this.selectedPatient.id);
      }
    });
  }

  private applyScopeValidators(scope: 'year' | 'month' | 'consultation'): void {
    const yearCtrl = this.reportForm.get('year');
    const monthCtrl = this.reportForm.get('month');
    const consultationIdCtrl = this.reportForm.get('consultationId');

    yearCtrl?.clearValidators();
    monthCtrl?.clearValidators();
    consultationIdCtrl?.clearValidators();

    if (scope === 'year') {
      yearCtrl?.setValidators([Validators.required]);
    } else if (scope === 'month') {
      yearCtrl?.setValidators([Validators.required]);
      monthCtrl?.setValidators([Validators.required]);
    } else {
      consultationIdCtrl?.setValidators([Validators.required]);
    }

    yearCtrl?.updateValueAndValidity();
    monthCtrl?.updateValueAndValidity();
    consultationIdCtrl?.updateValueAndValidity();
  }

  private mapToReportPatient(patient: Patient): ReportPatient {
    return {
      ...patient,
      id: patient._id ?? '',
      dob: patient.dateOfBirth ? String(patient.dateOfBirth) : '',
      mrn: patient.phone ?? '',
    };
  }

  /** بتجيب الكونسلتيشنز من الـ history بس عشان عرضها في الـ picker (scope = consultation) */
  loadConsultationsForPicker(patientId: string): void {
    this.isLoadingConsultations.set(true);
    this.consultations = [];
    this.consultationsError = '';

    this.patientService
      .getHistory(patientId)
      .pipe(
        map((res) =>
          (res.data?.history || []).map((c) => ({
            id: c.consultationId,
            date: c.date,
            diagnosis: c.diagnosis,
          })),
        ),
        catchError(() => {
          this.consultationsError = 'Failed to load consultations.';
          return of([]);
        }),
      )
      .subscribe({
        next: (list) => {
          this.consultations = list;
          this.isLoadingConsultations.set(false);
        },
        error: () => {
          this.consultations = [];
          this.isLoadingConsultations.set(false);
        },
      });
  }

  onPatientSearchFocus(): void {
    if (this.blurTimeout) clearTimeout(this.blurTimeout);
    this.showPatientDropdown.set(true);
  }

  onPatientSearchBlur(): void {
    this.blurTimeout = setTimeout(() => this.showPatientDropdown.set(false), 150);
  }

  selectPatient(patient: ReportPatient): void {
    this.selectedPatient = patient;
    this.reportForm.patchValue({ patientId: patient.id, patientSearch: patient.name });
    this.patientResults = [];
    this.showPatientDropdown.set(false);
    this.consultations = [];
    this.consultationsError = '';
    this.generatedReport = null;
    this.reportForm.get('consultationId')?.setValue('');

    if (this.isSpecificConsultation) {
      this.loadConsultationsForPicker(patient.id);
    }
  }

  selectConsultation(c: ReportConsultation): void {
    this.reportForm.get('consultationId')?.setValue(c.id);
  }

  formatDate(dateValue: string): string {
    if (!dateValue) return '';
    const d = new Date(dateValue);
    return isNaN(d.getTime()) ? dateValue : d.toLocaleDateString();
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

    this.reportService.generate({ patientId, scope, year, month, consultationId }).subscribe({
      next: (res) => {
        this.isGeneratingReport.set(false);

        if (!res.success) {
          this.generateError = res.message || 'Failed to generate report.';
          return;
        }

        if (res.empty || !res.data) {
          this.generateError = res.message || 'No consultations found in the selected time range.';
          return;
        }

        this.generatedReport = {
          data: res.data,
          meta: res.meta,
          patientName: this.selectedPatient?.name || '',
          mrn: this.selectedPatient?.mrn || '',
          dob: this.selectedPatient?.dob || '',
          generatedAt: new Date(res.meta.generatedAt),
        };
      },
      error: (err) => {
        this.isGeneratingReport.set(false);
        this.generateError =
          err?.error?.message || 'Failed to generate report. Check server connection.';
      },
    });
  }

  printReport(): void {
    window.print();
  }
}
