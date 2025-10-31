import { Component } from '@angular/core';
import { SharedModule } from '../../shared.module';
import { CommonModule } from '@angular/common';
import { SpkReusableTablesComponent } from '../../../../@spk/spk-reusable-tables/spk-reusable-tables.component';
import { SpkSalesCardsComponent } from '../../../../@spk/reusable-dashboard/spk-sales-cards/spk-sales-cards.component';

@Component({
  selector: 'app-home',
  imports: [SharedModule,CommonModule, SpkReusableTablesComponent, SpkSalesCardsComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {

  // 👇 Table Columns
  columns = [
    { header: 'ID', field: 'id' },
    { header: 'Name', field: 'name' },
    { header: 'Department', field: 'department' },
    { header: 'Status', field: 'status' }
  ];

  // 👇 Table Data
  data = [
    { id: 1, name: 'John Doe', department: 'Production', status: 'Active', checked: false },
    { id: 2, name: 'Jane Smith', department: 'Quality', status: 'Inactive', checked: false },
    { id: 3, name: 'Ravi Kumar', department: 'Maintenance', status: 'Active', checked: false }
  ];


  // 🟩 SALES CARDS DATA
  salesCards = [
    {
      title: 'Total Sales',
      value: '$1.25M',
      valueClass: 'text-3xl font-semibold text-primary',
      percentage: '+12%',
      percentageIcon: 'ri-arrow-up-line',
      color: 'success',
      bg: 'primary/10',
      icon: 'ri-shopping-cart-line',
      cardClass: 'border border-defaultborder shadow-sm',
      graph: 'Compared to last month',
      customClass: 'items-center',
      customClass1: '',
    },
    {
      title: 'Orders Processed',
      value: '8,540',
      valueClass: 'text-3xl font-semibold text-success',
      percentage: '+4%',
      percentageIcon: 'ri-arrow-up-line',
      color: 'success',
      bg: 'success/10',
      icon: 'ri-box-3-line',
      cardClass: 'border border-defaultborder shadow-sm',
      graph: 'Orders fulfilled',
      customClass: 'items-center',
      customClass1: '',
    },
    {
      title: 'Returns',
      value: '432',
      valueClass: 'text-3xl font-semibold text-danger',
      percentage: '-2%',
      percentageIcon: 'ri-arrow-down-line',
      color: 'danger',
      bg: 'danger/10',
      icon: 'ri-refresh-line',
      cardClass: 'border border-defaultborder shadow-sm',
      graph: 'Compared to last week',
      customClass: 'items-center',
      customClass1: '',
    },
    {
      title: 'Customer Growth',
      value: '3.2k',
      valueClass: 'text-3xl font-semibold text-info',
      percentage: '+8%',
      percentageIcon: 'ri-arrow-up-line',
      color: 'info',
      bg: 'info/10',
      icon: 'ri-user-star-line',
      cardClass: 'border border-defaultborder shadow-sm',
      graph: 'New signups',
      customClass: 'items-center',
      customClass1: '',
    }
  ];


  // Checkbox event handlers
  onSelectAll(event: boolean) {
    this.data.forEach(row => (row.checked = event));
      console.log('Select all toggled:', event);

  }

    ngOnInit() {
    console.log('✅ HomeComponent loaded with data:', this.data);
  }

  
}
