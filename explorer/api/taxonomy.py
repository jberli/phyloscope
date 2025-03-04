import wikipediaapi as wiki

from explorer.models import Taxon, Photo
from explorer.api.tools.information import RANKS

def get_taxon_information(obj, lang):
    """
    Construct a taxon dict from the given taxon object.
    """
    if obj is None:
        return None
    else:
        vern = obj.vernacular.all().filter(language=lang)
        vernaculars = [ v.name for v in vern ] if vern else []
        photographs = Photo.objects.filter(taxon_id=obj)

        photos = []
        if len(photographs) > 0:
            for p in photographs:
                default = True if p.default else False
                extension = p.extension
                if extension is not None:
                    if len(extension) > 0:
                        photo = { "id": p.pid, "default": default, "extension": extension }
                        if default:
                            photos.insert(0, photo)
                        else:
                            photos.append(photo)
        parent = True
        if obj.parent is None:
            parent = False

        return {
            'id': obj.tid,
            'scientific': obj.name,
            'vernaculars': vernaculars,
            'parent': parent,
            'type': RANKS[obj.rank][lang],
            'typesorting': obj.rank,
            'level': obj.level,
            'count': obj.count_species,
            'percentage': obj.percentage_parent,
            'photographs': photos
        }

def get_taxon_description(language, taxon):
    """
    Retrieve the description from Wikipedia.
    """
    name = taxon.wikipedia.split('/')[-1].replace(" ", "_")
    if len(name) == 0:
        name = taxon.name

    wikipedia = wiki.Wikipedia(user_agent='phyloscope.org', language='en')
    page = wikipedia.page(name)

    if language != 'en':
        found = False
        langlinks = page.langlinks
        for k in sorted(langlinks.keys()):
            if k == language:
                page = langlinks[k]
                found = True
        if not found:
            return None

    if page.exists():
        return {
            'title': page.title,
            'summary': page.summary,
            'url': page.fullurl
        }
    else:
        return None

def get_taxon(language, index):
    """
    Retrieve taxonomic information on the taxon.
    """
    result = {}
    taxon = Taxon.objects.get(tid=index)
    parent = taxon.parent
    ancestry = []
    
    if parent is not None:
        ancestry.append(get_taxon_information(parent, language))
        siblings = parent.children
        grandparent = parent.parent
        if grandparent is not None:
            ancestry.insert(0, get_taxon_information(grandparent, language))
            parentsiblings = grandparent.children.filter(rank=parent.rank)
            result['pindex'] = (*parentsiblings.all(),).index(parent)
            result['parents'] = [ get_taxon_information(sibling, language) for sibling in parentsiblings.all() ]
            elder = grandparent.parent
            while elder is not None:
                ancestry.insert(0, get_taxon_information(elder, language))
                elder = elder.parent
        else:
            result['parents'] = [ get_taxon_information(parent, language) ]
            result['pindex'] = 0

        siblingslist = [ get_taxon_information(sibling, language) for sibling in siblings.all() ]
        result['siblings'] = sorted(siblingslist, key=lambda k: k['level'], reverse=True)
        result['tindex'] = 0
        for i, s in enumerate(result['siblings']):
            if s['id'] == taxon.tid:
                result['tindex'] = i 
    else:
        result['parents'] = None
        result['pindex'] = None
        result['siblings'] = [ get_taxon_information(taxon, language) ]
        result['tindex'] = 0
    
    result['ancestry'] = ancestry
    children = taxon.children.all()

    if len(children) > 0:
        childrenlist = [ get_taxon_information(child, language) for child in children.all() ]
        result['children'] = sorted(childrenlist, key=lambda k: k['level'], reverse=True)
        result['cindex'] = 0
    else:
        result['children'] = None
        result['cindex'] = None

    result['description'] = get_taxon_description(language, taxon)

    return result

def get_parents(language, index):
    """
    Get the parents from a given taxon index.
    """
    result = {}
    taxon = Taxon.objects.get(tid=index)
    parent = taxon.parent
    if parent is not None:
        grandparent = parent.parent
        if grandparent is not None:
            parentsiblings = grandparent.children
            parents = [ get_taxon_information(sibling, language) for sibling in parentsiblings.all() ]
            result['parents'] = sorted(parents, key=lambda k: k['level'], reverse=True)
            for i, s in enumerate(result['parents']):
                if s['id'] == parent.tid:
                    result['pindex'] = i
        else:
            result['parents'] = [ get_taxon_information(parent, language) ]
            result['pindex'] = 0
    else:
        result['parents'] = None
        result['pindex'] = None
    return result

def get_children(language, index):
    """
    Get the children from a given taxon index.
    """
    result = {}
    taxon = Taxon.objects.get(tid=index)
    children = taxon.children.all()
    if len(children) > 0:
        childrenlist = [ get_taxon_information(child, language) for child in children.all() ]
        result['children'] = sorted(childrenlist, key=lambda k: k['level'], reverse=True)
    else:
        result['children'] = None
    return result

def get_description(language, index):
    """
    Get the wikipedia description from a given taxon index.
    """
    result = {}
    taxon = Taxon.objects.get(tid=index)
    if taxon is not None:
        result['values'] = get_taxon_description(language, taxon)
    else:
        result['values'] = None
    return result