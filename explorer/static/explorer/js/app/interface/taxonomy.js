/**
 * @taxonomy
 * Define the taxonomy widget.
 */

import { loadImage } from "../generic/ajax.js";
import { addClass, addSVG, hasClass, makeDiv, makeImage, removeChildren, removeClass, wait } from "../generic/dom.js";
import { calculateTextWidth, formatPercentage, uppercaseFirstLetter } from "../generic/parsing.js";
import { Helper } from "./helper.js";
import Widget from "./widget.js";

class Taxonomy extends Widget {
    constructor(app, parent, params) {
        super(app, parent, params);
        this.type = 'taxonomy';

        // Create DOM elements
        this.container = makeDiv('taxonomy', 'sub-panel');
        this.parent.append(this.container);

        this.helper = new Helper(this, this.container, this.type);
        this.helper.update();

        this.infocontainer = makeDiv(null, 'taxonomy-information panel-information');
        this.container.append(this.infocontainer);

        // Mask and loader
        this.mask = makeDiv(null, 'taxonomy-mask mask');
        this.container.append(this.mask);

        this.ancestry = new Ancestry(this);

        this.levels = makeDiv(null, 'taxonomy-levels');
        this.container.append(this.levels);

        this.grandparents = new GrandParents(this);
        this.parents = new Parents(this);
        this.siblings = new Siblings(this);
        this.children = new Children(this);
        this.grandchildren = new GrandChildren(this);
    }

    update(callback) {
        callback = callback || function () {};
        this.loading();
        this.collapse();
        wait(this.params.interface.transition, () => {
            this.helper.update();
            this.clear();
            this.ancestry.update();
            this.grandparents.update();
            this.parents.update();
            this.siblings.update();
            this.children.update();
            this.grandchildren.update();
            this.loaded();
            wait(10, () => { this.reveal(); })
            callback();
        })
    }

    updateChildren() {
        this.children.clear();
        this.children.update();
        wait(10, () => {
            this.loaded();
            this.children.reveal();
        });
    }

    grow(index) {
        // If an index is provided, check if the wanted index is the active one.
        if (index) {
            if (this.children.getActive() !== index) {
                this.children.slideTo(index);
            }
        }
        
        // Destroy grand parents
        this.grandparents.destroy();

        // Set parents as new grand parents
        this.grandparents = this.parents;
        this.grandparents.type = 'grandparents';
        this.grandparents.smoosh();
        wait(this.params.interface.transition, () => {
            this.grandparents.clear();
        });

        // Set siblings as new parents
        this.parents = this.siblings;
        this.parents.type = 'parents';
        this.parents.deactivate();

        for (let i = 0; i < (this.parents.taxons.length); ++i) {
            if (!this.parents.taxons[i].active) { this.parents.taxons[i].collapse(); }
        }

        // Set children as new siblings
        this.siblings = this.children;
        this.siblings.type = 'siblings';
        this.siblings.activate();
        
        // Set grand children as new children
        this.children = this.grandchildren;
        this.children.type = 'children';
        this.children.expand();

        // Create new grand children
        this.grandchildren = new GrandChildren(this);

        this.ancestry.grow();
        
    }

    regress() {
        // Destroy grand children
        this.grandchildren.destroy();

        // Set new grand children as children
        this.grandchildren = this.children;
        this.grandchildren.type = 'grandchildren';
        this.grandchildren.smoosh();
        wait(this.params.interface.transition, () => {
            this.grandchildren.clear();
        })

        // Set new children as siblings
        this.children = this.siblings;
        this.children.type = 'children';
        this.children.deactivate();

        // Set new siblings as parents
        this.siblings = this.parents;
        this.siblings.type = 'siblings';
        this.siblings.activate();

        for (let i = 0; i < (this.siblings.taxons.length); ++i) {
            this.parents.taxons[i].reveal();
        }

        // Set new parents as grand parents
        this.parents = this.grandparents;
        this.parents.type = 'parents';
        this.parents.expand();

        // Create new grand parents
        this.grandparents = new GrandParents(this);

        this.ancestry.regress();
    }

