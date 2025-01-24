import requests
import yaml
import xml.dom.minidom
import wikipediaapi as wiki

from django.shortcuts import render
from django.http import JsonResponse, HttpResponse

from explorer.models import Names, Taxon, Photo, Current
from explorer.api.tools.models import get_random_model
from explorer.api.tools.information import RANKS

def initialization(request):
    return render(request, 'explorer/index.html', {
            'name': 'phylopedia',
            'fullname': 'Phylopedia',
            'version': 1.0,
        })

def configuration(request):
    configuration = yaml.safe_load(open('explorer/static/explorer/conf/configuration.yaml', 'r'))
    current = Current.objects.all()[0].taxon
    configuration['taxon'] = get_taxon_info(current, configuration['languages']['current'])
    return JsonResponse(configuration)

def lookup(request, lang, value):
    """
    Autocomplete tool that returns the right results
    from a given string.
    """
    language = 'fr'
    limit = 15

    # Add entries until limit is reached
    def add_entries(names, taxons, e, vernacular=None):
        # Check if taxon has not been entered already
        if e.tid not in taxons:
            miniature = Photo.objects.filter(taxon_id=e, default=True)
            # e.default_photo
            link = None
            if len(miniature) > 0:
                link = 'https://inaturalist-open-data.s3.amazonaws.com/photos/{0}/square.{1}'.format(miniature[0].pid, miniature[0].extension)
            if vernacular is None:
                vernaculars = Names.objects.filter(language=language, taxon=e)
                if len(vernaculars) > 0:
                    vernacular = vernaculars[0].name
            else:
                vernacular = vernacular.lower()
            # Add the entry
            names.append({
                'taxon': e.tid,
                'vernacular': vernacular,
                'scientific': e.name,
                'type': RANKS[e.rank]['fr'],
                'typesorting': e.rank,
                'picture': link
            })
            # Add the taxon as being added
            taxons.append(e.tid)
        return names, taxons

    # Add scientific names
    def add_scientific(names, taxons, entries):
        # Loop through provided entries
        for e in entries:
            names, taxons = add_entries(names, taxons, e)
            # Break the loop if limit is reached
            if len(names) > (limit - 1):
                break
        return names, taxons


    # Add entries until limit is reached
    def add_vernacular(names, taxons, entries):
        # Loop through provided entries
        for e in entries:
            names, taxons = add_entries(names, taxons, e.taxon, e.name)
            # Break the loop if limit is reached
            if len(names) > (limit - 1):
                break
        return names, taxons

    # Get the vernacular names starting with the value in priority
    startwith = Names.objects.filter(language=language, name__istartswith=value)[:limit]

    # Define the result dict
    names = []
    # Storage to avoid same taxon
    taxons = []
    # Add entries
    names, taxons = add_vernacular(names, taxons, startwith)

    # If the length of the result is below the limit
    if len(names) < limit:
        # Get the scientific names starting with the value in priority
        scientific_startwith = Taxon.objects.filter(name__istartswith=value)[:limit]
        # Add these entries
        names, taxons = add_scientific(names, taxons, scientific_startwith)

    # If the length of the result is below the limit
    if len(names) < limit:
        # Look for entries containing the provided string
        contains = Names.objects.filter(language=language, name__icontains=value)[:limit - len(names)]
        # Add these entries
        names, taxons = add_vernacular(names, taxons, contains)

     # If the length of the result is below the limit
    if len(names) < limit:
        # Get the scientific names containing the provided string
        scientific_contains = Taxon.objects.filter(name__icontains=value)[:limit - len(names)]
        # Add these entries
        names, taxons = add_scientific(names, taxons, scientific_contains)

    # Map the table names to a dict ordered
    map = { v: i for i, v in enumerate(RANKS.keys()) }

    # Order the returned list of entries by their scientific names (common genus will be kept in order)
    names = sorted(names, key=lambda d: d['scientific'])
    # Order the returned list of entries by their taxonomy
    names = sorted(names, key=lambda d: map[d['typesorting']])

    # Return the JSON
    return JsonResponse({ 'values': names })

