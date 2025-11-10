import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SharedModule } from '../../shared.module';
import { HeaderComponent } from '../../components/header/header.component';

@Component({
  selector: 'app-header-only-layout',
  standalone: true,
  imports: [SharedModule, RouterOutlet, HeaderComponent],
  template: `
    <app-header></app-header>
    <main >
      <router-outlet></router-outlet>
    </main>
  `,
})
export class HeaderOnlyLayoutComponent {}