    loading() {
        removeClass(this.mask, 'loaded');
        removeClass(this.ancestry.loader, 'loaded');
    }

    loaded() {
        addClass(this.mask, 'loaded');
        addClass(this.ancestry.loader, 'loaded');
    }

    collapse() {
        addClass(this.helper.content, 'hidden');
        this.ancestry.collapse();
        this.parents.collapse();
        this.siblings.collapse();
        this.children.collapse();
    }

    reveal() {
        removeClass(this.helper.content, 'hidden');
        this.ancestry.reveal();
        this.parents.reveal();
        this.siblings.reveal();
        this.children.reveal();
    }

    clear() {
        this.ancestry.clear();
        this.parents.clear();
        this.siblings.clear();
        this.children.clear();
    }

    click(level, index) {
        if (level === 'children') { this.children.taxons[index].click(); }
        else if (level === 'parent') {  }
    }
}

class Ancestry {
    constructor(taxonomy) {
        this.taxonomy = taxonomy;
        this.acontainer = makeDiv(null, 'taxonomy-ancestry-container');
        this.container = makeDiv(null, 'taxonomy-ancestry');

        this.helpcontainer = makeDiv(null, 'taxonomy-button-help-container button-help-container');
        this.help = makeDiv(null, 'button button-help');
        addSVG(this.help, new URL('/static/explorer/img/help.svg', import.meta.url));

        this.loader = makeDiv(null, 'loader-container');
        this.loadersymbol = makeDiv(null, 'loader');
        this.loader.append(this.loadersymbol);
        this.helpcontainer.append(this.help, this.loader);

        this.helpcontainer.addEventListener('click', () => { this.taxonomy.helper.trigger(false); })

        this.acontainer.append(this.container, this.helpcontainer);
        this.taxonomy.container.append(this.acontainer);
        this.maxwidth = this.container.clientWidth;
        this.ancestors = [];

        new ResizeObserver(() => {
            this.maxwidth = this.container.clientWidth;
            if (this.total >= this.maxwidth - 1) { this.shrinkAncestors(); }
            else { this.expandAncestors(); }
        }).observe(this.container);
    }

    update() {
        addClass(this.container, 'resizing');

        this.ancestors = [];
        let ancestry = this.taxonomy.app.updater.taxonomy.ancestry;
        this.total = 0;

        let first = true;
        for (let i = 0; i < ancestry.length; ++i) {
            let ancestor = new Ancestor(this, ancestry[i], true, first);
            this.ancestors.push(ancestor);
            this.total += (ancestor.width + ancestor.padding - 5);
            if (this.total >= this.maxwidth) { this.shrinkAncestors(); }
            first = false;
        }

        wait(10, () => {
            removeClass(this.container, 'resizing');
        });
    }

    expandAncestors() {
        for (let i = this.ancestors.length - 1; i >= 0; --i) {
            let ancestor = this.ancestors[i];
            if (ancestor.small) {
                let newtotal = this.total + (ancestor.width + ancestor.padding - ancestor.smallwidth)
                if (newtotal < this.maxwidth) {
                    ancestor.expand();
                    this.total = newtotal;
                } else { break; }
            }
        }
    }

    shrinkAncestors() {
        for (let i = 0; i < this.ancestors.length; ++i) {
            let ancestor = this.ancestors[i];
            if (!ancestor.small) {
                ancestor.shrink();
                this.total -= (ancestor.width + ancestor.padding - ancestor.smallwidth);
                if (this.total < this.maxwidth) { break; }
            }
        }
    }

    grow() {
        let parent = this.taxonomy.app.updater.getParent();
        this.taxonomy.app.updater.taxonomy.ancestry.push(parent);
        let first = this.ancestors.length > 0 ? false : true;
        let ancestor = new Ancestor(this, parent, false, first);
        this.ancestors.push(ancestor);
        this.total += (ancestor.width + ancestor.padding - 5);
        if (this.total >= this.maxwidth) { this.shrinkAncestors(); }
    }

