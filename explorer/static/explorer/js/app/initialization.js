/**
 * @initialization
 * Defines the initialization of the application.
 */

window.addEventListener('DOMContentLoaded', function() {
    params = {
        'language': 'fr',
        'current': 3000
    }

    let container = makeDiv(id='container');
    let contentContainer = makeDiv(id='content-container');
    let mapContainer = makeDiv(id='map-container');
    let mapdiv = makeDiv(id='map');
    mapContainer.appendChild(mapdiv);

    let taxonomyContainer = constructTaxonomy(params);
    let headerContainer = constructHeader(params);

    contentContainer.append(mapContainer, taxonomyContainer);
    container.append(headerContainer, contentContainer);
    document.body.appendChild(container);

    initializeMap(params);
});