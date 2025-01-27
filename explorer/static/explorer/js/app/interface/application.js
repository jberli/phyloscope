/**
 * @application
 * Define the application object.
 */

import { ajaxGet } from "../generic/ajax.js";
import { addClass, removeClass, makeDiv } from "../generic/dom.js";
import Cartography from "./cartography.js";
import Description from "./description.js";
import Footer from "./footer.js";
import Header from "./header.js";
import Photography from "./photography.js";
import Taxonomy from "./taxonomy.js";

class Application {
    constructor() {
        // Create the application div and append it to the document body
        this.container = makeDiv('application');
        this.mask = makeDiv('application-mask', 'mask');
        this.container.append(this.mask);
        document.body.appendChild(this.container);

        // Wait for the DOM the finish loading
        window.addEventListener('DOMContentLoaded', () => {
            // Retrieve the configuration parameters
            ajaxGet('configuration/', (params) => {
                this.params = params;

                // Create the header
                this.header = new Header(this);
                // Create the main interface
                this.content = makeDiv('content');
                this.first = makeDiv('first-panel', 'panel');
                this.second = makeDiv('second-panel', 'panel');
                this.third = makeDiv('third-panel', 'panel');
                this.content.append(this.first, this.second, this.third);
                this.container.append(this.content);

                // Instanciate widgets of the application
                this.taxonomy = new Taxonomy(this);
                this.description = new Description(this);
                this.footer = new Footer(this);
                this.photography = new Photography(this, this.params);
                this.cartography = new Cartography(this, this.params);

                // Reveal the interface
                this.loaded();

                // Update the application by fetching the new taxon
                this.update();
            });        
        });
    }

    /**
     * Update the application by fetching the current taxon information.
     */
    update() {
        // Set widgets on loading mode

        // this.description.loading();
        // this.photography.loading();
        // this.cartography.loading();

        // let taxon = this.taxon();
        // console.log(this.params)

        // this.cartography.update(this.params.range);

        // // Hide and remove the range
        // this.cartography.removeRange();

        // // Retrieve the range file.
        // ajaxGet('range/' + this.params.taxonomy.id + '/', (r) => {
        //     this.cartography.update(r);
        // });

        // ajaxGet('taxon/' + this.language + '/' + this.params.taxon.id + '/', (r) => {
        //     this.params.taxonomy = r;
        //     this.photography.update();
        //     this.description.update();
        // });
    }

    taxon() {
        let i = this.params.taxonomy.tindex;
        return this.params.taxonomy.siblings[i]
    }

    loading() {
        removeClass(this.mask, 'loaded');
    }

    loaded() {
        addClass(this.mask, 'loaded');
    }
}

export default Application