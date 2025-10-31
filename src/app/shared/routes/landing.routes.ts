import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

export const landing: Routes = [

  { path: '', children: [
   
  ]}

  
];
@NgModule({
    // imports: [RouterModule.forRoot(admin)],
    exports: [RouterModule]
})
export class landingpageRoutingModule { }
