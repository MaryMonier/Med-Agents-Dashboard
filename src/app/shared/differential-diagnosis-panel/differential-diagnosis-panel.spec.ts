import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DifferentialDiagnosisPanel } from './differential-diagnosis-panel';

describe('DifferentialDiagnosisPanel', () => {
  let component: DifferentialDiagnosisPanel;
  let fixture: ComponentFixture<DifferentialDiagnosisPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DifferentialDiagnosisPanel],
    }).compileComponents();

    fixture = TestBed.createComponent(DifferentialDiagnosisPanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
