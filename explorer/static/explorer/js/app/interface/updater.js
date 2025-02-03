/**
 * @updater
 * Define the updater object to update every widgets.
 */

import { ajaxGet } from "../generic/ajax.js";

class Updater {
    constructor(app) {
        this.app = app;
    }

    update(index) {
        this.range(index);
        this.taxon(index);
    }

    range(index) {
        ajaxGet('range/' + index + '/', (r) => {
            this.app.params.range = r;
            this.app.cartography.update();
        });
    }

    taxon(index) {
        ajaxGet('taxon/' + this.app.params.languages.current + '/' + index + '/', (r) => {
            this.app.params.taxonomy = r;
            this.app.photography.update();
        });
    }
}

export default Updater;