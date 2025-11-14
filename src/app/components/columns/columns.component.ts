import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { HandsontableComponent } from '../form-structure/handsontable/handsontable.component';

@Component({
  selector: 'app-columns',
  standalone: true,
  imports: [CommonModule, DragDropModule, HandsontableComponent],
  templateUrl: './columns.component.html',
  styleUrls: ['./columns.component.scss']
})
export class ColumnsComponent {
  @Input() columnsField!: any;
  @Input() fieldIndex!: number;
  @Input() connectedTargets: string[] = [];

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

  @Output() addSpreadsheet = new EventEmitter<{ fieldIndex: number; columnIndex: number }>();

  getColumnListId(column: any): string {
    return `col-${this.columnsField.id}-${column.id}`;
  }

  getConnectedTargets(columnId: string): string[] {
    return this.connectedTargets.filter((id) => id !== columnId);
  }

  onDropOnColumn(columnIndex: number, event: CdkDragDrop<any[]>) {
    this.dropOnColumn.emit({ fieldIndex: this.fieldIndex, columnIndex, event });
  }

  onDeleteNestedField(columnIndex: number, nestedIndex: number) {
    this.deleteColumnField.emit({
      fieldIndex: this.fieldIndex,
      columnIndex,
      nestedIndex
    });
  }

  onAddSpreadsheet(columnIndex: number): void {
    this.addSpreadsheet.emit({ fieldIndex: this.fieldIndex, columnIndex });
  }
}
