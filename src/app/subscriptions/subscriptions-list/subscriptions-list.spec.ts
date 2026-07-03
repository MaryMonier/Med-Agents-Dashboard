import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubscriptionsList } from './subscriptions-list';

describe('SubscriptionsList', () => {
  let component: SubscriptionsList;
  let fixture: ComponentFixture<SubscriptionsList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubscriptionsList],
    }).compileComponents();

    fixture = TestBed.createComponent(SubscriptionsList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
