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


// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
type SimpleFieldType = 'text' | 'dropdown' | 'checkbox';
type CompositeFieldType = 'tabs' | 'columns';
type FieldType = SimpleFieldType | CompositeFieldType | 'handsontable';

interface BaseField {
  id: string;
  type: FieldType;
  label: string;
  options?: string[];
  value?: any;
  key?: string;
}

interface SimpleField extends BaseField {
  type: SimpleFieldType;
  value?: any;
  key?: string;
}

interface HandsontableField extends BaseField {
  type: 'handsontable';
  spreadsheetPayload?: any;
}

interface Tab {
  id: string;
  title: string;
  fields: (SimpleField | HandsontableField | ColumnsField)[];
}

interface TabsField extends BaseField {
  type: 'tabs';
  tabs: Tab[];
  activeTabIndex: number;
}

interface Column {
  id: string;
  title: string;
  fields: (SimpleField | HandsontableField | ColumnsField)[];
}

interface ColumnsField extends BaseField {
  type: 'columns';
  columns: Column[];
}

type BuilderField = SimpleField | TabsField | ColumnsField | HandsontableField;


// ─────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────

@Component({
  selector: 'app-form-structure',
  standalone: true,
  imports: [CommonModule, DragDropModule, FormsModule, TabsComponent, ColumnsComponent, HandsontableComponent],
  templateUrl: './form-structure.component.html',
  styleUrls: ['./form-structure.component.scss']
})
export class FormStructureComponent {

  // IDs, saving system
  private idCounter = 0;
  saveVersion = 0;
  private awaitingSnapshot = false;
  private awaitingFieldIds = new Set<string>();
  private completedFieldIds = new Set<string>();
  private awaitingSaveVersion = 0;

  // Palette
  availableFields = [
    { type: 'text', label: 'Text Field' },
    { type: 'dropdown', label: 'Dropdown', options: ['Option 1', 'Option 2'] },
    { type: 'checkbox', label: 'Checkbox' },
    { type: 'handsontable', label: 'Spreadsheet' },
    { type: 'tabs', label: 'Tabs' },
    { type: 'columns', label: 'Columns' }
  ];

  droppedFields: BuilderField[] = [];

  // ALL drop-list IDs for CDK connections
  get paletteConnections(): string[] {
    return this.collectDropListIds();
  }

  canvasEnterPredicate = () => {
    const el = document.querySelector('.cdk-drop-list-receiving');
    return !el || (el as HTMLElement).id === 'canvasZone';
  };

  connectedTargets(currentId: string): string[] {
    return this.collectDropListIds().filter((id) => id !== currentId);
  }

  get canvasConnections(): string[] {
    return this.connectedTargets('canvasZone');
  }

