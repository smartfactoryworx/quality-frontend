import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  DragDropModule,
  CdkDragDrop,
  moveItemInArray
} from '@angular/cdk/drag-drop';
import { TabsComponent } from '../tabs/tabs.component';
import { ColumnsComponent } from '../columns/columns.component';
import { HandsontableComponent } from './handsontable/handsontable.component';

type SimpleFieldType = 'text' | 'dropdown' | 'checkbox';
type CompositeFieldType = 'tabs' | 'columns';
type FieldType = SimpleFieldType | CompositeFieldType | 'handsontable';

interface BaseField {
  id: string;
  type: FieldType;
  label: string;
  options?: string[];
}

interface SimpleField extends BaseField {
  type: SimpleFieldType;
}

export interface HandsontableField extends BaseField {
  type: 'handsontable';
  spreadsheetPayload?: any;
}

interface Tab {
  id: string;
  title: string;
  fields: (SimpleField | HandsontableField)[];
}

interface TabsField extends BaseField {
  type: 'tabs';
  tabs: Tab[];
  activeTabIndex: number;
}

interface Column {
  id: string;
  title: string;
  fields: (SimpleField | HandsontableField)[];
}

interface ColumnsField extends BaseField {
  type: 'columns';
  columns: Column[];
}

type BuilderField = SimpleField | TabsField | ColumnsField | HandsontableField;

@Component({
  selector: 'app-form-structure',
  standalone: true,
  imports: [CommonModule, DragDropModule, FormsModule, TabsComponent, ColumnsComponent, HandsontableComponent],
  templateUrl: './form-structure.component.html',
  styleUrls: ['./form-structure.component.scss']
})
export class FormStructureComponent {
  private idCounter = 0;

  saveVersion = 0;
  private awaitingSnapshot = false;
  private awaitingFieldIds = new Set<string>();
  private completedFieldIds = new Set<string>();
  private awaitingSaveVersion = 0;

  availableFields = [
    { type: 'text', label: 'Text Field' },
    { type: 'dropdown', label: 'Dropdown', options: ['Option 1', 'Option 2'] },
    { type: 'checkbox', label: 'Checkbox' },
    { type: 'handsontable', label: 'Spreadsheet' },
    { type: 'tabs', label: 'Tabs' },
    { type: 'columns', label: 'Columns' }
  ];

  droppedFields: BuilderField[] = [];

  get paletteConnections(): string[] {
    return this.collectDropListIds().filter((id) => id !== 'fieldPalette');
  }

  connectedTargets(currentId: string): string[] {
    return this.collectDropListIds().filter((id) => id !== currentId);
  }

  get canvasConnections(): string[] {
    return this.connectedTargets('canvasZone');
  }

