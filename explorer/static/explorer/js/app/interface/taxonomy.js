/**
 * @taxonomy
 * Define the taxonomy widget.
 */

import { ajaxGet, loadImage } from "../generic/ajax.js";
import { addClass, hasClass, makeDiv, makeImage, removeChildren, removeClass, wait } from "../generic/dom.js";
import { calculateTextWidth, calculateWidthFromClass, formatPercentage, uppercaseFirstLetter } from "../generic/parsing.js";
import { round } from "../generic/math.js";
import Widget from "./widget.js";

class Taxonomy extends Widget {
    constructor(app, parent, params) {
        super(app, parent, params);
        this.type = 'taxonomy';

        // Create DOM elements
        this.container = makeDiv('taxonomy', 'sub-panel');
        this.parent.append(this.container);

        // Mask and loader
        this.mask = makeDiv(null, 'taxonomy-mask mask');
        this.loader = makeDiv(null, 'taxonomy-loader loader');
        this.mask.append(this.loader);
        this.container.append(this.mask);

        this.ancestrycontainer = makeDiv(null, 'taxonomy-ancestry');
        this.levels = makeDiv(null, 'taxonomy-levels');

        this.container.append(this.ancestrycontainer, this.levels);

        this.grandparents = new GrandParents(this);
        this.parents = new Parents(this);
        this.siblings = new Siblings(this);
        this.children = new Children(this);
        this.grandchildren = new GrandChildren(this);
    }

