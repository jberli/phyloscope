/**
 * @taxonomy
 * Taxonomy related functions.
 */

function constructTaxonomy(params) {
    let taxonomyContainer = makeDiv(id='taxonomy-container');
    let panelButtonsContainer = makeDiv(id=null, c='panel-button-container');
    let panelButtonTaxonomy = makeDiv(id=null, c='panel-button', html='Taxonomie');
    let panelButtonDescription = makeDiv(id=null, c='panel-button', html='Description');
    let viewContainer = makeDiv(id=null, c='taxonomy-view');

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

    function makeLabel(obj) {
        let html;
        if (obj.vernacular != null) {
            let name = uppercaseFirstLetter(obj.vernacular);
            html = name + '<br><i>' + obj.scientific + '</i>';
        } else {
            html = '<i>' + obj.scientific + '</i>';
        }
        return makeDiv(id=null, c='taxonomy-entry-label', html=html);
    }

    ajaxGet('taxon/' + params.current, (r) => {
        data = r.values;

        let grandParentContainer = makeDiv(id='taxonomy-level-grandparent', c='taxonomy-levels height-collapse');
        let grandChildrenContainer = makeDiv(id='taxonomy-level-grandchildren', c='taxonomy-levels height-collapse');

        viewContainer.appendChild(grandParentContainer);
        createParentLevel(data, viewContainer, data.pindex);
        createTaxonLevel(data, viewContainer, data.tindex);
        createChildrenLevel(data, viewContainer);
        viewContainer.appendChild(grandChildrenContainer);
        
        function createTaxonNode(obj, active, collapse) {
            let className = ''
            if (active) { className += ' active' }
            if (collapse) { className += ' collapse' }
            let node = makeDiv(id=null, c='taxonomy-entry' + className);
            let imageDiv = makePicture(obj);
            let labelDiv = makeLabel(obj);
            let mask = makeDiv(id=null, c='taxonomy-entry-mask');
            node.append(mask, imageDiv, labelDiv);
            node.setAttribute('taxon', obj.id);
            return node
        }

        function createParentLevel(data, container, index) {
            let objects = data.parents;
            if (objects != null) {
                let parentContainer = makeDiv(id='taxonomy-level-parents', c='taxonomy-levels');
                let typeNode = makeDiv(id=null, c='taxonomy-level-type ' + objects[0].typesorting)
                let typeLabelNode = makeDiv(id=null, c='taxonomy-level-type-label', html=objects[0].type)
                typeNode.appendChild(typeLabelNode);
                parentContainer.appendChild(typeNode);
                let entryContainer = makeDiv(id=null, c='taxonomy-entry-container');
                let node = createTaxonNode(objects[index], true, false)
                entryContainer.append(node);
                parentContainer.appendChild(entryContainer);
                container.appendChild(parentContainer);
            }
        }

        function createTaxonLevel(data, container, index) {
            let objects = data.siblings;
            if (objects != null) {
                let siblingsContainer = makeDiv(id='taxonomy-level-siblings', c='taxonomy-levels');
                let typeNode = makeDiv(id=null, c='taxonomy-level-type ' + objects[0].typesorting);
                let typeLabelNode = makeDiv(id=null, c='taxonomy-level-type-label', html=objects[0].type)
                typeNode.appendChild(typeLabelNode);
                siblingsContainer.appendChild(typeNode);
                let entryContainer = makeDiv(id=null, c='taxonomy-entry-container');

                let firstClass = '';
                if (index > 0) { firstClass += ' collapse'}
                entryContainer.appendChild(makeDiv(id=null, c='taxonomy-entry' + firstClass));
                for (let i = 0; i < (objects.length); ++i) {
                    let collapse = true;
                    let active = false;
                    if (i == index - 1) { collapse = false }
                    if (i == index) { collapse = false; active = true; }
                    if (i == index + 1) { collapse = false }
                    let node = createTaxonNode(objects[i], active, collapse);
                    node.addEventListener('click', changeSibling);
                    entryContainer.appendChild(node);
                }
                let lastClass = '';
                if (index < objects.length - 1) { lastClass += ' collapse'}
                entryContainer.appendChild(makeDiv(id=null, c='taxonomy-entry' + lastClass));

                siblingsContainer.addEventListener('wheel', changeSibling);
                siblingsContainer.appendChild(entryContainer);
                container.appendChild(siblingsContainer);

                function removeChildrenListeners() {
                    let nodes = entryContainer.children;
                    for (let i = 0; i < (nodes.length); ++i) {
                        nodes[i].removeEventListener('click', changeSibling);
                    }
                }

                function addChildrenListeners() {
                    let nodes = entryContainer.children;
                    for (let i = 0; i < (nodes.length); ++i) {
                        nodes[i].addEventListener('click', changeSibling);
                    }
                }

                function updateChildren(current, previous) {
                    previousType = objects[previous - 1].typesorting;
                    currentType = objects[current - 1].typesorting;
                    if (previousType != currentType) { addClass(typeNode, 'collapse'); }
                    siblingsContainer.removeEventListener('wheel', changeSibling);
                    removeChildrenListeners();
                    let taxon = entryContainer.children[current].getAttribute('taxon');
                    let childrenContainer = viewContainer.querySelector('#taxonomy-level-children');
                    let grandChildrenContainer = viewContainer.querySelector('#taxonomy-level-grandchildren');
                    grandChildrenContainer.remove();
                    ajaxGet('taxon/' + taxon, (r) => {
                        addClass(childrenContainer, 'collapse');
                        wait(100, () => {
                            if (previousType != currentType) { 
                                typeLabelNode.innerHTML = objects[current - 1].type;
                                removeClass(typeNode, 'collapse');
                            }
                            childrenContainer.remove();
                            grandChildrenContainer = makeDiv(id='taxonomy-level-grandchildren', c='taxonomy-levels height-collapse');
                            createChildrenLevel(r.values, viewContainer);
                            viewContainer.appendChild(grandChildrenContainer);
                            siblingsContainer.addEventListener('wheel', changeSibling);
                            addChildrenListeners();
                        })
                    })
                }

                function changeSibling(event) {
                    let displayed = entryContainer.querySelectorAll('.taxonomy-entry:not(.collapse)');
                    let firstindex = Array.prototype.indexOf.call(entryContainer.children, displayed[0]);
                    let currentindex = Array.prototype.indexOf.call(entryContainer.children, displayed[1]);
                    let lastindex = Array.prototype.indexOf.call(entryContainer.children, displayed[displayed.length - 1]);
                    let hide = null; let reveal = null; let current;
                    if (event.deltaY !== undefined) {
                        if (event.deltaY > 0) {
                            if (lastindex < entryContainer.children.length - 1) {
                                hide = firstindex; current = lastindex; reveal = lastindex + 1;
                            }
                        } else {
                            if (firstindex > 0) {
                                hide = lastindex; current = firstindex; reveal = firstindex - 1;
                            }
                        }
                    } else {
                        let targetindex = Array.prototype.indexOf.call(entryContainer.children, event.target.parentNode);
                        if (targetindex !== currentindex) {
                            if (targetindex > currentindex) {
                                hide = firstindex; current = lastindex; reveal = lastindex + 1;
                            } else {
                                hide = lastindex; current = firstindex; reveal = firstindex - 1;
                            }
                        }
                    }
                    if (hide !== null) {
                        addClass(entryContainer.children[hide], 'collapse');
                        addClass(entryContainer.children[current], 'active');
                        removeClass(entryContainer.children[reveal], 'collapse');
                        removeClass(entryContainer.children[currentindex], 'active');
                        updateChildren(current, currentindex);
                    }
                }
            }
        }

        function createChildrenLevel(data, container) {
            let objects = data.children;
            let childrenContainer = makeDiv(id='taxonomy-level-children', c='taxonomy-levels');
            if (objects != null) {
                let typeNode = makeDiv(id=null, c='taxonomy-level-type ' + objects[0].typesorting)
                let typeLabelNode = makeDiv(id=null, c='taxonomy-level-type-label', html=objects[0].type)
                typeNode.appendChild(typeLabelNode);
                childrenContainer.appendChild(typeNode);
                let entryContainer = makeDiv(id=null, c='taxonomy-entry-container');
                entryContainer.appendChild(createTaxonNode(objects[0], false, false));
                if (objects.length > 1) { addChildrenNode(entryContainer, objects[1], false, false); }
                if (objects.length > 2) { addChildrenNode(entryContainer, objects[2], false, false); }
                if (objects.length > 3) { 
                    for (let i = 3; i < (objects.length); ++i) { addChildrenNode(entryContainer, objects[i], false, true); }
                    childrenContainer.addEventListener('wheel', slideChildren);
                }
                childrenContainer.appendChild(entryContainer);

                function addChildrenNode(container, obj, active, collapse) {
                    let node = createTaxonNode(obj, active, collapse)
                    node.addEventListener('click', slideChildren);
                    container.appendChild(node);
                }

                function slideChildren(event) {
                    let displayed = entryContainer.querySelectorAll('.taxonomy-entry:not(.collapse)');
                    let firstindex = Array.prototype.indexOf.call(entryContainer.children, displayed[0]);
                    let lastindex = Array.prototype.indexOf.call(entryContainer.children, displayed[displayed.length - 1]);
                    let targetindex = Array.prototype.indexOf.call(entryContainer.children, event.target.parentNode);
                    let hide = null; let reveal = null;
                    if (event.type === 'wheel') {
                        if (event.deltaY > 0) {
                            if (lastindex < entryContainer.children.length - 1) {
                                hide = firstindex; reveal = lastindex + 1;
                            }
                        } else {
                            if (firstindex > 0) {
                                hide = lastindex; reveal = firstindex - 1;
                            }
                        }
                    }
                    else if (event.type === 'click') {
                        let currentindex = Array.prototype.indexOf.call(entryContainer.children, displayed[1]);
                        if (targetindex !== currentindex) {
                            if (targetindex < entryContainer.children.length - 1) {
                                if (targetindex > currentindex) {
                                    hide = firstindex; reveal = lastindex + 1;
                                } else {
                                    hide = lastindex; reveal = firstindex - 1;
                                }
                            }
                        }
                    }
                    if (hide !== null) {
                        addClass(entryContainer.children[hide], 'collapse');
                        removeClass(entryContainer.children[reveal], 'collapse');
                    }
                }
            }
            container.appendChild(childrenContainer)
        }       
    })

    panelButtonsContainer.append(panelButtonDescription, panelButtonTaxonomy);
    taxonomyContainer.append(panelButtonsContainer, viewContainer);
    return taxonomyContainer;
}

function updateTaxonomy(params) {

}

function retrieveTaxonInfos(taxon, callback) {
    ajaxGet('taxon/' + taxon, function(r) { callback(r); })
}