/**
 * @header
 * Define the header of the application.
 */

import { makeDiv } from "../generic/dom.js";

class Header {
    constructor(app) {
        this.app = app;
        this.container = makeDiv('header');
        this.logo = makeDiv('header-logo', null, 'Phylopedia');
        this.container.append(this.logo);
        this.app.container.append(this.container);
    }
}




function initializeHeader(params) {
    let container = document.getElementById('container');
    let headerContainer = makeDiv('header-container');

    let transition = params.transition;
    let heightLimit = 500;
    let resultGroupHeight = 26;
    let resultPhotoHeight = 50;
    let resultMargin = 10;

    let header = makeDiv(id='header-container');
    let out = true;
    
    let modulelookup = makeDiv(id='module-lookup', c='header-module');
    let lookupcontainer = makeDiv(id=null, c='lookup-container');
    let results = makeDiv(id='lookup-result-container', c='lookup-result-container');
    let lookup = makeInput(id=null, c='lookup-input');

    lookup.addEventListener("focusin", focusIn);
    lookup.addEventListener("focusout", focusOut);
    lookupcontainer.addEventListener("mouseenter", () => { out = false; });
    lookupcontainer.addEventListener("mouseleave", () => {
        let isfocused = document.activeElement === lookup;
        if (isfocused === false) {
            removeClass(lookupcontainer, 'active');
            results.style.height = '0px';
            wait(transition, () => { removeChildren(results); })
         }
        out = true;
    });

    lookupcontainer.append(lookup, results);
    modulelookup.appendChild(lookupcontainer);
    header.appendChild(modulelookup);
    headerContainer.append(header);
    container.append(headerContainer);

    function activateTaxon(event) {
        event.stopPropagation();
        lookup.innerHTML = '';
        removeClass(lookupcontainer, 'active');
        results.style.height = '0px';
        params.taxonomy = event.currentTarget.getAttribute('taxon');
        reloadTaxonomy(params);
        updateTaxonRange(params);
        wait(transition, () => { removeChildren(results); })
    }

    function focusIn(event) {
        addClass(lookupcontainer, 'active');
        lookup.addEventListener("input", input);
        getVernacular(event);
    }

    function focusOut(event) {
        if (out) {
            removeClass(lookupcontainer, 'active');
            results.style.height = '0px';
            wait(transition, () => { removeChildren(results); })
        }
    }

    function input(event) {
        getVernacular(event);
    }

    function getVernacular(event) {
        function addGroup(array, type, typesort) {
            let group = makeDiv(id=null, 'lookup-result-group');
            let sorting = makeDiv(id=null, 'lookup-result-sorting');
            let taxonomy = makeDiv(id=null, 'lookup-result-level ' + typesort, uppercaseFirstLetter(type));
            sorting.append(...array);
            group.append(taxonomy, sorting);
            return group;
        }

        let value = event.target.innerHTML.replace('<br>', '').trim();
        if (value.length > 2) {
            // Send the Ajax
            ajaxGet('lookup/' + value, function(r) {
                // Number of results
                let length = r.values.length;
                // If results have been returned
                if (r.values.length > 0) {
                    let height = 0;
                    let previousType;
                    let previousTypeSort;
                    let sorting = [];
                    let groups = [];
                    for (let i = 0; i < length; ++i) {
                        let entry = r.values[i];
                        let name = entry.vernacular
                        let html;
                        if (name === null) {
                            html = '<i>' + boldSubstring(entry.scientific, value) + '</i><br>';
                        } else {
                            html = boldSubstring(name, value) + '<br><i>' + boldSubstring(entry.scientific, value) + '</i>';
                        }
                        let typesort = entry.typesorting;
                        let type = entry.type;
                        if (typesort != previousTypeSort && sorting.length > 0) {
                            groups.push(addGroup(sorting, previousType, previousTypeSort));
                            if (height > 0) { height += resultMargin; }
                            height += resultGroupHeight + sorting.length * resultPhotoHeight;
                            sorting = [];
                        }
                        let label = makeDiv(id=null, c='lookup-label', html=html);
                        let imageDiv = makeDiv(id=null, c='lookup-image-container');
                        if (entry.picture !== null) {
                            let imageMask = makeDiv(id=null, c='photo-mask ' + typesort);
                            let loader = makeDiv(id=null, c='photo-loader');
                            let image = makeImage(entry.picture, null, null, id=null, c='photo');
                            loadingImage(image).then(() => { addClass(imageMask, 'loaded') });
                            imageMask.appendChild(loader);
                            imageDiv.append(imageMask, image);
                        }
                        let result = makeDiv(id=null, c='lookup-result ' + typesort);
                        result.append(imageDiv, label);
                        result.setAttribute('taxon', entry.taxon);
                        result.addEventListener('click', activateTaxon);
                        sorting.push(result);
                        previousTypeSort = typesort;
                        previousType = type;
                    }
                    groups.push(addGroup(sorting, previousType, previousTypeSort));
                    if (height > 0) { height += resultMargin; }
                    height += resultGroupHeight + sorting.length * resultPhotoHeight + resultMargin;
                    if (height > heightLimit) { height = heightLimit; }
                    results.style.height = height + 'px';
                    currentHeight = height;
                    
                    wait(transition, () => { removeChildren(results); results.append(...groups); })
                } else {
                    // Ajax didn't return anything
                    results.style.height = '0px';
                    wait(transition, () => { removeChildren(results); })
                }
            });
        } else {
            // Input length below 3 characters
            results.style.height = '0px';
            wait(transition, () => { removeChildren(results); })
        }
    }
}

export default Header;