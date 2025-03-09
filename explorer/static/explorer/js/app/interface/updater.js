/**
 * @updater
 * Define the updater interface object to update every widgets.
 */

import { ajaxGet } from "../generic/ajax.js";
import { addClass, wait } from "../generic/dom.js";

class Updater {
    constructor(app, params) {
        this.app = app;
        this.params = params;
        this.updating = false;

        this.taxonomy;
        this.range;

        this.done;
    }

    getTaxon() {
        return this.taxonomy.siblings[this.taxonomy.tindex];
    }

    getParent() {
        return this.taxonomy.parents[this.taxonomy.pindex];
    }

    getChild() {
        return this.taxonomy.children[this.taxonomy.cindex];
    }
    
    getLevel(level) {
        return this.taxonomy[level];
    }

    getRange() {
        return this.range;
    }

    getAncestry() {
        return this.taxonomy.ancestry;
    }

    getDescription() {
        return this.taxonomy.description;
    }

    

    /**
     * This function is used to update the whole application.
     * @param {Integer} index - The taxon index. 
     * @param {String} type - The type of widget requesting the update.
     * @param {Function} callback - Callback function.
     */
    update(index, type, callback) {
        callback = callback || function () {};
        this.app.freeze();
        this.done = [];
        let widgets = 5;

        this.updateRange(index, () => {
            this.return(widgets, callback);
        });

        this.app.information.loading();
        this.app.photography.loading();
        this.app.statistics.loading();
        this.app.taxonomy.loading();

        this.fetchTaxon(index, (r) => {
            this.app.information.update(() => { this.done.push('information'); this.return(widgets, callback); });
            this.app.photography.update(() => { this.done.push('photography'); this.return(widgets, callback); });
            this.app.statistics.update(() => { this.done.push('statistics'); this.return(widgets, callback); });
            this.app.taxonomy.update(() => { this.done.push('taxonomy'); this.return(widgets, callback); });
        });
    }

    /**
     * This function is used to update the whole application when clicking on a children.
     * @param {Integer} index - The taxon index. 
     * @param {Function} callback - Callback function.
     */
    updateSiblings(index, callback) {
        callback = callback || function () {};
        this.app.freeze();
        this.done = [];
        let widgets = 3;

        this.app.information.loading();
        this.app.photography.loading();
        this.app.cartography.loading();

        this.app.photography.update(() => { this.done.push('photography'); this.return(widgets, callback); });

        this.updateRange(index, () => { this.return(widgets, callback); });

        this.fetchChildren(index, () => {
            this.return(widgets, callback);
        });

        this.fetchDescription(index, () => {
            this.app.information.update(() => { this.done.push('information'); this.return(widgets, callback); });
        });
    }

    updateParents(index, callback) {
        callback = callback || function () {};
    }

    updateRange(index, callback) {
        callback = callback || function () {};
        let transition = this.params.interface.cartography.range.transition.display;
        let start = new Date();
        let self = this;
        this.fetchRange(index, (r) => {
            function display() {
                self.app.cartography.update(() => {
                    self.done.push('cartography');
                    callback();
                });
            }

            let end = new Date();
            let elapsed = end - start;
            if (elapsed < transition) {
                wait(transition - elapsed, () => { display() })
            } else { display(); }
        });
    }

    return(w, callback) {
        callback = callback || function () {};
        console.log(this.done);
        if (this.done.length >= w) {
            this.app.unfreeze();
            callback();
        }
    }

    fetchChildren(index, callback) {
        callback = callback || function () {};
        ajaxGet('children/' + this.params.languages.current + '/' + index + '/', (r) => {
            this.taxonomy.children = r.children;
            this.taxonomy.cindex = r.index;
            callback(r);
        });
    }

    fetchParent(index, callback) {
        callback = callback || function () {};
        ajaxGet('parents/' + this.params.languages.current + '/' + index + '/', (r) => {
            this.taxonomy.parents = r.parents;
            this.taxonomy.pindex = r.pindex;
            callback(r);
        });
    }

    fetchTaxon(index, callback) {
        callback = callback || function () {};
        ajaxGet('taxon/' + this.params.languages.current + '/' + index + '/', (r) => {
            this.taxonomy = r;
            callback(r);
        });
    }

    fetchDescription(index, callback) {
        ajaxGet('description/' + this.app.params.languages.current + '/' + index + '/', (r) => {
            this.taxonomy.description = r.values;
            callback(r);
        });
    }

    fetchRange(index, callback) {
        callback = callback || function () {};
        ajaxGet('range/' + index + '/', (r) => {
            this.range = r;
            callback(r);
        });
    }

    




    

    fullUpdate(index) {
        this.updateRange(index);
        this.app.information.loading();
        this.app.photography.loading();
        this.app.taxonomy.loading();
        this.app.statistics.loading();
        
        ajaxGet('taxon/' + this.app.params.languages.current + '/' + index + '/', (r) => {
            this.app.params.taxonomy = r;
            this.app.information.update();
            this.app.photography.update();
            this.app.taxonomy.update();
            this.app.statistics.update();
        });
    }

    taxonomyUpdate(index) {
        this.updateRange(index);
        this.app.information.loading();
        this.app.photography.loading();
        this.app.photography.update();

        ajaxGet('description/' + this.app.params.languages.current + '/' + index + '/', (r) => {
            this.app.params.taxonomy.description = r.values;
            this.app.information.update();
        });
    }

    // updateRange(index) {
    //     let self = this;
    //     function display(r) {
    //         self.app.params.range = r;
    //         self.app.cartography.update(() => {
    //             self.app.taxonomy.active = true;
    //         });
    //     }

    //     let start = new Date();
    //     this.app.cartography.range.remove(() => {
    //         ajaxGet('range/' + index + '/', (r) => {
    //             let end = new Date();
    //             let elapsed = end - start;
    //             let transition = this.params.interface.cartography.range.transition.display;
    //             if (elapsed < transition) {
    //                 wait(transition - elapsed, () => { display(r) })
    //             } else { display(r); }
    //         });
    //     })
    // }
}

export default Updater;