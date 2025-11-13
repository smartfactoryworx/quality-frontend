import {
  Component, Input, Output, EventEmitter, AfterViewInit, Inject, PLATFORM_ID, ChangeDetectorRef
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HotTableModule, HotTableRegisterer } from '@handsontable/angular';
import Handsontable from 'handsontable';
import { Opt, Kind } from '../types';
import { DateTimeEditor } from '../datetime-editor';
import { HandsontableService } from '../handsontable.service';

@Component({
  selector: 'app-handsontable-grid',
  standalone: true,
  imports: [CommonModule, HotTableModule],
  templateUrl: './grid.component.html',
  styleUrls: ['./grid.component.scss']
})
export class HandsontableGridComponent implements AfterViewInit {
  private registerer = new HotTableRegisterer();
  isBrowser: boolean;

  @Input() equipmentOptions: Opt[] = [];
  @Input() statusOptions: Opt[] = [];
  @Input() fillingDirection: '' | 'left_to_right' | 'top_to_bottom' = '';

  @Output() dataChanged = new EventEmitter<any>();
  @Output() openRoleModal = new EventEmitter<void>();

  hotId = 'mainGrid';
  data: any[][] = Array.from({ length: 12 }, () => Array(6).fill(null));
  gridSettings: Handsontable.GridSettings & { licenseKey?: string } = {
    
      licenseKey: 'non-commercial-and-evaluation',
      data: this.data, 
      rowHeaders: true, colHeaders: true,
      stretchH: 'none', colWidths: 150, height: 460,
      autoRowSize: false, autoColumnSize: false,
      dropdownMenu: true, filters: true, wordWrap: false,
      outsideClickDeselects: false, manualColumnResize: true, manualRowResize: true,
      mergeCells: true,

      afterValidate: (isValid, value, row, prop, source) => {
        const key = `${row}-${prop}`;
        if (!isValid) {
          this.invalidCells.add(key);
          if (source === 'edit') {
            const cur = value ?? 'empty';
            const last = this.cellLastValues.get(key);
            if (cur !== last) { this.ui.toast(`⚠️ Invalid value "${cur}"`, 'error'); this.cellLastValues.set(key, cur); }
          }
        } else {
          this.invalidCells.delete(key);
          this.cellLastValues.set(key, value);
        }
        return true;
      },

      cells: () => ({
        renderer: (inst, td, r, c, prop, value, cp) => {
          const meta: any = inst.getCellMeta(r, c);

          // checkbox
          if (meta?.type === 'checkbox') {
            Handsontable.renderers.CheckboxRenderer(inst, td, r, c, prop, value, cp);
            if (meta?.style) Object.assign(td.style, meta.style);
            td.style.borderRight = '3px solid #66bb6a';

            // approval stamp (only for approval checkboxes)
            const isApproval = Array.isArray(meta?.allowedClickRoles) && meta.allowedClickRoles.length > 0;
            td.querySelector('.checkbox-approval-stamp')?.remove();
            if (isApproval && meta?.approvalStamp) {
              setTimeout(() => {
                const span = document.createElement('span');
                span.className = 'checkbox-approval-stamp';
                span.textContent = meta.approvalStamp;
                Object.assign(span.style, { position: 'absolute', left: '28px', top: '50%', transform: 'translateY(-50%)',
                  fontSize: '10px', color: '#666', whiteSpace: 'nowrap', pointerEvents: 'none' });
                const box = td.querySelector('input[type="checkbox"]');
                if (box && !td.querySelector('.checkbox-approval-stamp')) td.appendChild(span);
              }, 10);
            }

            const tips: string[] = [];
            if (Array.isArray(meta?.allowedClickRoles) && meta.allowedClickRoles.length) tips.push(`Approved Users: ${meta.allowedClickRoles.join(', ')}`);
            const lbl = this.getAppliedLabel(r, c); if (lbl) tips.push(lbl);
            if (meta?.isMandatory) tips.push('Mandatory Field');
            if (tips.length) td.title = tips.join(' | ');

            if (meta?.isMandatory) td.style.outline = '2px solid #f57c00'; else if (td.style.outline) td.style.outline = '';
            td.querySelector('.dropdown-indicator')?.remove();
            return;
          }

          // text / dropdown / datetime
          Handsontable.renderers.TextRenderer(inst, td, r, c, prop, value, cp);

          const kind = meta.dropdownKind as Kind | undefined;
          if (kind) {
            const id = (value ?? '').toString();
            if (id) td.textContent = this.id2name[kind].get(id) ?? id;
            else { td.textContent = kind === 'equip' ? 'Select Equipment' : 'Select Status'; td.style.color = '#999'; td.style.fontStyle = 'italic'; }
          } else if (!value || value === '') {
            const hint = this.placeholderFromMeta(meta);
            if (hint) { td.textContent = hint; td.style.color = '#999'; td.style.fontStyle = 'italic'; }
          }

          if (meta?.style) Object.assign(td.style, meta.style);
          td.style.borderRight = ''; td.querySelector('.dropdown-indicator')?.remove();

          if (meta.editor === 'datetime-local' || meta.editor === 'datetime') td.style.borderRight = '3px solid #050506ff';
          else if (meta.dropdownKind) {
            td.style.position = 'relative';
            const span = document.createElement('span');
            span.className = 'dropdown-indicator'; span.textContent = '▼';
            Object.assign(span.style, { position: 'absolute', top: '2px', right: '4px', fontSize: '10px', color: '#000', opacity: '0.7', pointerEvents: 'none' });
            td.appendChild(span);
          }

          if (meta?.isMandatory) { td.title = td.title || 'Mandatory Field'; td.style.outline = '2px solid #f57c00'; }
          else { if (td.title === 'Mandatory Field') td.removeAttribute('title'); if (td.style.outline) td.style.outline = ''; }

          const lbl = this.getAppliedLabel(r, c); if (lbl) td.title = lbl;

          if (meta?.validator && value && value !== '') {
            const key = `${r}-${c}`;
            if (this.invalidCells.has(key)) { td.style.border = '2px solid #d32f2f'; td.style.backgroundColor = '#ffebee'; td.title = 'Invalid value - please correct'; }
            else { td.style.border = ''; td.style.backgroundColor = ''; if (td.title === 'Invalid value - please correct') td.removeAttribute('title'); }
          }

          if (meta?.className) td.className += ' ' + meta.className;
        }
      }),

      beforeChange: (changes) => { this.guardCheckboxRole(changes); this.convertNameToId(changes); },

      afterSelectionEnd: (r, c, r2, c2) => {
        this.lastSel = { r1: Math.min(r, r2), c1: Math.min(c, c2), r2: Math.max(r, r2), c2: Math.max(c, c2) };
      },

      contextMenu: {
        items: {
          row_above: {}, row_below: {}, col_left: {}, col_right: {},
          remove_row: {}, remove_col: {}, clear_column: {},
          undo: {}, redo: {}, make_read_only: {}, alignment: {}, borders: {},
          mergeCells: {},
          hsep0: '---------',
          apply_equipment: { name: 'Apply Equipment dropdown', callback: () => this.applyDropdownToSelection('equip') },
          apply_status:   { name: 'Apply Status dropdown',   callback: () => this.applyDropdownToSelection('status') },
          insert_checkbox:{ name: 'Insert Checkbox',          callback: () => this.applyCheckboxInternal() },
          apply_datetime: { name: 'Apply Date/Time Editor',   callback: () => this.applyDateTimeInternal() },
          clear_selection:{ name: 'Clear Selection (All)',    callback: () => this.clearSelectionInternal() },
          hsep_style: '---------',
          toggle_bold: { name: 'Toggle Bold', callback: () => this.applyStyleToSelection({ fontWeight: '700' }) },
          text_red:    { name: 'Text → Red',  callback: () => this.applyStyleToSelection({ color: '#c62828' }) },
          bg_yellow:   { name: 'Background → Yellow', callback: () => this.applyStyleToSelection({ backgroundColor:'#fff59d' }) },
          align_center:{ name: 'Align → Center', callback: () => this.applyStyleToSelection({ textAlign:'center' }) },
          hsep_req: '---------',
          make_required:  { name: 'Mark as Required', callback: () => this.makeRequired() },
          clear_required: { name: 'Clear “Required”', callback: () => this.clearRequired() },
          hsep_val: '---------',
          val_date:  { name: 'Validate → Date',       callback: () => this.applyValidationInternal('date') },
          val_time:  { name: 'Validate → Time',       callback: () => this.applyValidationInternal('time') },
          val_int:   { name: 'Validate → Integer',    callback: () => this.applyValidationInternal('integer') },
          val_float: { name: 'Validate → Float',      callback: () => this.applyValidationInternal('float') },
          val_str:   { name: 'Validate → Not empty',  callback: () => this.applyValidationInternal('string') },
          hsep_cmp: '---------',
          cmp_static: { name: 'Compare → Static (e.g. > 5)', callback: () => this.applyCompareStatic() },
          cmp_between:{ name: 'Compare → Between (e.g. 5..10)', callback: () => this.applyCompareBetween() },
          cmp_clear:  { name: 'Compare → Clear rules', callback: () => this.clearCompareRules() },
        }
      } as any,

      afterChange: (changes, source) => {
        if (source === 'edit') { setTimeout(() => this.hot.render(), 100); this.dataChanged.emit(this.hot.getData()); }
        if (source === 'loadData' || changes === null) return;

        const stamp = () => {
          const user = 'User1'; // wire to real user
          const dt = new Date().toLocaleString();
          return `${user} @ ${dt}`;
        };

        changes.forEach(([row, prop, oldValue, newValue]) => {
          const h = this.hot; if (!h || typeof prop !== 'number') return;
          const meta: any = h.getCellMeta(row, prop);
          if (meta?.type === 'checkbox') {
            const isApproval = Array.isArray(meta?.allowedClickRoles) && meta.allowedClickRoles.length > 0;
            if (newValue === true && isApproval) { h.setCellMeta(row, prop, 'approvalStamp', stamp()); h.setCellMeta(row, prop, 'readOnly', true); setTimeout(() => h.render(), 50); }
            else if (newValue === false && isApproval) { h.removeCellMeta(row, prop, 'approvalStamp'); setTimeout(() => h.render(), 50); }
          }
        });
      },
    
  };

