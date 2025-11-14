import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { HandsontableComponent } from '../form-structure/handsontable/handsontable.component';

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [CommonModule, DragDropModule, FormsModule, HandsontableComponent],
  templateUrl: './tabs.component.html',
  styleUrls: ['./tabs.component.scss']
})
export class TabsComponent {
  @Input() tabsField!: any;
  @Input() fieldIndex!: number;
  @Input() connectedTargets: string[] = [];

  @Output() addTab = new EventEmitter<number>();
  @Output() deleteTab = new EventEmitter<{ fieldIndex: number; tabIndex: number }>();
  @Output() updateTabTitle = new EventEmitter<{ fieldIndex: number; tabIndex: number; value: string }>();
  @Output() setActiveTab = new EventEmitter<{ fieldIndex: number; tabIndex: number }>();
  @Output() deleteNestedField = new EventEmitter<{ fieldIndex: number; tabIndex: number; nestedIndex: number }>();
  @Output() dropOnTab = new EventEmitter<{ fieldIndex: number; tabIndex: number; event: CdkDragDrop<any[]> }>();
  @Output() addSpreadsheet = new EventEmitter<{ fieldIndex: number; tabIndex: number }>();

  getTabListId(tab: any): string {
    return `tab-${this.tabsField.id}-${tab.id}`;
  }

  getActiveTab(): any | null {
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

  onDropOnTab(tabIndex: number, event: CdkDragDrop<any[]>): void {
    this.dropOnTab.emit({ fieldIndex: this.fieldIndex, tabIndex, event });
  }

  getConnectedTargets(tabId: string): string[] {
    return this.connectedTargets.filter((id) => id !== tabId);
  }

  onAddSpreadsheet(): void {
    this.addSpreadsheet.emit({ fieldIndex: this.fieldIndex, tabIndex: this.getActiveTabIndex() });
  }
}

