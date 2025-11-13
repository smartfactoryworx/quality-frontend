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

type SimpleFieldType = 'text' | 'dropdown' | 'checkbox';
type CompositeFieldType = 'tabs' | 'columns';
type FieldType = SimpleFieldType | CompositeFieldType;

interface BaseField {
  id: string;
  type: FieldType;
  label: string;
  options?: string[];
}

interface SimpleField extends BaseField {
  type: SimpleFieldType;
}

interface Tab {
  id: string;
  title: string;
  fields: SimpleField[];
}

interface TabsField extends BaseField {
  type: 'tabs';
  tabs: Tab[];
  activeTabIndex: number;
}

interface Column {
  id: string;
  title: string;
  fields: SimpleField[];
}

interface ColumnsField extends BaseField {
  type: 'columns';
  columns: Column[];
}

type BuilderField = SimpleField | TabsField | ColumnsField;

@Component({
  selector: 'app-form-structure',
  standalone: true,
  imports: [CommonModule, DragDropModule, FormsModule, TabsComponent, ColumnsComponent],
  templateUrl: './form-structure.component.html',
  styleUrls: ['./form-structure.component.scss']
})
export class FormStructureComponent {
  private idCounter = 0;
  private pendingColumnTarget: { fieldIndex: number; columnIndex: number } | null = null;

  availableFields = [
    { type: 'text', label: 'Text Field' },
    { type: 'dropdown', label: 'Dropdown', options: ['Option 1', 'Option 2'] },
    { type: 'checkbox', label: 'Checkbox' },
    { type: 'tabs', label: 'Tabs' },
    { type: 'columns', label: 'Columns' }
  ];

  droppedFields: BuilderField[] = [];

  get paletteConnections(): string[] {
    return this.collectDropListIds().filter((id) => id !== 'fieldPalette');
  }

  connectedTargets(currentId: string): string[] {
    return ['fieldPalette', ...this.collectDropListIds().filter((id) => id !== currentId)];
  }

  get canvasConnections(): string[] {
    return this.connectedTargets('canvasZone');
  }

  onDrop(event: CdkDragDrop<BuilderField[]>) {
    if (event.previousContainer.id === 'fieldPalette' && event.container.id === 'canvasZone') {
      const template = event.item.data;
      const newField = this.instantiateField(template);
      if (this.pendingColumnTarget && this.isSimpleField(newField)) {
        this.insertFieldIntoColumn(this.pendingColumnTarget.fieldIndex, this.pendingColumnTarget.columnIndex, newField);
        this.pendingColumnTarget = null;
        return;
      }
      this.pendingColumnTarget = null;
      this.droppedFields.splice(event.currentIndex, 0, newField);
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

  dropOnTab(data: { fieldIndex: number; tabIndex: number; event: CdkDragDrop<SimpleField[]> }) {
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

  dropOnColumn(data: { fieldIndex: number; columnIndex: number; event: CdkDragDrop<SimpleField[]> }) {
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

  onColumnDragEntered(data: { fieldIndex: number; columnIndex: number }) {
    this.pendingColumnTarget = data;
  }

  onColumnDragExited(data: { fieldIndex: number; columnIndex: number }) {
    if (
      this.pendingColumnTarget &&
      this.pendingColumnTarget.fieldIndex === data.fieldIndex &&
      this.pendingColumnTarget.columnIndex === data.columnIndex
    ) {
      this.pendingColumnTarget = null;
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

  collectDropListIds(): string[] {
    const ids = ['canvasZone'];
    this.droppedFields.forEach((field) => {
      if (this.isTabsField(field)) {
        const activeTab = this.getActiveTab(field);
        if (activeTab) {
          ids.push(this.getTabListId(field, activeTab));
        }
      }
      if (this.isColumnField(field)) {
        field.columns.forEach((column) => ids.push(this.getColumnListId(field, column)));
      }
    });
    return ids;
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

  private insertFieldIntoColumn(fieldIndex: number, columnIndex: number, field: SimpleField) {
    const columnField = this.droppedFields[fieldIndex];
    if (!this.isColumnField(columnField)) {
      return;
    }
    columnField.columns[columnIndex].fields.push(field);
  }
}
