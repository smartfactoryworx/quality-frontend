import Handsontable from 'handsontable';
export class DateTimeEditor extends Handsontable.editors.TextEditor {
  private inputEl: HTMLInputElement | null = null;
  override open(): void {
    super.open();
    const ta = this.TEXTAREA as HTMLTextAreaElement;
    ta.style.display = 'none';
    const parent = ta.parentElement!;
    this.inputEl = document.createElement('input');
    this.inputEl.type = 'datetime-local';
    this.inputEl.className = 'htDatetimeLocal';
    this.inputEl.value = this.toLocalValue(ta.value);
    Object.assign(this.inputEl.style, { width: '100%', height: '100%', boxSizing: 'border-box', font: 'inherit', border: 'none', outline: 'none' });
    parent.appendChild(this.inputEl);
    setTimeout(() => this.inputEl?.focus(), 0);
  }
  override close(): void {
    if (this.inputEl) {
      (this.TEXTAREA as HTMLTextAreaElement).value = this.fromLocalValue(this.inputEl.value);
      this.inputEl.remove();
      this.inputEl = null;
    }
    this.TEXTAREA.style.display = '';
    super.close();
  }
  override getValue() { return this.inputEl ? this.fromLocalValue(this.inputEl.value) : (this.TEXTAREA as HTMLTextAreaElement).value; }
  override setValue(value: any): void {
    const v = value == null ? '' : String(value);
    (this.TEXTAREA as HTMLTextAreaElement).value = v;
    if (this.inputEl) this.inputEl.value = this.toLocalValue(v);
  }
  private toLocalValue(v: string) { return v ? v.replace(' ', 'T') : ''; }
  private fromLocalValue(v: string) { return v ? v.replace('T', ' ') : ''; }
}