    regress() {
        this.taxonomy.app.updater.taxonomy.ancestry.pop();
        let last = this.ancestors.pop();
        this.total -= (last.width + last.padding - 5);
        this.expandAncestors();
        last.destroy();
    }

    collapse() {
        for (let i = 0; i < (this.ancestors.length); ++i) {
            this.ancestors[i].collapse();
        }
    }

    reveal() {
        for (let i = 0; i < (this.ancestors.length); ++i) {
            this.ancestors[i].reveal();
        }
    }

    clear() {
        if (this.container.children.length > 0) { removeChildren(this.container); }
    }
}

class Ancestor {
    constructor(ancestry, ancestor, collapse, first) {
        this.ancestry = ancestry;
        this.ancestor = ancestor;
        this.small = false;
        this.smallwidth = 30;

        this.container = makeDiv(null, 'taxonomy-ancestor');
        if (collapse) { addClass(this.container, 'collapse'); }
        this.ancestry.container.append(this.container);

        if (this.ancestor.vernaculars.length > 0) {
            this.name = uppercaseFirstLetter(this.ancestor.vernaculars[0]);
        } else {
            this.name = uppercaseFirstLetter(this.ancestor.scientific);
        }

        this.label = makeDiv(null, 'taxonomy-ancestor-label ' + this.ancestor.typesorting, this.name);
        this.label.setAttribute('taxon', this.ancestor.id);
        this.tooltip = makeDiv(null, 'taxonomy-ancestor-tooltip ' + this.ancestor.typesorting, this.name);
        this.container.append(this.label, this.tooltip);

        let margin = first ? 20 : 40;

        this.padding = first ? 12 : 0;
        this.width = calculateTextWidth(this.name, getComputedStyle(this.label), '1rem') + margin;
        this.label.style.width = this.width + 'px';
        this.label.style.paddingLeft = this.padding + 'px';

        this.label.addEventListener('click', (event) => {
            if (!this.ancestry.taxonomy.freezed) {
                let taxon = parseInt(event.target.getAttribute('taxon'));
                let parent = this.ancestry.taxonomy.app.updater.getParent();

                if (taxon === parent.id) {
                    this.ancestry.taxonomy.app.updater.updateFromTaxonomy(taxon, 'parents');
                } else {
                    this.ancestry.taxonomy.collapse();
                    this.ancestry.taxonomy.app.updater.updateFromSearch(taxon);
                }
            }
        });
    }

    collapse() {
        addClass(this.container, 'collapse');
    }

    reveal() {
        removeClass(this.container, 'collapse');
    }

    getWidth() {
        if (this.small) {
            return this.smallwidth;
        } else {
            return this.width + this.padding;
        }
    }

    shrink() {
        this.small = true;
        addClass(this.container, 'small');
        this.label.innerHTML = '';
        this.label.style.width = this.smallwidth + 'px';
        this.label.style.paddingLeft = 0;
    }

    expand() {
        this.small = false;
        removeClass(this.container, 'small');
        this.label.innerHTML = this.name;
        this.label.style.width = this.width + 'px';
        this.label.style.paddingLeft = this.padding + 'px';
    }

    destroy() {
        let transition = this.ancestry.taxonomy.params.interface.transition;
        this.label.innerHTML = '';
        this.label.style.width = '0';
        this.label.style.paddingLeft = 0;
        wait(transition, () => {
            this.container.remove();
        });
    }
}

class Level {
    constructor(taxonomy) {
        this.taxonomy = taxonomy;

        this.active = false;
        this.smooshed = false;

        this.entrycontainer;
        this.level;
        this.type;

        this.typecontainer;
        this.typelabel;

        this.taxonlevel;
        this.taxons = [];
    }

