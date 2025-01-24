/**
 * @footer
 * Define the footer widget.
 */

import { ajaxGet } from "../generic/ajax.js";
import { makeDiv } from "../generic/dom.js";

class Footer {
    constructor(app) {
        this.app = app;
        this.container = makeDiv('footer', 'sub-panel');
        this.app.second.append(this.container);
    }
}

export default Footer