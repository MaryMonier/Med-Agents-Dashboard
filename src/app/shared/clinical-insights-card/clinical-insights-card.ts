import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface AiRecommendationResult {
  structuredNote?: string;
  suggestedSpecialist?: string;
  urgencyLevel?: 'low' | 'medium' | 'critical' | 'unknown';
}

/**
 * ClinicalInsightsCard — shared sidebar card showing the AI Recommendation
 * result (urgency level / suggested specialist / structured note), matching
 * the React "Clinical Insights" card exactly. Used by consultation-form and
 * the inline follow-up form in patient-history.
 */
@Component({
  selector: 'app-clinical-insights-card',
  imports: [CommonModule],
  templateUrl: './clinical-insights-card.html',
  styleUrl: './clinical-insights-card.css',
})
export class ClinicalInsightsCardComponent {
  @Input() result: AiRecommendationResult | null = null;
  @Input() isGenerating = false;

  urgencyClass(level?: string): string {
    const map: Record<string, string> = {
      low: 'ci-urgency-low',
      medium: 'ci-urgency-medium',
      critical: 'ci-urgency-critical',
    };
    return map[level || ''] || 'ci-urgency-unknown';
  }
}
