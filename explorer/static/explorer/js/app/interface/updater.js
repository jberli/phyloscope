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

        console.log(widgets);
        console.log(type);

        this.app.information.loading();
        this.app.photography.loading();
        this.app.statistics.loading();
        this.app.taxonomy.loading();

        this.updateRange(index, () => { this.return(widgets, callback); });

        ajaxGet('taxon/' + this.params.languages.current + '/' + index + '/', (r) => {
            this.taxonomy = r;
            this.updateInformation(null, () => { this.return(widgets, callback); });
            this.updatePhotography(() => { this.return(widgets, callback); });
            this.updateTaxonomy(() => { this.return(widgets, callback); });
            this.updateStatistics(() => { this.return(widgets, callback); });
        });
    }

    updateFromTaxonomy(index, type, newIndex, callback) {
        callback = callback || function () {};
        this.app.freeze();
        this.done = [];
        let widgets = 4;

        this.app.information.loading();
        this.app.photography.loading();
        this.app.cartography.loading();
        this.app.statistics.loading();

        let transition = this.app.params.interface.transition;
        if (type === 'siblings') {
            this.taxonomy.tindex = newIndex;

            this.updateRange(index, () => { this.return(widgets, callback); });
            this.updateInformation(index, () => { this.return(widgets, callback); });
            this.updatePhotography(() => { this.return(widgets, callback); });

            this.app.statistics.collapse();
            let start = new Date();
            ajaxGet('children/' + this.params.languages.current + '/' + index + '/', (r) => {
                this.taxonomy.children = r.children;
                this.taxonomy.cindex = 0;
                wait(transition - (new Date() - start), () => {
                    this.app.taxonomy.updateChildren();
                    this.app.taxonomy.unfreeze();
                    this.updateStatistics(() => { this.return(widgets, callback); });
                })
            });
        }
        else if (type === 'parents') {
            this.taxonomy.children = this.taxonomy.siblings;
            this.taxonomy.siblings = this.taxonomy.parents;
            this.taxonomy.tindex = this.taxonomy.pindex;

            this.updateRange(index, () => { this.return(widgets, callback); });
            this.updateInformation(index, () => { this.return(widgets, callback); });
            this.updatePhotography(() => { this.return(widgets, callback); });

            this.app.taxonomy.regress();
            let start = new Date();
            ajaxGet('/parents/' + this.params.languages.current + '/' + index, (r) => {
                this.taxonomy.parents = r.parents;
                this.taxonomy.pindex = r.pindex;
                wait(transition - (new Date() - start), () => {
                    this.app.taxonomy.parents.update();
                    wait(10, () => {
                        this.app.taxonomy.parents.reveal();
                        this.app.taxonomy.unfreeze();
                    });
                });
            });
        }
        else if (type === 'children') {
            this.taxonomy.parents = this.taxonomy.siblings;
            this.taxonomy.pindex = this.taxonomy.tindex;
            this.taxonomy.siblings = this.taxonomy.children;
            this.taxonomy.tindex = this.taxonomy.cindex;

            this.updateRange(index, () => { this.return(widgets, callback); });
            this.updateInformation(index, () => { this.return(widgets, callback); });
            this.updatePhotography(() => { this.return(widgets, callback); });

            this.app.taxonomy.grow();
            let start = new Date();
            ajaxGet('/children/' + this.params.languages.current + '/' + index, (r) => {
                this.taxonomy.children = r.children;
                this.taxonomy.cindex = 0;
                wait(transition - (new Date() - start), () => {
                    this.app.taxonomy.children.update();
                    wait(10, () => {
                        this.app.taxonomy.children.reveal();
                        this.app.taxonomy.unfreeze();
                    })
                })
            });
        }
    }

    updateFromStatistics(index, type, callback) {

    }




    updateInformation(index, callback) {
        callback = callback || function () {};
        let self = this;

        function update(callback) {
            self.app.information.update(() => {
                self.done.push('information');
                callback();
            });
        }

        if (index !== null) {
            ajaxGet('description/' + this.app.params.languages.current + '/' + index + '/', (r) => {
                this.taxonomy.description = r.values;
                update(callback);
            });
        } else {
            update(callback);
        }
    }

    updatePhotography(callback) {
        callback = callback || function () {};
        this.app.photography.update(() => {
            this.done.push('photography');
            callback();
        });
    }

    updateRange(index, callback) {
        callback = callback || function () {};
        let transition = this.params.interface.cartography.range.transition.display;
        let start = new Date();
        ajaxGet('range/' + index + '/', (r) => {
            this.range = r;
            wait(transition - (new Date() - start), () => {
                this.app.cartography.update(() => {
                    this.done.push('cartography');
                    callback();
                });
            })
        });
    }

    updateStatistics(callback) {
        callback = callback || function () {};
        this.app.statistics.update(() => {
            this.done.push('statistics');
            callback();
        });
    }

    updateTaxonomy(callback) {
        this.app.taxonomy.update(() => {
            this.done.push('taxonomy');
            callback();
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