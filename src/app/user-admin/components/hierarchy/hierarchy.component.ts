import { Component, inject } from '@angular/core';
import { OrgChartComponent } from '../org-chart/org-chart.component';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { CreateNodeFormComponent } from './create-node-form/create-node-form.component';
import { MatDialog } from '@angular/material/dialog';
import { UserAdminService } from '../../services/user-admin.service';

@Component({
  selector: 'app-hierarchy',
  imports: [OrgChartComponent,CommonModule,CreateNodeFormComponent,
    ReactiveFormsModule,],
  templateUrl: './hierarchy.component.html',
  styleUrl: './hierarchy.component.scss'
})
export class HierarchyComponent {
  LinesData: any[] = [];
    private dialog = inject(MatDialog);
  
  
    constructor(private userAdmin: UserAdminService, ) { }
  
    ngOnInit(): void {
      this.GetLinesData(); // fetch company structure
      
    }
  GetLinesData() {
     this.userAdmin.GetCompanyApi().subscribe({
      next: (data: any) => {
      this.LinesData =  data//this.userAdmin.GetAllLinesList(data);
      console.log("Linesdata", this.LinesData )

      },
      error: (err: any) => {
        console.error('Failed to load menu routes:', err);
      }
    });
  }


    openAddNodeModal(nodeData: any) {
      console.log(nodeData,"nodeDataaa")
    const dialogRef = this.dialog.open(CreateNodeFormComponent, {
  width: '500px',
  data: {
    nodeData: nodeData,
    linesData: this.LinesData
  }
});


    dialogRef.afterClosed().subscribe((result: any) => {
  if (result) {
    console.log('New node data submitted:', result);
    this.GetLinesData(); // ✅ Reloads the org chart with latest data
  }
});


  }


}
