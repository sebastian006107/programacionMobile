// Comandos personalizados para interactuar con componentes de Ionic.
// Ionic renderiza ion-input/ion-select con Shadow DOM, así que hay que escribir
// directamente en el <input>/<textarea> interno en vez del elemento ion-input.

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Escribe en un ion-input ubicado por su label visible. */
      ionInput(label: string, valor: string): Chainable<void>;
      /** Elige una opción de un ion-select ubicado por su label visible. */
      ionSelect(label: string, opcion: string): Chainable<void>;
      /** Inicia sesión con las credenciales dadas y espera a llegar a /home. */
      login(email: string, password: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('ionInput', (label: string, valor: string) => {
  // .ion-page-hidden: Ionic mantiene páginas previas en el DOM (ocultas) para
  // animar la navegación hacia atrás; sin este filtro cy.contains podría
  // encontrar un campo con la misma etiqueta en una página oculta.
  // Ionic mantiene páginas previas en el DOM (marcadas .ion-page-hidden) para
  // animar la navegación hacia atrás; sin este filtro cy.contains podría
  // encontrar un campo con la misma etiqueta en una página oculta.
  // ion-app también matiene la clase .ion-page, por eso se excluye aparte.
  cy.get('.ion-page:not(.ion-page-hidden):not(ion-app)')
    .contains('ion-input', label)
    .find('input, textarea')
    .first()
    .clear({ force: true })
    .type(valor, { force: true });
});

Cypress.Commands.add('ionSelect', (label: string, opcion: string) => {
  cy.contains('ion-select', label).click({ force: true });
  // El popover/alert de ion-select se monta al final del <body>, fuera del componente.
  cy.get('.select-interface-option, .alert-radio-label')
    .contains(opcion)
    .click({ force: true });
  // Cierra el overlay si sigue abierto (alert de confirmación en algunos modos)
  cy.get('body').then(($body) => {
    if ($body.find('.alert-button:contains("OK")').length) {
      cy.contains('.alert-button', 'OK').click({ force: true });
    }
  });
});

Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/login');
  cy.ionInput('Email', email);
  cy.ionInput('Contraseña', password);
  cy.contains('ion-button', 'Ingresar').click();
  cy.location('pathname', { timeout: 10000 }).should('eq', '/home');
});

export {};
