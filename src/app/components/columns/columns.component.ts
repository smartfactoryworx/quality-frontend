import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  DragDropModule,
  CdkDragDrop,
} from '@angular/cdk/drag-drop';
import { HandsontableComponent } from '../form-structure/handsontable/handsontable.component';

@Component({
  selector: 'app-columns',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, HandsontableComponent],
  templateUrl: './columns.component.html',
  styleUrls: ['./columns.component.scss'],
})
export class ColumnsComponent {
  @Input() columnsField: any;
  @Input() fieldIndex!: number;
  @Input() connectedTargets: string[] = [];
  @Input() saveVersion = 0;

  /* FIX: emit fieldIndex */
  @Output() dropOnColumn = new EventEmitter<{
    fieldIndex: number;
    columnIndex: number;
    event: CdkDragDrop<any[]>;
  }>();

  @Output() deleteColumnField = new EventEmitter<{
    fieldIndex: number;
    columnIndex: number;
    nestedIndex: number;
  }>();

  @Output() addSpreadsheet = new EventEmitter<{
    fieldIndex: number;
    columnIndex: number;
  }>();

  @Output() spreadsheetSubmit = new EventEmitter<{
    fieldIndex: number;
    columnIndex: number;
    fieldId: string;
    payload: any;
    version: number;
  }>();

  getColumnListId(column: any) {
    return `col-${this.columnsField.id}-${column.id}`;
  }

  connectedTargetsFor(id: string): string[] {
    return this.connectedTargets.filter((x) => x !== id);
  }

  onDropOnColumn(columnIndex: number, event: CdkDragDrop<any[]>) {
    this.dropOnColumn.emit({
      fieldIndex: this.fieldIndex,
      columnIndex,
      event
    });
  }

  onDeleteNestedField(columnIndex: number, nestedIndex: number) {
    this.deleteColumnField.emit({
      fieldIndex: this.fieldIndex,
      columnIndex,
      nestedIndex
    });
  }

  onAddSpreadsheet(columnIndex: number) {
    this.addSpreadsheet.emit({
      fieldIndex: this.fieldIndex,
      columnIndex
    });
  }

  emitSpreadsheetSubmit(columnIndex: number, fieldId: string, event: any) {
    this.spreadsheetSubmit.emit({
      fieldIndex: this.fieldIndex,
      columnIndex,
      fieldId,
      payload: event.payload,
      version: event.version
    });
  }
}
