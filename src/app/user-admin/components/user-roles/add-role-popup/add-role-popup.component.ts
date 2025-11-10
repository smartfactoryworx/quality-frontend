import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators, FormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { MatFormField, MatFormFieldModule, MatLabel } from '@angular/material/form-field';
import { MatOption } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { UserAdminService } from '../../../services/user-admin.service';

@Component({
  selector: 'app-add-role-popup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule,MatOption, MatLabel,  MatFormFieldModule,
  MatSelectModule,], // ✅ IMPORT THESE
  templateUrl: './add-role-popup.component.html',
  styleUrls: ['./add-role-popup.component.scss']
})
export class AddRolePopupComponent implements OnInit {
  roleForm: FormGroup;
  menuRoutes: any[] = [];
  selectedRoutes: string[] = [];
  existingRoles: any[] = [];
selectAllChecked = false;



  constructor(
    private fb: FormBuilder,
    private http: HttpClient,    private userAdmin: UserAdminService,
        @Inject(MAT_DIALOG_DATA) public data:any,

    private dialogRef: MatDialogRef<AddRolePopupComponent>
  ) {
    this.roleForm = this.fb.group({
      name: ['', Validators.required],
      title: ['', Validators.required],
      code: ['', Validators.required],
      rootUrl: ['', Validators.required],
      responsibilities: this.fb.array([
        this.fb.control('', Validators.required)
      ]),
        excludeUrl: [[]], // for multi-select dropdown
     specialPrevelage: this.fb.array([]) 
    });
  }

  ngOnInit(): void {
    this.loadRoles();
    this.loadMenuRoutes();

    if (this.data, this.data?.isEditMode && this.data?.role) {
      const r = this.data.role;

      // 1. Populate simple fields
      this.roleForm.patchValue({
        name: r.name,
        title: r.title,
        code: r.code,
        rootUrl: r.rootUrl,
        excludeUrl: r.excludeUrl || []
      });

      // 2. Responsibilities
      this.responsibilities.clear();
      (r.responsibilities || []).forEach((resp: string) =>
        this.responsibilities.push(this.fb.control(resp, Validators.required))
      );

      // 3. Special privileges (object → FormArray)
      this.specialPrevelage.clear();
      Object.entries(r.specialPrevelage || {}).forEach(([key, val]) => {
        this.specialPrevelage.push(
          this.fb.group({ key: [key], value: [val] })
        );
      });

      // 4. Routes checkboxes
      this.selectedRoutes = (r.privileges.routes || []).map((x: any) => x._id);
    
  }
  }

  get specialPrevelage(): FormArray {
  return this.roleForm.get('specialPrevelage') as FormArray;
}

addSpecialPrivilege(): void {
  this.specialPrevelage.push(
    this.fb.group({
      key: ['', Validators.required],
      value: ['', Validators.required]
    })
  );
}

removeSpecialPrivilege(index: number): void {
  this.specialPrevelage.removeAt(index);
}
get specialPrivilegesGroups(): FormGroup[] {
  return this.specialPrevelage.controls as FormGroup[];
}

toggleSelectAll() {
  this.selectAllChecked = !this.selectAllChecked;
  
  if (this.selectAllChecked) {
    // Select all routes
    this.selectedRoutes = this.menuRoutes.map(route => route._id);
  } else {
    // Deselect all routes
    this.selectedRoutes = [];
  }
}
  get responsibilities(): FormArray {
    return this.roleForm.get('responsibilities') as FormArray;
  }

  get responsibilityControls(): FormControl[] {
    return this.responsibilities.controls as FormControl[];
  }

  addResponsibility(): void {
    this.responsibilities.push(this.fb.control('', Validators.required));
  }

  removeResponsibility(index: number): void {
    this.responsibilities.removeAt(index);
  }

  loadRoles(): void {
    this.userAdmin.GetUserRoles().subscribe({
      next: roles => this.existingRoles = roles,
      error: err => console.error('Error loading roles:', err)
    });
  }

  loadMenuRoutes(): void {
    this.userAdmin.GetMenuRoutes().subscribe({
      next: routes => this.menuRoutes = routes,
      error: err => console.error('Error loading routes:', err)
    });
  }

  onCheckboxChange(event: Event, routeId: string): void {
    const checked = (event.target as HTMLInputElement)?.checked;
    if (checked && !this.selectedRoutes.includes(routeId)) {
      this.selectedRoutes.push(routeId);
    } else if (!checked) {
      this.selectedRoutes = this.selectedRoutes.filter(id => id !== routeId);
    }
  }

submitForm(): void {
  if (!this.roleForm.valid) return;

  const fv = this.roleForm.value;
  const specialObj: Record<string, any> = {};
  fv.specialPrevelage.forEach((g: any) => (specialObj[g.key] = g.value));

  const payload: any = {
    name: fv.name,
    title: fv.title,
    code: fv.code,
    rootUrl: fv.rootUrl,
    responsibilities: fv.responsibilities,
    excludeUrl: fv.excludeUrl,
    specialPrevelage: specialObj,
    privileges: { routes: this.selectedRoutes }
  };

  if (this.data, this.data?.isEditMode && this.data?.role) {
    // EDIT
    this.userAdmin.UpdateRole(this.data.role._id, payload)
      .subscribe({
        next: (res) => {
           alert(
            `Role updated!`
          );
          this.dialogRef.close('refresh')
        },
        error: err => console.error('Error updating role:', err)
      });
  } else {
    // CREATE
    this.userAdmin.PostUserRoles(payload)
      .subscribe({
        next: () => 
          {  alert(
            `Role created!`
          );
                this.dialogRef.close('refresh')
},
        error: err => {
          console.error('Error creating role:', err);
          alert(`Creation failed: ${err.message||err}`);
        } 
      });
  }
}




  close(): void {
    this.dialogRef.close();
  }
}
