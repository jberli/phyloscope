/**
 * @initialization
 * Defines the initialization of the application.
 */

window.addEventListener('DOMContentLoaded', function(e) {
    ajaxGet('taxonoftheday/', (e) => {
        params = {
            language: 'en',
            taxonomy: e.values
        }

        let container = makeDiv(id='container');
        let contentContainer = makeDiv(id='content-container');
        let mapContainer = makeDiv(id='map-container');
        let mapdiv = makeDiv(id='map');
        mapContainer.appendChild(mapdiv);
    
        params = constructHeader(params, container);
        contentContainer.append(mapContainer);
        params = constructTaxonomy(params, contentContainer);

        container.append(contentContainer);
        document.body.appendChild(container);
    
        initializeMap(params);
    })
});