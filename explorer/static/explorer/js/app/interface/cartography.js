/**
 * @cartography
 * Define the cartography widget.
 */

import { makeDiv, addClass, removeClass, addSVG, wait } from "../generic/dom.js";
import { animateOpacity } from "../generic/map.js";
import { Helper } from "./helper.js";
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
        this.baselayers = this.params.interface.cartography.baselayers;
        this.baselayerindex = 0;
        let baselayer = this.baselayers[this.baselayerindex];

        // Create DOM elements
        this.container = makeDiv('cartography', 'sub-panel');
        this.parent.append(this.container);

        this.helper = new Helper(this, this.container, this.type);
        this.helper.update();

        this.infocontainer = makeDiv(null, 'cartography-information panel-information');
        this.container.append(this.infocontainer);

        this.resizercontainer = makeDiv(null, 'panel-resizer-container collapse');
        this.resizer = makeDiv(null, 'panel-resizer');
        this.resizercontainer.append(this.resizer);
        this.container.append(this.resizercontainer);
        wait(10, () => { removeClass(this.resizercontainer, 'collapse'); })

        let self = this;
        this.resizer.addEventListener('mousedown', () => {
            function moving(f) {
                let height = self.app.container.offsetHeight;
                let width = self.app.container.offsetWidth;
                
                let hperc = 100 * f.clientY / height;
                if (hperc > 20 && hperc < 80) {
                    self.app.information.container.style.flex = hperc + '%';
                    self.container.style.flex = (100 - hperc) + '%';
                }

                let wperc = (100 * f.clientX / width);
                if (wperc > 20 && wperc < 50) {
                    self.app.first.style.flex = wperc + '%';
                    self.app.second.style.flex = (70 - wperc) + '%';
                }
            }
            function exit() {
                document.removeEventListener('mousemove', moving);
                document.removeEventListener('mouseup', exit);
                self.app.selectable();
            }
            self.app.unselectable();
            document.addEventListener('mousemove', moving);
            document.addEventListener('mouseup', exit);
        });

        this.resizer.addEventListener('dblclick', () => {
            self.app.first.style.flex = '35%';
            self.app.second.style.flex = '35%';
            self.app.information.container.style.flex = '40%';
            self.container.style.flex = '60%';
        });

        // Map DOM element
        this.mapdiv = makeDiv('map', 'ol-map');
        this.container.append(this.mapdiv);

        this.projection = ol.proj.get('EPSG:3857');

        // Create the basemap
        this.basemap();

        // Create the taxon range object
        this.range = new Range(this, this.params);
        
        // Create the button to change the base layer
        this.baseLayerButton = makeDiv(null, 'cartography-basemap ' + this.getBaseStyle(), baselayer.name[this.params.languages.current]);
        this.container.append(this.baseLayerButton);

        this.swapping = false;
        this.baseLayerButton.addEventListener('click', () => {
            if (!this.swapping && !this.freezed) {
                this.swapping = true;
                this.cycleBaseLayer(() => { this.swapping = false; });
            }
        });

        // Mask and loader
        this.mask = makeDiv(null, 'cartography-mask mask');
        this.container.append(this.mask);

        this.helpcontainer = makeDiv(null, 'cartography-button-help-container button-help-container '  + this.getBaseStyle());
        this.help = makeDiv(null, 'button button-help');
        addSVG(this.help, new URL('/static/explorer/img/help.svg', import.meta.url));

        this.helpcontainer.addEventListener('click', () => { this.helper.trigger(true); })

        this.loader = makeDiv(null, 'loader-container');
        this.loadersymbol = makeDiv(null, 'loader');
        this.loader.append(this.loadersymbol);
        this.helpcontainer.append(this.help, this.loader);
        this.container.append(this.helpcontainer);
    }

    /**
     * Display the loader on the widget and block interractions.
     */
    loading() {
        removeClass(this.mask, 'loaded');
        removeClass(this.loader, 'loaded');
    }

    /**
     * Hide the loader and allow interractions.
     */
    loaded() {
        addClass(this.mask, 'loaded');
        addClass(this.loader, 'loaded');
    }

    /**
     * Update the range on the map.
     */
    update(callback) {
        this.range.set(this.app.updater.getRange(), () => {
            this.loaded();
            callback();
        });
    }

    hideRange(callback) {
        callback = callback || function () {};
        this.range.hide(callback);
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
            extent: [ (-pi * 6378137) * 2.5, -pi * 6378137, (pi * 6378137) * 2.5, pi * 6378137 ],
            projection: this.projection
        })

        // this.physical = new ol.layer.Tile({
        //     preload: Infinity,
        //     source: new ol.source.XYZ({
        //         url: 'http://localhost:8001/nefr/{z}/{x}/{y}.png',
        //     }),
        //     zIndex: 11
        // });

        this.baselayer = new ol.layer.Tile({
            preload: Infinity,
            source: new ol.source.XYZ({
                url: `https://geo.phyloscope.org/${this.baselayers[this.baselayerindex].url}/{z}/{x}/{y}.png`,
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
                url: `https://geo.phyloscope.org/${baselayer.url}/{z}/{x}/{y}.png`,
            }),
            zIndex: 9
        });
        this.map.addLayer(newlayer);

        animateOpacity(this.baselayer, 500, 60, 0, () => {
            this.map.removeLayer(this.baselayer);
            newlayer.setZIndex(10);
            this.baselayer = newlayer;
            callback();
        });
    }

    changeButtonStyle(previous, style) {
        let buttons = [ this.range.centerButton, this.baseLayerButton, this.helpcontainer, this.range.activateButton ];
        for (let i = 0; i < buttons.length; ++i) { this.changeStyle(buttons[i], previous, style); }
    }

    changeStyle(button, previous, style) {
        removeClass(button, previous);
        addClass(button, style);
    }

    getBaseStyle() {
        return this.baselayers[this.baselayerindex].style;
    }

    switchLanguage(language, callback) {
        callback = callback || function () {};
        let transition = this.app.params.interface.transition;
        addClass(this.baseLayerButton, 'collapse');
        addClass(this.helper.content, 'hidden');
        wait(transition, () => {
            this.baseLayerButton.innerHTML = this.baselayers[this.baselayerindex].name[language];
            this.helper.update();
            removeClass(this.baseLayerButton, 'collapse');
            wait(transition, () => {
                this.loaded();
                callback();
            });
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
        this.typesorting;
        
        // Flag to see if the range is currently activated
        this.active = true;
        // Flag to see if the map should listen to map changes
        this.listening = false;
        // Flag to see if the map has been moved since recentering
        this.moved = false;
        // Flag to see if the map is currently in the default view
        this.default = true;
        // Flag to see if the geometry of the range exists
        this.geometry = false;
        // Flag to see if the geometry should be wrap at the antimeridian
        this.wrapping = false;

        // Flag to avoid double activation of the range
        this.transition = false;

        // Create and add the layer
        this.layer = new ol.layer.Vector({
            updateWhileAnimating: true,
            updateWhileInteracting: true,
            zIndex: 100
        });
        this.cartography.map.addLayer(this.layer);

        let basestyle = this.cartography.getBaseStyle();

        // Create the button to center the map
        this.centerButton = makeDiv(null, 'cartography-center cartography-button button collapse ' + basestyle);
        addSVG(this.centerButton, new URL('/static/explorer/img/center.svg', import.meta.url));

        // Create the button to activate the range
        this.activateButton = makeDiv(null, 'cartography-button-display-container active ' + basestyle);
        this.activateButtonSlider = makeDiv(null, 'cartography-button-display-slider');
        this.activateButton.append(this.activateButtonSlider);

        // Activate the button to center the map when clicked
        this.centerButton.addEventListener('click', () => {
            if (!this.cartography.freezed) {
                addClass(this.centerButton, 'collapse');
                this.listening = false;
                this.center(() => {
                    this.moved = false;
                    this.listening = true;
                });
            }
        });

        // Activate of deactivate the range on click
        this.activateButton.addEventListener('click', () => {
            if (!this.cartography.freezed) {
                if (this.active) { this.deactivate(); }
                else { this.activate(); }
            }
        });

        // Display the centering button when moving the map
        this.cartography.map.on('movestart', (e) => {
            this.default = false;
            this.moved = true;
            if (this.listening) {
                this.listening = false;
                removeClass(this.centerButton, 'collapse');
            }
        });

        this.cartography.container.append(this.centerButton, this.activateButton);
    }

    /**
     * 
     * @param {Object} r - The range to display on the map as a WKT geometry along with its typesorting.
     * @param {function} callback - Callback fired when the range is displayed on the map. 
     */
    set(r, callback) {
        callback = callback || function () {};

        this.listening = false;
        addClass(this.centerButton, 'collapse');
        removeClass(this.activateButton, this.typesorting);

        let range = r.range;
        this.typesorting = r.typesorting;
        addClass(this.activateButton, this.typesorting);

        // Check if range is not null
        if (range !== '') {
            this.geometry = true;
            removeClass(this.activateButton, 'deactivated');

            // Create a new feature using the provided WKT
            let feature = new ol.format.WKT().readFeature(range);

            let extent = feature.getGeometry().getExtent();
            const minimum = -Math.PI * 6378137;
            const maximum = Math.PI * 6378137;

            if (extent[0] < minimum || extent[2] > maximum) {
                if (this.wrapping) { this.wrapping = false; }
            } else {
                if (!this.wrapping) { this.wrapping = true; }
            }
            
            // Set the fill color to represent the typesorting
            let style = new ol.style.Style({
                fill: new ol.style.Fill({
                    color: this.params.colors[this.typesorting]
                })
            });

            // Apply the fill style
            this.layer.setStyle(style);

            let source = new ol.source.Vector({
                features: [ feature ],
                wrapX: this.wrapping,
            });

            this.layer.setSource(source);
            
            // Set opacity to 0 for later reveal
            this.layer.setOpacity(0);

            if (this.active) {
                // Center the map on the layer
                this.center(() => {
                    // Activate the centering button
                    this.default = false;
                    this.moved = false;
                    this.listening = true;
                    // Now display the range
                    this.display(callback);
                });
            } else {
                callback();
            }
        }
        // If range is null
        else {
            this.geometry = false;
            this.deactivated = true;
            addClass(this.activateButton, 'deactivated');
            
            this.layer.getSource().clear();
            let carto = this.params.interface.cartography;
            let center = carto.start.center;
            let zoom = carto.start.zoom;
            let transition = this.cartography.params.interface.cartography.range.transition.center;

            if (!this.default) {
                this.cartography.animate(center, zoom, transition, () => {
                    this.default = true;
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
        animateOpacity(this.layer, duration, 60, value, callback)
    }

    activate() {
        if (!this.transition && this.geometry) {
            this.transition = true;
            this.active = true;
            addClass(this.activateButton, 'active');

            if (this.geometry) {
                this.listening = true;
                if (this.moved) {
                    removeClass(this.centerButton, 'collapse');
                }
            }

            this.display(() => {
                this.transition = false;
            })
        }
    }

    deactivate() {
        if (!this.transition && this.geometry) {
            this.transition = true;
            this.active = false;
            this.listening = false;
            removeClass(this.activateButton, 'active');
            addClass(this.centerButton, 'collapse');
            this.hide(() => {
                this.transition = false;
            })
        }
    }
}

export default Cartography