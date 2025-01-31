/**
 * @photography
 * Define the photography widget.
 */

import { loadImage } from "../generic/ajax.js";
import { makeDiv, makeImage, addClass, removeClass, wait } from "../generic/dom.js";

/**
 * Create the photography widget to display
 * photographs about the current taxon.
 */
class Photography {
    /**
     * @param {Application} app - Application object.
     * @param {Object} params - Parameters of the application.
     */
    constructor(app, params) {
        this.app = app;
        this.params = params;

        // Store photographs and the index of the default
        this.photographs = [];
        this.photoid = 0;

        // Create DOM elements
        this.container = makeDiv('photography', 'sub-panel');
        this.app.third.append(this.container);

        // Create individual photo objects
        this.previous = new PhotoContainer(this, false, false);
        this.current = new PhotoContainer(this, true, false);
        this.next = new PhotoContainer(this, false, false);

        // Flag to set the slider to active or not (if only one photo, set to inactive)
        this.active = false;
        // Flag to know if the sliding is currently taking place
        this.sliding = false;
    }

    /**
     * Update the widget to display a new taxon.
     */
    update() {
        // Activate loading
        this.loading();

        let taxonomy = this.params.taxonomy;
        let taxon = taxonomy.siblings[taxonomy.tindex];
        this.photographs = taxon.photographs;
        this.photoid = 0;

        // Set the slider as active if more than one photo is present
        if (this.photographs.length > 1) { this.active = true; }
        else { this.active = false; }

        // Display the default photo in the current photo container
        if (this.photographs.length > 0) { this.current.set(this.photographs[this.photoid], 'original'); }

        // Activate the sliding of the photographs
        this.slide();
    }

    /**
     * Display the loader on the widget and block interractions.
     */
    loading() { this.current.loading(); }

    /**
     * Hide the loader and allow interractions.
     */
    loaded() { this.current.loaded(); }

    /**
     * Activate the sliding of photographs.
     */
    slide() {
        let self = this;
        this.container.addEventListener('wheel', (e) => {
            if (self.active && !self.sliding) {
                self.sliding = true;
                if (e.type === 'wheel') {
                    if (e.deltaY > 0) {
                        self.previous.destroy();
                        self.current.smoosh();
                        self.previous = self.current;
                        self.current = self.next;
                        self.current.expand();
                        self.next = new PhotoContainer(self, false, false);
                        if (self.photoid == 0) { self.photoid = self.photographs.length - 1 }
                        else { self.photoid -= 1 }
                    } else {
                        self.next.destroy();
                        self.current.smoosh();
                        self.next = self.current;
                        self.current = self.previous;
                        self.current.expand();
                        self.previous = new PhotoContainer(self, false, true);
                        if (self.photoid == self.photographs.length - 1) { self.photoid = 0 }
                        else { self.photoid += 1 }
                    }
                    self.current.set(self.photographs[self.photoid], 'original');
                }
                wait(200, () => { self.sliding = false; })
            }
        })
    }
}

/**
 * An individual photo container.
 */
class PhotoContainer {
    /**
     * @param {Photography} photography - The photography widget.
     * @param {boolean} active - Whether the photograph should be active.
     * @param {boolean} start - Whether the photograph should be inserted at the start of the widget.
     */
    constructor(photography, active, start) {
        this.photography = photography;
        this.active = active;
        this.start = start;

        // The url of the photographs
        this.url = 'https://inaturalist-open-data.s3.amazonaws.com/photos/';

        // Smooshed the container if not active
        let c = '';
        if (!this.active) { c = ' smooshed' }

        // Create DOM Elements
        this.container = makeDiv(null, 'photography-container' + c);
        this.mask = makeDiv(null, 'photography-mask mask');
        this.loader = makeDiv(null, 'loader');
        this.mask.append(this.loader);
        this.container.append(this.mask);

        // Append the container to the start or the end
        if (this.start) { this.photography.container.insertBefore(this.container, this.photography.container.firstChild); }
        else { this.photography.container.append(this.container); }
    }

    /**
     * 
     * @param {Object} photo - Information about the photograph.
     * @param {string} size - Size of the photograph (small, medium, large, original). 
     */
    set(photo, size) {
        // If an image has already been set, remove it
        if (this.image !== undefined) { this.image.remove(); }
        // Make the image DOM Element
        this.image = makeImage(this.url + photo.id + '/' + size + '.' + photo.extension, null, null, null, 'image');
        this.container.append(this.image);
        // Load the photograph from iNaturalist servers
        loadImage(this.image).then(() => { this.loaded() });
        // Activate the adjustment interaction
        this.adjust();
    }

    /**
     * Activate the adjustment interaction to see the whole image
     * when its size is different from the size of the widget.
     */
    adjust() {
        let self = this;
        // Activate the adjustment when moving the mouse
        this.image.addEventListener('mousemove', (e) => {
            if  (self.active) {
                let i = self.image
                let dratio = i.width / i.height;
                let iratio = i.naturalWidth / i.naturalHeight;
                if (dratio !== iratio) {
                    let rect = e.target.getBoundingClientRect();
                    if (dratio > iratio) {
                        let p = (e.clientY - rect.top) * 100 / i.height;
                        e.target.style.objectPosition = 'center ' + p + '%';
                    } else {
                        let p = (e.clientX - rect.left) * 100 / i.width;
                        e.target.style.objectPosition = p + '% center';
                    }
                }
            }
        });
        // Reset the image when leaving
        this.image.addEventListener('mouseleave', (e) => {
            e.target.style.objectPosition = '50% 50%';
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
     * Unsmoosh the photograph => activate it.
     */
    expand() {
        removeClass(this.container, 'smooshed');
        this.active = true;
    }

    /**
     * Smoosh the photograph => deactivate it.
     */
    smoosh() {
        addClass(this.container, 'smooshed');
        this.active = false;
    }

    /**
     * Destroy the photograph.
     */
    destroy() { this.container.remove(); }
}

export default Photography