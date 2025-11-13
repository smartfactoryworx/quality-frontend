import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-handsontable-role-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './role-modal.component.html'
})
export class HandsontableRoleModalComponent {
  @Input() roleOptions: string[] = [];
  @Input() selectedRoles: string[] = [];
  @Output() confirm = new EventEmitter<string[]>();
  @Output() cancel = new EventEmitter<void>();
}
