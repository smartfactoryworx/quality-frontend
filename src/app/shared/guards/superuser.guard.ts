import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { BreadcrumbService } from '../services/breadcrumb.service';

@Injectable({ providedIn: 'root' })
export class SuperuserGuard implements CanActivate {
  constructor(
    private auth: AuthService,
    private bc: BreadcrumbService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    // If we already have a user in memory, check immediately
    const cached = this.auth.currentUser as any;
    if (cached) return of(cached.superuser ? true : this.router.parseUrl('/error/401'));

    // Otherwise, load user once and decide
    return this.bc.ensureLoaded().pipe(
      tap(p => this.auth.setCurrentUser(p?.user)),
      map(p => (p?.user?.superuser ? true : this.router.parseUrl('/error/401'))),
      catchError(() => of(this.router.parseUrl('/error/401')))
    );
  }
}
