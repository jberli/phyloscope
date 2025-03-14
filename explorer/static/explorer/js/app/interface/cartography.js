/**
 * @cartography
 * Define the cartography widget.
 */

import { makeDiv, addClass, removeClass, addSVG, wait } from "../generic/dom.js";
import { animateOpacity } from "../generic/map.js";
import Widget from "./widget.js";

/**
 * Create the cartography widget to display
 * geographical information about the current taxon.
 */
class Cartography extends Widget {
    /**
     * @param {Application} app - Application object.
     * @param {Object} params - Parameters of the application.
     */
    constructor(app, parent, params) {
        super(app, parent, params);
        this.type = 'cartography';
        this.large = false;
        this.baselayers = this.params.interface.cartography.baselayers;
        this.baselayerindex = 0;
        let baselayer = this.baselayers[this.baselayerindex];
        let basestyle = baselayer.style;

        // Boolean to flag if the map view is the same as the starting one
        this.origin = true;

        // Create DOM elements
        this.container = makeDiv('cartography', 'sub-panel');
        this.parent.append(this.container);

        // Mask and loader
        this.mask = makeDiv(null, 'cartography-mask mask');
        this.loader = makeDiv(null, 'cartography-loader loader');
        this.mask.append(this.loader)
        this.container.append(this.mask);

        // Map DOM element
        this.mapdiv = makeDiv('map', 'ol-map');
        this.container.append(this.mapdiv);

        this.projection = ol.proj.get('EPSG:3857');

        // Create the basemap
        this.basemap();

        // Create the taxon range object
        this.range = new Range(this, this.params);

        // Create the button to enlarge the map
        this.enlargeButton = makeDiv(null, 'cartography-enlarge cartography-button button ' + basestyle);
        addSVG(this.enlargeButton, new URL('/static/explorer/img/expand.svg', import.meta.url));
        this.container.append(this.enlargeButton);

        // Activate the button to enlarge the map when clicked
        this.enlargeButton.addEventListener('click', () => {
            addClass(this.enlargeButton, 'collapse');
            this.app.enlarge(this, () => {
                if (this.large) { addSVG(this.enlargeButton, new URL('/static/explorer/img/compress.svg', import.meta.url)); }
                else { addSVG(this.enlargeButton, new URL('/static/explorer/img/expand.svg', import.meta.url)); }
                removeClass(this.enlargeButton, 'collapse');
            });
        });
        
        // Create the button to change the base layer
        this.baseLayerButton = makeDiv(null, 'cartography-basemap ' + basestyle, baselayer.name[this.params.languages.current]);
        this.container.append(this.baseLayerButton);

        this.swapping = false;
        // Activate the button to center the map when clicked
        this.baseLayerButton.addEventListener('click', () => {
            if (!this.swapping) {
                this.swapping = true;
                this.cycleBaseLayer(() => { this.swapping = false; });
            }
        });

        // Create the button to center the map
        this.centerButton = makeDiv(null, 'cartography-center cartography-button button collapse ' + basestyle);
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
        this.map.on('movestart', (e) => {
            if (this.range.listen) {
                this.range.listen = false;
                removeClass(this.centerButton, 'collapse');
            }            
        });

        // this.map.on('moveend', (e) => {
        //     console.log(this.view.getZoom());
        // });
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
    update(callback) {
        this.range.set(this.app.updater.getRange(), () => {
            this.loaded();
            callback();
        });
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
            easing: ol.easing.easeInOut
        }, callback);
    }

    /**
     * Create the basemap.
     */
    basemap() {
        let tileDimension = 256;
        let projectionExtent = this.projection.getExtent();
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
            extent: [ (-pi * 6378137) * 2, (-pi * 6378137) * 0.8, (pi * 6378137) * 2, (pi * 6378137) * 0.9 ],
            projection: this.projection
        })

        this.baselayer = new ol.layer.Tile({
            preload: Infinity,
            source: new ol.source.XYZ({
                url: 'http://localhost:8001/' + this.baselayers[this.baselayerindex].url + '/{z}/{x}/{y}.png',
            }),
            zIndex: 10
        });

        this.map = new ol.Map({
            target: 'map',
            layers: [ this.baselayer ],
            view: this.view,
            controls: ol.control.defaults.defaults({
                zoom: false,
                attribution: false,
                rotate: false,
            })
        });
    }

    cycleBaseLayer(callback) {
        callback = callback || function () {};
        let formerstyle = this.baselayers[this.baselayerindex].style;
        this.baselayerindex += 1;
        if (this.baselayerindex >= this.baselayers.length) { this.baselayerindex = 0; }
        let baselayer = this.baselayers[this.baselayerindex];
        this.baseLayerButton.innerHTML = baselayer.name[this.params.languages.current];
        if (formerstyle !== baselayer.style) { this.changeButtonStyle(formerstyle, baselayer.style); }

        let newlayer = new ol.layer.Tile({
            preload: Infinity,
            source: new ol.source.XYZ({
                url: 'http://localhost:8001/' + baselayer.url + '/{z}/{x}/{y}.png',
            }),
            zIndex: 9
        });
        this.map.addLayer(newlayer);

        let transition = this.app.params.interface.transition;
        animateOpacity(this.baselayer, transition, 60, 0, () => {
            this.map.removeLayer(this.baselayer);
            newlayer.setZIndex(10);
            this.baselayer = newlayer;
            callback();
        });
    }

    changeButtonStyle(previous, style) {
        let buttons = [ this.enlargeButton, this.centerButton, this.baseLayerButton ];
        for (let i = 0; i < buttons.length; ++i) {
            removeClass(buttons[i], previous);
            addClass(buttons[i], style);
        }
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

        // Create and add the layer
        this.layer = new ol.layer.Vector({
            source: new ol.source.Vector({
                features: []
            }),
            updateWhileAnimating: true,
            updateWhileInteracting: true,
        });
        this.cartography.map.addLayer(this.layer);
    }

    /**
     * 
     * @param {Object} r - The range to display on the map as a KML file along with its typesorting.
     * @param {function} callback - Callback fired when the range is displayed on the map. 
     */
    set(r, callback) {
        callback = callback || function () {};

        this.listen = false;
        addClass(this.cartography.centerButton, 'collapse');

        let range = r.range;
        let typesorting = r.typesorting;

        // Check if range is not null
        if (range !== '') {
            // Create a new feature using the provided WKT
            let feature = new ol.format.WKT().readFeature(range, {
                dataProjection: 'EPSG:3857',
                featureProjection: 'EPSG:3857'
            })
            
            // Set the fill color to represent the typesorting
            let style = new ol.style.Style({
                fill: new ol.style.Fill({
                    color: this.params.colors[typesorting]
                })
            })

            // Apply the fill style
            this.layer.setStyle(style);

            // Remove all features from the source and add the current
            this.layer.getSource().clear();
            this.layer.getSource().addFeature(feature);
            // Set opacity to 0 for later reveal
            this.layer.setOpacity(0);

            // Center the map on the layer
            this.center(() => {
                // Activate the centering button
                this.cartography.origin = false;
                this.listen = true;
                // Now display the range
                this.display(callback);
            });
        }
        // If range is null
        else {
            this.layer.getSource().clear();
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
     * Center the map on the range layer.
     * @param {function} callback - Callback fired when the map has been centered. 
     */
    center(callback) {
        // Get padding and transition time
        let padding = this.params.interface.cartography.range.padding;
        let transition = this.params.interface.cartography.range.transition.center;
        let extent = this.layer.getSource().getExtent();
        this.cartography.map.getView().fit(extent, {
            // Keep a padding
            padding: [ padding, padding, padding, padding ],
            duration: transition,
            easing: ol.easing.easeInOut,
            callback: callback
        });
    }

    /**
     * Remove the layer from the map after an animation.
     * @param {function} callback - Callback fired when the features has been removed from the map. 
     */
    remove(callback) {
        this.hide(() => {
            this.layer.getSource().clear();
            callback();
        })
    }

    /**
     * Hide the layer on the map.
     * @param {function} callback - Callback fired when the layer has been hidden. 
     */
    hide(callback) {
        this.opacity(0, callback);
    }

    /**
     * Display the layer on the map.
     * @param {function} callback - Callback fired when the layer has been displayed. 
     */
    display(callback) {
        let opacity = this.cartography.params.interface.cartography.range.opacity;
        this.opacity(opacity, callback);
    }

    opacity(value, callback) {
        let duration = this.params.interface.cartography.range.transition.display;
        animateOpacity(this.layer, duration, 60, value, () => { callback(); })
    }
}

export default Cartography