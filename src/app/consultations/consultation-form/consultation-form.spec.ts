import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConsultationForm } from './consultation-form';

describe('ConsultationForm', () => {
  let component: ConsultationForm;
  let fixture: ComponentFixture<ConsultationForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConsultationForm],
    }).compileComponents();

    fixture = TestBed.createComponent(ConsultationForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
