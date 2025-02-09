/**
 * @updater
 * Define the updater object to update every widgets.
 */

import { ajaxGet } from "../generic/ajax.js";
import { wait } from "../generic/dom.js";

class Updater {
    constructor(app, params) {
        this.app = app;
        this.params = params
    }

    update(index, taxonomy=true) {
        this.range(index);
        this.taxon(index, taxonomy);
    }

    range(index) {
        let self = this;
        function display(r) {
            self.app.params.range = r;
            self.app.cartography.update(() => {
                self.app.taxonomy.active = true;
            });
        }

        let start = new Date();
        this.app.cartography.range.remove(() => {});

        ajaxGet('range/' + index + '/', (r) => {
            let end = new Date();
            let elapsed = end - start;
            let transition = this.params.interface.cartography.range.transition.display;
            if (elapsed < transition) {
                wait(transition - elapsed, () => { display(r) })
            } else { display(r); }
        });
    }

    taxon(index, taxonomy=true) {
        this.app.information.loading();
        this.app.photography.loading();
        if (taxonomy) { this.app.taxonomy.loading(); }
        ajaxGet('taxon/' + this.app.params.languages.current + '/' + index + '/', (r) => {
            this.app.params.taxonomy = r;
            this.app.information.update();
            this.app.photography.update();
            if (taxonomy) { this.app.taxonomy.update(); }
        });
    }
}

export default Updater;