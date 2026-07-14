import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { IonicModule } from '@ionic/angular';

import { HomePage } from './home.page';
import { DbserviceService } from '../services/dbservice.service';
import { ApiService } from '../services/api.service';
import { crearDbServiceMock, crearApiServiceMock } from '../../testing/dbservice.mock';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HomePage],
      imports: [IonicModule.forRoot(), FormsModule, RouterTestingModule],
      providers: [
        { provide: DbserviceService, useValue: crearDbServiceMock() },
        { provide: ApiService, useValue: crearApiServiceMock() },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('inicia con el total en 0 y sin gastos', () => {
    expect(component.total).toBe(0);
    expect(component.gastos.length).toBe(0);
  });
});
