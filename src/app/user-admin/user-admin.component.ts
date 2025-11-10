import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-admin-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h2>User Admin Module</h2>
    <p>Welcome Superuser!</p>
  `,
})
export class UserAdminHomeComponent {}
