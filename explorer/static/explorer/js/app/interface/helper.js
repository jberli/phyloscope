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
}

class CartographyHelper extends Helper {
    constructor(widget, parent, type) {
        super(widget, parent, type);
    }

    generate() {
        let params = this.widget.app.params
        let help = params.texts.help.cartography;
        let language = params.languages.current;

        this.content = makeDiv(null, 'helper-content no-scrollbar hidden');
        this.container.append(this.content);

        let tt = makeDiv(null, 'helper-title', help.tutorial.title[language]);
        this.content.append(tt);

        let tcontainer = makeDiv(null, 'helper-buttons');
        this.content.append(tcontainer);

        let bcontainer = makeDiv(null, 'helper-button-container');
        let bbutton = makeDiv(null, 'helper-button-basemap helper-button', params.interface.cartography.baselayers[0].name[language]);
        let blabel = makeDiv(null, 'helper-button-label', help.tutorial.content.basemap[language]);
        bcontainer.append(bbutton, blabel);
        tcontainer.append(bcontainer);

        let rcontainer = makeDiv(null, 'helper-button-container');
        let activateButton = makeDiv(null, 'helper-button-display-container active');
        let activateButtonSlider = makeDiv(null, 'helper-button-display-slider');
        activateButton.append(activateButtonSlider);
        let rlabel = makeDiv(null, 'helper-button-label', help.tutorial.content.range[language]);
        rcontainer.append(activateButton, rlabel);
        tcontainer.append(rcontainer);

        let ccontainer = makeDiv(null, 'helper-button-container');
        let centerButton = makeDiv(null, 'helper-button-center');
        addSVG(centerButton, new URL('/static/explorer/img/center.svg', import.meta.url));
        let clabel = makeDiv(null, 'helper-button-label', help.tutorial.content.center[language]);
        ccontainer.append(centerButton, clabel);
        tcontainer.append(ccontainer);

        let st = makeDiv(null, 'helper-title', help.source.title[language]);
        this.content.append(st);

        help.source.content.forEach((s) => {
            if (s.type === 'ul' || s.type === 'ol') {
                let c = makeDiv(null, 'helper-list-container helper-element');
                let e = makeDiv(null, 'helper-list-text')
                e.innerHTML = s.text[language];
                let u = document.createElement(s.type);
                u.setAttribute('class', 'helper-list');
                s.content.forEach((l) => {
                    let li = document.createElement('li');
                    li.setAttribute('class', 'helper-list-element');
                    li.innerHTML = l[language];
                    u.append(li);
                });
                c.append(e, u);
                this.content.append(c);
            }
        });

        wait(10, () => { removeClass(this.content, 'hidden'); });
    }
}

class TaxonomyHelper extends Helper {
    constructor(widget, parent, type) {
        super(widget, parent, type);
    }
}

class StatisticsHelper extends Helper {
    constructor(widget, parent, type) {
        super(widget, parent, type);
    }
}

export { CartographyHelper, TaxonomyHelper, StatisticsHelper }