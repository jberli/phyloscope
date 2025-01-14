/**
 * @initialization
 * Defines the initialization of the application.
 */

window.addEventListener('DOMContentLoaded', function(e) {
    // Retrieve the configuration
    ajaxGet('configuration/', (params) => {
        // Initialize interface using retrieve parameters
        initializeInterface(params);
    });
});

function initializeInterface(params) {
    let container = makeDiv(id='container');
    document.body.appendChild(container);
    initializeHeader(params);
    initializeContent(params);
}

function initializeContent(params) {
    let container = document.getElementById('container');
    let contentContainer = makeDiv(id='content-container');
    container.append(contentContainer);
    initializeMap(params);
    initializePanel(params);
    // updateTaxonRange(params);
}

function initializePanel(params) {
    let contentContainer = document.getElementById('content-container');
    let panelContainer = makeDiv(id='panel-container');
    let panelButtonsContainer = makeDiv(id=null, c='panel-button-container');
    let panelButtonTaxonomy = makeDiv(id=null, c='panel-button', html='Taxonomie');
    let panelButtonDescription = makeDiv(id=null, c='panel-button', html='Description');
    panelButtonsContainer.append(panelButtonDescription, panelButtonTaxonomy);
    panelContainer.append(panelButtonsContainer);
    contentContainer.append(panelContainer);
    initializeTaxonomy(params);
}