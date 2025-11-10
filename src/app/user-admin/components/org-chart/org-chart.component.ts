import { CommonModule } from '@angular/common';
import {
  Component,
  AfterViewInit,
  ElementRef,
  ViewChild,
  Input,
  OnChanges,
  SimpleChanges,
  Output,
  EventEmitter,
} from '@angular/core';

declare var ApexTree: any;

@Component({
  selector: 'app-org-chart',
  standalone: true,
  imports: [CommonModule], // if needed

  templateUrl: './org-chart.component.html',
  styles: [],
})
export class OrgChartComponent implements AfterViewInit, OnChanges {
  @ViewChild('svgTree') svgTree!: ElementRef;
  @Input() companyData: any;
  @Output() selectedLines = new EventEmitter<any[]>();
  @Output() addNodeClicked = new EventEmitter<any>();

  tree: any;

  options = {
    contentKey: 'data',
    width: 700,
    height: 450,
    nodeWidth: 250,
    nodeHeight: 200,
    fontColor: '#fff',
    borderColor: '#333',
    childrenSpacing: 80,
    siblingSpacing: 20,
    direction: 'top',
    enableExpandCollapse: true,
    enableToolbar: true,
    canvasStyle: 'border: 1px solid black; background: #f6f6f6;',
    nodeTemplate: (content: any) => `
  <div 
    class="node-content" 
    data-id="${content.id}" 
    data-type="${content.type}" 
    style="display: flex; flex-direction: column; gap: 8px; justify-content: center; align-items: center; height: 100%; position: relative;"
  >

   <div 
        class="add-btn"
        data-id="${content.id}"
        data-type="${content.type}"
        data-name="${content.name}"
        style="
          position: absolute;
          top: 20px;
          right: 100px;
          background: red;
          color: white;
          border-radius: 50%;
          width: 35px;
          height: 35px;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 18px;
          font-weight: bold;
          z-index: 10;
          cursor: pointer;
          box-shadow: 0 0 4px rgba(0, 0, 0, 0.2);
        "
      >+</div>

<div 
  style="
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background-color: ${ '#a9cce3'};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 48px;
    font-weight: bold;
    color: #1f618d;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    text-transform: uppercase;
  "
>
  ${content.avatar?.initial || ''}
</div>

    <div style="font-weight: bold; font-family: Arial; font-size: 32px; color: #000;">${content.name}</div>
  </div>
`

  };

  ngAfterViewInit(): void {
    this.setupDelegatedClickListener();
  }

  setupDelegatedClickListener() {
    if (!this.svgTree?.nativeElement) return;

    this.svgTree.nativeElement.addEventListener('click', (event: any) => {
      if (event.target.classList.contains('add-btn')) {
        const nodeInfo = {
          id: event.target.dataset.id,
          type: event.target.dataset.type,
          name: event.target.dataset.name,
        };
        this.onAddNode(nodeInfo);
      }
    });
  }


  ngOnChanges(changes: SimpleChanges): void {
    if (changes['companyData'] && changes['companyData'].currentValue && this.svgTree?.nativeElement) {
      this.renderTree();
    }
  }


  renderTree() {
    if (!this.companyData || !this.svgTree?.nativeElement) return;

    const formatted = this.formatCompanyData(this.companyData);
    if (this.tree) this.tree.destroy();
    this.tree = new ApexTree(this.svgTree.nativeElement, this.options);
    this.tree.render(formatted);
  }


  onLineSelect(selectedLine: any) {
    this.selectedLines.emit(selectedLine);
  }

  onAddNode(nodeData: any) {
    console.log("Clicked add on node:", nodeData);
    this.addNodeClicked.emit(nodeData);
  }

