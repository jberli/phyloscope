/**
 * @cartography
 * Define the cartography widget.
 */

import { ajaxGet } from "../generic/ajax.js";
import { makeDiv, addClass, removeClass, addSVG } from "../generic/dom.js";

class Cartography {
    constructor(app) {
        this.app = app;
        this.container = makeDiv('cartography', 'sub-panel');
        this.app.third.append(this.container);
        
        this.mapdiv = makeDiv('map', 'ol-map');
        this.container.append(this.mapdiv);

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

        this.view = new ol.View({
            center: [ 0, 3000000 ],
            zoom: 1,
            maxZoom: 6,
        })

        this.basemapLayer = new ol.layer.Tile({
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
    
        this.map = new ol.Map({
            target: 'map',
            layers: [ this.basemapLayer ],
            view: this.view,
            controls: ol.control.defaults.defaults({
                zoom: false,
                attribution: false,
                rotate: false,
            })
        });

        this.centerButton = makeDiv(null, 'cartography-center collapse');
        addSVG(this.centerButton, new URL('/static/explorer/img/center.svg', import.meta.url));
        this.container.append(this.centerButton);
    }

    update(r) {
        let map = this.map;
        this.taxon = this.app.params.taxon;

        // Check if a range has been found
        if (r.length > 0) {
            this.rangeLayer = new ol.layer.Vector({
                source: new ol.source.Vector({
                    features: new ol.format.KML({
                        extractStyles: false
                    }).readFeatures(r, {
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

            map.addLayer(this.rangeLayer);
            this.center();
        }
        // Here, no range has been found
        else {

        }
    }

    center() {
        this.map.getView().fit(this.rangeLayer.getSource().getExtent(), {
            padding: [ 20, 20, 20, 20 ],
            duration: 500,
            easing: ol.easing.easeOut,
            callback: (e) => this.activateCenter()
        });
    }

    activateCenter() {
        let self = this;

        function centerMap() {
            this.removeEventListener('click', centerMap);
            addClass(this, 'collapse');
            self.center();
        }
        
        let movement = this.map.on('movestart', (e) => {
            ol.Observable.unByKey(movement);
            removeClass(this.centerButton, 'collapse');
            this.centerButton.addEventListener('click', centerMap);
        })
    }
}

export default Cartography