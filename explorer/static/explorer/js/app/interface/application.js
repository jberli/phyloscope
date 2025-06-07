/**
 * @application
 * Define the application object.
 */

import { ajaxGet } from "../generic/ajax.js";
import { addClass, removeClass, makeDiv, getColorsByClassNames, wait } from "../generic/dom.js";
import Cartography from "./cartography.js";
import Information from "./information.js";
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
        let language = navigator.language.substring(0, 2);
        
        // Retrieve the configuration parameters
        ajaxGet('configuration/' + language, (params) => {
            this.params = params;
            this.params.widgets = 5;
            this.params.colors = getColorsByClassNames(...Object.keys(this.params.typesorting));

            document.title = this.params.metadata.title[language];
            document.querySelector('meta[name="description"]').setAttribute("content", this.params.metadata.description[language]);
            document.documentElement.setAttribute("lang", language);

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
            // this.footer = new Footer(this, this.second, this.params);

            // Create the cartography and statistics panel in the third panel
            this.photography = new Photography(this, this.third, this.params);
            this.statistics = new Statistics(this, this.third, this.params);

            // Set up the updater interface object
            this.updater = new Updater(this, this.params);
            this.updater.initialize(this.params.taxonomy.current);

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
        this.header.freeze();
        this.cartography.freeze();
        this.information.freeze();
        this.photography.freeze();
        this.taxonomy.freeze();
        this.statistics.freeze();
    }

    unfreeze() {
        this.header.unfreeze();
        this.cartography.unfreeze();
        this.information.unfreeze();
        this.photography.unfreeze();
        this.taxonomy.unfreeze();
        this.statistics.unfreeze();
    }

    unselectable() {
        this.header.unselectable();
        this.cartography.unselectable();
        this.information.unselectable();
        this.photography.unselectable();
        this.taxonomy.unselectable();
        this.statistics.unselectable();
    }

    selectable() {
        this.header.selectable();
        this.cartography.selectable();
        this.information.selectable();
        this.photography.selectable();
        this.taxonomy.selectable();
        this.statistics.selectable();
    }
}

export default Application