    update() {
        if (this.type === 'siblings') { this.activate(); }

        // Initialize taxons
        this.taxons = [];

        // Get the whole list of taxons in the level
        this.taxonlevel = this.taxonomy.app.updater.getLevel(this.type);

        // If parents or siblings, retrieve the parent or current taxon index in the list
        if (this.type === 'parents') { this.index = this.taxonomy.app.updater.taxonomy.pindex; }
        else if (this.type === 'siblings') { this.index = this.taxonomy.app.updater.taxonomy.tindex; }
        else if (this.type === 'children') { this.index = this.taxonomy.app.updater.taxonomy.cindex; }

        // Make sure the level is not null
        if (this.taxonlevel) {
            let i = this.index;
            let taxon = this.taxonlevel[i];

            let typesorting = taxon.typesorting;
            this.typecontainer = makeDiv(null, 'taxonomy-type-container collapse ' + typesorting);
            this.typelabel = makeDiv(null, 'taxonomy-type-label', taxon.type);
            this.typecontainer.append(this.typelabel);

            this.entrycontainer = makeDiv(null, 'taxonomy-entry-container');
            this.container.append(this.typecontainer, this.entrycontainer);
    
            let smoosh = false;
            if (this.index > 0) { smoosh = true; }
            
            let first = new Taxon(this, null, smoosh, true);
            this.taxons.push(first);

            let visible = [ this.index - 1, this.index, this.index + 1 ];
            
            for (let i = 0; i < (this.taxonlevel.length); ++i) {
                smoosh = true;
                if (visible.includes(i)) { smoosh = false; }
                let entry = new Taxon(this, this.taxonlevel[i], smoosh, false);
                entry.container.addEventListener('click', (e) => { this.slide(e); });
                if (i === this.index) { entry.activate(); }
                this.taxons.push(entry);
            }

            smoosh = false;
            if (this.index < this.taxonlevel.length - 1) { smoosh = true; }
           
            let last = new Taxon(this, null, smoosh, true);
            this.taxons.push(last);

            if (this.type !== 'parent') {
                this.entrycontainer.addEventListener('wheel', (e) => { this.slide(e); });
            }
        }
    }

    slide(e) {
        if (!this.taxonomy.freezed) {
            this.taxonomy.freeze();
            let active = false;

            let visible = []
            // Retrieve the visible taxons inside the level
            for (let i = 0; i < (this.taxons.length); ++i) {
                if (this.taxons[i].isVisible()) { visible.push(i); }
            }
    
            // Unpack to get the indexes of the three visible taxons
            let [ i1, i2, i3 ] = visible;
    
            let hide; let reveal; let current;
            // If user is scrolling
            if (e.type === 'wheel') {
                if (e.deltaY > 0) {
                    if (i3 < this.taxons.length - 1) {
                        hide = i1; current = i3; reveal = i3 + 1;
                    }
                } else {
                    if (i1 > 0) {
                        hide = i3; current = i1; reveal = i1 - 1;
                    }
                }
            }
            // If user has clicked
            else if (e.type === 'click') {
                let targetindex = Array.prototype.indexOf.call(this.entrycontainer.children, e.target);
                if (targetindex !== i2) {
                    if (targetindex < this.taxons.length - 1) {
                        if (targetindex > i2) {
                            hide = i1; current = i3; reveal = i3 + 1;
                        } else {
                            hide = i3; current = i1; reveal = i1 - 1;
                        }
                    }
                } else {
                    active = true;
                }
            }

            // Check if active entry is clicked
            if (!active) {
                // Here the taxonomy level is sliding
                if (hide !== undefined) {
                    if (this.type === 'parents') {
                        this.taxonomy.unfreeze();
                    } else {
                        this.slideTo(current);
                        if (this.type === 'siblings') {
                            this.taxonomy.loading();
                            let index = this.taxons[current].taxon.id;
                            this.taxonomy.children.collapse();
                            this.taxonomy.app.updater.updateFromTaxonomy(index, this.type, current - 1);
                        } else {
                            this.taxonomy.unfreeze();
                        }
                    }
                } else {
                    this.taxonomy.unfreeze();
                }
            }
            // Here, active entry has been clicked
            else {
                // Here, parent has been clicked, must regress
                if (this.type === 'parents') {
                    let pindex = this.taxonomy.app.updater.taxonomy.pindex;
                    let index = this.taxons[pindex + 1].taxon.id;
                    this.taxonomy.app.updater.updateFromTaxonomy(index, this.type, pindex);
                }
                // Here, active child clicked, must grow
                else if (this.type === 'children') {
                    let cindex = this.taxonomy.app.updater.taxonomy.cindex;
                    let index = this.taxons[cindex + 1].taxon.id;
                    this.taxonomy.app.updater.updateFromTaxonomy(index, this.type, cindex);
                }
                // Here, only clicked on already active taxon
                else {
                    this.taxonomy.unfreeze();
                }               
            }
        }
    }

