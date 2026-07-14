describe('Auth', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('test', () => {
    const email = `e2e_${Date.now()}@mibilletera.cl`;

    cy.visit('/login');
    cy.wait(800);
    cy.contains('ion-button', 'Crear cuenta').click();
    cy.wait(800);
    cy.ionInput('Nombre', 'Usuario E2E');
    cy.wait(800);
    cy.ionInput('Email', email);
    cy.wait(800);
    cy.ionInput('Contraseña', 'clave123');
    cy.wait(800);
    cy.ionInput('Confirmar contraseña', 'clave123');
    cy.wait(800);
    cy.get('app-registro').contains('ion-button', 'Crear cuenta').click();

    cy.location('pathname', { timeout: 10000 }).should('eq', '/home');
    cy.wait(800);
  });

  it('test', () => {
    cy.wait(800);
    cy.login('demo@mibilletera.cl', '1234');
    cy.wait(800);
    cy.contains('Total gastado').should('be.visible');
    cy.wait(800);
  });
});
