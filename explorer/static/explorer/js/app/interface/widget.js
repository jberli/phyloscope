/**
 * @widget
 * Define the base widget class.
 */

class Widget {
    constructor(app, params) {
        this.app = app;
        this.params = params;
        this.freezed = false;
    }

    freeze() {
        this.freezed = true;
    }

    unfreeze() {
        this.freezed = false;
    }
}

export default Widget;