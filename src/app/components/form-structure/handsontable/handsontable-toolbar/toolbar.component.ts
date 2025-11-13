import { Component, EventEmitter, HostListener, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import Handsontable from 'handsontable';

interface SelectedRange {
  from: { row: number, col: number };
  to: { row: number, col: number };
}
@Component({
  selector: 'app-handsontable-toolbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss'],
})
export class HandsontableToolbarComponent {
  @Output() action = new EventEmitter<{ action: string; value?: string }>();

  // dropdown state lives HERE
  showValidate = false;
  showInserts = false;
  showMore = false;

  selectedMode: 'static' | 'dynamic' = 'static'; // Default is Static
  isDropdownOpen = false;

  emit(action: string, valueOrEvent?: string | Event) {
    let value: string | undefined;
    if (typeof valueOrEvent === 'string') value = valueOrEvent;
    else if (valueOrEvent && 'target' in valueOrEvent)
      value = (valueOrEvent.target as HTMLInputElement).value;
    this.action.emit({ action, value });
  }

  toggleValidate() { 
    this.showValidate = !this.showValidate; 
    this.showInserts = false; 
  }
  toggleInserts() { 
    this.showInserts = !this.showInserts; 
    this.showValidate = false; 
  }
  toggleMore() { 
    this.showMore = !this.showMore; 
  }

  // close when clicking outside any dropdown
  @HostListener('document:click', ['$event'])
  closeDropdownOnOutsideClick(event: MouseEvent) {
    const t = event.target as HTMLElement;
    const inside =
      t.closest('.validate-dropdown') ||
      t.closest('.insert-dropdown') ||
      t.closest('.more-menu');
    if (!inside) {
      this.showValidate = false;
      this.showInserts = false;
      this.showMore = false;
    }
  }

  // Toggle dropdown visibility
  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  // Select Mode (Static/Dynamic)
  selectMode(mode: 'static' | 'dynamic') {
    this.selectedMode = mode;
    this.isDropdownOpen = false;
  }

  // Button actions
  markSelectionAsMeasurement() {
    this.setFieldCategoryOnSelection('measurement');
    this.showToast('✅ Marked selection as Measurement', 'success');
  }

  markSelectionAsEquipment() {
    this.setFieldCategoryOnSelection('equipment');
    this.showToast('✅ Marked selection as Equipment', 'success');
  }

  private setFieldCategoryOnSelection(category: 'measurement' | 'equipment') {
    this.forEachSelectedCell((r, c, hot) => {
      hot.setCellMeta(r, c, 'fieldCategory', category);
    });
    this.getHot()?.render();
  }

  private forEachSelectedCell(callback: (r: number, c: number, hot: Handsontable.Core) => void) {
    const hot = this.getHot();
    if (!hot) return;

    const selectedRange: SelectedRange[] = hot.getSelectedRange() ?? [];
    if (selectedRange.length) {
      selectedRange.forEach((range: SelectedRange) => {
        for (let r = range.from.row; r <= range.to.row; r++) {
          for (let c = range.from.col; c <= range.to.col; c++) {
            callback(r, c, hot);
          }
        }
      });
    }
  }

  private getHot(): Handsontable.Core | null {
  return (window as any)['hot'] as Handsontable.Core;
}

  showToast(message: string, type: 'success' | 'error') {
    // Show toast message based on type
    console.log(`${type}: ${message}`);
  }

  onFillingDirectionChange(event: any) {
    // Handle filling direction change if necessary
    console.log('Filling direction selected:', event.target.value);
  }

  // Check if buttons should be disabled based on selected mode
  isButtonDisabled(buttonName: string): boolean {
    return this.selectedMode === 'static' && ['Measurement', 'Section', 'Filling Direction'].includes(buttonName);
  }
}
