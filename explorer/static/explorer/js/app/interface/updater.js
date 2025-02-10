/**
 * @updater
 * Define the updater object to update every widgets.
 */

import { ajaxGet } from "../generic/ajax.js";
import { addClass, wait } from "../generic/dom.js";

class Updater {
    constructor(app, params) {
        this.app = app;
        this.params = params
    }

    fullUpdate(index) {
        this.range(index);
        this.app.information.loading();
        this.app.photography.loading();
        this.app.taxonomy.loading();
        ajaxGet('taxon/' + this.app.params.languages.current + '/' + index + '/', (r) => {
            this.app.params.taxonomy = r;
            this.app.information.update();
            this.app.photography.update();
            this.app.taxonomy.update();
        });
    }

    taxonomyUpdate(index) {
        let siblings = this.app.params.taxonomy.siblings;
        let j = -1;
        for (let i = 0; i < (siblings.length); ++i) {
            if (siblings[i].id === index) { j = i; break; }
        }
        
        if (j > -1) {
            this.app.params.taxonomy.tindex = j;
            this.range(index);
            this.app.information.loading();
            this.app.photography.loading();
            this.app.photography.update();

            ajaxGet('description/' + this.app.params.languages.current + '/' + index + '/', (r) => {
                this.app.params.taxonomy.description = r.values;
                this.app.information.update();
            });
        }
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
        this.app.cartography.range.remove(() => {
            ajaxGet('range/' + index + '/', (r) => {
                let end = new Date();
                let elapsed = end - start;
                let transition = this.params.interface.cartography.range.transition.display;
                if (elapsed < transition) {
                    wait(transition - elapsed, () => { display(r) })
                } else { display(r); }
            });
        })
    }
}

export default Updater;