    formatCompanyData(data: any[]): any {
  if (!data || !Array.isArray(data) || !data.length) {
    console.error('Invalid or empty companyData:', data);
    return {};
  }

  const root: any = {
    id: 'Root',
    data: {
      id: 'root',
      name: 'Companies',
      imageURL: 'assets/images/faces/company.png',
      avatar: {
        initial: 'C',
        bgColor: this.getColorByType('company'),
      },
      type: 'root',
    },
    options: { nodeBGColor: '#fff3b0' },
    children: [],
  };

  for (const company of data) {
    const companyNode: any = {
      id: company._id,
      data: {
        id: company._id,
        name: company.company_name,
        imageURL: company.logoURL || 'assets/images/faces/company.png',
        avatar: {
          initial: company.company_name[0]?.toUpperCase(),
          bgColor: this.getColorByType('company'),
        },
        type: 'company',
      },
      options: { nodeBGColor: '#fcd5ce' },
      children: [],
    };

    for (const country of company.countries || []) {
      const countryNode: any = {
        id: country._id,
        data: {
          id: country._id,
          name: country.country_name,
          imageURL: 'assets/images/faces/country.png',
          avatar: {
            initial: country.country_name[0]?.toUpperCase(),
            bgColor: this.getColorByType('country'),
          },
          type: 'country',
        },
        options: { nodeBGColor: '#ffb5a7' },
        children: [],
      };

      for (const state of country.states || []) {
        const stateNode: any = {
          id: state._id,
          data: {
            id: state._id,
            name: state.state_name,
            imageURL: 'assets/images/faces/state.png',
            avatar: {
              initial: state.state_name[0]?.toUpperCase(),
              bgColor: this.getColorByType('state'),
            },
            type: 'state',
          },
          options: { nodeBGColor: '#fcd5ce' },
          children: [],
        };

        for (const location of state.locations || []) {
          const locationNode: any = {
            id: location.location_name,
            data: {
              id: location._id,
              name: location.location_name,
              imageURL: 'assets/images/faces/location.png',
              avatar: {
                initial: location.location_name[0]?.toUpperCase(),
                bgColor: this.getColorByType('location'),
              },
              type: 'location',
            },
            options: { nodeBGColor: '#d8f3dc' },
            children: [],
          };

          for (const plant of location.plants || []) {
            const plantNode: any = {
              id: plant.plant_name,
              data: {
                id: plant._id,
                name: plant.plant_name,
                imageURL: 'assets/images/faces/plant.png',
                avatar: {
                  initial: plant.plant_name[0]?.toUpperCase(),
                  bgColor: this.getColorByType('plant'),
                },
                type: 'plant',
              },
              options: { nodeBGColor: '#b7e4c7' },
              children: [],
            };

            for (const line of plant.lines || []) {
              const lineNode: any = {
                id: line.line_name,
                data: {
                  id: line._id,
                  name: line.line_name,
                  imageURL: 'assets/images/faces/lines.png',
                  avatar: {
                    initial: line.line_name[0]?.toUpperCase(),
                    bgColor: this.getColorByType('line'),
                  },
                  type: 'line',
                },
                options: { nodeBGColor: '#fcd5ce' },
                children: [],
              };

              plantNode.children.push(lineNode);
            }

            locationNode.children.push(plantNode);
          }

          stateNode.children.push(locationNode);
        }

        countryNode.children.push(stateNode);
      }

      companyNode.children.push(countryNode);
    }

    root.children.push(companyNode);
  }

  return root;
}




  // formatCompanyData(data: any): any {
  //   if (!data || !Array.isArray(data) || !data.length || !data[0].company_name) {
  //     console.error('Invalid or empty companyData:', data);
  //     return {};
  //   }

  //   const root: any = {
  //     id: data[0].company_name,
  //     data: {
  //       id: data[0].company_name,
  //       name: data[0].company_name,
  //       avatar: {
  //         initial: data[0].company_name[0].toUpperCase(),
  //         bgColor: this.getColorByType('company'),
  //       },
  //       type: 'company',
  //     },

  //     options: { nodeBGColor: '#fef9e7' },
  //     children: [],
  //   };

  //   for (const country of data[0].countries || []) {
  //     const countryNode: any = {
  //       id: country.country_name,
  //       data: {
  //         id: country.country_name,
  //         name: country.country_name,
  //         avatar: {
  //           initial: country.country_name[0].toUpperCase(),
  //           bgColor: this.getColorByType('country'),
  //         },
  //         type: 'country',
  //       },
  //       options: { nodeBGColor: '#e8daef' },
  //       children: [],
  //     };

  //     for (const state of country.states || []) {
  //       const stateNode: any = {
  //         id: state.state_name,
  //         data: {
  //           id: state.state_name,
  //           name: state.state_name,
  //           avatar: {
  //             initial: state.state_name[0].toUpperCase(),
  //             bgColor: this.getColorByType('state'),
  //           },
  //           type: 'state',
  //         },
  //         options: { nodeBGColor: '#d1f2eb' },
  //         children: [],
  //       };

  //       for (const location of state.locations || []) {
  //         const locationNode: any = {
  //           id: location.location_name,
  //           data: {
  //             id: location.location_name,
  //             name: location.location_name,
  //             avatar: {
  //               initial: location.location_name[0].toUpperCase(),
  //               bgColor: this.getColorByType('location'),
  //             },
  //             type: 'location',
  //           },
  //           options: { nodeBGColor: '#fadbd8' },
  //           children: [],
  //         };

  //         for (const plant of location.plants || []) {
  //           const plantNode: any = {
  //             id: plant.plant_name,
  //             data: {
  //               id: plant.plant_name,
  //               name: plant.plant_name,
  //               avatar: {
  //                 initial: plant.plant_name[0].toUpperCase(),
  //                 bgColor: this.getColorByType('plant'),
  //               },
  //               type: 'plant',
  //             },
  //             options: { nodeBGColor: '#CCCCFF' },
  //             children: [],
  //           };

  //           for (const line of plant.lines || []) {
  //             const lineNode: any = {
  //               id: line.line_name,
  //               data: {
  //                 id: line.line_name,
  //                 name: line.line_name,
  //                 avatar: {
  //                   initial: line.line_name[0].toUpperCase(),
  //                   bgColor: this.getColorByType('line'),
  //                 },
  //                 type: 'line',
  //               },
  //               options: { nodeBGColor: '#FDD7E4' },
  //               children: [],
  //             };

  //             plantNode.children.push(lineNode);
  //           }

  //           locationNode.children.push(plantNode);
  //         }

  //         stateNode.children.push(locationNode);
  //       }

  //       countryNode.children.push(stateNode);
  //     }

  //     root.children.push(countryNode);
  //   }

  //   return root;
  // }

  getColorByType(type: string): string {
    switch (type) {
      case 'company': return '#fcd5ce';
      case 'country': return '#ffb5a7';
      case 'state': return '#fcd5ce';
      case 'location': return '#d8f3dc';
      case 'plant': return '#b7e4c7';
      case 'line': return '#fcd5ce';
      default: return '#ccc';
    }
  }

}
