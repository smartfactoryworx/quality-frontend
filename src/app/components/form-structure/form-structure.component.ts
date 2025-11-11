import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  DragDropModule,
  CdkDragDrop,
  moveItemInArray
} from '@angular/cdk/drag-drop';

type FieldType = 'text' | 'dropdown' | 'checkbox';

@Component({
  selector: 'app-form-structure',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './form-structure.component.html',
  styleUrls: ['./form-structure.component.scss']
})
export class FormStructureComponent {
  // Define field templates with explicit index signature
  fieldTemplates: Record<FieldType, any> = {
    text: { type: 'text', label: 'Text Field' },
    dropdown: { type: 'dropdown', label: 'Dropdown', options: ['Option 1', 'Option 2'] },
    checkbox: { type: 'checkbox', label: 'Checkbox' }
  };

  droppedFields: any[] = [];

  /** Add a field by type (called from header buttons) */
  addField(type: FieldType) {
    const template = this.fieldTemplates[type];
    if (template) {
      this.droppedFields.push({ ...template });
    }
  }

  /** Clear the canvas area */
  clearCanvas() {
    this.droppedFields = [];
  }

  onDrop(event: CdkDragDrop<any[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(this.droppedFields, event.previousIndex, event.currentIndex);
    }
  }
}
