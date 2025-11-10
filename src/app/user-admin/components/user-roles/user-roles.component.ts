import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, FormControl, Validators } from '@angular/forms';
import { AddRolePopupComponent } from './add-role-popup/add-role-popup.component'; // 👈 child popup component
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { SpkTitleCardComponent } from '../../../../@spk/reusable-ui-elements/spk-cards/spk-title-card/spk-title-card.component';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { SpkAccordionsComponent } from '../../../../@spk/reusable-advancedui/spk-accordions/spk-accordions.component';
import { ShowcodeCardComponent } from '../../../shared/components/showcode-card/showcode-card.component';
import { UserAdminService } from '../../services/user-admin.service';


@Component({
  selector: 'app-user-roles',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule,MatIconModule ,
    MatButtonModule,MatCardModule, SpkAccordionsComponent,ShowcodeCardComponent, MatIconModule],
  templateUrl: './user-roles.component.html',
  styleUrls: ['./user-roles.component.scss'],
})
export class UserRolesComponent implements OnInit {
  roleForm: FormGroup;
  menuRoutes: any[] = [];
  selectedRoutes: string[] = [];
  existingRoles: any[] =[];
  expandedRole: any | null = null;
  
  constructor(
    private fb: FormBuilder,
    private userAdmin: UserAdminService,
    private dialog: MatDialog // 👈 Inject MatDialog
  ) {
    this.roleForm = this.fb.group({
      name: ['', Validators.required],
      title: ['', Validators.required],
      code: ['', Validators.required],
      rootUrl: ['', Validators.required],
      responsibilities: this.fb.array([
        this.fb.control('', Validators.required)
      ])
    });
  }

  ngOnInit(): void {
    this.fetchMenuRoutes();
    this.fetchExistingRoles()
  }

   fetchExistingRoles(): void {
    this.userAdmin.GetUserRoles().subscribe({
      next: (roles: any[]) => {
        this.existingRoles = roles;
        console.log(this.existingRoles, "existingRoles")
      },
      error: (err: any) => {
        console.error('Failed to load roles:', err);
      }
    });
  }

  openAddRolePopup(): void {
    const dialogRef = this.dialog.open(AddRolePopupComponent, {
      width: '130vh',
      height: "95vh",
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'refresh') {
        // refresh roles or any data if needed
      }
    });
  }

  // user-roles.component.ts
openEditRolePopup(role: any): void {
  const dialogRef = this.dialog.open(AddRolePopupComponent, {
    width: '130vh',
    height: '95vh',
    data: {
      isEditMode: true,
      role    // pass the full role object
    }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result === 'refresh') {
      this.fetchExistingRoles();
    }
  });
}


    toggleDetails(role:any) {
    if (this.expandedRole && this.expandedRole._id === role._id) {
      this.expandedRole = null;
    } else {
      this.expandedRole = role;
    }
  }

  fetchMenuRoutes(): void {
    this.userAdmin.GetMenuRoutes().subscribe({
      next: (routes:any) => {
        this.menuRoutes = routes;
      },
      error: (err:any) => {
        console.error('Failed to load menu routes:', err);
      }
    });
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

  onCheckboxChange(event: Event, routeId: string): void {
    const checked = (event.target as HTMLInputElement)?.checked;
    this.toggleRoutePrivilege(routeId, checked);
  }

  toggleRoutePrivilege(routeId: string, checked: boolean): void {
    if (checked && !this.selectedRoutes.includes(routeId)) {
      this.selectedRoutes.push(routeId);
    } else if (!checked) {
      this.selectedRoutes = this.selectedRoutes.filter(id => id !== routeId);
    }
  }

  getAccordionsForRole(role: any) {
    console.log("Roles",role)
  const accordions = [];

  // 1. Privileges
 const routesHtml = role.privileges?.routes?.length
  ? role.privileges.routes
      .map((r: any) => `<div><strong>${r.label}</strong><span class="text-gray-500">: ${r.path}</span></div>`)
      .join('')
  : '<div class="text-muted">No Routes</div>';

const apisHtml = role.privileges?.apis?.length
  ? role.privileges.apis
      .map((a: any) => `<div><strong>${a.label || a.path}</strong><span class="text-gray-500">: ${a.path}</span></div>`)
      .join('')
  : '<div class="text-muted">No APIs</div>';

const privilegeContent = `
  <div class="accordion-body space-y-3">
    <div>
      <h6 class="font-semibold text-sm mb-1 text-indigo-600">Routes:</h6>
      ${routesHtml}
    </div>
    <div class="mt-3">
      <h6 class="font-semibold text-sm mb-1 text-indigo-600">APIs:</h6>
      ${apisHtml}
    </div>
  </div>
`;

  accordions.push({
    headingId: `priv-${role._id}`,
    collapseId: `priv-collapse-${role._id}`,
    title: 'Privileges',
    Customclass: 'accordion-item custom-accordion-primary',
    Custombodyclass: 'hidden',
    content: privilegeContent,
    afterarrow: true,
    buttonClass: 'hs-accordion-toggle accordion-button hs-accordion-active:pb-3 group inline-flex items-center justify-between gap-x-3 w-full font-semibold text-start transition',
  });

  // 2. Exclude URLs
  const excludeContent = `
    <div class="accordion-body">
      ${role.excludeUrl?.length ? role.excludeUrl.join('<br>') : 'No Exclude URLs'}
    </div>
  `;
  accordions.push({
    headingId: `excl-${role._id}`,
    collapseId: `excl-collapse-${role._id}`,
    title: 'Exclude URLs',
    Customclass: 'accordion-item custom-accordion-secondary',
    Custombodyclass: 'hidden',
    content: excludeContent,
    afterarrow: true,
    buttonClass: 'hs-accordion-toggle accordion-button hs-accordion-active:pb-3 group inline-flex items-center justify-between gap-x-3 w-full font-semibold text-start transition',
  });

    // 3. Special Privileges
  const special = role.specialPrevelage;
  const specialContent = `
    <div class="accordion-body">
      ${
        special
          ? Object.entries(special)
              .map(([k, v]) => `<strong>${k}</strong>: ${v}`)
              .join('<br>')
          : 'No special privileges'
      }
    </div>
  `;
  accordions.push({
    headingId: `spec-${role._id}`,
    collapseId: `spec-collapse-${role._id}`,
    title: 'Special Privileges',
    Customclass: 'accordion-item custom-accordion-secondary',
    Custombodyclass: 'hidden',
    content: specialContent,
    afterarrow: true,
    buttonClass: 'hs-accordion-toggle accordion-button hs-accordion-active:pb-3 group inline-flex items-center justify-between gap-x-3 w-full font-semibold text-start transition',
  });

  return accordions;
}


  submitForm(): void {
    if (this.roleForm.valid) {
      const formValue = {
        ...this.roleForm.value,
        selectedRoutes: this.selectedRoutes
      };
      console.log('Submitting form:', formValue);
    } else {
      console.log('Form is invalid');
    }
  }
}
