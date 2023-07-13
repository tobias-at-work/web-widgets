describe("Mapbox Maps", () => {
    const browserName = Cypress.browser.name;
    const cleanMendixSession = () => {
        cy.window().then(window => {
            // Cypress opens a new session for every test, so it exceeds mendix license limit of 5 sessions, we need to logout after each test.
            window.mx.session.logout();
        });
    };

    afterEach(() => cleanMendixSession());

    describe("rendering", () => {
        beforeEach(() => {
            cy.visit("p/mapbox-static");
        });

        it("compares with a screenshot baseline and checks if basemap is correct", () => {
            cy.get(".widget-maps").should("be.visible");
            cy.wait(3000); // eslint-disable-line cypress/no-unnecessary-waiting
            cy.get(".widget-maps").wait(3000).compareSnapshot(`mapboxMaps-${browserName}`, 0.5); // eslint-disable-line cypress/no-unnecessary-waiting
        });
    });

    describe("mixed rendering", () => {
        beforeEach(() => {
            cy.visit("p/mapbox");
        });

        it("checks the rendering", () => {
            cy.get(".widget-leaflet-maps").should("be.visible");
        });

        it("check the number of locations", () => {
            cy.get(".widget-leaflet-maps").should("be.visible");
            cy.wait(1000); // eslint-disable-line cypress/no-unnecessary-waiting
            cy.get(".leaflet-marker-icon").should("have.length", 3);
        });
    });

    describe("static locations", () => {
        beforeEach(() => {
            cy.visit("p/mapbox-static");
        });

        it("checks the rendering", () => {
            cy.get(".widget-leaflet-maps").should("be.visible");
        });

        it("check the number of locations", () => {
            cy.get(".widget-leaflet-maps").should("be.visible");
            cy.wait(1000); // eslint-disable-line cypress/no-unnecessary-waiting
            cy.get(".leaflet-marker-icon").should("have.length", 1);
        });
    });

    describe("datasource locations", () => {
        beforeEach(() => {
            cy.visit("p/mapbox-datasource");
        });

        it("checks the rendering", () => {
            cy.get(".widget-leaflet-maps").should("be.visible");
        });

        it("check the number of locations", () => {
            cy.get(".widget-leaflet-maps").should("be.visible");
            cy.wait(1000); // eslint-disable-line cypress/no-unnecessary-waiting
            cy.get(".leaflet-marker-icon").should("have.length", 2);
        });
    });

    describe("on click", () => {
        beforeEach(() => {
            cy.visit("p/mapbox-onclick");
        });

        it("should click on first marker", () => {
            cy.get(".widget-leaflet-maps").should("be.visible");
            cy.wait(1000); // eslint-disable-line cypress/no-unnecessary-waiting
            cy.get(".leaflet-marker-icon").first().click({ force: true });
            cy.wait(1000); // eslint-disable-line cypress/no-unnecessary-waiting
            cy.get(".modal-body.mx-dialog-body p").should("be.visible").should("have.text", "Clicked on static marker");
        });
    });
});
