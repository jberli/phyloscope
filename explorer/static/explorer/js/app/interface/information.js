/**
 * @information
 * Define the information widget.
 */

import { ajaxGet, loadImage } from "../generic/ajax.js";
import { addClass, addSVG, makeDiv, makeImage, makeInput, removeChildren, removeClass, wait } from "../generic/dom.js";
import { boldSubstring, compare, removeTrailing, uppercaseFirstLetter } from "../generic/parsing.js";

class Information {
    constructor(app) {
        this.app = app;
        this.container = makeDiv('information', 'sub-panel');

        this.search = new Search(this);
        this.text = new Text(this);

        this.mask = makeDiv(null, 'information-mask mask');
        this.loader = makeDiv(null, 'information-loader loader');
        this.mask.append(this.loader)
        this.container.append(this.mask);

        this.app.first.append(this.container);
    }

    update() {
        this.text.update();
    }

    loading() {
        removeClass(this.mask, 'loaded');
    }

    loaded() {
        addClass(this.mask, 'loaded');
    }
}

class Search {
    constructor(information) {
        this.information = information;
        this.active = false;
        this.results = []

        this.searchbutton = makeDiv(null, 'search-button');
        addSVG(this.searchbutton, new URL('/static/explorer/img/search.svg', import.meta.url));
        this.information.container.append(this.searchbutton);

        this.activateSearch();

        this.container = makeDiv(null, 'search-container collapse');
        this.input = makeInput(null, 'search-input', false);
        this.container.append(this.input);
        
        this.information.container.append(this.container);
    }

    activateSearch() {
        let self = this;

        function search() {
            function activateTaxon(e) {
                self.information.app.params.taxon.id = e.target.getAttribute('taxon');
                self.information.app.updateTaxon();
                close();
            }

            function addGroup(array, type, typesort) {
                let group = makeDiv(null, 'search-result-group');
                let sorting = makeDiv(null, 'search-result-sorting');
                let taxonomy = makeDiv(null, 'search-result-level ' + typesort, uppercaseFirstLetter(type));
                sorting.append(...array);
                group.append(taxonomy, sorting);
                return group;
            }

            function preventEnter(e) {
                if (e.key === 'Enter') {
                    self.input.removeEventListener('keydown', preventEnter);
                    e.preventDefault();

                    let taxonList = self.information.text.container.getElementsByClassName('search-result');
                    if (taxonList.length > 0) {
                        taxonList[0].click();
                    } else {
                        self.input.removeEventListener('input', input);
                        deactivate();
                    }
                }
            }

            function input(e) {
                let value = e.target.innerHTML.replace('<br>', '').trim();
                if (value.length > 2) {
                    ajaxGet('search/' + self.information.app.language + '/' + value, function(r) {
                        let length = r.values.length;
                        if (r.values.length > 0) {
                            let previousType;
                            let previousTypeSort;
                            let sorting = [];
                            self.results = [];
                            for (let i = 0; i < length; ++i) {
                                let entry = r.values[i];
                                let name = entry.vernacular
                                let html;
                                if (name === null) { html = '<i>' + boldSubstring(entry.scientific, value) + '</i><br>'; }
                                else { html = boldSubstring(name, value) + '<br><i>' + boldSubstring(entry.scientific, value) + '</i>'; }
                                let typesort = entry.typesorting;
                                let type = entry.type;
                                if (typesort != previousTypeSort && sorting.length > 0) {
                                    self.results.push(addGroup(sorting, previousType, previousTypeSort));
                                    sorting = [];
                                }
                                let label = makeDiv(null, 'search-label', html);
                                let imageDiv = makeDiv(null, 'search-image-container');
                                if (entry.picture !== null) {
                                    let imageMask = makeDiv(null, 'mask ' + typesort);
                                    let loader = makeDiv(null, 'search-loader');
                                    let image = makeImage(entry.picture, null, null, null, 'photo');
                                    loadImage(image).then(() => { addClass(imageMask, 'loaded') });
                                    imageMask.appendChild(loader);
                                    imageDiv.append(imageMask, image);
                                }
                                let result = makeDiv(null, 'search-result ' + typesort);
                                result.append(imageDiv, label);
                                result.setAttribute('taxon', entry.taxon);

                                result.addEventListener('click', activateTaxon);

                                sorting.push(result);
                                previousTypeSort = typesort;
                                previousType = type;
                            }
                            self.results.push(addGroup(sorting, previousType, previousTypeSort));
                            self.information.text.addResults(self.results, previousTypeSort);
                        } else {
                            self.information.text.clear();
                        }
                    });
                } else {
                    self.information.text.clear();
                }            
            }

            function open() {
                self.information.text.hide();
                addClass(self.searchbutton, 'active');
                addClass(self.input, 'active');
                removeClass(self.container, 'collapse');
                self.active = true;
                wait(200, () => {
                    self.information.text.clear();
                    self.input.setAttribute('contenteditable', true);
                    self.input.focus();
                    self.searchbutton.addEventListener('click', search);
                    self.input.addEventListener('keydown', preventEnter);
                    self.input.addEventListener('input', input);
                })
            }

            function close() {
                self.information.text.clear();
                self.input.setAttribute('contenteditable', false);
                removeClass(self.searchbutton, 'active');
                removeClass(self.input, 'active');
                addClass(self.container, 'collapse');
                self.active = false;
                self.input.removeEventListener('keydown', preventEnter);
                self.input.removeEventListener('input', input);

                wait(200, () => {
                    self.input.innerHTML = '';
                    self.searchbutton.addEventListener('click', search);
                })
            }

            function deactivate() {
                close();
                self.information.text.update();
            }

            self.searchbutton.removeEventListener('click', search);
            if (self.active) { deactivate(); }
            else { open(); }
        }

        this.searchbutton.addEventListener('click', search);
    }
}

