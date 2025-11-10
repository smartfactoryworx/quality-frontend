import { Component, Inject, inject, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray, FormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule, MatLabel } from '@angular/material/form-field';
import { MatOption, MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { OrgChartComponent } from '../../org-chart/org-chart.component';
import { UserAdminService } from '../../../services/user-admin.service';
    
@Component({
  selector: 'app-create-new-user',
  standalone: true,
  imports: [
  CommonModule,
  ReactiveFormsModule,
  MatDialogModule,
  MatSlideToggleModule,
  MatFormFieldModule,
  MatSelectModule,
  MatOptionModule,
  MatTabsModule,
  MatCheckboxModule, FormsModule
],

  templateUrl: './create-new-user.component.html',
  styleUrls: ['./create-new-user.component.scss']
})
export class CreateNewUserComponent implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private dialogRef = inject(MatDialogRef<CreateNewUserComponent>);
  menuRoutes: any[] = [];
selectedTab:number = 0;

  userForm: FormGroup;
  LinesData: any;
  availableRoles: any;
  @Input() isEditMode = false;
  @Input() userId: string | null = null;
  isEdit: any;


  constructor(private userAdmin: UserAdminService,  @Inject(MAT_DIALOG_DATA) public data: any
) {
    this.userForm = this.fb.group({
  name: ['', Validators.required],
  fullName: ['', Validators.required],
  empCode: ['', Validators.required],
  password: ['', Validators.required],
  phone: ['', Validators.required],
  email: ['', [Validators.required, Validators.email]],
  isActive: [true],
  isOTPallowed: [false],
  excludeUrl: [[]],
  specialPrevelage: this.fb.array([]),
  lines: this.fb.array([])  // Will be filled via org chart selection
});

  }

  ngOnInit(): void {
    this.GetLinesData(); // fetch company structure
    this.fetchRoles(); 
    this.fetchMenuRoutes();
    this.isEdit = this.data.isEditMode
    console.log(this.data,this.data.isEditMode, this.data.userId, "userid")
    
  }


  GetLinesData() {
    this.LinesData=[]
     this.userAdmin.GetCompanyApi().subscribe({
      next: (data: any) => {
      this.LinesData = this.userAdmin.GetAllLinesList(data);
      console.log("Linesdata", this.LinesData )
            this.onLinesSelected(this.LinesData ); // auto-select all for now

             if (this.data && this.data?.isEditMode && this.data?.userId) {
      console.log("if")
      this.loadUserData(this.data.userId);
    }
      },
      error: (err: any) => {
        console.error('Failed to load menu routes:', err);
      }
    });
  }

  switchTab(index: number) {
  this.selectedTab = index;
}


 onLinesSelected(lines: any[]) {
  const lineFormArray: any = this.fb.array([]);

  for (const line of lines) {
    lineFormArray.push(this.fb.group({
      _id: [line.lineid], // or line._id if you want the actual Mongo ID
      line_name: [line.linename], // ✅ corrected here
      selected: [false],
      roles: [line.roles || []],
      machines: this.fb.array(
        (line.equipments || []).map((m: any) =>
          this.fb.group({
            _id: [m.machine_id],
            name: [m.machine_display_name],
            selected: [true]
          })
        )
      )
    }));
  }

  this.userForm.setControl('lines', lineFormArray);
}


getRoleLabel(roleId: string): string {
  const r = this.availableRoles.find((x:any) => x._id === roleId);
  return r ? r.name : roleId;
}

getMachineLabel(lineId: string, machineId: string): string {
  // find that line in your LinesData
  const line = this.LinesData.find((l:any) => l.lineid === lineId);
  if (!line) return machineId;
  // then find the machine
  const m = line.equipments.find((eq:any) => eq.machine_id === machineId);
  return m ? m.machine_display_name : machineId;
}

loadUserData(id: string) {
  console.log('▶️ loadUserData()', id, 'LinesData=', this.LinesData);

  this.userAdmin.getUserById(id).subscribe((user: any) => {
    console.log('▶️ got user from API:', user);

    // 1) Patch only the scalar controls (no spreading `...user`)
    this.userForm.patchValue({
      name:         user.name,
      fullName:     user.fullName,
      empCode:      user.empCode,
      // if you don't want to show the hashed password back on edit, clear it:
      password:     '',
      phone:        user.phone,
      email:        user.email,
      isActive:     user.isActive,
      isOTPallowed: user.isOTPallowed ?? false,
      excludeUrl:   user.excludeUrl || []
    });

    // 2) Rebuild specialPrevelage array
    const specialFA = this.userForm.get('specialPrevelage') as FormArray;
    specialFA.clear();
    ;(user.specialPrevelageList || []).forEach((priv: any) => {
      specialFA.push(
        this.fb.group({
          key:   priv.key,
          value: priv.value
        })
      );
    });

    // 3) Rebuild lines ⇒ FormArray of FormGroup(line + machines + role)
    const lineFGs = (user.lines || []).map((line: any) => {
      // normalize line ID
      const lineId = line._id?.$oid || line._id;
      // find the metadata for that line
      const metaLine = this.LinesData.find((l: any) => String(l.lineid) === String(lineId))!;
      console.log('↳ matchedLine', metaLine);

      // build machines FormArray (tick only the ones user has)
      const savedMachineIds = (line.machines || [])
        .map((m: any) => m?.$oid || m)
        .map(String);
      const machinesFA = this.fb.array(
        (metaLine.equipments || []).map((eq: any) => this.fb.group({
          _id:      eq.machine_id,
          name:     eq.machine_display_name,
          selected: savedMachineIds.includes(String(eq.machine_id))
        }))
      );

      // pick the first saved role for this line
      const savedRoleId = (line.roles || [])[0]?.$oid || line.roles[0] || null;
      console.log('↳ savedRoleId', savedRoleId);

      return this.fb.group({
        _id:       lineId,
        line_name: metaLine.linename,
        selected:  true,          // keep the line itself checked
        roles:     [ savedRoleId ],  // will preselect in your <mat-select>
        machines:  machinesFA
      });
    });

    // 4) overwrite the lines FormArray with our new groups
    this.userForm.setControl('lines', this.fb.array(lineFGs));

    console.log('✅ form.value after load:', this.userForm.value);
  });
}

getMachines(lineIndex: number): FormArray {
  const lineGroup = this.linesArray.at(lineIndex);
  return (lineGroup?.get('machines') as FormArray) || this.fb.array([]);
}


get linesArray(): FormArray {
  //console.log(this.userForm.get('lines') as FormArray, "lines")
  return this.userForm.get('lines') as FormArray;
}

  fetchMenuRoutes(): void {
    this.userAdmin.GetMenuRoutes().subscribe({
      next: (routes: any) => {
        this.menuRoutes = routes;
      },
      error: (err: any) => {
        console.error('Failed to load menu routes:', err);
      }
    });
  }
fetchRoles(): void {
  this.userAdmin.GetUserRoles().subscribe({
    next: (roles: any) => {
      this.availableRoles = roles;
    },
    error: (err) => console.error('Failed to fetch roles:', err)
  });
}
  get specialPrevelage() {
    return this.userForm.get('specialPrevelage') as FormArray;
  }

  addSpecialPriv() {
    this.specialPrevelage.push(this.fb.group({ key: '', value: '' }));
  }

  removeSpecialPriv(index: number) {
    this.specialPrevelage.removeAt(index);
  }

  submitForm() {
  if (this.userForm.valid) {
    const formValue = this.userForm.value;

    // ✅ Convert specialPrevelage FormArray to object
    const specialPrevelageObj: Record<string, boolean> = {};
    (formValue.specialPrevelage || []).forEach((item: any) => {
      specialPrevelageObj[item.key] = item.value === 'true' || item.value === true;
    });

    const transformedLines = formValue.lines
      .filter((line: any) => line.selected)
      .map((line: any) => {
        return {
          _id: line._id,
          roles: [line.roles],
          machines: (line.machines || [])
            .filter((machine: any) => machine.selected)
            .map((machine: any) => machine._id)
        };
      });

    const payload = {
      ...formValue,
      specialPrevelage: specialPrevelageObj, // ✅ use the transformed object
      lines: transformedLines
    };

    //console.log(this.data.isEditMode, this.data.userId, "this.userId");

    if (this.data && this.data?.isEditMode && this.data?.userId) {
      this.userAdmin.updateUser(this.data.userId, payload).subscribe({
        next: () => {
          alert('User updated successfully');
          this.dialogRef.close('refresh');
        },
        error: err => console.error('Error updating user:', err)
      });
    } else {
      this.userAdmin.PostUsers(payload).subscribe({
        next: () => {
          alert('User created successfully');
          this.dialogRef.close('refresh');
        },
        error: err => console.error('Error creating user:', err)
      });
    }
  }
}

  close() {
    this.dialogRef.close();
  }
}
