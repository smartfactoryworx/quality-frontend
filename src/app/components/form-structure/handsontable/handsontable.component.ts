import { Component, ViewChild, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { HandsontableToolbarComponent } from './handsontable-toolbar/toolbar.component';
import { HandsontableRoleModalComponent } from './handsontable-role-modal/role-modal.component';
import { HandsontableGridComponent } from './handsontable-grid/grid.component';

import { HandsontableService } from './handsontable.service';
import { Kind, Opt } from './types';
import { PLATFORM_ID } from '@angular/core';

@Component({
  selector: 'app-handsontable',
  standalone: true,
  imports: [
    CommonModule, FormsModule, HttpClientModule,
    HandsontableToolbarComponent, HandsontableRoleModalComponent, HandsontableGridComponent
  ],
  providers: [HandsontableService],
  templateUrl: './handsontable.component.html'
})
export class HandsontableComponent {
  private svc = inject(HandsontableService);
  isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  // dropdown options
  EQUIP_URL = 'https://coke.smartfactoryworx.tech/api/manual/equipmentNew?type=all&line_id=65ded937618e06863492f3bc';
  STATUS_URL = 'https://coke.smartfactoryworx.tech/api/manual/statuscolour?line_id=65ded937618e06863492f3bc';
  opts: Record<Kind, Opt[]> = { equip: [], status: [] };

  // filling direction
  fillingDirectionOptions = [
    { value: '', label: 'Select direction' },
    { value: 'left_to_right', label: 'Left to Right' },
    { value: 'top_to_bottom', label: 'Top to Bottom' },
  ];
  selectedFillingDirection: '' | 'left_to_right' | 'top_to_bottom' = '';

  // role modal
  showRoleModal = false;
  selectedRoles: string[] = [];
  roleOptions: string[] = ['Operator', 'Supervisor', 'QA', 'Admin'];

  @ViewChild(HandsontableGridComponent) grid!: HandsontableGridComponent;

  ngOnInit() {
    this.svc.fetchDropdownOptions(this.EQUIP_URL, this.STATUS_URL).subscribe((m) => {
      this.opts = m;
    });
  }

  // toolbar → grid bridges
  onToolbar(e: {action:string; value?:string}) {
  switch (e.action) {
    case 'textColor':         this.grid.applyTextColor(e.value!); break;
    case 'bgColor':           this.grid.applyBackgroundColor(e.value!); break;
    case 'textStyle':         this.grid.applyTextStyle(e.value as any); break;
    case 'textAlign':         this.grid.applyTextAlign(e.value as any); break;
    case 'applyAllBorders':   this.grid.applyAllBorders(); break;

    case 'validate':          this.grid.applyValidation(e.value as any); break;
    case 'mandatory':         e.value==='make' ? this.grid['makeRequired']?.() : this.grid['clearRequired']?.(); break;

    case 'insert':
      if (e.value==='equip')      this.grid.applyDropdown('equip');
      else if (e.value==='status')this.grid.applyDropdown('status');
      else if (e.value==='checkbox') this.grid.applyCheckbox();
      else if (e.value==='datetime') this.grid.applyDateTime();
      break;

    case 'clear':             this.grid.clearSelection(); break;
    case 'approval':          this.grid.applyApprovalCheckbox(); break;
    case 'mark':
      e.value==='measurement' ? this.grid.markSelectionAsMeasurement()
                              : this.grid.markSelectionAsEquipment();
      break;

    case 'save':              this.grid.saveStructure(); break;
    case 'submit':            this.grid.submit(); break;
    case 'dummy':             this.grid.loadDummyData(); break;
  }
}

  // role modal
  onConfirmRole(roles: string[]) {
    this.selectedRoles = roles;
    this.grid.setApprovalRolesOnSelection(roles);
    this.showRoleModal = false;
  }
  onCancelRole() { this.showRoleModal = false; }

  updateFillingDirection(dir: '' | 'left_to_right' | 'top_to_bottom') {
    this.selectedFillingDirection = dir;
    // pass to grid if you want to persist it there too:
    (this.grid as any).fillingDirection = dir;
    this.svc.toast(`✅ Filling direction set to ${dir || 'none'}`, 'success');
  }

  onDataChanged(ev:any) {
    console.log('📊 Grid data updated:', ev);
  }
}
