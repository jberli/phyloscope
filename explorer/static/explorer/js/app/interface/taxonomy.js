/**
 * @taxonomy
 * Define the taxonomy widget.
 */

import { ajaxGet } from "../generic/ajax.js";
import { makeDiv } from "../generic/dom.js";

class Taxonomy {
    constructor(app) {
        this.app = app;
        this.container = makeDiv('taxonomy', 'sub-panel');
        this.app.second.append(this.container);

        // this.initialize();
        this.taxon = app.taxon;
    }

    initialize() {
        this.ancestry = makeDiv(null, 'taxonomy-ancestry-container');
        this.view = makeDiv(null, 'taxonomy-levels-container');
        this.container.append(this.ancestry, this.view);
    }

    reload() {
        this.destroy(() => {
            this.initialize();
        })
    }

    destroy(callback) {
        addClass(this.container, 'collapse');
        wait(this.app.params.transition, () => {
            this.container.remove();
            callback();
        });
    }

    createTaxonomy() {
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

function makePicture(obj) {
    let imageDiv = makeDiv(id=null, c='taxonomy-image-container');
        if (obj.picture !== null) {
            let imageMask = makeDiv(id=null, c='photo-mask');
            let loader = makeDiv(id=null, c='photo-loader');
            let image = makeImage(obj.picture, null, null, id=null, c='photo');
            loadingImage(image).then(() => { addClass(imageMask, 'loaded') });
            imageMask.appendChild(loader);
            imageDiv.append(imageMask, image);
        }
        return imageDiv;
}

function calculateLabelHeight(text, style, fontsize, width) {
    let dummy = document.createElement('div');
    dummy.style.position = 'absolute';
    dummy.style.fontFamily = style.fontFamily;
    dummy.style.fontSize = fontsize;
    dummy.style.fontWeight = style.fontWeight;
    dummy.style.fontStyle = style.fontStyle;
    dummy.style.lineHeight = '1.2em';
    dummy.style.padding = '6px 10px';
    dummy.style.height = 'auto';
    dummy.style.width = width + 'px';
    dummy.style.whiteSpace = 'wrap';
    dummy.style.whiteSpace = 'pre-wrap';
    dummy.style.wordBreak = 'break-word';
    dummy.style.boxSizing = 'border-box';
    dummy.innerHTML = text;
    document.body.appendChild(dummy);
    let height = Math.ceil(dummy.clientHeight);
    dummy.remove();
    return height;
}

export default Taxonomy