    update(callback) {
        this.loading();
        this.collapse();
        wait(this.params.interface.transition, () => {
            this.clear();
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
    }

    loading() {
        removeClass(this.mask, 'loaded');
    }

    loaded() {
        addClass(this.mask, 'loaded');
    }

    collapse() {
        this.parents.collapse();
        this.siblings.collapse();
        this.children.collapse();
    }

    reveal() {
        this.parents.reveal();
        this.siblings.reveal();
        this.children.reveal();
    }

    clear() {
        this.parents.clear();
        this.siblings.clear();
        this.children.clear();
    }

    click(level, index) {
        if (level === 'children') { this.children.taxons[index].click(); }
        else if (level === 'parent') {  }
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
                        // Smoosh and expand the right taxon
                        this.taxons[hide].smoosh();
                        this.taxons[reveal].expand();

                        let previous;
                        if (this.type === 'siblings') { previous = this.taxonomy.app.updater.taxonomy.tindex + 1 }
                        else { previous = this.taxonomy.app.updater.taxonomy.cindex + 1 }

                        let previoustype = this.taxons[previous].taxon.typesorting;
                        let newtype = this.taxons[current].taxon.typesorting;

                        if (newtype !== previoustype) {
                            removeClass(this.typecontainer, previoustype);
                            addClass(this.typecontainer, newtype);
                            this.typelabel.innerHTML = this.taxons[current].taxon.type;
                        }

                        this.taxons[previous].deactivate();
                        this.taxons[current].activate();

                        if (this.type === 'siblings') {
                            this.taxonomy.loading();
                            let index = this.taxons[current].taxon.id;
                            this.taxonomy.children.collapse();
                            this.taxonomy.app.updater.updateFromTaxonomy(index, this.type, current - 1);
                        } else {
                            this.taxonomy.app.updater.taxonomy.cindex = current - 1;
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
        let visible = [ index - 1, index, index + 1 ];
        for (let i = 0; i < this.taxons.length; ++i) {
            let taxon = this.taxons[i];
            if (visible.includes(i)) { taxon.expand(); }
            else { taxon.smoosh(); }
            if (i === index) { taxon.activate(); }
            else { taxon.deactivate(); }
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
            if (infos !== undefined) {
                let imageMask = makeDiv(null, 'photo-mask');
                let loader = makeDiv(null, 'photo-loader');
                let i = makeImage(url + infos.id + '/medium.' + infos.extension, null, null, null, 'photo');
                loadImage(i).then(() => { addClass(imageMask, 'loaded') });
                imageMask.appendChild(loader);
                image.append(imageMask, i);
            }

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









function reloadTaxonomy(params) {
    let taxonomy = document.getElementById('taxonomy-container');
    addClass(taxonomy, 'collapse');
    wait(params.transition, () => {
        taxonomy.remove();
        initializeTaxonomy(params);
    })
}

function initializeTaxonomy(params) {
    let container = document.getElementById('panel-container');
    let taxonomyContainer = makeDiv(id='taxonomy-container', c='collapse');
    let ancestry = makeDiv(id=null, c='taxonomy-ancestry-container');
    let view = makeDiv(id=null, c='taxonomy-levels-container');

    function createTaxonomy(taxon, params) {
        ajaxGet('taxon/' + taxon, (r) => {
            params.taxonomy = r.values;
            createAncestry(params.taxonomy.ancestry);
            let grandparent = makeDiv(id=null, c='taxonomy-levels smooshed');
            let parent = makeDiv(id=null, c='taxonomy-levels');
            let siblings = makeDiv(id=null, c='taxonomy-levels taxonomy-levels-main');
            let children = makeDiv(id=null, c='taxonomy-levels');
            let grandchildren = makeDiv(id=null, c='taxonomy-levels smooshed');
            createParentLevel(params, parent);
            createTaxonLevel(params, siblings);
            createChildrenLevel(params, children);
            view.append(grandparent, parent, siblings, children, grandchildren);
            removeClass(taxonomyContainer, 'collapse');
        });
    }

    taxonomyContainer.append(ancestry, view);
    createTaxonomy(params.taxonomy, params);
    container.appendChild(taxonomyContainer);

    function updateActiveTaxon(params) {
        let updateButton = document.getElementById('map-button-update');
        let taxonTaxon = params.taxonomy.siblings[params.taxonomy.tindex].id;
        let taxonCarto = params.cartography.taxon;
        if (taxonTaxon === taxonCarto) {
            addClass(updateButton, 'collapse');
        } else {
            removeClass(updateButton, 'collapse');
        }
    }

    function createAncestry(objects) {
        let total = 0;
        let max = view.clientWidth;
        for (let i = 0; i < (objects.length); ++i) {
            let elder = objects[i];
            let name = elder.scientific;
            if (name === 'Life') { name = 'Vie' }
            let a = makeDiv(id=null, c='taxonomy-ancestry');
            let alabel = makeDiv(id=null, c='taxonomy-ancestry-label ' + elder.typesorting, html=name);
            let atooltip = makeDiv(id=null, c='taxonomy-ancestry-tooltip ' + elder.typesorting, html=name)
            a.append(alabel, atooltip);
            let width = calculateTextWidth(name, getComputedStyle(alabel), '13px') + 40;
            a.setAttribute('taxon', elder.id);
            a.addEventListener('click', clickAncestry);
            ancestry.appendChild(a);
            a.style.width = width + 'px';
            total += width
        }
        let children = ancestry.children;
        if (total > max) {
            for (let i = 0; i < (children.length); ++i) {
                if (!hasClass(children[i], 'small')) {
                    let d = parseInt(children[i].style.width.replace('px', ''), 10);
                    addClass(children[i], 'small');
                    children[i].style.width = '25px';
                    children[i].firstChild.innerHTML = '';
                    total -= (d - 25)
                    if ((max - total) > 0 ) { break }
                }
            }
        }
    }

    function updateAncestry(value) {
        let last = ancestry.lastChild;
        let children = ancestry.children;
        let total = ancestry.clientWidth;
        let max = view.clientWidth;
        if (value === undefined) {
            let width = parseInt(last.style.width.replace('px', ''), 10);
            total -= width;
            for (let i = (children.length - 1); i >= 0; --i) {
                if (hasClass(children[i], 'small')) {
                    let name = children[i].lastChild.innerHTML;
                    if (name === 'Life') { name = 'Vie' }
                    let d = calculateTextWidth(name, getComputedStyle(children[i]), '13px') + 40;
                    if ((total + (d - 25)) < max ) {
                        removeClass(children[i], 'small');
                        children[i].style.width = d + 'px';
                        children[i].firstChild.innerHTML = name;
                        total += (d - 25)
                    }
                    else { break }
                }
            }
            last.style.width = '0px';
            wait(params.transition, () => { last.remove(); })
        } else {
            let name = value.scientific;
            if (name === 'Life') { name = 'Vie' }
            let a = makeDiv(id=null, c='taxonomy-ancestry');
            let alabel = makeDiv(id=null, c='taxonomy-ancestry-label ' + value.typesorting, html=name);
            let atooltip = makeDiv(id=null, c='taxonomy-ancestry-tooltip ' + value.typesorting, html=name)
            a.append(alabel, atooltip);
            a.setAttribute('taxon', value.id)
            let width = calculateTextWidth(name, getComputedStyle(alabel), '13px') + 40;
            a.style.width = '0px';
            a.addEventListener('click', clickAncestry);
            let available = max - (total + width);
            ancestry.appendChild(a);
            wait(10, () => {
                if ((total + width) > max) {
                    for (let i = 0; i < (children.length); ++i) {
                        if (i < children.length - 1) {
                            if (!hasClass(children[i], 'small')) {
                                let d = parseInt(children[i].style.width.replace('px', ''), 10);
                                addClass(children[i], 'small');
                                children[i].style.width = '25px';
                                children[i].firstChild.innerHTML = '';
                                if ((available + (d - 25)) > 0 ) { 
                                    a.style.width = width + 'px';
                                    break
                                }
                                else { available += (d - 25) }
                            }
                        } else {
                            a.style.width = width - Math.abs(available) + 'px';
                        }
                    }
                } else {
                    a.style.width = width + 'px';
                }
            })
        }
    }

    function clickAncestry(event) {
        let currentParent = view.firstChild.nextElementSibling.lastChild.querySelector('.active');
        let parent = currentParent.getAttribute('taxon');
        let taxon = event.currentTarget.getAttribute('taxon');
        if (parent === taxon) {
            currentParent.click();
        } else {
            addClass(taxonomyContainer, 'collapse');
            wait(params.transition, () => {
                removeChildren(ancestry);
                removeChildren(view);
                createTaxonomy(taxon, params);
            })
        }
    }

    function createParentLevel(params, container) {
        let objects = params.taxonomy.parents;
        let index = params.taxonomy.pindex;
        if (objects != null) {
            let typeNode = makeDiv(id=null, c='taxonomy-level-type ' + objects[0].typesorting)
            let typeLabelNode = makeDiv(id=null, c='taxonomy-level-type-label', html=objects[0].type)
            typeNode.appendChild(typeLabelNode);
            container.appendChild(typeNode);
            let entryContainer = makeDiv(id=null, c='taxonomy-entry-container');
            let firstClass = ' collapse';
            if (index > 0) { firstClass += ' smooshed'}
            entryContainer.appendChild(makeDiv(id=null, c='taxonomy-entry placeholder' + firstClass));
            for (let i = 0; i < (objects.length); ++i) {
                let active = false;
                let collapse = true;
                let smooshed = true;
                if (i == index - 1) { active = false; collapse = true; smooshed = false; }
                if (i == index) { active = true; collapse = false; smooshed = false; }
                if (i == index + 1) { active = false; collapse = true; smooshed = false; }
                let node = createTaxonNode(objects[i], active, collapse, smooshed);
                node.addEventListener('click', regressParent);
                entryContainer.appendChild(node);
            }
            let lastClass = ' collapse';
            if (index < objects.length - 1) { lastClass += ' smooshed' }
            entryContainer.appendChild(makeDiv(id=null, c='taxonomy-entry placeholder' + lastClass));
            container.appendChild(entryContainer);
        }
    }

    function createTaxonLevel(params, container) {
        let objects = params.taxonomy.siblings;
        let index = params.taxonomy.tindex;
        if (objects != null) {
            let typeNode = makeDiv(id=null, c='taxonomy-level-type ' + objects[0].typesorting);
            let typeLabelNode = makeDiv(id=null, c='taxonomy-level-type-label', html=objects[0].type)
            typeNode.appendChild(typeLabelNode);
            container.appendChild(typeNode);
            let entryContainer = makeDiv(id=null, c='taxonomy-entry-container');

            let firstClass = '';
            if (index > 0) { firstClass += ' smooshed'}
            entryContainer.appendChild(makeDiv(id=null, c='taxonomy-entry placeholder' + firstClass));
            for (let i = 0; i < (objects.length); ++i) {
                let smooshed = true;
                let active = false;
                if (i == index - 1) { smooshed = false }
                if (i == index) { smooshed = false; active = true; }
                if (i == index + 1) { smooshed = false }
                let node = createTaxonNode(objects[i], active, false, smooshed);
                node.addEventListener('click', slideSibling);
                entryContainer.appendChild(node);
            }
            let lastClass = '';
            if (index < objects.length - 1) { lastClass += ' smooshed'}
            entryContainer.appendChild(makeDiv(id=null, c='taxonomy-entry placeholder' + lastClass));

            entryContainer.addEventListener('wheel', slideSibling);
            container.appendChild(entryContainer);
        }
    }

    function createChildrenLevel(params, container) {
        let objects = params.taxonomy.children;
        if (objects != null) {
            let typeNode = makeDiv(id=null, c='taxonomy-level-type ' + objects[0].typesorting)
            let typeLabelNode = makeDiv(id=null, c='taxonomy-level-type-label', html=objects[0].type)
            typeNode.appendChild(typeLabelNode);
            container.appendChild(typeNode);
            let entryContainer = makeDiv(id=null, c='taxonomy-entry-container');
            entryContainer.appendChild(makeDiv(id=null, c='taxonomy-entry placeholder'));
            let number = 0;
            for (let i = 0; i < (objects.length); ++i) {
                let smooshed = false;
                if (i > 1) { smooshed = true; }
                let node = createTaxonNode(objects[i], false, false, smooshed)
                node.addEventListener('click', slideChildren);
                entryContainer.appendChild(node);
                ++number;
            }
            let lastClass = '';
            if (number > 1) { lastClass += ' smooshed' }
            entryContainer.appendChild(makeDiv(id=null, c='taxonomy-entry placeholder' + lastClass));
            entryContainer.addEventListener('wheel', slideChildren);
            container.appendChild(entryContainer);
        }
    }

    function regressParent(event) {
        let taxon = event.currentTarget.getAttribute('taxon');
        ajaxGet('parent/' + taxon, (r) => {
            let parent = view.firstChild.nextElementSibling;
            removeLevelListeners(parent, regressParent);
            params.taxonomy.children = params.taxonomy.siblings;
            params.taxonomy.siblings = params.taxonomy.parents;
            params.taxonomy.tindex = params.taxonomy.pindex;
            params.taxonomy.parents = r.values.parents;
            params.taxonomy.pindex = r.values.pindex;
            updateActiveTaxon(params);

            let newparent = view.firstChild;
            let siblings = parent.nextElementSibling;
            let children = view.lastChild.previousElementSibling;
            removeLevelListeners(siblings, slideSibling);
            if (children.children.length > 0) { removeLevelListeners(children, slideChildren); }
            displayParentSiblings(params, parent);
            addClass(children, 'smooshed');
            createParentLevel(params, newparent);
            view.insertBefore(makeDiv(id=null, c='taxonomy-levels smooshed'), newparent);
            removeClass(newparent, 'smooshed');
            removeClass(siblings, 'taxonomy-levels-main');
            updateAncestry();
            wait(params.transition, () => {
                children.remove();
                addClass(parent, 'taxonomy-levels-main');
                addLevelListeners(parent, slideSibling);
                removeClassList(parent.lastChild.children, 'collapse');
                addLevelListeners(siblings, slideChildren);
                removeClassList(siblings.lastChild.children, 'active');
            });
        })
    }

    function growChildren(taxon, tindex) {
        ajaxGet('children/' + taxon.id, (r) => {
            params.taxonomy.parents = params.taxonomy.siblings;
            params.taxonomy.pindex = params.taxonomy.tindex;
            params.taxonomy.siblings = params.taxonomy.children;
            params.taxonomy.tindex = tindex;
            params.taxonomy.children = r.values.children;
            updateActiveTaxon(params);

            let parent = view.firstChild.nextElementSibling;
            let siblings = parent.nextElementSibling;
            let children = siblings.nextElementSibling;
            let newchildren = view.lastChild;
            removeLevelListeners(siblings, slideSibling);
            removeLevelListeners(children, slideChildren);
            addClass(parent, 'smooshed');
            hideParentSiblings(siblings)
            createChildrenLevel(params, newchildren);
            view.appendChild(makeDiv(id=null, c='taxonomy-levels smooshed'));
            removeClass(newchildren, 'smooshed');
            removeClass(siblings, 'taxonomy-levels-main');
            updateAncestry(params.taxonomy.parents[params.taxonomy.pindex]);
            wait(params.transition, () => {
                parent.remove();
                addClass(children, 'taxonomy-levels-main');
                addLevelListeners(children, slideSibling);
                let newparent = siblings.lastChild.children;
                for (let i = 0; i < newparent.length; ++i) {
                    newparent[i].addEventListener('click', regressParent);
                }
            });
        })
    }

    function hideParentSiblings(target) {
        let entries = target.lastChild.children;
        for (let i = 0; i < entries.length; ++i) {
            if (!hasClass(entries[i], 'active')) { addClass(entries[i], 'collapse') }
        }
    }

    function displayParentSiblings(params, target) {
        let entries = target.lastChild.children;
        let index = params.taxonomy.tindex + 1;
        for (let i = 0; i < entries.length; ++i) {
            if (i == index - 1) { removeClass(entries[i], 'collapse') }
            if (i == index + 1) { removeClass(entries[i], 'collapse') }
        }
    }

    function addLevelListeners(target, listener) {
        let scroll = target.lastChild;
        scroll.addEventListener('wheel', listener);
        addChildrenListeners(scroll, listener);
    }

    function removeLevelListeners(target, listener) {
        let scroll = target.lastChild;
        scroll.removeEventListener('wheel', listener);
        removeChildrenListeners(scroll, listener);
    }
    
    function updateChildren(target, current, previous) {
        let objects = params.taxonomy.siblings;
        let view = target.parentNode.parentNode;
        let typeNode = target.parentNode.firstChild;
        let typeNodeLabel = typeNode.firstChild;
        let previousType = objects[previous - 1].typesorting;
        let currentType = objects[current - 1].typesorting;
        if (previousType != currentType) { addClass(typeNode, 'collapse'); }
        target.removeEventListener('wheel', slideSibling);
        removeChildrenListeners(target, slideSibling);
        let taxon = target.children[current].getAttribute('taxon');
        let childrenContainer = view.lastChild.previousElementSibling;
        ajaxGet('children/' + taxon, (r) => {
            addClass(childrenContainer, 'collapse');
            wait(params.transition, () => {
                params.taxonomy.children = r.values.children;
                if (previousType != currentType) {
                    typeNodeLabel.innerHTML = objects[current - 1].type;
                    removeClass(typeNode, 'collapse');
                }
                childrenContainer.remove();
                let children = makeDiv(id=null, c='taxonomy-levels collapse');
                createChildrenLevel(params, children);
                view.insertBefore(children, view.lastChild);
                target.addEventListener('wheel', slideSibling);
                addChildrenListeners(target, slideSibling);
                wait(10, () => { removeClass(children, 'collapse'); })
            })
        })
    }

    function removeChildrenListeners(target, listener) {
        let nodes = target.children;
        for (let i = 0; i < (nodes.length); ++i) {
            nodes[i].removeEventListener('click', listener);
        }
    }
    
    function addChildrenListeners(target, listener) {
        let nodes = target.children;
        for (let i = 0; i < (nodes.length); ++i) {
            nodes[i].addEventListener('click', listener);
        }
    }
    
    function slideSibling(event) {
        let entries;
        if (event.type === 'wheel') { entries = event.currentTarget }
        else if (event.type === 'click') { entries = event.currentTarget.parentNode }
        let displayed = entries.querySelectorAll('.taxonomy-entry:not(.smooshed)');
        let firstindex = Array.prototype.indexOf.call(entries.children, displayed[0]);
        let currentindex = Array.prototype.indexOf.call(entries.children, displayed[1]);
        let lastindex = Array.prototype.indexOf.call(entries.children, displayed[displayed.length - 1]);
        let hide = null; let reveal = null; let current;
        if (event.type === 'wheel') {
            if (event.deltaY > 0) {
                if (lastindex < entries.children.length - 1) {
                    hide = firstindex; current = lastindex; reveal = lastindex + 1;
                }
            } else {
                if (firstindex > 0) {
                    hide = lastindex; current = firstindex; reveal = firstindex - 1;
                }
            }
        } else if (event.type === 'click') {
            let targetindex = Array.prototype.indexOf.call(entries.children, event.target);
            if (targetindex !== currentindex) {
                if (targetindex > currentindex) {
                    hide = firstindex; current = lastindex; reveal = lastindex + 1;
                } else {
                    hide = lastindex; current = firstindex; reveal = firstindex - 1;
                }
            }
        }
        if (hide !== null) {
            params.taxonomy.tindex = current - 1;
            addClass(entries.children[hide], 'smooshed');
            addClass(entries.children[current], 'active');
            removeClass(entries.children[reveal], 'smooshed');
            removeClass(entries.children[currentindex], 'active');
            updateChildren(entries, current, currentindex);
            updateActiveTaxon(params);
        }
    }

    function slideChildren(event) {
        let entries;
        if (event.type === 'wheel') { entries = event.currentTarget }
        else if (event.type === 'click') { entries = event.currentTarget.parentNode }
        let objects = params.taxonomy.children;
        let displayed = entries.querySelectorAll('.taxonomy-entry:not(.smooshed)');
        let firstindex = Array.prototype.indexOf.call(entries.children, displayed[0]);
        let currentindex = Array.prototype.indexOf.call(entries.children, displayed[1]);
        let lastindex = Array.prototype.indexOf.call(entries.children, displayed[displayed.length - 1]);
        let hide = null; let reveal = null; let current = null;
        if (event.type === 'wheel') {
            if (event.deltaY > 0) {
                if (lastindex < entries.children.length - 1) {
                    hide = firstindex; current = lastindex; reveal = lastindex + 1;
                }
            } else {
                if (firstindex > 0) {
                    hide = lastindex; current = firstindex; reveal = firstindex - 1;
                }
            }
        }
        else if (event.type === 'click') {
            let targetindex = Array.prototype.indexOf.call(entries.children, event.target);
            if (targetindex !== currentindex) {
                if (targetindex < entries.children.length - 1) {
                    if (targetindex > currentindex) {
                        hide = firstindex; current = lastindex; reveal = lastindex + 1;
                    } else {
                        hide = lastindex; current = firstindex; reveal = firstindex - 1;
                    }
                }
            } else {
                addClass(event.currentTarget, 'active');
                growChildren(objects[currentindex - 1], currentindex - 1);
            }
        }
        if (hide !== null) {
            let typeNode = entries.parentNode.firstChild;
            let typeNodeLabel = typeNode.firstChild;
            addClass(entries.children[hide], 'smooshed');
            removeClass(entries.children[reveal], 'smooshed');
            previousType = objects[currentindex - 1].typesorting;
            currentType = objects[current - 1].typesorting;
            if (previousType != currentType) {
                removeClass(typeNode, previousType);
                addClass(typeNode, currentType);
                typeNodeLabel.innerHTML = objects[current - 1].type;
            }
        }
    }

    function createTaxonNode(obj, active, collapse, smooshed) {
        let className = '';
        if (active) { className += ' active' }
        if (collapse) { className += ' collapse' }
        if (smooshed) { className += ' smooshed' }
        let node = makeDiv(id=null, c='taxonomy-entry' + className);
        let imageDiv = makePicture(obj);
    
        let html, name;
        if (obj.vernacular != null) {
            name = uppercaseFirstLetter(obj.vernacular);
            html = name;
        } else {
            name = uppercaseFirstLetter(obj.scientific);
            html = '<i>' + uppercaseFirstLetter(obj.scientific) + '</i>';
        }
    
        let stats = obj.count.toLocaleString();
        if (obj.parent) {
            stats += ' (';
            if (round(obj.percentage, 1) < 10) {
                if (round(obj.percentage, 1) < 0.1) {
                    if (round(obj.percentage, 2) < 0.01) {
                        stats += round(obj.percentage, 3).toFixed(3) + '%';
                    } else {
                        stats += round(obj.percentage, 2).toFixed(2) + '%';
                    }
                } else {
                    stats += round(obj.percentage, 1).toFixed(1) + '%';
                }
            } else {
                stats += Math.round(obj.percentage) + '%';
            }
            stats += ')';
        }
    
        let statistics = makeDiv(id=null, c='taxonomy-entry-statistics', stats);
        let swidth = calculateTextWidth(stats, getComputedStyle(statistics), '13px') + 10;
    
        statistics.style.width = '0px';
        statistics.style.height = '0px';
        node.addEventListener('mouseover', (e) => {
            statistics.style.width = swidth + 'px';
            statistics.style.height = '25px';
        });
        node.addEventListener('mouseout', (e) => {
            statistics.style.width = '0px';
            statistics.style.height = '0px';
        });
        
        let label = makeDiv(id=null, c='taxonomy-entry-label', html=html);
        let width = calculateTextWidth(name, getComputedStyle(label), '13px') + 20;

        let nodeWidth = calculateWidthFromClass('taxonomy-entry');
        if (width > nodeWidth) {
            let height = calculateLabelHeight(name, getComputedStyle(label), '13px', nodeWidth);
            node.addEventListener('mouseover', (e) => {
                label.style.height = height + 'px';
                label.style.textWrap = 'wrap';
                label.style.whiteSpace = 'pre-wrap';
                label.style.wordBreak = 'break-word';
                label.style.textOverflow = 'unset';
            });
            node.addEventListener('mouseout', (e) => {
                label.style.height = '28px';
                label.style.textWrap = 'nowrap';
                label.style.textOverflow = 'ellipsis';
            });
        }
    
        let mask = makeDiv(id=null, c='taxonomy-entry-mask');
        node.append(mask, imageDiv, label, statistics);
        node.setAttribute('taxon', obj.id);
        node.remove();

        return node
    }
}

// function makePicture(obj) {
//     let imageDiv = makeDiv(id=null, c='taxonomy-image-container');
//         if (obj.picture !== null) {
//             let imageMask = makeDiv(id=null, c='photo-mask');
//             let loader = makeDiv(id=null, c='photo-loader');
//             let image = makeImage(obj.picture, null, null, id=null, c='photo');
//             loadingImage(image).then(() => { addClass(imageMask, 'loaded') });
//             imageMask.appendChild(loader);
//             imageDiv.append(imageMask, image);
//         }
//         return imageDiv;
// }

// function calculateLabelHeight(text, style, fontsize, width) {
//     let dummy = document.createElement('div');
//     dummy.style.position = 'absolute';
//     dummy.style.fontFamily = style.fontFamily;
//     dummy.style.fontSize = fontsize;
//     dummy.style.fontWeight = style.fontWeight;
//     dummy.style.fontStyle = style.fontStyle;
//     dummy.style.lineHeight = '1.2em';
//     dummy.style.padding = '6px 10px';
//     dummy.style.height = 'auto';
//     dummy.style.width = width + 'px';
//     dummy.style.whiteSpace = 'wrap';
//     dummy.style.whiteSpace = 'pre-wrap';
//     dummy.style.wordBreak = 'break-word';
//     dummy.style.boxSizing = 'border-box';
//     dummy.innerHTML = text;
//     document.body.appendChild(dummy);
//     let height = Math.ceil(dummy.clientHeight);
//     dummy.remove();
//     return height;
// }

export default Taxonomy