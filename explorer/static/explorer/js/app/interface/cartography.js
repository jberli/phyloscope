/**
 * @cartography
 * Define the cartography widget.
 */

import { animateOpacity } from "../generic/map.js";
import { makeDiv, addClass, removeClass, addSVG, wait } from "../generic/dom.js";

/**
 * Create the cartography widget to display
 * geographical information about the current taxon.
 */
class Cartography {
    /**
     * @param {Application} app - Application object.
     * @param {Object} params - Parameters of the application.
     */
    constructor(app, params) {
        this.app = app;
        this.params = params;

        // Boolean to flag if the map view is the same as the starting one
        this.origin = true;

        // Create DOM elements
        this.container = makeDiv('cartography', 'sub-panel');
        this.app.third.append(this.container);

        // Mask and loader
        this.mask = makeDiv(null, 'cartography-mask mask');
        this.loader = makeDiv(null, 'cartography-loader loader');
        this.mask.append(this.loader)
        this.container.append(this.mask);

        // Map DOM element
        this.mapdiv = makeDiv('map', 'ol-map');
        this.container.append(this.mapdiv);

        // Create the basemap
        this.basemap();

        // Create the taxon range object
        this.range = new Range(this, this.params);

        // Create the button to center the map
        this.centerButton = makeDiv(null, 'cartography-center collapse');
        addSVG(this.centerButton, new URL('/static/explorer/img/center.svg', import.meta.url));
        this.container.append(this.centerButton);

        // Activate the button to center the map when clicked
        this.centerButton.addEventListener('click', () => {
            addClass(this.centerButton, 'collapse');
            this.range.center(() => {
                this.range.listen = true;
            });
        });
        
        // Display the button when moving the map
        this.listener = this.map.on('movestart', (e) => {
            if (this.range.listen) {
                this.range.listen = false;
                removeClass(this.centerButton, 'collapse');
            }            
        });
    }

    /**
     * Display the loader on the widget and block interractions.
     */
    loading() { removeClass(this.mask, 'loaded'); }

    /**
     * Hide the loader and allow interractions.
     */
    loaded() { addClass(this.mask, 'loaded'); }

    /**
     * Update the range on the map.
     */
    update() {
        this.range.set(this.params.range, () => { this.loaded(); });
    }

    /**
     * Animate the view using the parameters.
     * @param {Array} center - Target coordinates center.
     * @param {int} zoom - Target zoom level
     * @param {int} duration - Duration of the animation in ms.
     * @param {function} callback - Callback of the animation.
     */
    animate(center, zoom, duration, callback) {
        this.map.getView().animate({
            center: center,
            zoom: zoom,
            duration: duration,
            easing: ol.easing.easeInOut,
            callback: () => { callback(); }
        });
    }

    /**
     * Create the basemap.
     */
    basemap() {
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

        let carto = this.params.interface.cartography;
        const pi = Math.PI;
        this.view = new ol.View({
            center: carto.start.center,
            zoom: carto.start.zoom,
            maxZoom: carto.maxzoom,
            extent: [ (-pi * 6378137)*1.2, -pi * 6378137, (pi * 6378137)*1.2, pi * 6378137 ]
        })

        this.map = new ol.Map({
            target: 'map',
            layers: [ 
                new ol.layer.Tile({
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
                })
            ],
            view: this.view,
            controls: ol.control.defaults.defaults({
                zoom: false,
                attribution: false,
                rotate: false,
            })
        });
    }
}

/**
 * The range of the taxon on the map.
 */
class Range {
    /**
     * @param {Cartography} cartography - The cartography widget object. 
     * @param {Object} params - The application parameters.
     */
    constructor(cartography, params) {
        this.cartography = cartography;
        this.params = params;
        
        // Flag to see if the centering button should be displayed
        this.listen = false;

        // Store for the OpenLayers layer object
        this.layer;
    }

    /**
     * 
     * @param {Object} r - The range to display on the map as a KML file along with its typesorting.
     * @param {function} callback - Callback fired when the range is displayed on the map. 
     */
    set(r, callback) {
        this.listen = false;
        let range = r.range;
        let typesorting = r.typesorting;

        // Check if range is not null
        if (range !== '') {
            // The vector layer
            this.layer = new ol.layer.Vector({
                source: new ol.source.Vector({
                    features: [new ol.format.WKT().readFeature(range)]
                }),
                style: new ol.style.Style({
                    fill: new ol.style.Fill({
                        // Set the style from the parameters
                        color: this.params.colors[typesorting],
                    }),
                }),
                // Keep it hidden
                opacity: 0,
                // Avoid the range to pop-up when moving on the map
                updateWhileAnimating: true,
                updateWhileInteracting: true,
            });

            // Add the layer to the map
            this.cartography.map.addLayer(this.layer);

            // Center the map on the layer
            this.center(() => {
                // Now display the range
                this.display(() => {});
                // Activate the centering button
                this.listen = true;
                this.cartography.origin = false;
                callback();
            });
        }
        // If range is null
        else {
            this.layer = undefined;
            let carto = this.params.interface.cartography;
            let center = carto.start.center;
            let zoom = carto.start.zoom;
            let transition = this.cartography.params.interface.cartography.range.transition.center;

            if (!this.cartography.origin) {
                this.cartography.animate(center, zoom, transition, () => {
                    // Activate the centering button
                    this.listen = true;
                    this.cartography.origin = true;
                    callback();
                });
            }
            else {
                callback();
            }
        }
        
    }
    
    /**
     * Checks if a range layer exists on the map.
     * @returns {boolean}
     */
    exists() {
        if (this.layer !== undefined) { return true; }
        else { return false; }
    }

    /**
     * Center the map on the range layer.
     * @param {function} callback - Callback fired when the map has been centered. 
     */
    center(callback) {
        // Get padding and transition time
        let padding = this.params.interface.cartography.range.padding;
        let transition = this.params.interface.cartography.range.transition.center;
        this.cartography.map.getView().fit(this.layer.getSource().getExtent(), {
            // Keep a padding
            padding: [ padding, padding, padding, padding ],
            duration: transition,
            easing: ol.easing.easeInOut,
            callback: () => { callback(); }
        });
    }

    /**
     * Remove the layer from the map after an animation.
     * @param {function} callback - Callback fired when the layer has been removed from the map. 
     */
    remove(callback) {
        this.hide(() => {
            this.cartography.map.removeLayer(this.layer);
            callback();
        })
    }

    /**
     * Hide the layer on the map.
     * @param {function} callback - Callback fired when the layer has been hidden. 
     */
    hide(callback) {
        let transition = this.params.interface.cartography.range.transition.display;
        if (this.exists()) {
            animateOpacity(this.layer, transition, 60, 0, () => { callback(); });
        }
    }

    /**
     * Display the layer on the map.
     * @param {function} callback - Callback fired when the layer has been displayed. 
     */
    display(callback) {
        let transition = this.params.interface.cartography.range.transition.display;
        let opacity = this.cartography.params.interface.cartography.range.opacity;
        if (this.exists()) {
            animateOpacity(this.layer, transition, 60, opacity, () => { callback(); });
        }
    }
}

export default Cartography