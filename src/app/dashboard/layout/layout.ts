import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Sidebar } from '../../shared/sidebar/sidebar';
import { Navbar } from '../../shared/navbar/navbar';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, Sidebar, Navbar],
  templateUrl: './layout.html',
  styleUrl: './layout.css'
})
export class Layout {}