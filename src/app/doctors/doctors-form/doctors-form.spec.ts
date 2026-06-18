import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DoctorsForm } from './doctors-form';

describe('DoctorsForm', () => {
  let component: DoctorsForm;
  let fixture: ComponentFixture<DoctorsForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DoctorsForm],
    }).compileComponents();

    fixture = TestBed.createComponent(DoctorsForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
