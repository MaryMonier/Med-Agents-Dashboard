import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectPatient } from './select-patient';

describe('SelectPatient', () => {
  let component: SelectPatient;
  let fixture: ComponentFixture<SelectPatient>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectPatient],
    }).compileComponents();

    fixture = TestBed.createComponent(SelectPatient);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
