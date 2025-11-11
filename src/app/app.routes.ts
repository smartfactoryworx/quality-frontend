import { Routes } from '@angular/router';
import { ContentLayoutComponent } from './shared/layouts/content-layout/content-layout.component';
import { content } from './shared/routes/content.routes';
import { SuperuserGuard } from './shared/guards/superuser.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },

  {
    path: 'auth/login',
    loadComponent: () =>
      import('../app/authentication/login/login.component').then(
        (m) => m.LoginComponent
      ),
  },

  // ⬇️ All main routes that use your layout (sidebar + topbar)
  {
    path: '',
    component: ContentLayoutComponent,
    children: [
      ...content,

      {
        path: 'user-admin',
        canActivate: [SuperuserGuard],
        loadChildren: () =>
          import('./user-admin/user-admin.routes').then(
            (m) => m.userAdminRoutes
          ),
      },

      {
        path: 'home',
        loadComponent: () =>
          import('../app/components/home/home.component').then(
            (m) => m.HomeComponent
          ),
      },
      {
        path: 'create-form',
        loadComponent:()=>
          import('../app/components/form-structure/form-structure.component').then(
            (m)=>m.FormStructureComponent
          ),
      },
    ],
  },
{
        path: 'hierarchy',
        loadChildren: () =>
          import('./components/hierarchy/hierarchy.routes').then(
            (m) => m.hierarchyRoutes
          ),
      },
 // { path: '**', redirectTo: '/error/error404', pathMatch: 'full' },
];
