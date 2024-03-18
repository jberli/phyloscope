/**
 * @initialization
 * Defines the initialization of the application.
 */

window.addEventListener('DOMContentLoaded', function() {
    let header = makeDiv(id='header');
    document.body.appendChild(header);

    let container = makeDiv(id='container');
    let mapdiv = makeDiv(id='map');
    container.appendChild(mapdiv);
    document.body.appendChild(container);

    initializeMap(mapdiv);

    let modulelookup = makeDiv(id='module-lookup', c='header-module');
    let lookupcontainer = makeDiv(id=null, c='lookup-container');
    let results = makeDiv(id=null, c='lookup-result-container');
    let lookup = makeInput(id=null, c='lookup-input');

    lookup.addEventListener("focusin", focusIn);

    function focusIn(event) {
        lookup.addEventListener("input", input);
        lookup.addEventListener("focusout", focusOut);
        getVernacular(event);
    }

    function focusOut(event) {
        lookup.removeEventListener("input", input);
        removeChildren(results);
    }

    function input(event) {
        getVernacular(event);
    }

    function loadingImage(image) {
        return new Promise(resolve=>{image.onload = resolve})
    }

    function getVernacular(event) {
        function addGroup(group, type, typesort) {
            let sorting = makeDiv(id=null, 'lookup-result-sorting');
            let taxonomy = makeDiv(id=null, 'lookup-taxonomy-level ' + typesort, uppercaseFirstLetter(type));
            appendMultiple(sorting, group);
            results.append(taxonomy);
            results.append(sorting);
        }

        let value = event.target.innerHTML.replace('<br>', '').trim();
        if (value.length > 2) {
            let data = { str: value };
            ajax(data, 'lookup/', 'POST', function(r) {
                removeChildren(results);
                let length = r.values.length;
                let previousType;
                let previousTypeSort;
                let group = [];
                for (let i = 0; i < length; ++i) {
                    let entry = r.values[i];
                    let name = entry.vernacular
                    let vernacular = boldSubstring(name, data.str);
                    let html = vernacular + '<br><i>' + entry.scientific + '</i>';
                    let typesort = entry.typesorting;
                    let type = entry.type;

                    if (typesort != previousTypeSort && group.length > 0) {
                        addGroup(group, previousType, previousTypeSort);
                        group = [];
                    }

                    let label = makeDiv(id=null, c='lookup-label', html=html);
                    let imageDiv = makeDiv(id=null, c='lookup-image-container');
                    if (entry.picture !== null) {
                        let imageMask = makeDiv(id=null, c='lookup-image-mask ' + typesort);
                        let loader = makeDiv(id=null, c='loader-image');
                        let image = makeImage(entry.picture, null, null, id=null, c='lookup-image');
                        loadingImage(image).then(() => { addClass(imageMask, 'loaded') });
                        imageMask.appendChild(loader);
                        imageDiv.append(imageMask, image);
                    }
                    
                    let result = makeDiv(id=null, c='lookup-result ' + typesort);
                    result.append(imageDiv, label);

                    group.push(result);
                    previousTypeSort = typesort;
                    previousType = type;
                }
                addGroup(group, previousType, previousTypeSort);
            });
        } else {
            removeChildren(results);
        }
    }

    lookupcontainer.append(lookup, results);
    modulelookup.appendChild(lookupcontainer);
    header.appendChild(modulelookup);
});