/**
 * @statistics
 * Define the statistics widget.
 */

import { makeDiv } from "../generic/dom.js";

class Statistics {
    constructor(app) {
        this.app = app;
        this.container = makeDiv('statistics', 'sub-panel');
        this.app.third.append(this.container);
    }
}

export default Statistics;