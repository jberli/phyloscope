/**
 * @application
 * Define the application object.
 */

import { ajaxGet } from "../generic/ajax.js";
import { addClass, removeClass, makeDiv, getColorsByClassNames, wait } from "../generic/dom.js";
import Cartography from "./cartography.js";
import Information from "./information.js";
import Footer from "./footer.js";
import Header from "./header.js";
import Photography from "./photography.js";
import Statistics from "./statistics.js";
import Taxonomy from "./taxonomy.js";
import Updater from "./updater.js";

class Application {
    constructor() {
        // Create the application div and append it to the document body
        this.container = makeDiv('application');
        this.mask = makeDiv('application-mask', 'mask');
        this.container.append(this.mask);
        this.large = '';
        document.body.appendChild(this.container);

        // Retrieve the configuration parameters
        ajaxGet('configuration/', (params) => {
            this.params = params;
            this.params.colors = getColorsByClassNames(...Object.keys(this.params.typesorting));

            // Create the first, second and third column panel
            this.first = makeDiv('first-panel', 'panel');
            this.second = makeDiv('second-panel', 'panel');
            this.third = makeDiv('third-panel', 'panel');
            // Append the panels to the application container
            this.container.append(this.first, this.second, this.third);

            // Create the information, photography and footer widgets in the first panel
            this.information = new Information(this, this.first, this.params);
            this.cartography = new Cartography(this, this.first, this.params);           

            // Create header and taxonomy widgets in the second panel
            this.header = new Header(this, this.second, this.params);
            this.taxonomy = new Taxonomy(this, this.second, this.params);
            this.footer = new Footer(this, this.second, this.params);

            // Create the cartography and statistics panel in the third panel
            this.photography = new Photography(this, this.third, this.params);
            this.statistics = new Statistics(this, this.third, this.params);

            // Set up the updater interface object
            this.updater = new Updater(this, this.params);
            this.updater.update(this.params.taxonomy.current, 'application', () => {
                console.log('updated');
            });

            this.widgets = 5;

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

    freeze() {
        this.information.freeze();
        this.photography.freeze();
        this.taxonomy.freeze();
    }

    unfreeze() {
        this.information.unfreeze();
        this.photography.unfreeze();
        this.taxonomy.unfreeze();
    }

    enlarge(widget, callback) {
        callback = callback || function () {};
        if (widget.type === this.large) {
            removeClass(this.container, widget.type);
            this.large = '';
            widget.large = false;
        } else {
            addClass(this.container, widget.type);
            this.large = widget.type;
            widget.large = true;
        }
        wait(this.params.interface.transition, callback);
    }
}

export default Application