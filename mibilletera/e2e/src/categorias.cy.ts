describe('Categorías', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.login('demo@mibilletera.cl', '1234');
    cy.wait(800);
    cy.get('app-home ion-buttons ion-button').eq(2).click(); // Mi cuenta
    cy.wait(800);
    cy.contains('ion-item', 'Categorías').click();
    cy.wait(800);
    cy.location('pathname').should('eq', '/categorias');
    cy.wait(800);
  });

  it('crea una categoría nueva', () => {
    cy.ionInput('Nombre', 'Mascotas');
    cy.wait(800);
    cy.contains('ion-button', 'Crear categoría').click();
    cy.wait(800);
    cy.contains('ion-item', 'Mascotas', { timeout: 8000 }).should('be.visible');
    cy.wait(800);
  });

  it('no permite crear dos categorías con el mismo nombre', () => {
    cy.ionInput('Nombre', 'comida'); // ya existe "Comida", sin distinguir mayúsculas
    cy.wait(800);
    cy.contains('ion-button', 'Crear categoría').click();
    cy.wait(800);
    cy.contains('ion-alert', 'repetido', { timeout: 8000 }).should('be.visible');
    cy.wait(800);
    cy.contains('.alert-button', 'OK').click();
    cy.wait(800);
  });

  it('edita el nombre de una categoría', () => {
    cy.contains('ion-item', 'Otros').click();
    cy.wait(800);
    cy.ionInput('Nombre', 'Otros gastos');
    cy.wait(800);
    cy.contains('ion-button', 'Guardar cambios').click();
    cy.wait(800);
    cy.contains('.lista-categorias ion-item', 'Otros gastos', { timeout: 8000 }).should(
      'be.visible'
    );
    cy.wait(800);
  });

});
