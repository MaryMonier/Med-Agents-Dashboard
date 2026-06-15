import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PatientHistory } from './patient-history';

describe('PatientHistory', () => {
  let component: PatientHistory;
  let fixture: ComponentFixture<PatientHistory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientHistory],
    }).compileComponents();

    fixture = TestBed.createComponent(PatientHistory);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
