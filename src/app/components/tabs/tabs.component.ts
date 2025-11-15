import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { HandsontableComponent } from '../form-structure/handsontable/handsontable.component';
import { ColumnsComponent } from '../columns/columns.component';
import { CdkDrag } from '@angular/cdk/drag-drop';

type SimpleFieldType = 'text' | 'dropdown' | 'checkbox';
type AllowedNested =
  | { id: string; type: SimpleFieldType; label: string; options?: string[]; value?: any; key?: string }
  | { id: string; type: 'handsontable'; label: string };

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [CommonModule, DragDropModule, FormsModule, HandsontableComponent, ColumnsComponent],
  templateUrl: './tabs.component.html',
  styleUrls: ['./tabs.component.scss']
})
export class TabsComponent {

  @Input() tabsField!: any;
  @Input() fieldIndex!: number;
  @Input() connectedTargets: string[] = [];
  @Input() saveVersion = 0;

  @Output() addTab = new EventEmitter<number>();
  @Output() deleteTab = new EventEmitter<{ fieldIndex: number; tabIndex: number }>();
  @Output() updateTabTitle = new EventEmitter<{ fieldIndex: number; tabIndex: number; value: string }>();
  @Output() setActiveTab = new EventEmitter<{ fieldIndex: number; tabIndex: number }>();
  @Output() deleteNestedField = new EventEmitter<{ fieldIndex: number; tabIndex: number; nestedIndex: number }>();
  @Output() dropOnTab = new EventEmitter<{ fieldIndex: number; tabIndex: number; event: CdkDragDrop<any[]> }>();
  @Output() addSpreadsheet = new EventEmitter<{ fieldIndex: number; tabIndex: number }>();
  @Output() spreadsheetSubmit = new EventEmitter<{ fieldIndex: number; tabIndex: number; fieldId: string; payload: any; version: number }>();

  /** Always accept these */
  private baseAcceptIds = ['fieldPalette', 'canvasZone'];

  // Utility
  private makeId(prefix = 'fld'): string {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  private createFromPalette(tpl: any): AllowedNested | null {
    if (!tpl || !tpl.type) return null;
    if (tpl.type === 'text' || tpl.type === 'dropdown' || tpl.type === 'checkbox') {
      return {
        id: this.makeId(),
        type: tpl.type,
        label: tpl.label ?? 'Field',
        options: tpl.options ? [...tpl.options] : undefined
      };
    }
    if (tpl.type === 'handsontable') {
      return { id: this.makeId(), type: 'handsontable', label: 'Spreadsheet' };
    }
    return null;
  }

  private isAllowedNested(x: any): x is AllowedNested {
    return !!x &&
      (x.type === 'text' || x.type === 'dropdown' || x.type === 'checkbox' || x.type === 'handsontable');
  }

  // ───────────────────────── Tabs Helpers ─────────────────────────
  getTabListId(tab: any): string {
    return `tab-${this.tabsField.id}-${tab.id}`;
  }

  getActiveTab(): any | null {
    if (!this.tabsField.tabs.length) return null;
    const index = this.getActiveTabIndex();
    return this.tabsField.tabs[index] || null;
  }

  getActiveTabIndex(): number {
    if (this.tabsField.activeTabIndex == null) {
      this.tabsField.activeTabIndex = 0;
    }
    return Math.min(
      Math.max(this.tabsField.activeTabIndex, 0),
      this.tabsField.tabs.length - 1
    );
  }

  getConnectedTargets(tabId: string): string[] {
    return this.connectedTargets.filter((id) => id !== tabId);
  }

  connectedTargetsFor(tabId: string): string[] {
    const s = new Set<string>([...this.baseAcceptIds, ...this.connectedTargets]);
    s.delete(tabId);
    return Array.from(s);
  }

  // ───────────────────────── Toolbar Actions ─────────────────────────
  onAddTab(): void {
    this.addTab.emit(this.fieldIndex);
  }

  onDeleteTab(tabIndex: number): void {
    this.deleteTab.emit({ fieldIndex: this.fieldIndex, tabIndex });
  }

  onUpdateTabTitle(tabIndex: number, value: string): void {
    this.updateTabTitle.emit({ fieldIndex: this.fieldIndex, tabIndex, value });
  }

  onSetActiveTab(tabIndex: number): void {
    this.setActiveTab.emit({ fieldIndex: this.fieldIndex, tabIndex });
  }

  onDeleteNestedField(tabIndex: number, nestedIndex: number): void {
    this.deleteNestedField.emit({ fieldIndex: this.fieldIndex, tabIndex, nestedIndex });
  }

  onDropOnTab(tabIndex: number, event: CdkDragDrop<any[]>): void {
    this.dropOnTab.emit({ fieldIndex: this.fieldIndex, tabIndex, event });
  }

  // ───────────────────── Spreadsheet (Developer A Logic) ─────────────────────
  /** Add spreadsheet for specific tab index */
  onAddSpreadsheet(tabIndex: number): void {
    this.addSpreadsheet.emit({ fieldIndex: this.fieldIndex, tabIndex });
  }

  /** Submit spreadsheet (tabIndex passed correctly) */
  onSpreadsheetSubmit(tabIndex: number, fieldId: string, submission: { payload: any; version: number }) {
    this.spreadsheetSubmit.emit({
      fieldIndex: this.fieldIndex,
      tabIndex,
      fieldId,
      payload: submission.payload,
      version: submission.version
    });
  }

  // ───────────────── Nested Columns Handling (Developer B Logic) ─────────────
  onNestedColumnsDrop(columnsField: any, payload: { columnIndex: number; event: CdkDragDrop<any[]> }) {
    const { columnIndex, event } = payload;
    const column = columnsField?.columns?.[columnIndex];
    if (!column) return;

    if (event.previousContainer.id === 'fieldPalette') {
      const created = this.createFromPalette(event.item.data);
      if (!created) return;
      column.fields.splice(event.currentIndex, 0, created);
      return;
    }

    if (event.previousContainer === event.container) {
      moveItemInArray(column.fields, event.previousIndex, event.currentIndex);
      return;
    }

    const source = event.previousContainer.data as any[];
    const [moved] = source.splice(event.previousIndex, 1);
    if (!this.isAllowedNested(moved)) return;
    column.fields.splice(event.currentIndex, 0, moved);
  }

  onNestedColumnsDelete(columnsField: any, payload: { columnIndex: number; nestedIndex: number }) {
    const { columnIndex, nestedIndex } = payload;
    const column = columnsField?.columns?.[columnIndex];
    if (!column) return;
    column.fields.splice(nestedIndex, 1);
  }

  onNestedColumnsAddSheet(columnsField: any, payload: { columnIndex: number }) {
    const { columnIndex } = payload;
    const column = columnsField?.columns?.[columnIndex];
    if (!column) return;
    column.fields.push({ id: this.makeId(), type: 'handsontable', label: 'Spreadsheet' });
  }

  // ───────────────────────── Tab Predicate ─────────────────────────
  tabEnterPredicate = (drag: CdkDrag): boolean => {
    const fromPalette = drag.dropContainer?.id === 'fieldPalette';
    const t = (drag.data as any)?.type as string | undefined;

    const receiving = document.querySelector('.cdk-drop-list-receiving') as HTMLElement | null;
    const childIsColumn = !!receiving && receiving.id.startsWith('col-');

    if (fromPalette) {
      if (childIsColumn) return false;

      if (t === 'handsontable' || t === 'columns') return true;

      if (t === 'text' || t === 'dropdown' || t === 'checkbox') return false;
    }

    return true;
  };
}
