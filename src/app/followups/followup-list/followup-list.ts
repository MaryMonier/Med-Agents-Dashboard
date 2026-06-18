import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FollowupService, Followup } from '../../services/followup.service';

@Component({
  selector: 'app-followup-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './followup-list.html',
})
export class FollowupListComponent implements OnInit {
  followups: Followup[] = [];
  isLoading = true;
  errorMessage = '';

  constructor(private followupService: FollowupService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.followupService.getAll().subscribe({
      next: (res) => {
        this.followups = res.data;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load follow-ups.';
        this.isLoading = false;
      }
    });
  }

  markDone(id: string): void {
    this.followupService.update(id, { status: 'done' }).subscribe(() => this.load());
  }

  formatDate(d: string): string {
    return d
      ? new Date(d).toLocaleDateString('en-US', { day:'numeric', month:'short', year:'numeric' })
      : '—';
  }
}
