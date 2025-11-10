import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { UserAdminService } from '../../../services/user-admin.service';

@Component({
  selector: 'app-create-node-form',
    standalone: true,
  imports: [CommonModule, ReactiveFormsModule,FormsModule],
  templateUrl: './create-node-form.component.html',
})
export class CreateNodeFormComponent implements OnInit {
  form!: FormGroup;
  nodeType: string = '';
  linesData: any[] = []; // ✅ define it
  stateList: any;
  countryList: any;
  companyList: { _id: any; name: any; }[] = [];
  locationList: any;
  locations!: any[];
  states!: any[];
  countries!: any[];
  companies!: { _id: any; name: any; }[];
  selectedNodeType!: string;
  plants!: any[];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,  private userAdmin: UserAdminService,  private dialogRef: MatDialogRef<CreateNodeFormComponent>,

    private fb: FormBuilder
  ) {}

  
ngOnInit() {
  this.nodeType = this.data?.nodeData?.type;   // ✅ FIXED: access nested type
  console.log( this.nodeType, " this.nodeType")
  this.linesData = this.data?.linesData || [];

  this.extractDropdowns();
  this.setupForm(this.nodeType);
}


extractDropdowns() {
  this.companies = this.linesData.map(c => ({
    _id: c._id,
    name: c.company_name,
  }));

  this.countries = this.linesData.flatMap(c =>
    c.countries.map((country:any) => ({
      _id: country._id,
      name: country.country_name,
      company_id: c._id,
    }))
  );

  this.states = this.linesData.flatMap(c =>
    c.countries.flatMap((cty:any) =>
      cty.states.map((state:any) => ({
        _id: state._id,
        name: state.state_name,
        country_id: cty._id,
      }))
    )
  );

  this.locations = this.linesData.flatMap(c =>
    c.countries.flatMap((cty:any) =>
      cty.states.flatMap((state:any) =>
        state.locations.map((loc:any) => ({
          _id: loc._id,
          name: loc.location_name,
          state_id: state._id,
        }))
      )
    )
  );
  this.plants = this.linesData.flatMap(c =>
  c.countries.flatMap((cty: any) =>
    cty.states.flatMap((state: any) =>
      state.locations.flatMap((loc: any) =>
        loc.plants.map((plant: any) => ({
          _id: plant._id,
          name: plant.plant_name,
          location_id: loc._id,
        }))
      )
    )
  )
);

}


setupForm(nodeType: string) {
  console.log(nodeType, "nodeType");
  this.form = this.fb.group({});
  this.selectedNodeType = nodeType;

  if (nodeType === 'company') {
    this.form.addControl('name', new FormControl('', Validators.required));
    this.form.addControl('code', new FormControl('', Validators.required));
  }

  if (nodeType === 'country') {
    this.form.addControl('company_id', new FormControl('', Validators.required));
    this.form.addControl('name', new FormControl('', Validators.required));
    this.form.addControl('code', new FormControl('', Validators.required));
  }

  if (nodeType === 'state') {
    this.form.addControl('country_id', new FormControl('', Validators.required));
    this.form.addControl('name', new FormControl('', Validators.required));
    this.form.addControl('code', new FormControl('', Validators.required));
  }

  if (nodeType === 'location') {
    this.form.addControl('state_id', new FormControl('', Validators.required));
    this.form.addControl('name', new FormControl('', Validators.required));
    this.form.addControl('code', new FormControl('', Validators.required));
  }

  if (nodeType === 'plant') {
    this.form.addControl('location_id', new FormControl('', Validators.required));
    this.form.addControl('name', new FormControl('', Validators.required));
    this.form.addControl('code', new FormControl('', Validators.required));
  }

  if (nodeType === 'line') {
    this.form.addControl('plant_id', new FormControl('', Validators.required));
    this.form.addControl('name', new FormControl('', Validators.required));
    this.form.addControl('code', new FormControl('', Validators.required));
  }
}




  loadCompanies() {
  this.companyList = this.linesData.map(c => ({ _id: c._id, name: c.name }));
}

loadCountries() {
  const companyId = this.form.get('company')?.value;
  const company = this.linesData.find(c => c._id === companyId);
  this.countryList = company?.countries || [];
}

loadStatesFlat() {
  this.stateList = [];
  for (const company of this.linesData) {
    for (const country of company.countries || []) {
      this.stateList.push(...(country.states || []));
    }
  }
}

loadLocationsFlat() {
  this.locationList = [];
  for (const company of this.linesData) {
    for (const country of company.countries || []) {
      for (const state of country.states || []) {
        this.locationList.push(...(state.locations || []));
      }
    }
  }
}

  onSubmit() {
    if (this.form.valid) {
      const payload = {
        nodeType: this.selectedNodeType,
        ...this.form.value
      };

      this.userAdmin.PostHierarchy(payload)
        .subscribe({
          next: (res:any) => {
            console.log('Node created successfully:', res);
            this.dialogRef.close(res);  
            // maybe close modal, show message, refresh list etc.
          },
          error: (err:any) => {
            console.error('Error creating node:', err);
            // show error message to user
          }
        });
    }
  }

}
