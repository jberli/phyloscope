/**
 * @header
 * Define the header of the application.
 */

import { makeDiv } from "../generic/dom.js";
import Widget from "./widget.js";

class Header extends Widget {
    constructor(app, parent, params) {
        super(app, parent, params);
        this.container = makeDiv('header', 'sub-panel');
        this.parent.append(this.container);

        this.logo = new Logo(this);
        // this.search = new Search(this);
        // this.information = new Information(this);
    }
}

class Logo {
    constructor(header) {
        this.header = header;
        this.container = makeDiv('header-logo', 'header-module', this.header.app.params.interface.title);
        this.header.container.append(this.container);
    }
}

// class Information {
//     constructor(header) {
//         this.header = header;
//         this.container = makeDiv('header-information', 'header-module');
//         this.header.container.append(this.container);
//     }
// }

export default Header;