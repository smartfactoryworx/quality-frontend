import { Routes } from '@angular/router';
import { UserAdminHomeComponent } from './user-admin.component';

export const userAdminRoutes: Routes = [
  {
    path: '',
    component: UserAdminHomeComponent,
    children: [
      {
        path: 'users',
        loadComponent: () =>
          import('./components/users/users.component').then(m => m.UsersComponent),
      },
      {
        path: 'user-roles',
        loadComponent: () =>
          import('./components/user-roles/user-roles.component').then(m => m.UserRolesComponent),
      },
      {
        path: 'menu-routes',
        loadComponent: () =>
          import('./components/menu-routes/menu-routes.component').then(m => m.MenuRoutesComponent),
      },
      {
        path: 'org-chart',
        loadComponent: () =>
          import('./components/org-chart/org-chart.component').then(m => m.OrgChartComponent),
      },
      {
        path: '',
        redirectTo: 'users',
        pathMatch: 'full',
      },
    ],
  },
];
