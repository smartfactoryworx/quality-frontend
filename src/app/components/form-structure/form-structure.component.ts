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

  availableFields = [
    { type: 'text', label: 'Text Field' },
    { type: 'dropdown', label: 'Dropdown', options: ['Option 1', 'Option 2'] },
    { type: 'checkbox', label: 'Checkbox' },
    { type: 'handsontable', label: 'Spreadsheet' },
    { type: 'tabs', label: 'Tabs' },
    { type: 'columns', label: 'Columns' }
  ];

  droppedFields: BuilderField[] = [];

  // form-structure.component.ts
  get paletteConnections(): string[] {
    // include EVERY list id (palette, canvas, tabs, columns...)
    // don't filter out 'fieldPalette' here
    return this.collectDropListIds();
  }
  // form-structure.component.ts
  canvasEnterPredicate = () => {
    // refuse entering canvas while a child list is the actual hover target
    const el = document.querySelector('.cdk-drop-list-receiving');
    // if a child list is already receiving the drag, don't let canvas accept it
    return !el || (el as HTMLElement).id === 'canvasZone';
  };


  connectedTargets(currentId: string): string[] {
    return this.collectDropListIds().filter((id) => id !== currentId);
  }

  get canvasConnections(): string[] {
    return this.connectedTargets('canvasZone');
  }

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

dropOnTab(data: { fieldIndex: number; tabIndex: number; event: CdkDragDrop<any[]> }) {
  const { fieldIndex, tabIndex, event } = data;
  const tabsField = this.droppedFields[fieldIndex] as TabsField;
  if (!this.isTabsField(tabsField)) return;

  const tab:any = tabsField.tabs[tabIndex];

  if (event.previousContainer.id === 'fieldPalette') {
    const template = event.item.data;
    const newField:any = this.instantiateField(template);
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



  dropOnColumn(data: { fieldIndex: number; columnIndex: number; event: CdkDragDrop<any[]> }) {
    const { fieldIndex, columnIndex, event } = data;
    const columnField = this.droppedFields[fieldIndex];
    if (!this.isColumnField(columnField)) {
      return;
    }

    const column:any = columnField.columns[columnIndex];
    if (event.previousContainer.id === 'fieldPalette') {
      const template = event.item.data;
      const newField: any = this.instantiateField(template);
     
      if (!this.isNestableField(newField)) {
        return;
      }
      column.fields.splice(event.currentIndex, 0, newField);
    } else if (event.previousContainer === event.container) {
      moveItemInArray(column.fields, event.previousIndex, event.currentIndex);
    } else {
      const source = event.previousContainer.data as BuilderField[];
      const [moved] = source.splice(event.previousIndex, 1);
     
      if (!moved || !this.isNestableField(moved)) {
        return;
      }
      column.fields.splice(event.currentIndex, 0, moved);
    }
  }

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

  onDeleteNestedField(data: { fieldIndex: number; tabIndex: number; nestedIndex: number }) {
    const { fieldIndex, tabIndex, nestedIndex } = data;
    const field = this.droppedFields[fieldIndex];
    if (!this.isTabsField(field)) {
      return;
    }
    field.tabs[tabIndex].fields.splice(nestedIndex, 1);
  }

  onDeleteColumnField(data: { fieldIndex: number; columnIndex: number; nestedIndex: number }) {
    const { fieldIndex, columnIndex, nestedIndex } = data;
    const field = this.droppedFields[fieldIndex];
    if (!this.isColumnField(field)) {
      return;
    }
    field.columns[columnIndex].fields.splice(nestedIndex, 1);
  }

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

  onSetActiveTab(data: { fieldIndex: number; tabIndex: number }) {
    const { fieldIndex, tabIndex } = data;
    const field = this.droppedFields[fieldIndex];
    if (!this.isTabsField(field)) {
      return;
    }
    field.activeTabIndex = tabIndex;
  }

  clearCanvas() {
    this.droppedFields = [];
  }

  deleteField(index: number) {
    this.droppedFields.splice(index, 1);
  }

  getTabListId(field: TabsField, tab: Tab) {
    return `tab-${field.id}-${tab.id}`;
  }

  asTabs(field: BuilderField): TabsField {
    return field as TabsField;
  }

  asColumns(field: BuilderField): ColumnsField {
    return field as ColumnsField;
  }

  asHandsontable(field: BuilderField): HandsontableField {
    return field as HandsontableField;
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
  // 👇 Add this inside FormStructureComponent (class body)
private collectIdsFromFields(fields: BuilderField[], out: Set<string>) {
  for (const f of fields) {
    // tabs: add the tab droplist id, then scan its inner fields for columns
    if (this.isTabsField(f)) {
      for (const tab of f.tabs) {
        out.add(this.getTabListId(f, tab));
        // look for Columns dropped INSIDE this tab
        for (const inner of (tab.fields as unknown as BuilderField[])) {
          if (this.isColumnField(inner)) {
            for (const col of inner.columns) {
              out.add(this.getColumnListId(inner, col));
            }
          }
        }
      }
    }

    // top-level columns
    if (this.isColumnField(f)) {
      for (const col of f.columns) {
        out.add(this.getColumnListId(f, col));
      }
    }
    // (optional) recurse here if you later allow columns-inside-columns
  }
}


  collectDropListIds(): string[] {
  const out = new Set<string>(['fieldPalette', 'canvasZone']);
  this.collectIdsFromFields(this.droppedFields, out);
  return Array.from(out);
}

  getColumnListId(field: ColumnsField, column: Column) {
    return `col-${field.id}-${column.id}`;
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

  // ✅ Allow simple fields AND spreadsheet inside tabs/columns
  private isNestableField(field: BuilderField): field is SimpleField | HandsontableField | ColumnsField | TabsField {
  // you can decide if tabs-inside-tabs is allowed; columns-in-tabs is the key ask
  return this.isSimpleField(field) || field.type === 'handsontable' || field.type === 'columns';
}


  private getActiveTab(field: TabsField): Tab | null {
    if (!field.tabs.length) {
      return null;
    }
    const idx = Math.min(Math.max(field.activeTabIndex ?? 0, 0), field.tabs.length - 1);
    return field.tabs[idx] ?? null;
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
