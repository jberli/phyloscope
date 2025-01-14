/**
 * @map 
 * Defines OpenLayers's object and related functions.
 */

function initializeMap(params) {
    let contentContainer = document.getElementById('content-container');
    let mapContainer = makeDiv(id='map-container');
    let mapdiv = makeDiv(id='map');
    let updateButton = makeDiv(id='map-button-update', c='map-button collapse');
    mapContainer.appendChild(mapdiv);
    mapContainer.appendChild(updateButton);
    updateButton.addEventListener('click', (e) => {
        updateTaxonRange(params);
    });
    contentContainer.append(mapContainer);

    let tileDimension = 256;
    let projection = ol.proj.get('EPSG:3857');
    let projectionExtent = projection.getExtent();
    let size = ol.extent.getWidth(projectionExtent) / tileDimension;
    let resolutions = new Array(19);
    let matrixIds = new Array(19);
    for (let z = 0; z < 19; ++z) {
        resolutions[z] = size / Math.pow(2, z);
        matrixIds[z] = z;
    }

    // View definition
    view = new ol.View({
        center: [ 0, 3000000 ],
        zoom: 1,
        maxZoom: 6,
        // constrainResolution: true,
    })

    // let layer = new ol.layer.Tile({
    //     preload: Infinity,
    //     source: new ol.source.OSM()
    // });

    let layer = new ol.layer.Tile({
        preload: Infinity,
        source: new ol.source.WMTS({
            url: 'http://localhost:8080/geoserver/NE/gwc/service/wmts',
            layer: 'NE:basemap',
            matrixSet: 'WebMercatorQuad',
            format: 'image/jpeg',
            dimensions: [tileDimension, tileDimension],
            tileGrid: new ol.tilegrid.WMTS({
                origin: ol.extent.getTopLeft(projectionExtent),
                resolutions: resolutions,
                matrixIds: matrixIds,
            }),
            wrapX: true,
        })
    });

    // Map definition
    map = new ol.Map({
        target: 'map',
        layers: [layer],
        view: view,
        controls: ol.control.defaults.defaults({
            zoom: false,
            attribution: false,
            rotate: false,
        })
    });

    map.on('moveend', (e) => {
        // console.log(e.map.getView().getZoom());
    })

    params['cartography'] = { map: map };
}

function updateTaxonRange(params) {
    let taxon = params.taxonomy.siblings[params.taxonomy.tindex].id
    let map = params.cartography.map;
    let range = params.cartography.range;
    if (range !== null) {
        range.getSource();
        map.removeLayer(range);
    }

    let url = 'https://www.inaturalist.org/taxa/' + taxon + '/range.kml';
    let xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    let onError = function() { xhr.abort() }
    xhr.onerror = onError;
    xhr.onload = function() {
        if (xhr.status == 200) {
            let map = params.cartography.map;
            let taxonLayer = new ol.layer.Vector({
                source: new ol.source.Vector({
                    features: new ol.format.KML({
                        extractStyles: false
                    }).readFeatures(xhr.responseText,{
                        dataProjection:'EPSG:4326',
                        featureProjection:'EPSG:3857'
                    })
                }),
                style: new ol.style.Style({
                    fill: new ol.style.Fill({
                        color: 'rgba(200, 110, 100, 0.7)',
                    }),
                })
            });
            params.cartography.range = taxonLayer;
            params.cartography.taxon = taxon;
            map.addLayer(taxonLayer);
            map.getView().fit(taxonLayer.getSource().getExtent(), {
                padding: [ 50, 50, 50, 50 ],
                duration: 500,
                easing: ol.easing.easeOut,
            });

            let updateButton = document.getElementById('map-button-update');
            addClass(updateButton, 'collapse');
        } else {
            onError();
        }
    }
    xhr.send();   
}