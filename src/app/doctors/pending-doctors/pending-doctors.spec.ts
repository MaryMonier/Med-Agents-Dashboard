import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PendingDoctors } from './pending-doctors';

describe('PendingDoctors', () => {
  let component: PendingDoctors;
  let fixture: ComponentFixture<PendingDoctors>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PendingDoctors],
    }).compileComponents();

    fixture = TestBed.createComponent(PendingDoctors);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
