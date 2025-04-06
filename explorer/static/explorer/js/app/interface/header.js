/**
 * @header
 * Define the header of the application.
 */

import { addClass, addSVG, hasClass, makeDiv, removeClass, wait } from "../generic/dom.js";
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
        this.lastupdate = new Date(this.params.database.update);
        this.lastinit = new Date(this.params.database.initialization);
        let locale = this.params.languages.available[language].locale;

        let options = { weekday: "short", year: "numeric", month: "long", day: "numeric" };
        this.updatecontainer = makeDiv(null, 'header-update-container');
        this.update = makeDiv(null, 'header-update', this.params.texts.database.update[language] + ' ' + this.lastupdate.toLocaleDateString(locale, options));
        this.init = makeDiv(null, 'header-update', this.params.texts.database.initialization[language] + ' ' + this.lastinit.toLocaleDateString(locale, options));
        this.updatecontainer.append(this.update, this.init);

        this.languages = []

        this.languagescontainer = makeDiv(null, 'header-languages-container');
        for (let [lang, value] of Object.entries(this.params.languages.available)) {
            let lcont = makeDiv(null, 'header-language');
            let l = makeDiv(null, 'header-language-flag');
            l.setAttribute('value', lang);
            let tooltip = makeDiv(null, 'header-language-tooltip', value.name);
            addSVG(l, new URL('/static/explorer/img/languages/' + lang + '.svg', import.meta.url));
            if (lang === language) { addClass(l, 'active') }
            this.languages.push(l);
            lcont.append(l, tooltip);
            this.languagescontainer.append(lcont);

            l.addEventListener('click', () => {
                if (!hasClass(l, 'active') && !this.freezed) {
                    this.languages.forEach((e) => { removeClass(e, 'active'); });
                    addClass(l, 'active');
                    this.app.updater.switchLanguage(l.getAttribute('value'));
                }
            });
        }

        this.foldable.append(this.updatecontainer, this.languagescontainer);
    }

    switchLanguage(language, callback) {
        callback = callback || function () {};
        let transition = this.app.params.interface.transition;
        addClass(this.updatecontainer, 'hidden');
        wait(transition, () => {
            let locale = this.params.languages.available[language].locale;
            let options = { weekday: "short", year: "numeric", month: "long", day: "numeric" };
            this.update.innerHTML = this.params.texts.database.update[language] + ' ' + this.lastupdate.toLocaleDateString(locale, options);
            this.init.innerHTML = this.params.texts.database.initialization[language] + ' ' + this.lastinit.toLocaleDateString(locale, options);
            removeClass(this.updatecontainer, 'hidden');
            wait(transition, () => {
                callback();
            });
        });
    }
}

export default Header;