def taxon(request, lang, id):
    """
    Retrieve taxon informations.
    """
    result = { 'taxonomy': {} }

    taxon = Taxon.objects.get(tid=id)
    parent = taxon.parent
    ancestry = []
    
    if parent is not None:
        ancestry.append(get_taxon_info(parent, lang))
        siblings = parent.children
        grandparent = parent.parent
        if grandparent is not None:
            ancestry.insert(0, get_taxon_info(grandparent, lang))
            parentsiblings = grandparent.children.filter(rank=parent.rank)
            result['taxonomy']['pindex'] = (*parentsiblings.all(),).index(parent)
            result['taxonomy']['parents'] = [ get_taxon_info(sibling, lang) for sibling in parentsiblings.all() ]
            elder = grandparent.parent
            while elder is not None:
                ancestry.insert(0, get_taxon_info(elder, lang))
                elder = elder.parent
        else:
            result['taxonomy']['parents'] = [ get_taxon_info(parent, lang) ]
            result['taxonomy']['pindex'] = 0

        siblingslist = [ get_taxon_info(sibling, lang) for sibling in siblings.all() ]
        result['taxonomy']['siblings'] = sorted(siblingslist, key=lambda k: k['level'], reverse=True)
        result['taxonomy']['tindex'] = 0
        for i, s in enumerate(result['taxonomy']['siblings']):
            if s['id'] == taxon.tid:
                result['taxonomy']['tindex'] = i 
    else:
        result['taxonomy']['parents'] = None
        result['taxonomy']['pindex'] = None
        result['taxonomy']['siblings'] = [ get_taxon_info(taxon, lang) ]
        result['taxonomy']['tindex'] = 0
    
    result['taxonomy']['ancestry'] = ancestry
    children = taxon.children.all()

    if len(children) > 0:
        childrenlist = [ get_taxon_info(child, lang) for child in children.all() ]
        result['taxonomy']['children'] = sorted(childrenlist, key=lambda k: k['level'], reverse=True)
    else:
        result['taxonomy']['children'] = None


    name = taxon.wikipedia.split('/')[-1].replace(" ", "_")
    if len(name) == 0:
        name = taxon.name

    wikipedia = wiki.Wikipedia(user_agent='phylopedia.org', language='en')
    page = wikipedia.page(name)

    if page.exists():
        result['description'] = {
            'title': page.title,
            'summary': page.summary,
        }
    else:
        result['description'] = None
    
    return JsonResponse(result)

def children(request, lang, id):
    """
    Get only the new children from a given taxon id.
    """
    result = { 'values': {} }
    taxon = Taxon.objects.get(tid=id)
    children = taxon.children.all()
    if len(children) > 0:
        childrenlist = [ get_taxon_info(child, lang) for child in children.all() ]
        result['values']['children'] = sorted(childrenlist, key=lambda k: k['level'], reverse=True)
    else:
        result['values']['children'] = None
    return JsonResponse(result)

def parent(request, lang, id):
    """
    Get only the parents of a given taxon id.
    """
    result = { 'values': {} }
    taxon = Taxon.objects.get(tid=id)
    parent = taxon.parent
    if parent is not None:
        grandparent = parent.parent
        if grandparent is not None:
            parentsiblings = grandparent.children
            parents = [ get_taxon_info(sibling, lang) for sibling in parentsiblings.all() ]
            result['values']['parents'] = sorted(parents, key=lambda k: k['level'], reverse=True)
            for i, s in enumerate(result['values']['parents']):
                if s['id'] == parent.tid:
                    result['values']['pindex'] = i
        else:
            result['values']['parents'] = [ get_taxon_info(parent, lang) ]
            result['values']['pindex'] = 0
    else:
        result['values']['parents'] = None

    return JsonResponse(result)

def range(request, id):
    """
    Get the taxon range.
    """
    if id is not None:
        rangeurl = f'https://www.inaturalist.org/taxa/{id}/range.kml'
        response = requests.get(rangeurl).content
        try:
            xml.dom.minidom.parseString(response)
            taxonrange = response
        except:
            taxonrange = ''
        finally:
            return HttpResponse(taxonrange)

def description(request, lang, id):
    """
    Get the wikipedia description.
    """
    if id is not None:
        taxon = Taxon.objects.get(tid=id)
        name = taxon.wikipedia.split('/')[-1].replace(" ", "_")

        if len(name) == 0:
            name = taxon.name

        wikipedia = wiki.Wikipedia(user_agent='phylopedia.org', language='en')
        page = wikipedia.page(name)

        if page.exists():
            result = {
                'title': page.title,
                'summary': page.summary,
            }
            return JsonResponse(result)
        else:
            return HttpResponse('')


def get_taxon_info(obj, lang):
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