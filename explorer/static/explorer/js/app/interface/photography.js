/**
 * @photography
 * Define the photography widget.
 */

import { ajaxGet, loadImage } from "../generic/ajax.js";
import { makeDiv, makeImage, addClass, removeClass, wait } from "../generic/dom.js";

class Photography {
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

        this.active = false;
    }

    update() {
        this.loading();

        this.taxon = this.app.params.taxon;
        let index = this.taxon.taxonomy.tindex;
        this.photographs = this.taxon.taxonomy.siblings[index].photographs;
        this.photoid = 0;

        if (this.photographs.length > 1) {
            if (!this.active) { this.sliding(true); }
        } else {
            if (this.active) { this.sliding(false); }
        }

        this.reload();
    }

    reload() {
        let l = this.photographs.length;
        if (l > 0) { this.current.set(this.photographs[this.photoid], 'original'); }
    }

    loading() {
        this.current.loading();
    }

    loaded() {
        this.current.loaded();
    }

    sliding(activate) {
        let self = this;

        function slide(e) {
            self.container.removeEventListener('wheel', slide, true);
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
                self.reload();
            }
            wait(200, () => {
                self.sliding(true);
            })
        }

        if (activate) {
            self.active = true;
            self.container.addEventListener('wheel', slide, true);
        } else {
            self.active = false;
            self.container.removeEventListener('wheel', slide, true);
        }
    }
}

class PhotoContainer {
    constructor(photography, active, start) {
        this.active = active;
        this.url = 'https://inaturalist-open-data.s3.amazonaws.com/photos/';

        let c = '';
        if (!this.active) { c = ' smooshed' }
        this.container = makeDiv(null, 'photography-container' + c);
        this.mask = makeDiv(null, 'photography-mask mask');
        this.loader = makeDiv(null, 'loader');
        this.mask.append(this.loader);
        this.container.append(this.mask);

        if (start) { photography.container.insertBefore(this.container, photography.container.firstChild); }
        else { photography.container.append(this.container); }
    }

    set(photo, size) {
        if (this.image !== undefined) { this.image.remove(); }
        this.image = makeImage(this.url + photo.id + '/' + size + '.' + photo.extension, null, null, null, 'image');
        this.container.append(this.image);
        loadImage(this.image).then(() => { this.loaded() });
        this.adjusting();
    }

    adjusting() {
        let self = this;

        function restore(e) {
            e.target.style.objectPosition = '50% 50%';
        }

        function adjust(e) {
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
        }

        // this.image.addEventListener('mouseenter', adjust);
        this.image.addEventListener('mousemove', adjust);
        this.image.addEventListener('mouseleave', restore);
    }

    loading() {
        removeClass(this.mask, 'loaded');
    }

    loaded() {
        addClass(this.mask, 'loaded');
    }

    expand() {
        removeClass(this.container, 'smooshed');
        this.active = true;
    }

    smoosh() {
        addClass(this.container, 'smooshed');
        this.active = false;
    }

    destroy() {
        this.container.remove()
    }
}

export default Photography