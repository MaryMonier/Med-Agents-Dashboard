import { TestBed } from '@angular/core/testing';

import { Followup } from './followup';

describe('Followup', () => {
  let service: Followup;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Followup);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
