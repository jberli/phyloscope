/**
 * @footer
 * Define the footer widget.
 */

import { makeDiv } from "../generic/dom.js";
import Widget from "./widget.js";

class Footer extends Widget {
    constructor(app, parent, params) {
        super(app, parent, params);
        this.container = makeDiv('footer', 'sub-panel');
        this.parent.append(this.container);
    }
}

export default Footer