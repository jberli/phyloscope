/**
 * @header
 * Define the header of the application.
 */

import { addClass, addSVG, makeDiv } from "../generic/dom.js";
import Widget from "./widget.js";

class Header extends Widget {
    constructor(app, parent, params) {
        super(app, parent, params);
        this.container = makeDiv('header', 'sub-panel');
        this.parent.append(this.container);

        this.logo = makeDiv(null, 'header-logo');
        addSVG(this.logo, new URL('/static/explorer/img/logo.svg', import.meta.url));
        this.container.append(this.logo);

        this.foldable = makeDiv(null, 'header-foldable');
        this.container.append(this.foldable);

        let language = this.params.languages.current;
        let lastupdate = new Date(this.params.database.update);
        let lastinit = new Date(this.params.database.initialization);
        let locale = this.params.languages.available[language].locale;

        let options = { weekday: "short", year: "numeric", month: "long", day: "numeric" };
        this.updatecontainer = makeDiv(null, 'header-update-container');
        this.update = makeDiv(null, 'header-update', this.params.texts.database.update[language] + ' ' + lastupdate.toLocaleDateString(locale, options));
        this.init = makeDiv(null, 'header-update', this.params.texts.database.initialization[language] + ' ' + lastinit.toLocaleDateString(locale, options));
        this.updatecontainer.append(this.update, this.init);

        this.languages = makeDiv(null, 'header-languages-container');
        for (let [lang, value] of Object.entries(this.params.languages.available)) {
            let l = makeDiv(null, 'header-language');
            addSVG(l, new URL('/static/explorer/img/languages/' + lang + '.svg', import.meta.url));
            if (lang === language) { addClass(l, 'active') }
            this.languages.append(l);
        }

        this.foldable.append(this.updatecontainer, this.languages);
    }
}

export default Header;