  // ─────────────────────────────────────────────────────────────
  // ROOT CANVAS DROP HANDLER
  // ─────────────────────────────────────────────────────────────
  onDrop(event: CdkDragDrop<BuilderField[]>) {
    if (event.previousContainer.id === 'fieldPalette' &&
        event.container.id === 'canvasZone') {

      const template = event.item.data;
      this.droppedFields.splice(event.currentIndex, 0, this.instantiateField(template));

    } else if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);

    } else {
      const source = event.previousContainer.data as BuilderField[];
      const [moved] = source.splice(event.previousIndex, 1);
      if (!moved) return;
      event.container.data.splice(event.currentIndex, 0, moved);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // TAB DROP
  // ─────────────────────────────────────────────────────────────
  dropOnTab(data: { fieldIndex: number; tabIndex: number; event: CdkDragDrop<any[]> }) {
    const { fieldIndex, tabIndex, event } = data;
    const tabsField = this.droppedFields[fieldIndex] as TabsField;
    if (!this.isTabsField(tabsField)) return;

    const tab = tabsField.tabs[tabIndex];

    if (event.previousContainer.id === 'fieldPalette') {
      const template = event.item.data;
      const newField = this.instantiateField(template);
      if (!this.isNestableField(newField)) return;
      tab.fields.splice(event.currentIndex, 0, newField);

    } else if (event.previousContainer === event.container) {
      moveItemInArray(tab.fields, event.previousIndex, event.currentIndex);

    } else {
      const source = event.previousContainer.data as BuilderField[];
      const [moved] = source.splice(event.previousIndex, 1);
      if (!moved || !this.isNestableField(moved)) return;
      tab.fields.splice(event.currentIndex, 0, moved);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // COLUMN DROP
  // ─────────────────────────────────────────────────────────────
  dropOnColumn(data: { fieldIndex: number; columnIndex: number; event: CdkDragDrop<any[]> }) {
    const { fieldIndex, columnIndex, event } = data;
    const columnField = this.droppedFields[fieldIndex];
    if (!this.isColumnField(columnField)) return;

    const column = columnField.columns[columnIndex];

    if (event.previousContainer.id === 'fieldPalette') {
      const template = event.item.data;
      const newField = this.instantiateField(template);
      if (!this.isNestableField(newField)) return;
      column.fields.splice(event.currentIndex, 0, newField);

    } else if (event.previousContainer === event.container) {
      moveItemInArray(column.fields, event.previousIndex, event.currentIndex);

    } else {
      const source = event.previousContainer.data as BuilderField[];
      const [moved] = source.splice(event.previousIndex, 1);
      if (!moved || !this.isNestableField(moved)) return;
      column.fields.splice(event.currentIndex, 0, moved);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // TAB FUNCTIONS
  // ─────────────────────────────────────────────────────────────
  onAddTab(fieldIndex: number) {
    const field = this.droppedFields[fieldIndex];
    if (!this.isTabsField(field)) return;
    field.tabs.push(this.createTab(field.tabs.length + 1));
    field.activeTabIndex = field.tabs.length - 1;
  }

  onDeleteTab(data: { fieldIndex: number; tabIndex: number }) {
    const { fieldIndex, tabIndex } = data;
    const field = this.droppedFields[fieldIndex];
    if (!this.isTabsField(field) || field.tabs.length <= 1) return;

    field.tabs.splice(tabIndex, 1);
    if (field.activeTabIndex >= field.tabs.length) {
      field.activeTabIndex = field.tabs.length - 1;
    }
  }

  onUpdateTabTitle(data: { fieldIndex: number; tabIndex: number; value: string }) {
    const { fieldIndex, tabIndex, value } = data;
    const field = this.droppedFields[fieldIndex];
    if (!this.isTabsField(field)) return;
    field.tabs[tabIndex].title = value;
  }

  onDeleteNestedField(data: { fieldIndex: number; tabIndex: number; nestedIndex: number }) {
    const { fieldIndex, tabIndex, nestedIndex } = data;
    const field = this.droppedFields[fieldIndex];
    if (!this.isTabsField(field)) return;

    field.tabs[tabIndex].fields.splice(nestedIndex, 1);
  }

  onSetActiveTab(data: { fieldIndex: number; tabIndex: number }) {
    const { fieldIndex, tabIndex } = data;
    const field = this.droppedFields[fieldIndex];
    if (!this.isTabsField(field)) return;
    field.activeTabIndex = tabIndex;
  }

  onAddSpreadsheetToTab(data: { fieldIndex: number; tabIndex: number }) {
    const { fieldIndex, tabIndex } = data;
    const tabsField = this.droppedFields[fieldIndex] as TabsField;
    if (!this.isTabsField(tabsField)) return;

    const tab = tabsField.tabs[tabIndex];
    tab.fields.push({
      id: this.generateId(),
      type: 'handsontable',
      label: 'Spreadsheet'
    });
  }

  // ─────────────────────────────────────────────────────────────
  // COLUMNS FUNCTIONS
  // ─────────────────────────────────────────────────────────────
  onAddSpreadsheetToColumn(data: { fieldIndex: number; columnIndex: number }) {
    const { fieldIndex, columnIndex } = data;
    const columnField = this.droppedFields[fieldIndex];
    if (!this.isColumnField(columnField)) return;

    const column = columnField.columns[columnIndex];
    column.fields.push({
      id: this.generateId(),
      type: 'handsontable',
      label: 'Spreadsheet'
    });
  }

  onDeleteColumnField(data: { fieldIndex: number; columnIndex: number; nestedIndex: number }) {
    const { fieldIndex, columnIndex, nestedIndex } = data;
    const field = this.droppedFields[fieldIndex];
    if (!this.isColumnField(field)) return;

    field.columns[columnIndex].fields.splice(nestedIndex, 1);
  }

  // ─────────────────────────────────────────────────────────────
  // HANDSONTABLE SAVING SYSTEM
  // ─────────────────────────────────────────────────────────────
  save() {
    const spreadsheetIds = this.collectSpreadsheetIds(this.droppedFields);
    if (!spreadsheetIds.length) {
      this.outputStructureSnapshot();
      return;
    }

    this.awaitingSnapshot = true;
    this.awaitingFieldIds = new Set(spreadsheetIds);
    this.completedFieldIds.clear();

    const next = this.saveVersion + 1;
    this.awaitingSaveVersion = next;
    this.saveVersion = next;
  }

  deleteField(index: number) {
    this.droppedFields.splice(index, 1);
  }

  private assignSpreadsheetPayload(field: HandsontableField | null | undefined,
                                   fieldId: string, payload: any, version: number) {

    if (!field) return;

    field.spreadsheetPayload = payload;

    if (!this.awaitingSnapshot || version !== this.awaitingSaveVersion) return;
    if (!this.awaitingFieldIds.has(fieldId) || this.completedFieldIds.has(fieldId)) return;

    this.completedFieldIds.add(fieldId);

    if (this.completedFieldIds.size === this.awaitingFieldIds.size) {
      this.outputStructureSnapshot();
    }
  }

  onRootSpreadsheetSubmit(fieldId: string, submission: { payload: any; version: number }) {
    const field = this.droppedFields.find(f =>
      f.id === fieldId && this.isHandsontableField(f)
    ) as HandsontableField | undefined;

    this.assignSpreadsheetPayload(field, fieldId, submission.payload, submission.version);
  }

  onTabSpreadsheetSubmit(event: { fieldIndex: number; tabIndex: number; fieldId: string; payload: any; version: number }) {
    const field = this.getTabField(event.fieldIndex, event.tabIndex, event.fieldId);
    this.assignSpreadsheetPayload(field, event.fieldId, event.payload, event.version);
  }

  onColumnSpreadsheetSubmit(event: { fieldIndex: number; columnIndex: number; fieldId: string; payload: any; version: number }) {
    const field = this.getColumnField(event.fieldIndex, event.columnIndex, event.fieldId);
    this.assignSpreadsheetPayload(field, event.fieldId, event.payload, event.version);
  }

  private outputStructureSnapshot() {
    this.awaitingSnapshot = false;
    this.awaitingFieldIds.clear();
    this.completedFieldIds.clear();
    this.awaitingSaveVersion = this.saveVersion;

    const snapshot = JSON.parse(JSON.stringify(this.droppedFields));
    console.log(snapshot);
  }

  // ─────────────────────────────────────────────────────────────
  // HELPERS FOR FINDING HANDSONTABLE INSIDE TAB/COLUMN
  // ─────────────────────────────────────────────────────────────
  private getTabField(fieldIndex: number, tabIndex: number, handsontableId: string): HandsontableField | null {
    const field = this.droppedFields[fieldIndex];
    if (!field || !this.isTabsField(field)) return null;

    const tab = field.tabs[tabIndex];
    if (!tab) return null;

    const inner = tab.fields.find(f => f.id === handsontableId);
    return inner && this.isHandsontableField(inner) ? inner : null;
  }

  private getColumnField(fieldIndex: number, columnIndex: number, handsontableId: string): HandsontableField | null {
    const field = this.droppedFields[fieldIndex];
    if (!field || !this.isColumnField(field)) return null;

    const column = field.columns[columnIndex];
    if (!column) return null;

    const inner = column.fields.find(f => f.id === handsontableId);
    return inner && this.isHandsontableField(inner) ? inner : null;
  }

  private collectSpreadsheetIds(fields: BuilderField[]): string[] {
    const ids: string[] = [];

    fields.forEach(field => {
      if (this.isHandsontableField(field)) {
        ids.push(field.id);
      }
      else if (this.isTabsField(field)) {
        field.tabs.forEach(tab => {
          ids.push(...this.collectSpreadsheetIds(tab.fields as BuilderField[]));
        });
      }
      else if (this.isColumnField(field)) {
        field.columns.forEach(column => {
          ids.push(...this.collectSpreadsheetIds(column.fields as BuilderField[]));
        });
      }
    });

    return ids;
  }

  // ─────────────────────────────────────────────────────────────
  // DROPLIST ID COLLECTOR (tabs/columns)
  // ─────────────────────────────────────────────────────────────
  private collectIdsFromFields(fields: BuilderField[], out: Set<string>) {
    for (const f of fields) {

      if (this.isTabsField(f)) {
        for (const tab of f.tabs) {
          out.add(this.getTabListId(f, tab));

          // look for Columns inside tab
          for (const inner of (tab.fields as BuilderField[])) {
            if (this.isColumnField(inner)) {
              for (const col of inner.columns) {
                out.add(this.getColumnListId(inner, col));
              }
            }
          }
        }
      }

      if (this.isColumnField(f)) {
        for (const col of f.columns) {
          out.add(this.getColumnListId(f, col));
        }
      }
    }
  }

  collectDropListIds(): string[] {
    const out = new Set<string>(['fieldPalette', 'canvasZone']);
    this.collectIdsFromFields(this.droppedFields, out);
    return Array.from(out);
  }

  // get list IDs
  getTabListId(field: TabsField, tab: Tab) {
    return `tab-${field.id}-${tab.id}`;
  }

  getColumnListId(field: ColumnsField, column: Column) {
    return `col-${field.id}-${column.id}`;
  }

  // ─────────────────────────────────────────────────────────────
  // TYPE GUARDS
  // ─────────────────────────────────────────────────────────────
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

  // ** MERGED FIX ** allow Simple + Spreadsheet + Columns inside tabs
  private isNestableField(field: BuilderField): field is SimpleField | HandsontableField | ColumnsField {
    return this.isSimpleField(field) || this.isHandsontableField(field) || this.isColumnField(field);
  }

  // ─────────────────────────────────────────────────────────────
  // FORM BUILDER UTILITY HELPERS
  // ─────────────────────────────────────────────────────────────
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
    if (!parsed || parsed < 1) return 1;
    if (parsed > 4) return 4;
    return Math.floor(parsed);
  }

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
      return {
        id: this.generateId(),
        type: 'columns',
        label: template.label,
        columns: this.createColumns()
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

  private generateId(): string {
    this.idCounter += 1;
    return `fld-${this.idCounter}`;
  }

  clearCanvas() {
    this.droppedFields = [];
    this.awaitingSnapshot = false;
    this.awaitingFieldIds.clear();
    this.completedFieldIds.clear();
    this.awaitingSaveVersion = 0;
  }

  asTabs(field: BuilderField): TabsField {
  return field as TabsField;
}

asColumns(field: BuilderField): ColumnsField {
  return field as ColumnsField;
}

}
