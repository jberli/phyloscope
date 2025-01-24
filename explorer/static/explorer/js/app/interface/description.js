/**
 * @description
 * Define the description widget.
 */

import { ajaxGet } from "../generic/ajax.js";
import { makeDiv } from "../generic/dom.js";

class Description {
    constructor(app) {
        this.app = app;
        this.container = makeDiv('description', 'sub-panel');
        this.content = makeDiv(null, 'description-content');
        this.container.append(this.content);
        this.app.second.append(this.container);
    }

    displayDescription() {
        let taxon = this.app.params.taxon;
        let title = makeDiv(null, 'description-title');
        this.content.append(title);

        // ajaxGet('description/' + this.app.language + '/' + taxon.id + '/', (r) => {
        //     let t;
        //     if (taxon.vernaculars.length > 0) { t = taxon.vernaculars.shift(); }
        //     else { t = r.title }

        //     let title = makeDiv(null, 'description-title', t);
        //     this.content.append(title);

        //     let names = makeDiv(null, 'description-names');
        //     let scientific = makeDiv(null, 'description-scientific', taxon.scientific);
        //     let vernaculars = makeDiv(null, 'description-vernaculars');
        //     names.append(scientific, vernaculars);

        //     for (let i = 0; i < taxon.vernaculars.length; i++) {
        //         let v = taxon.vernaculars[i];
        //         if (v.toLowerCase().replace('-', ' ') !== title) {
        //             let vernacular = makeDiv(null, 'description-vernacular', v);
        //             vernaculars.append(vernacular);
        //         }
        //     }
        //     this.content.append(names);

        //     let summary = makeDiv(null, 'description-summary', r.summary);
        //     this.content.append(summary);

        // });
    }

    update() {
        
    }
}

export default Description