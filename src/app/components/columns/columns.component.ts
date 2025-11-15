import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { HandsontableComponent } from '../form-structure/handsontable/handsontable.component';

@Component({
  selector: 'app-columns',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, HandsontableComponent],
  templateUrl: './columns.component.html',
  styleUrls: ['./columns.component.scss']
})
export class ColumnsComponent {
  @Input() columnsField!: any;
  @Input() fieldIndex!: number;
  @Input() connectedTargets: string[] = [];

  @Output() dropOnColumn = new EventEmitter<{ fieldIndex: number; columnIndex: number; event: CdkDragDrop<any[]> }>();
  @Output() deleteColumnField = new EventEmitter<{ fieldIndex: number; columnIndex: number; nestedIndex: number }>();
  @Output() addSpreadsheet = new EventEmitter<{ fieldIndex: number; columnIndex: number }>();

  // Always allow drops coming from the palette (and from canvas if you also want that)
  private baseAcceptIds = ['fieldPalette', 'canvasZone'];

  getColumnListId(column: any): string {
    return `col-${this.columnsField.id}-${column.id}`;
  }

  /** Build the final connectedTo list for a specific column (include palette + canvas + all others, minus myself) */
  connectedTargetsFor(columnId: string): string[] {
    const s = new Set<string>([...this.baseAcceptIds, ...this.connectedTargets]);
    s.delete(columnId);
    return Array.from(s);
  }

  onDropOnColumn(columnIndex: number, event: CdkDragDrop<any[]>) {
    this.dropOnColumn.emit({ fieldIndex: this.fieldIndex, columnIndex, event });
  }

  onDeleteNestedField(columnIndex: number, nestedIndex: number) {
    this.deleteColumnField.emit({ fieldIndex: this.fieldIndex, columnIndex, nestedIndex });
  }

  onAddSpreadsheet(columnIndex: number): void {
    this.addSpreadsheet.emit({ fieldIndex: this.fieldIndex, columnIndex });
  }
}