class Text {
    constructor(information) {
        this.information = information;
        this.container = makeDiv(null, 'text-container');
        this.information.container.append(this.container);
    }

    update() {
        this.taxon = this.information.app.params.taxon;
        let index = this.taxon.taxonomy.tindex;

        let infos = this.taxon.taxonomy.siblings[index];
        let v = infos.vernaculars.slice(0)

        let wikipedia = this.taxon.information;

        let t;
        if (wikipedia !== null) {
            if (compare(wikipedia.title, infos.scientific, true, [['_', ' ']])) {
                if (v.length > 0) { t = v.shift(); }
                else { t = wikipedia.title }
            } else {
                t = wikipedia.title;
            }
        } else {
            if (v.length > 0) { t = v.shift(); }
            else { t = infos.scientific }
        }

        this.content = makeDiv(null, 'text-content hidden');
        this.container.append(this.content);

        let title = makeDiv(null, 'text-title', t);
        let scientific = makeDiv(null, 'text-scientific', infos.scientific);
        this.content.append(title, scientific);

        if (v.length > 0) {
            let vstring = '';
            for (let i = 0; i < v.length; i++) {
                if (!compare(v[i], t, true, [['_', ' ']])) {
                    let str;
                    if (vstring === '') { str = v[i]; }
                    else { str = ' · ' + v[i]; }
                    vstring += str;
                }
            }

            if (vstring !== '') {
                let vernacular = makeDiv(null, 'text-vernacular', this.information.app.params.texts.description.vernaculars[this.information.app.language])
                let vernaculars = makeDiv(null, 'text-vernaculars', vstring);
                this.content.append(vernacular, vernaculars);
            }
        }
        
        if (wikipedia !== null) {
            let summary = makeDiv(null, 'text-summary', removeTrailing(wikipedia.summary.replace('== References ==', '')));
            this.content.append(summary);
        }
        
        wait(10, () => {
            removeClass(this.content, 'hidden');
            this.information.loaded();
        })
    }

    default() {
        let cl = this.container.classList;
        for (let i = 0; i < cl.length; ++i) {
            if (cl[i] !== 'text-container') { removeClass(this.container, cl[i]) }
        }
    }

    addResults(r, typesort) {
        this.default();
        
        removeChildren(this.container);
        addClass(this.container, typesort);

        if (r.length > 0) {
            let results = makeDiv(null, 'search-result-container no-scrollbar');
            results.append(...r);
            this.container.append(results);
        } 
    }

    reload(taxon) {
        this.clear();
        ajaxGet('taxon/' + this.information.app.language + '/' + taxon + '/', (r) => {
            this.information.app.params.taxon = r;
            this.information.app.photography.update();
            this.information.update();
        });
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