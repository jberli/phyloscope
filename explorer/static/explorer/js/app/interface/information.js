/**
 * @information
 * Define the information widget.
 */

import { ajaxGet, loadImage } from "../generic/ajax.js";
import { addClass, addSVG, makeDiv, makeImage, makeInput, removeChildren, removeClass, wait } from "../generic/dom.js";
import { boldSubstring, compare, removeTrailing, uppercaseFirstLetter } from "../generic/parsing.js";

class Information {
    constructor(app, params) {
        this.app = app;
        this.params = params;

        // Create DOM Elements
        this.container = makeDiv('information', 'sub-panel');
        this.app.first.append(this.container);

        // Mask and loader
        this.mask = makeDiv(null, 'information-mask mask');
        this.loader = makeDiv(null, 'information-loader loader');
        this.mask.append(this.loader)
        this.container.append(this.mask);

        // Create the search bar and the description
        this.search = new Search(this);
        this.description = new Description(this);
    }

    update() {
        this.description.clear();
        this.description.update();
    }

    loading() {
        removeClass(this.mask, 'loaded');
    }

    loaded() {
        addClass(this.mask, 'loaded');
    }

    searching(callback) {
        // Hide the description
        this.description.hide();
        // Display the search bar and wait for the transition
        this.search.activate(() => {
            // Empty the description widget
            this.description.clear();
            callback();
        });
    }

    describing(callback) {
        // Empty the description widget
        this.description.clear();
        // Close the search bar
        this.search.deactivate(() => {
            // Update the description widget
            this.description.update();
            callback();
        });
    }
}

class Search {
    constructor(information) {
        this.information = information;

        // Flag to see if the search bar is currently active
        this.active = false;
        // Storage for results of the search
        this.results = []

        // Add a button to activate the search
        this.searchbutton = makeDiv(null, 'search-button');
        addSVG(this.searchbutton, new URL('/static/explorer/img/search.svg', import.meta.url));
        this.information.container.append(this.searchbutton);

        // Create DOM Elements of the search bar
        this.container = makeDiv(null, 'search-container collapse');
        this.input = makeInput(null, 'search-input', false);
        this.container.append(this.input);

        // Append the search to the top of the information panel
        this.information.container.append(this.container);

        let self = this;
        this.searchbutton.addEventListener('click', (e) => {
            if (self.active) { this.information.describing(() => {}); }
            else { this.information.searching(() => {}); }
        });

        this.input.addEventListener('input', (e) => {
            if (self.active) {
                let value = e.target.innerHTML.replace('<br>', '').trim();
                self.lookup(value);
            }
        })

        this.input.addEventListener('keydown', (e) => {
            if (self.active) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    let taxonList = self.information.description.container.getElementsByClassName('search-result');
                    if (taxonList.length > 0) {
                        taxonList[0].click();
                    } else {
                        this.information.describing(() => {});
                    }
                }
            }
        })  
    }

    activate(callback) {
        // Reveal the search bar, activate search button and input
        removeClass(this.container, 'collapse');
        addClass(this.searchbutton, 'active');
        addClass(this.input, 'active');

        // Wait for the transition animation
        wait(this.information.params.interface.transition, () => {
            // Set the input search bar as editable and focus on it
            this.input.setAttribute('contenteditable', true);
            this.input.focus();
            // Set search bar as active
            this.active = true;
            // Callback
            callback();
        })
    }

    deactivate(callback) {
        // Collapse the search bar
        addClass(this.container, 'collapse');
        // Deactivate seach button and input field
        removeClass(this.searchbutton, 'active');
        removeClass(this.input, 'active');
        // Remove the editability of input field
        this.input.setAttribute('contenteditable', false);

        // Wait for the transition animation
        wait(this.information.params.interface.transition, () => {
            // Remove search string
            this.input.innerHTML = '';
            // Set search bar as inactive
            this.active = false;
            // Callback
            callback();
        })
    }

    lookup(value) {
        // Create a group of results depending of the sorting type
        function addGroup(array, type, typesort) {
            // Create DOM Elements
            let group = makeDiv(null, 'search-result-group');
            let sorting = makeDiv(null, 'search-result-sorting');
            let taxonomy = makeDiv(null, 'search-result-level ' + typesort, uppercaseFirstLetter(type));
            // Append results to the group
            sorting.append(...array);
            group.append(taxonomy, sorting);
            // Return the group
            return group;
        }

        let self = this;
        // Check if there is at least 3 characters
        if (value.length > 2) {
            // Send an ajax to lookup the wanted characters
            ajaxGet('search/' + self.information.app.params.languages.current + '/' + value, function(r) {
                let length = r.values.length;
                // If results have been returned
                if (r.values.length > 0) {
                    // Storage for the previous taxon type for sorting purposes 
                    let previousType;
                    let previousTypeSort;
                    // Storage for different taxon types
                    let sorting = [];
                    // Set the results as empty
                    self.results = [];
                    // Loop through each result
                    for (let i = 0; i < length; ++i) {
                        let entry = r.values[i];
                        // Retrieve the vernacular name
                        let name = entry.vernacular
                        let html;
                        // Set name as the scientific name when needed and boldify sent string
                        if (name === null) { html = '<i>' + boldSubstring(entry.scientific, value) + '</i><br>'; }
                        // Set vernacular name and boldify sent string
                        else { html = boldSubstring(name, value) + '<br><i>' + boldSubstring(entry.scientific, value) + '</i>'; }
                        // Retrieve the sorting type
                        let typesort = entry.typesorting;
                        let type = entry.type;
                        // If the type is different from the previous 
                        if (typesort != previousTypeSort && sorting.length > 0) {
                            // Add the group to the results
                            self.results.push(addGroup(sorting, previousType, previousTypeSort));
                            sorting = [];
                        }
                        let label = makeDiv(null, 'search-label', html);
                        let imageDiv = makeDiv(null, 'search-image-container');

                        // If there is an image, loading it
                        if (entry.picture !== null) {
                            let imageMask = makeDiv(null, 'mask ' + typesort);
                            let loader = makeDiv(null, 'search-loader');
                            let image = makeImage(entry.picture, null, null, null, 'photo');
                            loadImage(image).then(() => { addClass(imageMask, 'loaded'); });
                            imageMask.appendChild(loader);
                            imageDiv.append(imageMask, image);
                        }

                        // Create the element for the current result with image and label
                        let result = makeDiv(null, 'search-result ' + typesort);
                        result.append(imageDiv, label);
                        // Add the taxon index as an html attribute
                        result.setAttribute('taxon', entry.taxon);

                        // Activate the taxon on click
                        function activateTaxon(e) {
                            result.removeEventListener('click', activateTaxon);
                            self.information.description.clear();
                            // Deactivate search mode
                            self.deactivate(() => {});
                            // Update the application widgets
                            self.information.app.updater.update(e.target.getAttribute('taxon'));
                        }
                        result.addEventListener('click', activateTaxon);

                        // Add the current result to the list
                        sorting.push(result);
                        // Set current types as previous
                        previousTypeSort = typesort;
                        previousType = type;
                    }
                    // Add the last group to the list of results
                    self.results.push(addGroup(sorting, previousType, previousTypeSort));
                    // Add results to the description widget
                    self.information.description.results(self.results, previousTypeSort);
                }
                // If no results have been found, clear the description container
                else {
                    self.information.description.clear();
                }
            });
        }
        // If there is less than 3 characters
        else {
            // Empty the description container
            self.information.description.clear();
        }
    }
}

