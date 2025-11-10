import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { CreateNewUserComponent } from './create-new-user/create-new-user.component';
import { MatCardModule } from '@angular/material/card';
import { SpkAccordionsComponent } from '../../../../@spk/reusable-advancedui/spk-accordions/spk-accordions.component';
import { ShowcodeCardComponent } from '../../../shared/components/showcode-card/showcode-card.component';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { UserAdminService } from '../../services/user-admin.service';

@Component({
  selector: 'app-users',
  standalone: true,
imports: [CommonModule, MatDialogModule, MatCardModule,  SpkAccordionsComponent,ShowcodeCardComponent,
   MatSlideToggleModule, MatIconModule ],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit {
  private http = inject(HttpClient);
  private dialog = inject(MatDialog);

  users: any[] = [];
  selectedUserId!: string;
  showEditPopup!: boolean;
confirmingUserId: string | null = null;
confirmAction: () => void = () => {};


  constructor(
        private userAdmin: UserAdminService,
    

      ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers() {
    this.userAdmin.GetUsers().subscribe({
      next: res => this.users = res,
      
      error: err => console.error('Error fetching users:', err)
    });
  }



  openCreateUserDialog() {
    const dialogRef = this.dialog.open(CreateNewUserComponent, {
      width: '1200px',
      height:'700px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'refresh') {
        this.loadUsers();
      }
    });
  }

  openEditUser(user: any) {
    console.log(user, "edituser")
  this.dialog.open(CreateNewUserComponent, {
    data: {
      isEditMode: true,
      userId: user._id
    },
      width: '1200px',
      height:'700px'
      });
}

confirmToggle(user: any) {
  this.confirmingUserId = user._id;
  const newStatus = !user.isActive;

  this.confirmAction = () => {
    const apiCall = newStatus
      ? this.userAdmin.activateUser(user._id)
      : this.userAdmin.deactivateUser(user._id);

    apiCall.subscribe({
      next: () => {
        user.isActive = newStatus;
        this.confirmingUserId = null;
      },
      error: err => {
        console.error('Failed to toggle user:', err);
        this.confirmingUserId = null;
      }
    });
  };
}



  getAccordionsForUser(user: any): any[] {
  const accordions = [];

  // 1. Exclude URLs
  const excludeContent = `
    <div class="accordion-body">
      ${user.excludeUrl?.length
        ? user.excludeUrl.map((url: string) => `<div>${url}</div>`).join('')
        : 'No URLs excluded'}
    </div>
  `;

  accordions.push({
    headingId: `excl-${user._id}`,
    collapseId: `excl-collapse-${user._id}`,
    title: 'Exclude URLs',
    Customclass: 'accordion-item custom-accordion-secondary',
    Custombodyclass: 'hidden',
    content: excludeContent,
    afterarrow: true,
    buttonClass:
      'hs-accordion-toggle accordion-button hs-accordion-active:pb-3 group inline-flex items-center justify-between gap-x-3 w-full font-semibold text-start transition',
  });

  // 2. Assigned Lines & Roles
  const linesHtml = user.lines?.length
    ? user.lines
        .map(
          (line: any, index: number) => `
        <div class="mb-3 p-2 rounded border border-gray-200 bg-gray-50">
          <p><strong>Line ${index + 1}:</strong> ${line.line_name}</p>
          <p><strong>Roles:</strong> ${
            line.roles?.map((r: any) => r?.name || r).join(', ') || 'N/A'
          }</p>
          <p><strong>Machines:</strong> ${line.machines?.length || 0}</p>
        </div>
      `
        )
        .join('')
    : 'No lines assigned';

  accordions.push({
    headingId: `lines-${user._id}`,
    collapseId: `lines-collapse-${user._id}`,
    title: 'Assigned Lines & Roles',
    Customclass: 'accordion-item custom-accordion-primary',
    Custombodyclass: 'hidden',
    content: `<div class="accordion-body">${linesHtml}</div>`,
    afterarrow: true,
    buttonClass:
      'hs-accordion-toggle accordion-button hs-accordion-active:pb-3 group inline-flex items-center justify-between gap-x-3 w-full font-semibold text-start transition',
  });

  return accordions;
}


}
