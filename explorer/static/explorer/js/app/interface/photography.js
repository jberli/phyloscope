/**
 * @photography
 * Define the photography widget.
 */

import { ajaxGet, loadImage } from "../generic/ajax.js";
import { makeDiv, makeImage, addClass, removeClass, wait } from "../generic/dom.js";

class Photography {
    constructor(app) {
        this.app = app;
        this.div = makeDiv('photography', 'sub-panel');
        this.app.third.append(this.div);
        this.photographs = [];
        this.photoid = 0;

        this.previous = new PhotoContainer(false, this.div, false);
        this.current = new PhotoContainer(true, this.div, false);
        this.next = new PhotoContainer(false, this.div, false);
    }

    update() {
        this.current.loading();
        this.taxon = this.app.params.taxon;
        let index = this.taxon.taxonomy.tindex;
        this.photographs = this.taxon.taxonomy.siblings[index].photographs;
        this.photoid = 0;

        if (this.photographs.length > 1) { this.activateSlide(); }

        this.reload();
    }

    reload() {
        let l = this.photographs.length
        if (l > 0) { this.current.setImage(this.photographs[this.photoid], 'original'); }
    }

    activateSlide() {
        let p = this;
        this.div.addEventListener('wheel', slide)
        function slide(e) {
            this.removeEventListener('wheel', slide);
            if (e.type === 'wheel') {
                if (e.deltaY > 0) {
                    p.previous.destroy();
                    p.current.smoosh();
                    p.previous = p.current;
                    p.current = p.next;
                    p.current.expand();
                    p.next = new PhotoContainer(false, p.div, false);
                    if (p.photoid == 0) { p.photoid = p.photographs.length - 1 }
                    else { p.photoid -= 1 }
                } else {
                    p.next.destroy();
                    p.current.smoosh();
                    p.next = p.current;
                    p.current = p.previous;
                    p.current.expand();
                    p.previous = new PhotoContainer(false, p.div, true);
                    if (p.photoid == p.photographs.length - 1) { p.photoid = 0 }
                    else { p.photoid += 1 }
                }
                p.reload();
            }
            wait(200, () => { p.activateSlide(); })
        }
    }
}

class PhotoContainer {
    constructor(active, container, start) {
        this.active = active;
        this.url = 'https://inaturalist-open-data.s3.amazonaws.com/photos/';

        let c = '';
        if (!this.active) { c = ' smooshed' }
        this.div = makeDiv(null, 'photography-container' + c);
        this.mask = makeDiv(null, 'photography-mask mask');
        this.loader = makeDiv(null, 'photography-loader');
        this.mask.append(this.loader);
        this.div.append(this.mask);

        if (start) { container.insertBefore(this.div, container.firstChild); }
        else { container.append(this.div); }
    }

    setImage(photo, size) {
        this.image = makeImage(this.url + photo.id + '/' + size + '.' + photo.extension, null, null, null, 'image');
        loadImage(this.image).then(() => { this.loaded() });
        this.div.append(this.image);
    }

    loading() {
        removeClass(this.mask, 'loaded');
    }

    loaded() {
        addClass(this.mask, 'loaded');
    }

    expand() {
        removeClass(this.div, 'smooshed');
    }

    smoosh() {
        addClass(this.div, 'smooshed');
    }

    destroy() {
        this.div.remove()
    }
}

export default Photography