    slideTo(index) {
        let previous;
        if (this.type === 'siblings') { previous = this.taxonomy.app.updater.taxonomy.tindex + 1 }
        else { previous = this.taxonomy.app.updater.taxonomy.cindex + 1 }

        let previoustype = this.taxons[previous].taxon.typesorting;
        let newtype = this.taxons[index].taxon.typesorting;

        if (newtype !== previoustype) {
            removeClass(this.typecontainer, previoustype);
            addClass(this.typecontainer, newtype);
            this.typelabel.innerHTML = this.taxons[index].taxon.type;
        }

        let visible = [ index - 1, index, index + 1 ];
        for (let i = 0; i < this.taxons.length; ++i) {
            let taxon = this.taxons[i];
            if (visible.includes(i)) { taxon.expand(); }
            else { taxon.smoosh(); }
            if (i === index) { taxon.activate(); }
            else { taxon.deactivate(); }
        }
        
        if (this.type === 'children') {
            this.taxonomy.app.updater.taxonomy.cindex = index - 1;
        }
    }

    clear() {
        if (this.container.children.length > 0) { removeChildren(this.container); }
    }

    destroy() {
        this.container.remove();
    }

    activate() {
        addClass(this.container, 'active');
        this.active = true;
    }

    deactivate() {
        removeClass(this.container, 'active');
        this.active = false;
    }

    smoosh() {
        addClass(this.container, 'smooshed');
        this.smooshed = true;
    }

    expand() {
        removeClass(this.container, 'smooshed');
        this.smooshed = false;
    }

    collapse() {
        if (this.typecontainer !== undefined) { addClass(this.typecontainer, 'collapse'); }
        for (let i = 0; i < (this.taxons.length); ++i) {
            this.taxons[i].collapse();
        }
    }

    reveal() {
        if (this.typecontainer !== undefined) { removeClass(this.typecontainer, 'collapse'); }
        for (let i = 0; i < (this.taxons.length); ++i) {
            if (this.type !== 'parents') { this.taxons[i].reveal(); }
            else {
                if (this.taxons[i].active) { this.taxons[i].reveal(); }
            }
        }
    }

    getActive() {
        for (let i = 0; i < (this.taxons.length); ++i) {
            if(this.taxons[i].isActive()) { return i; }
        }
    }
}

class GrandParents extends Level {
    constructor(taxonomy) {
        super(taxonomy);
        this.type = 'grandparents';
        this.container = makeDiv(null, 'taxonomy-level');
        if (this.taxonomy.levels.children.length > 0) { this.taxonomy.levels.insertBefore(this.container, this.taxonomy.levels.children[0]); }
        else { this.taxonomy.levels.append(this.container); }
        addClass(this.container, 'smooshed');
    }
}

class Parents extends Level{
    constructor(taxonomy) {
        super(taxonomy);
        this.type = 'parents';
        this.container = makeDiv(null, 'taxonomy-level');
        this.taxonomy.levels.append(this.container);
    }
}

class Siblings extends Level {
    constructor(taxonomy) {
        super(taxonomy);
        this.type = 'siblings';
        this.container = makeDiv(null, 'taxonomy-level');
        this.taxonomy.levels.append(this.container);
    }
}

class Children extends Level {
    constructor(taxonomy) {
        super(taxonomy);
        this.type = 'children';
        this.container = makeDiv(null, 'taxonomy-level');
        this.taxonomy.levels.append(this.container);
    }
}

class GrandChildren extends Level {
    constructor(taxonomy) {
        super(taxonomy);
        this.type = 'grandchildren';
        this.container = makeDiv(null, 'taxonomy-level');
        this.taxonomy.levels.append(this.container);
        addClass(this.container, 'smooshed');
    }
}


