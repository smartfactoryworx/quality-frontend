import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';

type SimpleFieldType = 'text' | 'dropdown' | 'checkbox';

interface SimpleField {
  id: string;
  type: SimpleFieldType;
  label: string;
  options?: string[];
}

interface Tab {
  id: string;
  title: string;
  fields: SimpleField[];
}

interface TabsField {
  id: string;
  type: 'tabs';
  label: string;
  tabs: Tab[];
  activeTabIndex: number;
}

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [CommonModule, DragDropModule, FormsModule],
  templateUrl: './tabs.component.html',
  styleUrls: ['./tabs.component.scss']
})
export class TabsComponent {
  @Input() tabsField!: TabsField;
  @Input() fieldIndex!: number;
  @Input() connectedTargets: string[] = [];

  @Output() addTab = new EventEmitter<number>();
  @Output() deleteTab = new EventEmitter<{ fieldIndex: number; tabIndex: number }>();
  @Output() updateTabTitle = new EventEmitter<{ fieldIndex: number; tabIndex: number; value: string }>();
  @Output() setActiveTab = new EventEmitter<{ fieldIndex: number; tabIndex: number }>();
  @Output() deleteNestedField = new EventEmitter<{ fieldIndex: number; tabIndex: number; nestedIndex: number }>();
  @Output() dropOnTab = new EventEmitter<{ fieldIndex: number; tabIndex: number; event: CdkDragDrop<SimpleField[]> }>();

  getTabListId(tab: Tab): string {
    return `tab-${this.tabsField.id}-${tab.id}`;
  }

  getActiveTab(): Tab | null {
    if (!this.tabsField.tabs.length) {
      return null;
    }
    const index = this.getActiveTabIndex();
    return this.tabsField.tabs[index] || null;
  }

  getActiveTabIndex(): number {
    if (this.tabsField.activeTabIndex == null) {
      this.tabsField.activeTabIndex = 0;
    }
    return Math.min(Math.max(this.tabsField.activeTabIndex, 0), this.tabsField.tabs.length - 1);
  }

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

  onDropOnTab(tabIndex: number, event: CdkDragDrop<SimpleField[]>): void {
    this.dropOnTab.emit({ fieldIndex: this.fieldIndex, tabIndex, event });
  }

  getConnectedTargets(tabId: string): string[] {
    return ['fieldPalette', ...this.connectedTargets.filter(id => id !== tabId)];
  }
}

