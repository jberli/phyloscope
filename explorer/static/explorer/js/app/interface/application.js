/**
 * @application
 * Define the application object.
 */

import { ajaxGet } from "../generic/ajax.js";
import { addClass, removeClass, makeDiv, getColorsByClassNames } from "../generic/dom.js";
import Cartography from "./cartography.js";
import Information from "./information.js";
import Footer from "./footer.js";
import Header from "./header.js";
import Photography from "./photography.js";
import Taxonomy from "./taxonomy.js";
import Updater from "./updater.js";

class Application {
    constructor() {
        // Create the application div and append it to the document body
        this.container = makeDiv('application');
        this.mask = makeDiv('application-mask', 'mask');
        this.container.append(this.mask);
        document.body.appendChild(this.container);

        // Retrieve the configuration parameters
        ajaxGet('configuration/', (params) => {
            this.params = params;
            this.params.colors = getColorsByClassNames(...this.params.typesorting);

            // Create the first, second and third column panel
            this.first = makeDiv('first-panel', 'panel');
            this.second = makeDiv('second-panel', 'panel');
            this.third = makeDiv('third-panel', 'panel');
            // Append the panels to the application container
            this.container.append(this.first, this.second, this.third);

            // Create the information and footer widgets in the first panel
            this.information = new Information(this, this.params);
            this.footer = new Footer(this);
            // Create the header and taxonomy widgets in the second panel
            this.header = new Header(this);
            this.taxonomy = new Taxonomy(this, this.params);
            // Create the photography and cartography widgets in the second panel
            this.photography = new Photography(this, this.params);
            this.cartography = new Cartography(this, this.params);

            // Create the updater object to update the widgets on demand
            this.updater = new Updater(this, this.params);
            this.updater.full(this.params.taxonomy.current);

            // Reveal the interface
            this.loaded();
        });
    }

    loading() {
        removeClass(this.mask, 'loaded');
    }

    loaded() {
        addClass(this.mask, 'loaded');
    }
}

export default Application