  // mirrors of your state
  currentUserRole = 'Operator';
  private lastSel: { r1: number; c1: number; r2: number; c2: number } | null = null;
  private invalidCells = new Set<string>();
  private cellLastValues = new Map<string, any>();

  id2name: Record<Kind, Map<string, string>> = { equip: new Map(), status: new Map() };
  name2id: Record<Kind, Map<string, string>> = { equip: new Map(), status: new Map() };

  constructor(
    @Inject(PLATFORM_ID) platformId: Object,
    private cdr: ChangeDetectorRef,
    private ui: HandsontableService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngAfterViewInit() {
    if (!this.isBrowser) return;
    Handsontable.editors.registerEditor('datetime', DateTimeEditor);
    this.rebuildMaps();
  }

  // ---------- External API (called by parent) ----------
  // styling
  applyTextColor(v: string) { this.applyStyleToSelection({ color: v }); }
  applyBackgroundColor(v: string) { this.applyStyleToSelection({ backgroundColor: v }); }
  applyTextStyle(kind: 'bold' | 'italic' | 'underline') {
    if (kind === 'bold') this.applyStyleToSelection({ fontWeight: 'bold' });
    if (kind === 'italic') this.applyStyleToSelection({ fontStyle: 'italic' });
    if (kind === 'underline') this.applyStyleToSelection({ textDecoration: 'underline' });
  }
  applyTextAlign(align: 'left' | 'center' | 'right') { this.applyStyleToSelection({ textAlign: align }); }
  applyAllBorders() { this.applyAllBordersInternal(); }

  // inserts
  applyDropdown(kind: 'equip' | 'status') { this.applyDropdownToSelection(kind); }
  applyCheckbox() { this.applyCheckboxInternal(); }
  applyDateTime() { this.applyDateTimeInternal(); }
  applyApprovalCheckbox() { this.openRoleModal.emit(); } // parent opens modal for role selection
  markSelectionAsMeasurement() { this.forEachCell((r, c, h) => h.setCellMeta(r, c, 'fieldCategory', 'measurement')); h_render(this.hot); }
  markSelectionAsEquipment() { this.forEachCell((r, c, h) => h.setCellMeta(r, c, 'fieldCategory', 'equipment')); h_render(this.hot); }
  clearSelection() { this.clearSelectionInternal(); }
  loadDummyData() { const d = Array.from({ length: 8 }, (_, r) => Array.from({ length: 10 }, (_, c) => `R${r + 1}C${c + 1}`)); this.hot.loadData(d); }

  // validations & compare
  applyValidation(rule: 'date'|'time'|'integer'|'float'|'string') { this.applyValidationInternal(rule); }
  applyStaticComparisonToSelection() { this.applyCompareStatic(); }
  applyBetweenComparisonToSelection() { this.applyCompareBetween(); }
  clearComparisonRulesFromSelection() { this.clearCompareRules(); }

  // submit/save/restore
  submit() { this.submitGrid(); }
  saveStructure() { this.saveStructureInternal(); }
  restoreFromPayload(payload: any) { this.restoreInternal(payload); }

  // role-assignment from parent
  setApprovalRolesOnSelection(roles: string[]) {
    const h = this.hot; const sel = this.selBox();
    for (let r = sel.r1; r <= sel.r2; r++) for (let c = sel.c1; c <= sel.c2; c++) {
      h.setCellMeta(r, c, 'type', 'checkbox');
      h.setCellMeta(r, c, 'allowedClickRoles', roles.slice());
      // left align approval checkbox for stamp space
      const meta: any = h.getCellMeta(r, c);
      h.setCellMeta(r, c, 'style', { ...(meta.style || {}), textAlign: 'left' });
    }
    h_render(h);
    this.ui.toast(`Assigned [${roles.join(', ')}]`, 'success');
  }

  // ---------- Internals ----------
  private rebuildMaps() {
    this.id2name.equip.clear(); this.name2id.equip.clear();
    this.id2name.status.clear(); this.name2id.status.clear();
    (this.equipmentOptions||[]).forEach(o => { this.id2name.equip.set(String(o._id), o.name); this.name2id.equip.set(o.name, String(o._id)); });
    (this.statusOptions||[]).forEach(o => { this.id2name.status.set(String(o._id), o.name); this.name2id.status.set(o.name, String(o._id)); });
  }

  // private initGrid() {
  //   this.gridSettings = {
  //     licenseKey: 'non-commercial-and-evaluation',
  //     data: this.data, 
  //     rowHeaders: true, colHeaders: true,
  //     stretchH: 'none', colWidths: 150, height: 460,
  //     autoRowSize: false, autoColumnSize: false,
  //     dropdownMenu: true, filters: true, wordWrap: false,
  //     outsideClickDeselects: false, manualColumnResize: true, manualRowResize: true,
  //     mergeCells: true,

  //     afterValidate: (isValid, value, row, prop, source) => {
  //       const key = `${row}-${prop}`;
  //       if (!isValid) {
  //         this.invalidCells.add(key);
  //         if (source === 'edit') {
  //           const cur = value ?? 'empty';
  //           const last = this.cellLastValues.get(key);
  //           if (cur !== last) { this.ui.toast(`⚠️ Invalid value "${cur}"`, 'error'); this.cellLastValues.set(key, cur); }
  //         }
  //       } else {
  //         this.invalidCells.delete(key);
  //         this.cellLastValues.set(key, value);
  //       }
  //       return true;
  //     },

  //     cells: () => ({
  //       renderer: (inst, td, r, c, prop, value, cp) => {
  //         const meta: any = inst.getCellMeta(r, c);

  //         // checkbox
  //         if (meta?.type === 'checkbox') {
  //           Handsontable.renderers.CheckboxRenderer(inst, td, r, c, prop, value, cp);
  //           if (meta?.style) Object.assign(td.style, meta.style);
  //           td.style.borderRight = '3px solid #66bb6a';

  //           // approval stamp (only for approval checkboxes)
  //           const isApproval = Array.isArray(meta?.allowedClickRoles) && meta.allowedClickRoles.length > 0;
  //           td.querySelector('.checkbox-approval-stamp')?.remove();
  //           if (isApproval && meta?.approvalStamp) {
  //             setTimeout(() => {
  //               const span = document.createElement('span');
  //               span.className = 'checkbox-approval-stamp';
  //               span.textContent = meta.approvalStamp;
  //               Object.assign(span.style, { position: 'absolute', left: '28px', top: '50%', transform: 'translateY(-50%)',
  //                 fontSize: '10px', color: '#666', whiteSpace: 'nowrap', pointerEvents: 'none' });
  //               const box = td.querySelector('input[type="checkbox"]');
  //               if (box && !td.querySelector('.checkbox-approval-stamp')) td.appendChild(span);
  //             }, 10);
  //           }

  //           const tips: string[] = [];
  //           if (Array.isArray(meta?.allowedClickRoles) && meta.allowedClickRoles.length) tips.push(`Approved Users: ${meta.allowedClickRoles.join(', ')}`);
  //           const lbl = this.getAppliedLabel(r, c); if (lbl) tips.push(lbl);
  //           if (meta?.isMandatory) tips.push('Mandatory Field');
  //           if (tips.length) td.title = tips.join(' | ');

  //           if (meta?.isMandatory) td.style.outline = '2px solid #f57c00'; else if (td.style.outline) td.style.outline = '';
  //           td.querySelector('.dropdown-indicator')?.remove();
  //           return;
  //         }

  //         // text / dropdown / datetime
  //         Handsontable.renderers.TextRenderer(inst, td, r, c, prop, value, cp);

  //         const kind = meta.dropdownKind as Kind | undefined;
  //         if (kind) {
  //           const id = (value ?? '').toString();
  //           if (id) td.textContent = this.id2name[kind].get(id) ?? id;
  //           else { td.textContent = kind === 'equip' ? 'Select Equipment' : 'Select Status'; td.style.color = '#999'; td.style.fontStyle = 'italic'; }
  //         } else if (!value || value === '') {
  //           const hint = this.placeholderFromMeta(meta);
  //           if (hint) { td.textContent = hint; td.style.color = '#999'; td.style.fontStyle = 'italic'; }
  //         }

  //         if (meta?.style) Object.assign(td.style, meta.style);
  //         td.style.borderRight = ''; td.querySelector('.dropdown-indicator')?.remove();

  //         if (meta.editor === 'datetime-local' || meta.editor === 'datetime') td.style.borderRight = '3px solid #050506ff';
  //         else if (meta.dropdownKind) {
  //           td.style.position = 'relative';
  //           const span = document.createElement('span');
  //           span.className = 'dropdown-indicator'; span.textContent = '▼';
  //           Object.assign(span.style, { position: 'absolute', top: '2px', right: '4px', fontSize: '10px', color: '#000', opacity: '0.7', pointerEvents: 'none' });
  //           td.appendChild(span);
  //         }

  //         if (meta?.isMandatory) { td.title = td.title || 'Mandatory Field'; td.style.outline = '2px solid #f57c00'; }
  //         else { if (td.title === 'Mandatory Field') td.removeAttribute('title'); if (td.style.outline) td.style.outline = ''; }

  //         const lbl = this.getAppliedLabel(r, c); if (lbl) td.title = lbl;

  //         if (meta?.validator && value && value !== '') {
  //           const key = `${r}-${c}`;
  //           if (this.invalidCells.has(key)) { td.style.border = '2px solid #d32f2f'; td.style.backgroundColor = '#ffebee'; td.title = 'Invalid value - please correct'; }
  //           else { td.style.border = ''; td.style.backgroundColor = ''; if (td.title === 'Invalid value - please correct') td.removeAttribute('title'); }
  //         }

  //         if (meta?.className) td.className += ' ' + meta.className;
  //       }
  //     }),

  //     beforeChange: (changes) => { this.guardCheckboxRole(changes); this.convertNameToId(changes); },

  //     afterSelectionEnd: (r, c, r2, c2) => {
  //       this.lastSel = { r1: Math.min(r, r2), c1: Math.min(c, c2), r2: Math.max(r, r2), c2: Math.max(c, c2) };
  //     },

  //     contextMenu: {
  //       items: {
  //         row_above: {}, row_below: {}, col_left: {}, col_right: {},
  //         remove_row: {}, remove_col: {}, clear_column: {},
  //         undo: {}, redo: {}, make_read_only: {}, alignment: {}, borders: {},
  //         mergeCells: {},
  //         hsep0: '---------',
  //         apply_equipment: { name: 'Apply Equipment dropdown', callback: () => this.applyDropdownToSelection('equip') },
  //         apply_status:   { name: 'Apply Status dropdown',   callback: () => this.applyDropdownToSelection('status') },
  //         insert_checkbox:{ name: 'Insert Checkbox',          callback: () => this.applyCheckboxInternal() },
  //         apply_datetime: { name: 'Apply Date/Time Editor',   callback: () => this.applyDateTimeInternal() },
  //         clear_selection:{ name: 'Clear Selection (All)',    callback: () => this.clearSelectionInternal() },
  //         hsep_style: '---------',
  //         toggle_bold: { name: 'Toggle Bold', callback: () => this.applyStyleToSelection({ fontWeight: '700' }) },
  //         text_red:    { name: 'Text → Red',  callback: () => this.applyStyleToSelection({ color: '#c62828' }) },
  //         bg_yellow:   { name: 'Background → Yellow', callback: () => this.applyStyleToSelection({ backgroundColor:'#fff59d' }) },
  //         align_center:{ name: 'Align → Center', callback: () => this.applyStyleToSelection({ textAlign:'center' }) },
  //         hsep_req: '---------',
  //         make_required:  { name: 'Mark as Required', callback: () => this.makeRequired() },
  //         clear_required: { name: 'Clear “Required”', callback: () => this.clearRequired() },
  //         hsep_val: '---------',
  //         val_date:  { name: 'Validate → Date',       callback: () => this.applyValidationInternal('date') },
  //         val_time:  { name: 'Validate → Time',       callback: () => this.applyValidationInternal('time') },
  //         val_int:   { name: 'Validate → Integer',    callback: () => this.applyValidationInternal('integer') },
  //         val_float: { name: 'Validate → Float',      callback: () => this.applyValidationInternal('float') },
  //         val_str:   { name: 'Validate → Not empty',  callback: () => this.applyValidationInternal('string') },
  //         hsep_cmp: '---------',
  //         cmp_static: { name: 'Compare → Static (e.g. > 5)', callback: () => this.applyCompareStatic() },
  //         cmp_between:{ name: 'Compare → Between (e.g. 5..10)', callback: () => this.applyCompareBetween() },
  //         cmp_clear:  { name: 'Compare → Clear rules', callback: () => this.clearCompareRules() },
  //       }
  //     } as any,

  //     afterChange: (changes, source) => {
  //       if (source === 'edit') { setTimeout(() => this.hot.render(), 100); this.dataChanged.emit(this.hot.getData()); }
  //       if (source === 'loadData' || changes === null) return;

  //       const stamp = () => {
  //         const user = 'User1'; // wire to real user
  //         const dt = new Date().toLocaleString();
  //         return `${user} @ ${dt}`;
  //       };

  //       changes.forEach(([row, prop, oldValue, newValue]) => {
  //         const h = this.hot; if (!h || typeof prop !== 'number') return;
  //         const meta: any = h.getCellMeta(row, prop);
  //         if (meta?.type === 'checkbox') {
  //           const isApproval = Array.isArray(meta?.allowedClickRoles) && meta.allowedClickRoles.length > 0;
  //           if (newValue === true && isApproval) { h.setCellMeta(row, prop, 'approvalStamp', stamp()); h.setCellMeta(row, prop, 'readOnly', true); setTimeout(() => h.render(), 50); }
  //           else if (newValue === false && isApproval) { h.removeCellMeta(row, prop, 'approvalStamp'); setTimeout(() => h.render(), 50); }
  //         }
  //       });
  //     },
  //   };
  // }

  // ----- utilities
  get hot() { return this.registerer.getInstance(this.hotId)!; }
  private selBox() {
    const live = this.hot.getSelectedRangeLast();
    return live
      ? { r1: Math.min(live.from.row, live.to.row), c1: Math.min(live.from.col, live.to.col), r2: Math.max(live.from.row, live.to.row), c2: Math.max(live.from.col, live.to.col) }
      : (this.lastSel ?? { r1: 0, c1: 0, r2: 0, c2: 0 });
  }
  private forEachCell(cb:(r:number,c:number,h:Handsontable.Core)=>void) {
    const h = this.hot; const ranges = h.getSelectedRange(); if (!ranges?.length) return;
    for (const rg of ranges) {
      const r1 = Math.min(rg.from.row, rg.to.row), r2 = Math.max(rg.from.row, rg.to.row);
      const c1 = Math.min(rg.from.col, rg.to.col), c2 = Math.max(rg.from.col, rg.to.col);
      for (let r=r1;r<=r2;r++) for (let c=c1;c<=c2;c++) cb(r,c,h);
    }
  }
  private applyStyleToSelection(style: Partial<CSSStyleDeclaration>) {
    this.forEachCell((r,c,h) => {
      const meta:any = h.getCellMeta(r,c);
      const next = { ...(meta.style||{}), ...style };
      h.setCellMeta(r,c,'style',next);
    });
    h_render(this.hot);
  }
  private applyAllBordersInternal() {
    const h = this.hot; const sel = h.getSelectedRangeLast(); if (!sel) return;
    const plugin:any = h.getPlugin('customBorders'); if (!plugin) return;
    const from = { row: Math.min(sel.from.row, sel.to.row), col: Math.min(sel.from.col, sel.to.col) };
    const to   = { row: Math.max(sel.from.row, sel.to.row), col: Math.max(sel.from.col, sel.to.col) };
    plugin.setBorders([[from.row, from.col, to.row, to.col]], {
      top:{width:1,color:'#000'}, right:{width:1,color:'#000'}, bottom:{width:1,color:'#000'}, left:{width:1,color:'#000'}
    });
    h_render(h);
  }

  private applyDropdownToSelection(kind: Kind) {
    const h = this.hot;
    const src = (kind==='equip'? this.equipmentOptions : this.statusOptions).map(o=>o.name);
    if (!src.length) return;
    const S = this.selBox();
    for (let r=S.r1;r<=S.r2;r++) for (let c=S.c1;c<=S.c2;c++) {
      this.clearMeta(h,r,c);
      h.setCellMeta(r,c,'editor','dropdown');
      h.setCellMeta(r,c,'type','text');
      h.setCellMeta(r,c,'strict',true);
      h.setCellMeta(r,c,'allowInvalid',true);
      h.setCellMeta(r,c,'source',src);
      h.setCellMeta(r,c,'dropdownKind',kind);
    }
    h_render(h); h.selectCell(S.r1,S.c1,S.r2,S.c2,true,true);
  }
  private applyCheckboxInternal() {
    const h = this.hot; const S = this.selBox();
    for (let r=S.r1;r<=S.r2;r++) for (let c=S.c1;c<=S.c2;c++) {
      this.clearMeta(h,r,c);
      h.setCellMeta(r,c,'type','checkbox');
      h.setCellMeta(r,c,'className','htCenter');
      const cur = h.getDataAtCell(r,c);
      if (cur === '' || cur == null) h.setDataAtCell(r,c,false);
    }
    h_render(h); h.selectCell(S.r1,S.c1,S.r2,S.c2,true,true);
  }
  private applyDateTimeInternal() {
    const h = this.hot; const S = this.selBox();
    for (let r=S.r1;r<=S.r2;r++) for (let c=S.c1;c<=S.c2;c++) {
      this.clearMeta(h,r,c);
      h.setCellMeta(r,c,'editor','datetime');
    }
    h_render(h); h.selectCell(S.r1,S.c1,S.r2,S.c2,true,true);
  }
  private clearSelectionInternal() {
    const h=this.hot; this.forEachCell((r,c,hh)=>{
      hh.setDataAtCell(r,c,null,'clearSelection');
      this.clearMeta(hh,r,c,true);
    });
    h_render(h);
  }
  private clearMeta(h:Handsontable.Core,r:number,c:number,keepStyle=false){
    h.removeCellMeta(r,c,'editor'); h.removeCellMeta(r,c,'type'); h.removeCellMeta(r,c,'dropdownKind');
    h.removeCellMeta(r,c,'source'); h.removeCellMeta(r,c,'strict'); h.removeCellMeta(r,c,'allowInvalid');
    h.removeCellMeta(r,c,'isMandatory'); h.removeCellMeta(r,c,'baseValidation'); h.removeCellMeta(r,c,'compareRule');
    h.removeCellMeta(r,c,'validator'); h.setCellMeta(r,c,'valid',true); h.removeCellMeta(r,c,'className');
    h.removeCellMeta(r,c,'readOnly'); h.removeCellMeta(r,c,'fieldCategory'); h.removeCellMeta(r,c,'approvalStamp');
    if (!keepStyle) h.removeCellMeta(r,c,'style');
  }

  private placeholderFromMeta(meta:any):string|null{
    const parts:string[]=[];
    const base:string|undefined = meta['baseValidation'];
    if (base==='date') parts.push('Date (MM/DD/YYYY)');
    else if (base==='time') parts.push('HH:mm');
    else if (base==='integer') parts.push('Enter integer');
    else if (base==='float') parts.push('Enter number');
    else if (base==='string') parts.push('Enter text');
    else {
      if (meta?.type==='date') parts.push('Date (MM/DD/YYYY)');
      if (meta?.type==='time' && meta?.validator) parts.push('HH:mm');
      if (meta?.type==='numeric') parts.push('Enter number');
      if (meta?.editor==='datetime' || meta?.editor==='datetime-local') parts.push('Date & Time');
    }
    const cmp = meta?.compareRule;
    if (cmp) {
      if (cmp.type==='static' && cmp.op && (cmp.rhs ?? '')!=='') parts.push(`${cmp.op} ${cmp.rhs}`);
      else if (cmp.type==='between' && (cmp.min ?? '')!=='' && (cmp.max ?? '')!=='') parts.push(`between ${cmp.min} and ${cmp.max}`);
    }
    if (meta?.isMandatory) parts.push('*required');
    return parts.length? parts.join(' | '): null;
  }

  private getAppliedLabel(r:number,c:number):string|null{
    const meta:any = this.hot.getCellMeta(r,c);
    if (meta.type==='checkbox') return 'Checkbox';
    if (meta.editor==='datetime' || meta.editor==='datetime-local') return 'Date/Time Picker';
    if (meta.dropdownKind==='equip') return 'Select Equipment';
    if (meta.dropdownKind==='status') return 'Select Status';
    return null;
  }

  private guardCheckboxRole(changes:(Handsontable.CellChange|null)[]|null){
    const h=this.hot; if (!h || !changes) return;
    for (let i=0;i<changes.length;i++){
      const ch=changes[i]; if(!ch)continue;
      const [row,prop,oldVal,newVal]=ch;
      const col = typeof prop==='number'? prop : h.propToCol(prop as any);
      const meta:any = h.getCellMeta(row as number, col as number);
      const isCheckbox = meta?.type==='checkbox';
      const roles = (meta?.allowedClickRoles as string[]|undefined) ?? [];
      const toggle = oldVal!==newVal;
      if (isCheckbox && roles.length && !roles.includes(this.currentUserRole) && toggle){
        changes[i]=null;
        this.ui.toast(`Not allowed. Only [${roles.join(', ')}] can click.`, 'warning');
      }
    }
  }

  private convertNameToId(changes:(Handsontable.CellChange|null)[]|null){
    const h=this.hot; if(!h||!changes)return;
    for (const ch of changes){
      if(!ch)continue;
      const [row,col,_old,newVal]=ch;
      if (typeof col!=='number' || typeof newVal!=='string') continue;
      const kind = (h.getCellMeta(row as number, col) as any).dropdownKind as Kind|undefined;
      if (kind){ const id = this.name2id[kind].get(newVal); if (id) ch[3]=id; }
    }
  }

  // validations & compare
  private requiredValidator = (value:any, cb:(ok:boolean)=>void) => cb(value != null && String(value).trim() !== '');

  private buildCompositeValidator(h:Handsontable.Core,r:number,c:number){
    const meta:any = h.getCellMeta(r,c);
    const base:string|undefined = meta['baseValidation'];
    const cmp:any = meta['compareRule'];

    const baseOk = (v:any):boolean => {
      switch (base){
        case 'date': return [/^\d{4}-\d{2}-\d{2}$/, /^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}$/].some(rx=>rx.test(v??''));
        case 'time': return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v??'');
        case 'integer': return /^-?\d+$/.test(String(v ?? ''));
        case 'float': return /^-?\d+(\.\d+)?$/.test(String(v ?? ''));
        case 'string': return typeof v === 'string' && v.trim().length > 0;
        default: return true;
      }
    };
    const cmpOk = (v:any):boolean => {
      if (!cmp) return true;
      const toNum = (x:any)=> (x!==null && x!=='' && !isNaN(Number(x))) ? Number(x) : x;
      const L:any = toNum(v);
      if (cmp.type==='static'){
        const R:any = toNum(cmp.rhs);
        switch (cmp.op){
          case '>': return L>R; case '>=': return L>=R; case '<': return L<R; case '<=': return L<=R; case '==': return L==R; case '!=': return L!=R;
          default: return true;
        }
      }
      if (cmp.type==='between'){
        const min:any = toNum(cmp.min), max:any = toNum(cmp.max);
        return (L>=min) && (L<=max);
      }
      return true;
    };

