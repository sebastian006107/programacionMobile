describe('Navegación y ruta 404', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('una ruta inexistente muestra la página 404', () => {
    cy.visit('/esta-ruta-no-existe', { failOnStatusCode: false });
    cy.wait(800);
    cy.location('pathname', { timeout: 10000 }).should('eq', '/not-found');
    cy.wait(800);
    cy.contains('404').should('be.visible');
    cy.wait(800);
  });

  it('el botón de la página 404 vuelve al inicio', () => {
    cy.login('demo@mibilletera.cl', '1234');
    cy.wait(800);
    cy.visit('/otra-ruta-mala', { failOnStatusCode: false });
    cy.wait(800);
    cy.location('pathname', { timeout: 10000 }).should('eq', '/not-found');
    cy.wait(800);

    cy.contains('ion-button', 'Volver al inicio').click();
    cy.wait(800);
    cy.location('pathname', { timeout: 10000 }).should('eq', '/home');
    cy.wait(800);
  });


});
