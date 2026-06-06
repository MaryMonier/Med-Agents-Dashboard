import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Sidebar } from '../../shared/sidebar/sidebar';
import { Navbar } from '../../shared/navbar/navbar';

@Component({
  selector: 'app-home',
  imports: [CommonModule,RouterModule,Sidebar,Navbar],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  totalPatients = signal(0);
  totalConsultation = signal(0);
  totalWarnings = signal(0);
  totalFollowups=signal(0);

  ngOnInit() {
    this.totalPatients.set(124);
    this.totalConsultation.set(48);
    this.totalWarnings.set(7);
    this.totalFollowups.set(31)
  }
}
