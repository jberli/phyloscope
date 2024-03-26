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
            let name = obj.vernacular
            html = name + '<br><i>' + obj.scientific + '</i>';
        } else {
            html = '<i>' + obj.scientific + '</i>';
        }
        return makeDiv(id=null, c='taxonomy-entry-label', html=html);
    }

    function retrieveTaxonInfos(taxon, callback) {
        ajaxGet('taxon/' + taxon, function(r) { callback(r); })
    }

    ajaxGet('taxon/2708', function(r) {
        function createTaxonNode(obj) {
            let node = makeDiv(id=null, c='taxonomy-entry');
            let imageDiv = makePicture(obj);
            let labelDiv = makeLabel(obj);
            node.append(imageDiv, labelDiv);
            node.setAttribute('taxon', obj.id);
            return node
        }

        function createTaxonLevel(objects, container) {
            if (objects != null) {
                let typeNode = makeDiv(id=null, c='taxonomy-level-type ' + objects[0].typesorting)
                let typeLabelNode = makeDiv(id=null, c='taxonomy-level-type-label', html=objects[0].type)
                typeNode.appendChild(typeLabelNode);
                container.appendChild(typeNode);
                let entryContainer = makeDiv(id=null, c='taxonomy-entry-container');
                for (let i = 0; i < objects.length; ++i) {
                    let node = createTaxonNode(objects[i], true)
                    entryContainer.append(node);
                }
                container.appendChild(entryContainer);
            }
        }

        let hiddenchildrenContainer = makeDiv(id=null, c='taxonomy-levels collapse');
        let childrenContainer = makeDiv(id=null, c='taxonomy-levels');
        let siblingsContainer = makeDiv(id=null, c='taxonomy-levels');
        let parentContainer = makeDiv(id=null, c='taxonomy-levels');
        let hiddenparentContainer = makeDiv(id=null, c='taxonomy-levels collapse');

        data = r.values;
        createTaxonLevel(data.children, childrenContainer);
        createTaxonLevel(data.siblings, siblingsContainer);
        createTaxonLevel(data.parents, parentContainer);

        childrenContainer.addEventListener("click", function(event) {
            addClass(parentContainer, 'collapse');
            createTaxonLevel(data.children, hiddenchildrenContainer);
            removeClass(hiddenchildrenContainer, 'collapse');
        });
        parentContainer.addEventListener("click", function(event) {
            retrieveTaxonInfos();
            addClass(childrenContainer, 'collapse');
            createTaxonLevel(data.parents, hiddenparentContainer);
            removeClass(hiddenparentContainer, 'collapse');
        });
        
        viewContainer.append(hiddenparentContainer, parentContainer, siblingsContainer, childrenContainer, hiddenchildrenContainer);
        
    })

    panelButtonsContainer.append(panelButtonDescription, panelButtonTaxonomy);
    taxonomyContainer.append(panelButtonsContainer, viewContainer);
    return taxonomyContainer;
}

function updateTaxonomy(params) {

}