class Description {
    constructor(information) {
        this.information = information;

        // Create DOM elements
        this.container = makeDiv(null, 'description-container');
        this.information.container.append(this.container);
    }

    update() {
        // Retrieve infos on the taxon from the database
        let taxonomy = this.information.params.taxonomy;
        let infos = taxonomy.siblings[taxonomy.tindex];
        // Retrieve wikipedia information
        let wikipedia = taxonomy.description;

        // Get the first vernacular name
        let v = infos.vernaculars.slice(0)
        // Storage for the title of the description
        let t;
        // If the wikipedia page exists 
        if (wikipedia !== null) {
            // If the wikipedia title is the scientific name
            if (compare(wikipedia.title, infos.scientific, true, [['_', ' ']])) {
                // If vernaculars exists, set the title as the first vernacular
                if (v.length > 0) { t = v.shift(); }
                // If not, set the title as the wikipedia title
                else { t = wikipedia.title }
            }
            // If the wikipedia title is different from the scientific name, set it as title
            else { t = wikipedia.title; }
        }
        // No wikipedia page exists        
        else {
            // Set first vernacular if exists, else the scientifc name
            if (v.length > 0) { t = v.shift(); }
            else { t = infos.scientific }
        }

        // Create DOM Elements
        this.content = makeDiv(null, 'description-content hidden');
        this.container.append(this.content);
        let title = makeDiv(null, 'description-title', t);
        let scientific = makeDiv(null, 'description-scientific', infos.scientific);
        this.content.append(title, scientific);

        // If there are other vernacular names
        if (v.length > 0) {
            let vstring = '';
            // Loop through them
            for (let i = 0; i < v.length; i++) {
                // Only add them if they are different from the title of the description
                if (!compare(v[i], t, true, [['_', ' ']])) {
                    let str;
                    // Append the name to the string
                    if (vstring === '') { str = v[i]; }
                    else { str = ' · ' + v[i]; }
                    vstring += str;
                }
            }
            // Add the DOM Element only if vernaculars were found
            if (vstring !== '') {
                let vernacular = makeDiv(null, 'description-vernacular', this.information.app.params.texts.vernaculars[this.information.params.languages.current])
                let vernaculars = makeDiv(null, 'description-vernaculars', vstring);
                this.content.append(vernacular, vernaculars);
            }
        }
        
        // If there is a wikipedia page
        if (wikipedia !== null) {
            // Add the summary
            let summary = makeDiv(null, 'description-summary', removeTrailing(wikipedia.summary.replace('== References ==', '').replace(',.', '.').replace(' .', '.')));
            this.content.append(summary);
        }
        
        // Animate the display of information
        wait(10, () => {
            removeClass(this.content, 'hidden');
            this.information.loaded();
        })
    }

    /**
     * Add search results to the description container.
     * @param {Array} r - Results to add to the description.
     * @param {string} typesort - The type of the last result to style the container. 
     */
    results(r, typesort) {
        // Set the style to default
        this.default();
        // Remove all children
        removeChildren(this.container);
        // If there are indeed results
        if (r.length > 0) {
            // Add the type class and append all results
            addClass(this.container, typesort);
            let results = makeDiv(null, 'search-result-container no-scrollbar');
            results.append(...r);
            this.container.append(results);
        } 
    }

    /**
     * Reset the description to default style
     */
    default() {
        let cl = this.container.classList;
        for (let i = 0; i < cl.length; ++i) {
            if (cl[i] !== 'description-container') { removeClass(this.container, cl[i]) }
        }
    }

    hide() {
        addClass(this.content, 'hidden');
    }

    clear() {
        removeChildren(this.container);
        this.default();
    }
}

export default Information