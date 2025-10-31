import { Routes } from '@angular/router';
import { ContentLayoutComponent } from './shared/layouts/content-layout/content-layout.component';
import { content } from './shared/routes/content.routes';

export const routes: Routes = [
    { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
    {
        path: 'auth/login',
        loadComponent: () =>
          import('../app/authentication/login/login.component').then((m) => m.LoginComponent),
      },
    { path: '', component: ContentLayoutComponent, children: content },

    { path: '**', redirectTo: '/error/error404', pathMatch: 'full' },
];
