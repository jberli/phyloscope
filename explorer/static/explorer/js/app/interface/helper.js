import { addClass, addSVG, makeDiv, removeClass, wait } from "../generic/dom.js";

class Helper {
    constructor(widget, parent, type) {
        this.widget = widget;
        this.parent = parent;
        this.type = type;
        this.active = false;

        this.container = makeDiv(null, 'helper-container');
        this.parent.append(this.container);
    }

    clear() {
        let children = Array.from(this.container.children);
        children.forEach((element) => {
            element.remove();
        });
    }

    update() {
        this.clear();
        this.generate();
    }

    trigger(style) {
        let cs;
        if (style) { cs = this.widget.getBaseStyle(); }
        if (this.active) {
            removeClass(this.container, 'active');
            this.active = false;
            if (style && cs === 'dark') { this.widget.changeStyle(this.widget.helpcontainer, 'light', cs); }
        } else {
            addClass(this.container, 'active');
            this.active = true;
            if (style && cs === 'dark') { this.widget.changeStyle(this.widget.helpcontainer, cs, 'light'); }
        }
    }

    generate() {
        let params = this.widget.app.params
        let help = params.texts.help[this.type];
        let language = params.languages.current;

        this.content = makeDiv(null, 'helper-content no-scrollbar hidden');
        this.container.append(this.content);

        help.forEach((c) => {
            let type = c.type;

            switch(type) {
                case 'title': {
                    let title = makeDiv(null, 'helper-title', c[language]);
                    this.content.append(title);
                    break;
                }

                case 'paragraph': {
                    let paragraph = makeDiv(null, 'helper-paragraph', c.content[language])
                    this.content.append(paragraph);
                    break;
                }

                case 'list': {
                    let s = c.sorted ? 'ol' : 'ul';
                    let u = document.createElement(s);
                    u.setAttribute('class', 'helper-list');

                    c.content.forEach((l) => {
                        let li = document.createElement('li');
                        li.setAttribute('class', 'helper-list-element');
                        li.innerHTML = l[language];
                        u.append(li);
                    });

                    this.content.append(u);
                    break;
                }

                case 'vector': {
                    let vector = makeDiv(null, 'helper-vector');
                    let label = makeDiv(null, 'helper-label', c.label[language]);
                    addSVG(vector, new URL(`/static/explorer/img/helper/${c.svg}_${language}.svg`, import.meta.url));
                    this.content.append(vector, label);
                    break;
                }

                case 'buttons': {
                    let buttons = makeDiv(null, 'helper-buttons');
                    this.content.append(buttons);
    
                    c.content.forEach((element) => {
                        let econtainer = makeDiv(null, 'helper-button-container');
                        let button;
    
                        if (element.type === 'standard') {
                            button = makeDiv(null, 'helper-button-standard helper-button', element.text[language]);
                        }
                        else if (element.type === 'slider') {
                            button = makeDiv(null, 'helper-button-slider-container active');
                            let slider = makeDiv(null, 'helper-button-slider');
                            button.append(slider);
                        }
                        else if (element.type === 'vector') {
                            button = makeDiv(null, 'helper-button-vector');
                            addSVG(button, new URL('/static/explorer/img/' + element.svg + '.svg', import.meta.url));
                        }
    
                        let label = makeDiv(null, 'helper-button-label', element.label[language]);
                        econtainer.append(button, label);
                        buttons.append(econtainer);
                    });
                    break;
                }

                case 'taxonomy': {
                    let container = makeDiv(null, 'helper-taxonomy');
                    let label = makeDiv(null, 'helper-label', c.label[language]);
                    this.content.append(container, label);

                    let ancestry = makeDiv(null, 'helper-taxonomy-ancestry');

                    c.ancestry.forEach((element) => {
                        let ancestor = makeDiv(null, 'helper-taxonomy-ancestor');
                        let label = makeDiv(null, 'helper-taxonomy-ancestor-label', element[language]);
                        ancestor.append(label);
                        ancestry.append(ancestor);
                    });

                    let taxonomy = makeDiv(null, 'helper-taxonomy-container');
                    let parents = makeDiv(null, 'helper-taxonomy-level');
                    let p1 = makeDiv(null, 'helper-taxonomy-entry helper-taxonomy-placeholder');
                    let parent = makeDiv(null, 'helper-taxonomy-entry', c.parent[language]);
                    let p2 = makeDiv(null, 'helper-taxonomy-entry helper-taxonomy-placeholder');
                    parents.append(p1, parent, p2);
                    let siblings = makeDiv(null, 'helper-taxonomy-level');
                    
                    c.siblings.forEach((element) => {
                        let sibling = makeDiv(null, 'helper-taxonomy-entry', element[language]);
                        siblings.append(sibling);
                    });
    
                    let children = makeDiv(null, 'helper-taxonomy-level');
                    c.children.forEach((element) => {
                        let child = makeDiv(null, 'helper-taxonomy-entry', element[language]);
                        children.append(child);
                    });
    
                    container.append(ancestry, taxonomy);
                    taxonomy.append(parents, siblings, children);
                    break;
                }

                case 'colorscale': {
                    let container = makeDiv(null, 'helper-color-container');
                    let current = makeDiv(null, 'helper-color-current', c.placeholder[language]);
                    let colorscale = makeDiv(null, 'helper-color-scale');
                    container.append(current, colorscale);

                    for (let [level, value] of Object.entries(params.typesorting)) {
                        let color = makeDiv(null, 'helper-color ' + level);
                        colorscale.append(color);
                        color.addEventListener('mouseenter', () => {
                            addClass(current, level);
                            addClass(current, 'hovering');
                            current.innerHTML = `${value[language]} (${c.level[language]} ${value.level})`;
                        });
                        color.addEventListener('mouseleave', () => {
                            removeClass(current, level);
                            removeClass(current, 'hovering');
                            current.innerHTML = c.placeholder[language];
                        });
                    }

                    let label = makeDiv(null, 'helper-label', c.label[language]);
                    this.content.append(container, label);
                    break;
                }
            }
        });

        wait(10, () => { removeClass(this.content, 'hidden'); });
    }
}

export { Helper }