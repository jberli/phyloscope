/**
 * @widget
 * Define the base widget class.
 */

import { addClass, removeClass } from "../generic/dom.js";

class Widget {
    constructor(app, parent, params) {
        this.app = app;
        this.params = params;
        this.parent = parent;
        this.freezed = false;
        this.activeinfo = false;
    }

    freeze() {
        this.freezed = true;
    }

    unfreeze() {
        this.freezed = false;
    }
}

export default Widget;