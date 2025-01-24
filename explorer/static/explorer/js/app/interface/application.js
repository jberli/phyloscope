/**
 * @application
 * Define the application object.
 */

import { ajaxGet } from "../generic/ajax.js";
import { makeDiv } from "../generic/dom.js";
import Cartography from "./cartography.js";
import Description from "./description.js";
import Footer from "./footer.js";
import Header from "./header.js";
import Photography from "./photography.js";
import Taxonomy from "./taxonomy.js";

class Application {
    constructor(params, container) {
        this.params = params;
        this.language = params.languages.current;
        this.languages = params.languages.available;
        this.container = container;
        this.header = new Header(this);

        this.content = makeDiv('content');
        this.first = makeDiv('first-panel', 'panel');
        this.second = makeDiv('second-panel', 'panel');
        this.third = makeDiv('third-panel', 'panel');

        this.content.append(this.first, this.second, this.third);
        this.container.append(this.content);

        this.taxonomy = new Taxonomy(this);
        this.description = new Description(this);
        this.footer = new Footer(this);
        this.photography = new Photography(this);
        this.cartography = new Cartography(this);

        this.updateTaxon();
    }

    updateTaxon() {
        ajaxGet('range/' + this.params.taxon.id + '/', (r) => {
            this.cartography.update(r);
        })

        ajaxGet('taxon/' + this.language + '/' + this.params.taxon.id + '/', (r) => {
            this.params.taxon = r;
            this.photography.update();
        })
    }
}

export default Application