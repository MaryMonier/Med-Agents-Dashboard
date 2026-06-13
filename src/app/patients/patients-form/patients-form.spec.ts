import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PatientsForm } from './patients-form';

describe('PatientsForm', () => {
  let component: PatientsForm;
  let fixture: ComponentFixture<PatientsForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientsForm],
    }).compileComponents();

    fixture = TestBed.createComponent(PatientsForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