    const composite = (v:any, cb:(ok:boolean)=>void)=>{
      if (meta['isMandatory']) { const okReq = v!=null && String(v).trim()!==''; if(!okReq) return cb(false); }
      if (!baseOk(v)) return cb(false);
      if (!cmpOk(v)) return cb(false);
      cb(true);
    };

    h.setCellMeta(r,c,'validator',composite);
    h.setCellMeta(r,c,'allowInvalid',true);
  }

  private applyValidationInternal(rule:'date'|'time'|'integer'|'float'|'string'){
    this.forEachCell((r,c,h)=>{
      h.setCellMeta(r,c,'baseValidation',rule);
      if (rule==='date') h.setCellMeta(r,c,'type','date');
      else if (rule==='time') h.setCellMeta(r,c,'type','time');
      else if (rule==='integer' || rule==='float') h.setCellMeta(r,c,'type','numeric');
      else h.setCellMeta(r,c,'type','text');
      this.buildCompositeValidator(h,r,c);
    });
    this.hot.validateCells(()=>this.hot.render());
  }

  private applyCompareStatic(){
    const h=this.hot; const op = prompt('Enter operator (>, >=, <, <=, ==, !=):','>'); if(!op) return;
    const rhs = prompt('Enter value:','0'); if(rhs==null) return;
    this.forEachCell((r,c,hh)=>{ hh.setCellMeta(r,c,'compareRule',{type:'static', op, rhs}); this.buildCompositeValidator(hh,r,c); });
    h.validateCells(()=>h.render());
  }

  private applyCompareBetween(){
    const h=this.hot; const min = prompt('Enter minimum:','0'); if(min==null) return;
    const max = prompt('Enter maximum:','10'); if(max==null) return;
    this.forEachCell((r,c,hh)=>{ hh.setCellMeta(r,c,'compareRule',{type:'between', min, max}); this.buildCompositeValidator(hh,r,c); });
    h.validateCells(()=>h.render());
  }

  private clearCompareRules(){
    const h=this.hot;
    this.forEachCell((r,c,hh)=>{ hh.removeCellMeta(r,c,'compareRule'); hh.removeCellMeta(r,c,'validator'); hh.removeCellMeta(r,c,'allowInvalid'); hh.setCellMeta(r,c,'valid',true); });
    h.render();
  }

  private makeRequired(){ this.forEachCell((r,c,h)=>{ h.setCellMeta(r,c,'isMandatory',true); h.setCellMeta(r,c,'validator',this.requiredValidator); h.setCellMeta(r,c,'allowInvalid',false); }); h_render(this.hot); }
  private clearRequired(){ this.forEachCell((r,c,h)=>{ h.removeCellMeta(r,c,'isMandatory'); h.removeCellMeta(r,c,'validator'); h.removeCellMeta(r,c,'allowInvalid'); h.setCellMeta(r,c,'valid',true); }); h_render(this.hot); }

  // submit/save/restore
  private submitGrid(){
    const h=this.hot; (h as any).destroyEditor?.();
    const rows=h.countRows(), cols=h.countCols();
    const merge:any = h.getPlugin('mergeCells');
    const merged = merge ? (merge as any).mergedCellsCollection?.mergedCells ?? [] : [];

    let hasMandatoryEmpty=false;
    const payloadRows:any[]=[];
    for(let r=0;r<rows;r++){
      const rowArr:any[]=[];
      for(let c=0;c<cols;c++){
        const meta:any=h.getCellMeta(r,c);
        const val=h.getDataAtCell(r,c);
        const kind = meta.dropdownKind as Kind|undefined;
        const stored = kind ? (this.name2id[kind].get(String(val)) ?? val) : val;
        const td=h.getCell(r,c);

        if(meta?.isMandatory){
          const empty = stored==null || String(stored).trim()==='';
          if (empty){ hasMandatoryEmpty=true; if(td){ td.style.border='2px solid #d32f2f'; td.title='This mandatory field is empty'; } }
          else if(td){ td.style.border='2px solid #f57c00'; td.removeAttribute('title'); }
        }

        let validationType:'text'|'date'|'time'|'numeric'|null=null;
        if (meta?.type==='date') validationType='date';
        else if (meta?.type==='time') validationType='time';
        else if (meta?.type==='numeric' || meta?.type==='integer' || meta?.type==='float') validationType='numeric';

        let controlType:'dropdown'|'checkbox'|'datetime'|null=null;
        if (kind) controlType='dropdown';
        else if (meta?.type==='checkbox') controlType='checkbox';
        else if (meta?.editor==='datetime' || meta?.editor==='datetime-local') controlType='datetime';

        const ds = kind ?? null;

        const cellData:any={
          row:r,col:c,
          value: stored ?? '',
          display: kind ? (this.id2name[kind].get(String(stored)) ?? stored) : stored,
          style: meta?.style || {},
          isMandatory: !!meta?.isMandatory,
          validationType, controlType, dataSource: ds,
          cellValue: String(stored ?? ''),
          validationRange: this.validationRangeFromMeta(meta),
          approvalCheckbox: meta?.type==='checkbox' && Array.isArray(meta?.allowedClickRoles) && meta.allowedClickRoles.length>0,
          approvedUser: Array.isArray(meta?.allowedClickRoles) ? meta.allowedClickRoles : null,
          fieldCategory: meta?.fieldCategory ?? null,
        };
        if (meta?.type==='checkbox' && meta?.approvalStamp) cellData.approvalStamp = meta.approvalStamp;

        rowArr.push(cellData);
      }
      payloadRows.push(rowArr);
    }

    if (hasMandatoryEmpty){ this.ui.toast('⚠️ Complete all mandatory fields before submitting.','error'); return; }

    h.validateCells((ok)=>{
      if(!ok){ this.ui.toast('⚠️ Fix invalid cells before submit.','error'); return; }
      const rowHeights = this.getRowHeights(h, rows);
      const colWidths = this.getColWidths(h, cols);
      const payload = {
        formName:'form name', createdAt:new Date().toISOString(),
        totalRows:rows, totalCols:cols,
        rowHeights, colWidths,
        mergedCells: merged.map((m:any)=>({ row:m.row, col:m.col, rowspan:m.rowspan, colspan:m.colspan })),
        data: payloadRows,
        fillingDirection: this.fillingDirection || null,
      };
      console.log('🧾 JSON:', JSON.stringify(payload, null, 2));
      this.ui.toast('✅ Submitted successfully!','success');
    });
  }

  private saveStructureInternal(){
    // uses your earlier header-detection logic; omitted for brevity in this snippet
    // keep your existing implementation here unchanged…
    this.ui.toast(`✅ Structure saved for layout: ${this.fillingDirection || 'detected'}`,'success');
  }

  private restoreInternal(payload:any){
    const h=this.hot; if(!h||!payload) return;
    const pure = payload.data.map((row:any[]) => row.map((cell:any)=> cell?.value ?? ''));
    h.loadData(pure);
    if (Array.isArray(payload.mergedCells) && payload.mergedCells.length>0) h.updateSettings({ mergeCells: payload.mergedCells });
    if (Array.isArray(payload.rowHeights) || Array.isArray(payload.colWidths)) h.updateSettings({ rowHeights: payload.rowHeights, colWidths: payload.colWidths });

    payload.data.forEach((row:any[], r:number)=>{
      row.forEach((cell:any, c:number)=>{
        if (!cell) return;
        if (cell.style && Object.keys(cell.style).length) h.setCellMeta(r,c,'style',cell.style);
        if (cell.validationType) h.setCellMeta(r,c,'type',cell.validationType);
        if (cell.isMandatory){ h.setCellMeta(r,c,'isMandatory',true); h.setCellMeta(r,c,'validator',this.requiredValidator); }
        switch (cell.controlType){
          case 'dropdown': {
            const kind:Kind = cell.dataSource;
            const src = kind==='equip' ? (this.equipmentOptions||[]).map(o=>o.name) : (this.statusOptions||[]).map(o=>o.name);
            h.setCellMeta(r,c,'editor','dropdown'); h.setCellMeta(r,c,'source',src);
            h.setCellMeta(r,c,'dropdownKind',kind); h.setCellMeta(r,c,'strict',true); h.setCellMeta(r,c,'allowInvalid',true);
            break;
          }
          case 'checkbox': h.setCellMeta(r,c,'type','checkbox'); break;
          case 'datetime': h.setCellMeta(r,c,'editor','date'); h.setCellMeta(r,c,'dateFormat','YYYY-MM-DD HH:mm'); break;
          default: h.setCellMeta(r,c,'type','text');
        }
        if (cell.fieldCategory) h.setCellMeta(r,c,'fieldCategory',cell.fieldCategory); else h.removeCellMeta(r,c,'fieldCategory');

        if (typeof cell.validationRange==='string'){
          const parsed = this.parseValidationRange(cell.validationRange);
          if (parsed){
            if (parsed.kind==='static'){ h.setCellMeta(r,c,'compareRule',{type:'static', op:parsed.op, rhs:parsed.rhs}); }
            else { h.setCellMeta(r,c,'compareRule',{type:'between', min:parsed.min, max:parsed.max}); }
            this.buildCompositeValidator(h,r,c);
          }
        }
      });
    });
    h_render(h);
  }

  private getRowHeights(h:Handsontable.Core, rows:number){ const hs:number[]=[]; for(let i=0;i<rows;i++){ hs.push(h.getRowHeight(i) ?? 23); } return hs; }
  private getColWidths(h:Handsontable.Core, cols:number){ const ws:number[]=[]; for(let i=0;i<cols;i++){ ws.push(h.getColWidth(i) ?? 100); } return ws; }

  private validationRangeFromMeta(meta:any):string|undefined{
    const cmp=meta?.compareRule; if(!cmp) return undefined;
    if (cmp.type==='static' && cmp.op && (cmp.rhs??'')!=='') return `${cmp.op}${cmp.rhs}`;
    if (cmp.type==='between' && (cmp.min??'')!=='' && (cmp.max??'')!=='') return `${cmp.min}^${cmp.max}`;
    return undefined;
  }
  private parseValidationRange(range:string|undefined){
    if(!range) return null;
    const hat = range.indexOf('^');
    if (hat>0) return { kind:'between' as const, min:range.slice(0,hat).trim(), max:range.slice(hat+1).trim() };
    const m=/^(>=|<=|==|!=|>|<)\s*(.+)$/.exec(range.trim());
    if (m) return { kind:'static' as const, op:m[1], rhs:m[2].trim() };
    return null;
  }
}

function h_render(h:Handsontable.Core){ h.validateCells?.(()=>h.render()); }
