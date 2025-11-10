import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';


export const content: Routes = [

  {
    path: '',
    children: [
      
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
      },

     
    ],
  },
];
@NgModule({
    // imports: [RouterModule.forRoot()],
    exports: [RouterModule]
})
export class SaredRoutingModule { }
