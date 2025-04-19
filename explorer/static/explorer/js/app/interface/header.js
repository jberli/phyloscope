/**
 * @header
 * Define the header of the application.
 */

import { addClass, addSVG, hasClass, makeDiv, removeClass, wait } from "../generic/dom.js";
import { calculateTextWidth, pxToRem, remToPx } from "../generic/parsing.js";
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
        
        this.githubcontainer = makeDiv(null, 'header-github-container');
        let githublogo = makeDiv(null, 'header-github-logo');
        addSVG(githublogo, new URL('/static/explorer/img/github.svg', import.meta.url));
        let github = document.createElement('a');
        github.href = 'https://www.github.com/jberli/phyloscope';
        github.setAttribute('target', '_blank');
        github.append(githublogo);
        
        let githubtooltip = makeDiv(null, 'header-github-tooltip', 'GitHub');
        this.githubcontainer.append(github, githubtooltip);

        this.lastupdate = new Date(this.params.database.update);
        this.lastinit = new Date(this.params.database.initialization);
        let locale = this.params.languages.available[language].locale;
        let options = { weekday: "short", year: "numeric", month: "long", day: "numeric" };

        this.updatecontainer = makeDiv(null, 'header-update-container information');
        this.updatesvg = makeDiv(null, 'header-update-vector');
        addSVG(this.updatesvg, new URL('/static/explorer/img/update.svg', import.meta.url));
        this.updatecontainer.append(this.updatesvg);

        this.updatelabels = makeDiv(null, 'header-update-labels');
        this.updatetext = this.params.texts.database.update[language] + ' ' + this.lastupdate.toLocaleDateString(locale, options);
        this.inittext = this.params.texts.database.initialization[language] + ' ' + this.lastinit.toLocaleDateString(locale, options);
        this.update = makeDiv(null, 'header-update-line', this.updatetext);
        this.init = makeDiv(null, 'header-update-line', this.inittext);
        this.updatelabels.append(this.update, this.init);
        this.updatecontainer.append(this.updatelabels);

        let uwidth = pxToRem(calculateTextWidth(this.updatetext, getComputedStyle(this.update), .8));
        let iwidth = pxToRem(calculateTextWidth(this.inittext, getComputedStyle(this.init), .8));
        this.updatewidth = Math.max(uwidth, iwidth) + 3;

        this.updatecontainer.addEventListener('mouseover', (e) => {
            addClass(this.updatecontainer, 'information');
            this.updatecontainer.style.width = this.updatewidth + 'rem';
        });
        this.updatecontainer.addEventListener('mouseout', (e) => {
            removeClass(this.updatecontainer, 'information');
            this.updatecontainer.style.width = '2rem';
        });

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

        this.foldable.append(this.githubcontainer, this.updatecontainer, this.languagescontainer);
    }

    switchLanguage(language) {
        let locale = this.params.languages.available[language].locale;
        let options = { weekday: "short", year: "numeric", month: "long", day: "numeric" };
        this.updatetext = this.params.texts.database.update[language] + ' ' + this.lastupdate.toLocaleDateString(locale, options);
        this.inittext = this.params.texts.database.initialization[language] + ' ' + this.lastinit.toLocaleDateString(locale, options);
        let uwidth = pxToRem(calculateTextWidth(this.updatetext, getComputedStyle(this.update), .8));
        let iwidth = pxToRem(calculateTextWidth(this.inittext, getComputedStyle(this.init), .8));
        this.updatewidth = Math.max(uwidth, iwidth) + 3;

        this.update.innerHTML = this.updatetext;
        this.init.innerHTML = this.inittext;
    }
}

export default Header;