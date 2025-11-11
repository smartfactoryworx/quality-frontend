import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NavigationEnd, Router, Event,RouterOutlet } from '@angular/router';
import { AppStateService } from './shared/services/app-state.service';
import { BreadcrumbService } from './shared/services/breadcrumb.service';
import { take } from 'rxjs';
import { AuthService } from './shared/services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet,CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'Xintra';
  constructor(private appState : AppStateService,private router:Router,
    private breadcrumbService: BreadcrumbService,private auth: AuthService,){
    this.appState.updateState();
  }

  ngOnInit() {
    this.router.events.subscribe((event: Event) => {
      if (event instanceof NavigationEnd) {
        setTimeout(() => {
          // @ts-ignore
          HSStaticMethods.autoInit();
        }, 100);
      }
    });
this.breadcrumbService.ensureLoaded().subscribe(p => {
    if (p?.user) this.auth.setCurrentUser(p.user);  // <-- set once on boot/refresh
  });
  }
}