class Taxon {
    constructor(level, taxon=null, smooshed=false, placeholder=false) {
        this.level = level;
        this.taxon = taxon;
        this.placeholder = placeholder;
        this.active = false;
        this.smooshed = smooshed;
        this.collapsed = true;

        let className = '';
        if (smooshed) { className += ' smooshed'; }
        if (placeholder) { className += ' placeholder'; }

        this.container = makeDiv(null, 'taxonomy-entry collapse' + className);
        this.level.entrycontainer.append(this.container);

        if (!placeholder) {
            let url = this.level.taxonomy.params.photography.url;
            let image = makeDiv(null, 'taxonomy-image-container');
    
            let infos = this.taxon.photographs[0];
            let imageMask = makeDiv(null, 'photo-mask');
            let loader = makeDiv(null, 'photo-loader');

            let i;
            if (infos === undefined) {
                i = makeDiv(null, 'photo-svg');
                if (this.taxon.iconic !== null) {
                    addSVG(i, new URL('/static/explorer/img/iconic/' + this.taxon.iconic + '.svg', import.meta.url), () => {
                        addClass(imageMask, 'loaded');
                    })
                } else {
                    addClass(imageMask, 'loaded');
                }
            } else {
                i = makeImage(url + infos.id + '/medium.' + infos.extension, null, null, null, 'photo');
                loadImage(i).then(() => { addClass(imageMask, 'loaded'); });
            }
            
            imageMask.appendChild(loader);
            image.append(imageMask, i);

            let stats = this.taxon.count.toLocaleString();
            if (this.taxon.percentage) { stats += ' (' + formatPercentage(this.taxon.percentage) + ')'; }
            let statistics = makeDiv(null, 'taxonomy-entry-statistics', stats);
            let swidth = calculateTextWidth(stats, getComputedStyle(statistics), .8);
    
            statistics.style.width = '0';
            statistics.style.height = '0';
            this.container.addEventListener('mouseover', (e) => {
                statistics.style.width = swidth + 'px';
                statistics.style.height = '1.3rem';
            });
            this.container.addEventListener('mouseout', (e) => {
                statistics.style.width = '0';
                statistics.style.height = '0';
            });

            let html, name;
            if (this.taxon.vernaculars.length > 0) {
                name = uppercaseFirstLetter(this.taxon.vernaculars[0]);
                html = name;
            } else {
                name = uppercaseFirstLetter(this.taxon.scientific);
                html = '<i>' + uppercaseFirstLetter(this.taxon.scientific) + '</i>';
            }

            if (this.taxon.status.length > 0) {
                let status = makeDiv(null, 'taxonomy-entry-status');
                addSVG(status, new URL('/static/explorer/img/status/' + this.taxon.status.toLowerCase() + '.svg', import.meta.url));
                this.container.append(status);
            }
    
            this.label = makeDiv(null, 'taxonomy-entry-label', html);        
            let mask = makeDiv(null, 'taxonomy-entry-mask');
            this.container.append(mask, image, statistics, this.label);
            this.container.setAttribute('taxon', this.taxon.id);
        }
    }

    isVisible() {
        if (hasClass(this.container, 'smooshed')) { return false; }
        else { return true; }
    }

    isActive() {
        if (this.active) { return true; }
        else { return false; }
    }

    activate() {
        addClass(this.container, 'active');
        addClass(this.label, this.taxon.typesorting);
        this.active = true;
    }

    deactivate() {
        removeClass(this.container, 'active');
        if (this.taxon) { removeClass(this.label, this.taxon.typesorting); }
        this.active = false;
    }

    smoosh() {
        addClass(this.container, 'smooshed');
        this.smooshed = true;
    }

    expand() {
        removeClass(this.container, 'smooshed');
        this.smooshed = false;
    }

    collapse() {
        addClass(this.container, 'collapse');
        this.collapsed = true;
    }

    reveal() {
        removeClass(this.container, 'collapse');
        this.collapsed = false;
    }
}

export default Taxonomy