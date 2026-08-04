import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export type Likelihood = 'high' | 'moderate' | 'low';
export type EvidenceBasis = 'referenced' | 'general_knowledge';
export type GroundingSource = 'pinecone' | 'pubmed' | 'medlineplus';

export interface PossibleDiagnosis {
  diagnosis: string;
  likelihood?: Likelihood;
  supportingReasoning?: string;
  againstReasoning?: string;
  recommendedTests?: string;
  protocol?: string;
  evidenceBasis?: EvidenceBasis;
  referenceSource?: GroundingSource | null;
}

export interface LabFileRef {
  originalName?: string;
}

const sourceDisplayFallback: Record<string, string> = {
  pinecone: 'Internal knowledge base',
  pubmed: 'PubMed',
  medlineplus: 'MedlinePlus',
};

/**
 * DifferentialDiagnosisPanel — Angular counterpart of the React
 * DifferentialDiagnosisPanel component: clinical reading + a collapsible
 * (accordion) list of differential diagnoses instead of dumping every
 * diagnosis's full detail (supporting/against reasoning, tests, protocol)
 * open at once. The most likely diagnosis (index 0) is open by default,
 * matching the React behavior exactly.
 *
 * Used everywhere the React app uses it: the consultation form / follow-up
 * form (used directly inside NewConsultationModalComponent), the Patient
 * History screen, and
 * the Follow-up Details screen — one component instead of repeating the
 * same long block in every place.
 */
@Component({
  selector: 'app-differential-diagnosis-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './differential-diagnosis-panel.html',
  styleUrl: './differential-diagnosis-panel.css',
})
export class DifferentialDiagnosisPanelComponent {
  @Input() clinicalReading: string | null | undefined;
  @Input() diagnoses: PossibleDiagnosis[] | null | undefined = [];
  @Input() structuredNoteFallback: string | null | undefined;
  @Input() groundingSourcesUsed: GroundingSource[] | null | undefined = [];
  @Input() labFiles: LabFileRef[] | null | undefined = [];

  // أول تشخيص (الأرجح) مفتوح افتراضيًا، الباقي مقفول — بالظبط زي الرياكت
  openIndex = signal(0);

  get hasStructuredData(): boolean {
    return !!this.clinicalReading || (this.diagnoses?.length || 0) > 0;
  }

  get diagnosesList(): PossibleDiagnosis[] {
    return this.diagnoses || [];
  }

  toggle(i: number): void {
    this.openIndex.set(this.openIndex() === i ? -1 : i);
  }

  isReferenced(d: PossibleDiagnosis): boolean {
    return d.evidenceBasis === 'referenced';
  }

  likelihoodDotClass(likelihood?: Likelihood): string {
    const map: Record<string, string> = {
      high: 'ddp-dot-high',
      moderate: 'ddp-dot-moderate',
      low: 'ddp-dot-low',
    };
    return map[likelihood || ''] || 'ddp-dot-low';
  }

  likelihoodBadgeClass(likelihood?: Likelihood): string {
    const map: Record<string, string> = {
      high: 'ddp-badge-high',
      moderate: 'ddp-badge-moderate',
      low: 'ddp-badge-low',
    };
    return map[likelihood || ''] || 'ddp-badge-low';
  }

  sourceLabel(source?: string | null): string {
    if (!source) return '';
    return sourceDisplayFallback[source] || source;
  }

  groundingSourcesLabel(): string {
    return (this.groundingSourcesUsed || []).map((s) => this.sourceLabel(s)).join(', ');
  }

  labFilesLabel(): string {
    return (this.labFiles || []).map((f) => f.originalName).join(', ');
  }
}
