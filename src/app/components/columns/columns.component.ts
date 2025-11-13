import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop, CdkDragEnter, CdkDragExit } from '@angular/cdk/drag-drop';

type SimpleFieldType = 'text' | 'dropdown' | 'checkbox';

interface SimpleField {
  id: string;
  type: SimpleFieldType;
  label: string;
  options?: string[];
}

interface Column {
  id: string;
  title: string;
  fields: SimpleField[];
}

interface ColumnsField {
  id: string;
  type: 'columns';
  label: string;
  columns: Column[];
}

@Component({
  selector: 'app-columns',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './columns.component.html',
  styleUrls: ['./columns.component.scss']
})
export class ColumnsComponent {
  @Input() columnsField!: ColumnsField;
  @Input() fieldIndex!: number;
  @Input() connectedTargets: string[] = [];

  @Output() dropOnColumn = new EventEmitter<{
    fieldIndex: number;
    columnIndex: number;
    event: CdkDragDrop<SimpleField[]>;
  }>();

  @Output() deleteColumnField = new EventEmitter<{
    fieldIndex: number;
    columnIndex: number;
    nestedIndex: number;
  }>();

  @Output() columnDragEntered = new EventEmitter<{ fieldIndex: number; columnIndex: number }>();
  @Output() columnDragExited = new EventEmitter<{ fieldIndex: number; columnIndex: number }>();

  getColumnListId(column: Column): string {
    return `col-${this.columnsField.id}-${column.id}`;
  }

  getConnectedTargets(columnId: string): string[] {
    return ['fieldPalette', ...this.connectedTargets.filter((id) => id !== columnId)];
  }

  onDropOnColumn(columnIndex: number, event: CdkDragDrop<SimpleField[]>) {
    this.dropOnColumn.emit({ fieldIndex: this.fieldIndex, columnIndex, event });
  }

  onDeleteNestedField(columnIndex: number, nestedIndex: number) {
    this.deleteColumnField.emit({
      fieldIndex: this.fieldIndex,
      columnIndex,
      nestedIndex
    });
  }

  onDragEntered(columnIndex: number, event: CdkDragEnter<any>) {
    if (event.item.dropContainer.id === 'fieldPalette') {
      this.columnDragEntered.emit({ fieldIndex: this.fieldIndex, columnIndex });
    }
  }

  onDragExited(columnIndex: number, event: CdkDragExit<any>) {
    this.columnDragExited.emit({ fieldIndex: this.fieldIndex, columnIndex });
  }
}
