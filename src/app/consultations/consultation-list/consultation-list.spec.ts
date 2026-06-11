import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConsultationListComponent } from './consultation-list';
import { provideHttpClient } from '@angular/common/http';

describe('ConsultationListComponent', () => {
  let component: ConsultationListComponent;
  let fixture: ComponentFixture<ConsultationListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConsultationListComponent],
      providers: [provideHttpClient()]
    }).compileComponents();

    fixture = TestBed.createComponent(ConsultationListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
