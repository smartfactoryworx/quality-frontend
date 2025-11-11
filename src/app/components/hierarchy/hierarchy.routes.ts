// hierarchy.routes.ts
import { Routes } from '@angular/router';
import { HierarchyComponent } from './hierarchy.component';
import { ContentLayoutComponent } from '../../shared/layouts/content-layout/content-layout.component';
import { HeaderOnlyLayoutComponent } from '../../shared/layouts/header-only-layout/header-only-layout.component';

export const hierarchyRoutes: Routes = [
  {
    path: '',
    component: HeaderOnlyLayoutComponent,
    children: [
      // company → country → state → plant → category
      { path: '', component: HierarchyComponent },
      { path: ':company', component: HierarchyComponent },
      { path: ':company/:country', component: HierarchyComponent },
      { path: ':company/:country/:state', component: HierarchyComponent },
      { path: ':company/:country/:state/:plant', component: HierarchyComponent },
      { path: ':company/:country/:state/:plant/:category', component: HierarchyComponent },

      // ✅ With lines: category → line → formgroup → home
      {
        path: ':company/:country/:state/:plant/:category/:line',
        component: HierarchyComponent,
      },
      {
        path: ':company/:country/:state/:plant/:category/:line/:formgroup',
        component: ContentLayoutComponent,
        data: { hideHeader: true },
        children: [
          {
            path: 'home',
            loadComponent: () =>
              import('../home/home.component').then((m) => m.HomeComponent),
          },
          {
            path: 'create-form',
            loadComponent: () =>
              import('../form-structure/form-structure.component').then((m) => m.FormStructureComponent),
          },
          { path: '', redirectTo: 'home', pathMatch: 'full' },
        ],
      },

      // ✅ Without lines: category → formgroup → home
      {
        path: ':company/:country/:state/:plant/:category/:formgroup',
        component: ContentLayoutComponent,
        data: { hideHeader: true },
        children: [
          {
            path: 'home',
            loadComponent: () =>
              import('../home/home.component').then((m) => m.HomeComponent),
          },
          { path: '', redirectTo: 'home', pathMatch: 'full' },
        ],
      },
    ],
  },
];
