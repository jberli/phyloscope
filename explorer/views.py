from django.shortcuts import render
from django.http import JsonResponse

from explorer.models import Names, Taxon
from explorer.setup import APP_CONFIGURATION
from explorer.management.database.tools.database import get_random_model
from explorer.management.database.tools.database import RANKS

def initialization(request):
    return render(request, 'explorer/index.html', {
            'name': 'Oazo',
            'fullname': 'Oazo',
            'version': 1.0,
        })

def configuration(request):
    return JsonResponse(APP_CONFIGURATION)

def lookup(request, value):
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
            miniature = e.default_photo
            link = None
            if miniature is not None:
                link = 'https://inaturalist-open-data.s3.amazonaws.com/photos/{0}/square.{1}'.format(miniature.pid, miniature.extension)
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

def taxon(request, id=None):
    """
    Retrieve taxon informations.
    """
    result = { 'values': {} }

    taxon = Taxon.objects.get(tid=id)
    parent = taxon.parent
    ancestry = []
    
    if parent is not None:
        ancestry.append(get_taxon_info(parent))
        siblings = parent.children
        grandparent = parent.parent
        if grandparent is not None:
            ancestry.insert(0, get_taxon_info(grandparent))
            parentsiblings = grandparent.children.filter(rank=parent.rank)
            result['values']['pindex'] = (*parentsiblings.all(),).index(parent)
            result['values']['parents'] = [ get_taxon_info(sibling) for sibling in parentsiblings.all() ]
            elder = grandparent.parent
            while elder is not None:
                ancestry.insert(0, get_taxon_info(elder))
                elder = elder.parent
        else:
            result['values']['parents'] = [ get_taxon_info(parent) ]
            result['values']['pindex'] = 0

        siblingslist = [ get_taxon_info(sibling) for sibling in siblings.all() ]
        result['values']['siblings'] = sorted(siblingslist, key=lambda k: k['level'], reverse=True)
        result['values']['tindex'] = 0
        for i, s in enumerate(result['values']['siblings']):
            if s['id'] == taxon.tid:
                result['values']['tindex'] = i 
    else:
        result['values']['parents'] = None
        result['values']['pindex'] = None
        result['values']['siblings'] = [ get_taxon_info(taxon) ]
        result['values']['tindex'] = 0
    
    result['values']['ancestry'] = ancestry
    children = taxon.children.all()

    if len(children) > 0:
        childrenlist = [ get_taxon_info(child) for child in children.all() ]
        result['values']['children'] = sorted(childrenlist, key=lambda k: k['level'], reverse=True)
    else:
        result['values']['children'] = None
    
    return JsonResponse(result)

def children(request, id=None):
    """
    Get only the new children from a given taxon id.
    """
    result = { 'values': {} }
    taxon = Taxon.objects.get(tid=id)
    children = taxon.children.all()
    if len(children) > 0:
        childrenlist = [ get_taxon_info(child) for child in children.all() ]
        result['values']['children'] = sorted(childrenlist, key=lambda k: k['level'], reverse=True)
    else:
        result['values']['children'] = None
    return JsonResponse(result)

def parent(request, id=None):
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
            parents = [ get_taxon_info(sibling) for sibling in parentsiblings.all() ]
            result['values']['parents'] = sorted(parents, key=lambda k: k['level'], reverse=True)
            for i, s in enumerate(result['values']['parents']):
                if s['id'] == parent.tid:
                    result['values']['pindex'] = i
        else:
            result['values']['parents'] = [ get_taxon_info(parent) ]
            result['values']['pindex'] = 0
    else:
        result['values']['parents'] = None

    return JsonResponse(result)

def get_taxon_info(obj):
    """
    Construct a taxon dict from the given taxon object.
    """
    if obj is None:
        return None
    else:
        v = obj.vernacular.all().filter(language='fr')           
        vernacular = v[0].name if v else None
        miniature = obj.default_photo
        link = None
        if miniature is not None:
            link = 'https://inaturalist-open-data.s3.amazonaws.com/photos/{0}/medium.{1}'.format(miniature.pid, miniature.extension)
        parent = True
        if obj.parent is None:
            parent = False
        return {
            'id': obj.tid,
            'scientific': obj.name,
            'vernacular': vernacular,
            'parent': parent,
            'type': RANKS[obj.rank]['fr'],
            'typesorting': obj.rank,
            'level': obj.level,
            'picture': link,
            'count': obj.count_species,
            'percentage': obj.percentage_parent,
        }