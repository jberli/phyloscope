/**
 * @taxonomy
 * Taxonomy related functions.
 */

function constructTaxonomy(params) {
    let taxonomyContainer = makeDiv(id='taxonomy-container');
    let viewContainer = makeDiv(id=null, c='taxonomy-view');

    ajaxGet('taxon/42044', function(r) {
        function createTaxonNode(obj, active) {
            let node = makeDiv(id=null, c='taxonomy-entry');
            let imageDiv = makeDiv(id=null, c='taxonomy-image-container');
            if (obj.picture !== null) {
                let imageMask = makeDiv(id=null, c='photo-mask');
                let loader = makeDiv(id=null, c='photo-loader');
                let image = makeImage(obj.picture, null, null, id=null, c='photo');
                loadingImage(image).then(() => { addClass(imageMask, 'loaded') });
                imageMask.appendChild(loader);
                imageDiv.append(imageMask, image);
            }
            let html;
            if (obj.vernacular != null) {
                let name = obj.vernacular
                html = name + '<br><i>' + obj.scientific + '</i>';
            } else {
                html = '<i>' + obj.scientific + '</i>';
            }
            let label = makeDiv(id=null, c='taxonomy-entry-label', html=html)
            node.append(imageDiv, label);
            return node
        }
        function createTaxonLevel(objects, container) {
            if (objects != null) {
                let typeNode = makeDiv(id=null, c='taxonomy-level-type ' + objects[0].typesorting)
                let typeLabelNode = makeDiv(id=null, c='taxonomy-level-type-label', html=objects[0].type)
                typeNode.appendChild(typeLabelNode);
                container.appendChild(typeNode);
                let entryContainer = makeDiv(id=null, c='taxonomy-entry-container');
                
                // for (let i = 0; i < objects.length; ++i) {
                //     let active = false;
                //     if (i == taxonIndex) {
                //         active = true;
                //     }
                    
                // }
                let node = createTaxonNode(objects[0], true)
                entryContainer.append(node);
                container.appendChild(entryContainer);
            }  
        }

        let childrenContainer = makeDiv(id=null, c='taxonomy-levels taxonomy-level-upper');
        let siblingsContainer = makeDiv(id=null, c='taxonomy-levels taxonomy-level-current');
        let parentContainer = makeDiv(id=null, c='taxonomy-levels taxonomy-level-lower');
        let granndParentContainer = makeDiv(id=null, c='taxonomy-levels taxonomy-level-lower');

        data = r.values;
        createTaxonLevel(data.children, childrenContainer);
        createTaxonLevel(data.siblings, siblingsContainer);
        createTaxonLevel(data.parents, parentContainer);
        createTaxonLevel(data.grandparent, granndParentContainer);
        
        viewContainer.append(childrenContainer, siblingsContainer, parentContainer, granndParentContainer);
        
    })

    taxonomyContainer.append(viewContainer);
    return taxonomyContainer;
}

function updateTaxonomy(params) {

}