  // ---------- Drag & Drop on root canvas ----------
  onDrop(event: CdkDragDrop<BuilderField[]>) {
    if (event.previousContainer.id === 'fieldPalette' && event.container.id === 'canvasZone') {
      const template = event.item.data;
      this.droppedFields.splice(event.currentIndex, 0, this.instantiateField(template));
    } else if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      const source = event.previousContainer.data as BuilderField[];
      const [moved] = source.splice(event.previousIndex, 1);
      if (!moved) {
        return;
      }
      event.container.data.splice(event.currentIndex, 0, moved);
    }
  }

  // ---------- Drag & Drop inside Tabs ----------
  dropOnTab(data: { fieldIndex: number; tabIndex: number; event: CdkDragDrop<any[]> }) {
    const { fieldIndex, tabIndex, event } = data;
    const tabsField = this.droppedFields[fieldIndex] as TabsField;
    if (!this.isTabsField(tabsField)) {
      return;
    }
    const tab = tabsField.tabs[tabIndex];

    if (event.previousContainer.id === 'fieldPalette') {
      const template = event.item.data;
      const newField = this.instantiateField(template);
      if (!this.isSimpleField(newField)) {
        return;
      }
      tab.fields.splice(event.currentIndex, 0, newField);
    } else if (event.previousContainer === event.container) {
      moveItemInArray(tab.fields, event.previousIndex, event.currentIndex);
    } else {
      const source = event.previousContainer.data as BuilderField[];
      const [moved] = source.splice(event.previousIndex, 1);
      if (!moved || !this.isSimpleField(moved)) {
        return;
      }
      tab.fields.splice(event.currentIndex, 0, moved);
    }
  }

  // ---------- Drag & Drop inside Columns ----------
  dropOnColumn(data: { fieldIndex: number; columnIndex: number; event: CdkDragDrop<any[]> }) {
    const { fieldIndex, columnIndex, event } = data;
    const columnField = this.droppedFields[fieldIndex];
    if (!this.isColumnField(columnField)) {
      return;
    }
    const column = columnField.columns[columnIndex];

    if (event.previousContainer.id === 'fieldPalette') {
      const template = event.item.data;
      const newField = this.instantiateField(template);
      if (!this.isSimpleField(newField)) {
        return;
      }
      column.fields.splice(event.currentIndex, 0, newField);
    } else if (event.previousContainer === event.container) {
      moveItemInArray(column.fields, event.previousIndex, event.currentIndex);
    } else {
      const source = event.previousContainer.data as BuilderField[];
      const [moved] = source.splice(event.previousIndex, 1);
      if (!moved || !this.isSimpleField(moved)) {
        return;
      }
      column.fields.splice(event.currentIndex, 0, moved);
    }
  }

  // ---------- Tabs management ----------
  onAddTab(fieldIndex: number) {
    const field = this.droppedFields[fieldIndex];
    if (!this.isTabsField(field)) {
      return;
    }
    field.tabs.push(this.createTab(field.tabs.length + 1));
    field.activeTabIndex = field.tabs.length - 1;
  }

  onDeleteTab(data: { fieldIndex: number; tabIndex: number }) {
    const { fieldIndex, tabIndex } = data;
    const field = this.droppedFields[fieldIndex];
    if (!this.isTabsField(field) || field.tabs.length <= 1) {
      return;
    }
    field.tabs.splice(tabIndex, 1);
    if (field.activeTabIndex >= field.tabs.length) {
      field.activeTabIndex = field.tabs.length - 1;
    }
  }

  onUpdateTabTitle(data: { fieldIndex: number; tabIndex: number; value: string }) {
    const { fieldIndex, tabIndex, value } = data;
    const field = this.droppedFields[fieldIndex];
    if (!this.isTabsField(field)) {
      return;
    }
    field.tabs[tabIndex].title = value;
  }

  onSetActiveTab(data: { fieldIndex: number; tabIndex: number }) {
    const { fieldIndex, tabIndex } = data;
    const field = this.droppedFields[fieldIndex];
    if (!this.isTabsField(field)) {
      return;
    }
    field.activeTabIndex = tabIndex;
  }

  onDeleteNestedField(data: { fieldIndex: number; tabIndex: number; nestedIndex: number }) {
    const { fieldIndex, tabIndex, nestedIndex } = data;
    const field = this.droppedFields[fieldIndex];
    if (!this.isTabsField(field)) {
      return;
    }
    field.tabs[tabIndex].fields.splice(nestedIndex, 1);
  }

  // ---------- Columns management ----------
  onDeleteColumnField(data: { fieldIndex: number; columnIndex: number; nestedIndex: number }) {
    const { fieldIndex, columnIndex, nestedIndex } = data;
    const field = this.droppedFields[fieldIndex];
    if (!this.isColumnField(field)) {
      return;
    }
    field.columns[columnIndex].fields.splice(nestedIndex, 1);
  }

  // ---------- Add spreadsheet instances ----------
  onAddSpreadsheetToTab(data: { fieldIndex: number; tabIndex: number }) {
    const { fieldIndex, tabIndex } = data;
    const tabsField = this.droppedFields[fieldIndex] as TabsField;
    if (!this.isTabsField(tabsField)) {
      return;
    }
    const tab = tabsField.tabs[tabIndex];
    const spreadsheetField: HandsontableField = {
      id: this.generateId(),
      type: 'handsontable',
      label: 'Spreadsheet'
    };
    tab.fields.push(spreadsheetField);
  }

  onAddSpreadsheetToColumn(data: { fieldIndex: number; columnIndex: number }) {
    const { fieldIndex, columnIndex } = data;
    const columnField = this.droppedFields[fieldIndex];
    if (!this.isColumnField(columnField)) {
      return;
    }
    const column = columnField.columns[columnIndex];
    const spreadsheetField: HandsontableField = {
      id: this.generateId(),
      type: 'handsontable',
      label: 'Spreadsheet'
    };
    column.fields.push(spreadsheetField);
  }

  // ---------- Canvas actions ----------
  clearCanvas() {
    this.droppedFields = [];
    this.awaitingSnapshot = false;
    this.awaitingFieldIds.clear();
    this.completedFieldIds.clear();
    this.awaitingSaveVersion = 0;
    this.saveVersion = 0;
  }

  deleteField(index: number) {
    this.droppedFields.splice(index, 1);
  }

  // ---------- SAVE orchestration ----------
  save() {
    const spreadsheetIds = this.collectSpreadsheetIds(this.droppedFields);
    if (!spreadsheetIds.length) {
      this.outputStructureSnapshot();
      return;
    }

    this.awaitingSnapshot = true;
    this.awaitingFieldIds = new Set(spreadsheetIds);
    this.completedFieldIds.clear();

    const nextVersion = this.saveVersion + 1;
    this.awaitingSaveVersion = nextVersion;
    this.saveVersion = nextVersion;
  }

  // ---------- IDs for cdkDropList ----------
  getTabListId(field: TabsField, tab: Tab) {
    return `tab-${field.id}-${tab.id}`;
  }

  getColumnListId(field: ColumnsField, column: Column) {
    return `col-${field.id}-${column.id}`;
  }

  collectDropListIds(): string[] {
    const ids = ['fieldPalette', 'canvasZone'];
    this.droppedFields.forEach((field) => {
      if (this.isTabsField(field)) {
        field.tabs.forEach((tab) => ids.push(this.getTabListId(field, tab)));
      }
      if (this.isColumnField(field)) {
        field.columns.forEach((column) => ids.push(this.getColumnListId(field, column)));
      }
    });
    return ids;
  }

  // ---------- Type guards & helpers ----------
  asTabs(field: BuilderField): TabsField {
    return field as TabsField;
  }

  asColumns(field: BuilderField): ColumnsField {
    return field as ColumnsField;
  }

  asHandsontable(field: BuilderField): HandsontableField {
    return field as HandsontableField;
  }

  private isTabsField(field: BuilderField): field is TabsField {
    return field.type === 'tabs';
  }

  private isColumnField(field: BuilderField): field is ColumnsField {
    return field.type === 'columns';
  }

  private isSimpleField(field: BuilderField): field is SimpleField {
    return field.type === 'text' || field.type === 'dropdown' || field.type === 'checkbox';
  }

  private isHandsontableField(field: BuilderField): field is HandsontableField {
    return field.type === 'handsontable';
  }

  private getTabField(fieldIndex: number, tabIndex: number, handsontableId: string): HandsontableField | null {
    const field = this.droppedFields[fieldIndex];
    if (!field || !this.isTabsField(field)) {
      return null;
    }
    const tab = field.tabs[tabIndex];
    if (!tab) {
      return null;
    }
    const innerField = tab.fields.find((f) => f.id === handsontableId);
    return innerField && this.isHandsontableField(innerField) ? innerField : null;
  }

  private getColumnField(fieldIndex: number, columnIndex: number, handsontableId: string): HandsontableField | null {
    const field = this.droppedFields[fieldIndex];
    if (!field || !this.isColumnField(field)) {
      return null;
    }
    const column = field.columns[columnIndex];
    if (!column) {
      return null;
    }
    const innerField = column.fields.find((f) => f.id === handsontableId);
    return innerField && this.isHandsontableField(innerField) ? innerField : null;
  }

  private getActiveTab(field: TabsField): Tab | null {
    if (!field.tabs.length) {
      return null;
    }
    const idx = Math.min(Math.max(field.activeTabIndex ?? 0, 0), field.tabs.length - 1);
    return field.tabs[idx] ?? null;
  }

  // ---------- Spreadsheet wiring ----------
  private assignSpreadsheetPayload(
    field: HandsontableField | null | undefined,
    fieldId: string,
    payload: any,
    version: number
  ) {
    if (!field) {
      return;
    }

    field.spreadsheetPayload = payload;

    if (!this.awaitingSnapshot || version !== this.awaitingSaveVersion) {
      return;
    }
    if (!this.awaitingFieldIds.has(fieldId) || this.completedFieldIds.has(fieldId)) {
      return;
    }

    this.completedFieldIds.add(fieldId);

    if (this.completedFieldIds.size === this.awaitingFieldIds.size) {
      this.outputStructureSnapshot();
    }
  }

  private outputStructureSnapshot() {
    this.awaitingSnapshot = false;
    this.awaitingFieldIds.clear();
    this.completedFieldIds.clear();
    this.awaitingSaveVersion = this.saveVersion;

    const snapshot = JSON.parse(JSON.stringify(this.droppedFields));
    console.log('[Form Structure]\n', JSON.stringify(snapshot, null, 2));
  }

  // **IMPORTANT**: now collects ALL spreadsheets in ALL tabs & columns
  private collectSpreadsheetIds(fields: BuilderField[]): string[] {
    const ids: string[] = [];

    fields.forEach((field) => {
      if (this.isHandsontableField(field)) {
        ids.push(field.id);
      } else if (this.isTabsField(field)) {
        field.tabs.forEach((tab) => {
          ids.push(...this.collectSpreadsheetIds(tab.fields as BuilderField[]));
        });
      } else if (this.isColumnField(field)) {
        field.columns.forEach((column) => {
          ids.push(...this.collectSpreadsheetIds(column.fields as BuilderField[]));
        });
      }
    });

    return ids;
  }

  // child events
  onRootSpreadsheetSubmit(fieldId: string, submission: { payload: any; version: number }) {
    const field = this.droppedFields.find(
      (f) => f.id === fieldId && this.isHandsontableField(f)
    ) as HandsontableField | undefined;
    this.assignSpreadsheetPayload(field, fieldId, submission.payload, submission.version);
  }

  onTabSpreadsheetSubmit(event: {
    fieldIndex: number;
    tabIndex: number;
    fieldId: string;
    payload: any;
    version: number;
  }) {
    const field = this.getTabField(event.fieldIndex, event.tabIndex, event.fieldId);
    this.assignSpreadsheetPayload(field, event.fieldId, event.payload, event.version);
  }

  onColumnSpreadsheetSubmit(event: {
    fieldIndex: number;
    columnIndex: number;
    fieldId: string;
    payload: any;
    version: number;
  }) {
    const field = this.getColumnField(event.fieldIndex, event.columnIndex, event.fieldId);
    this.assignSpreadsheetPayload(field, event.fieldId, event.payload, event.version);
  }

  // ---------- Field creation ----------
  private instantiateField(template: any): BuilderField {
    if (template.type === 'tabs') {
      return {
        id: this.generateId(),
        type: 'tabs',
        label: template.label,
        tabs: [this.createTab(1), this.createTab(2)],
        activeTabIndex: 0
      };
    }
    if (template.type === 'columns') {
      const columns = this.createColumns();
      return {
        id: this.generateId(),
        type: 'columns',
        label: template.label,
        columns
      };
    }
    if (template.type === 'handsontable') {
      return {
        id: this.generateId(),
        type: 'handsontable',
        label: template.label
      };
    }

    return {
      id: this.generateId(),
      type: template.type as SimpleFieldType,
      label: template.label,
      options: template.options ? [...template.options] : undefined
    };
  }

  private createTab(index: number): Tab {
    return {
      id: this.generateId(),
      title: `Tab ${index}`,
      fields: []
    };
  }

  private createColumns(): Column[] {
    const count = this.askColumnCount();
    return Array.from({ length: count }, (_, idx) => ({
      id: this.generateId(),
      title: `Column ${idx + 1}`,
      fields: []
    }));
  }

  private askColumnCount(): number {
    const input = prompt('How many columns do you need?', '2');
    const parsed = Number(input);
    if (!parsed || parsed < 1) {
      return 1;
    }
    if (parsed > 4) {
      return 4;
    }
    return Math.floor(parsed);
  }

  private generateId(): string {
    this.idCounter += 1;
    return `fld-${this.idCounter}`;
  }
}
