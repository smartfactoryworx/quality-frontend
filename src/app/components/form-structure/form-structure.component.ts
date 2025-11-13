import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  DragDropModule,
  CdkDragDrop,
  moveItemInArray
} from '@angular/cdk/drag-drop';
import { HandsontableComponent } from '../form-structure/handsontable/handsontable.component';


type FieldType = 'text' | 'dropdown' | 'checkbox';

@Component({
  selector: 'app-form-structure',
  standalone: true,
  imports: [CommonModule, DragDropModule, HandsontableComponent],
  templateUrl: './form-structure.component.html',
  styleUrls: ['./form-structure.component.scss']
})
export class FormStructureComponent {
  // Define field templates with explicit index signature
  availableFields = [
    { type: 'text', label: 'Text Field' },
    { type: 'dropdown', label: 'Dropdown', options: ['Option 1', 'Option 2'] },
    { type: 'checkbox', label: 'Checkbox' },
      { type: 'handsontable', label: 'Spreadsheet' }   

  ];

  droppedFields: any[] = [];

  /** Add a field by type (called from header buttons) */
  onDrop(event: CdkDragDrop<any[]>) {
    // If dropped inside the canvas from palette
    if (event.previousContainer.id === 'fieldPalette' && event.container.id === 'canvasZone') {
      const field = event.item.data;
      this.droppedFields.push({ ...field });
    }
    // If reordering inside the canvas
    else if (event.previousContainer === event.container) {
      moveItemInArray(this.droppedFields, event.previousIndex, event.currentIndex);
    }
  }

  clearCanvas() {
    this.droppedFields = [];
  }

  deleteField(index: number) {
    this.droppedFields.splice(index, 1);
  }
}
