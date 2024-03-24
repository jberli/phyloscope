import json

from django.shortcuts import render
from django.http import JsonResponse

from explorer.models import Names, Taxon
from explorer.database.tools.database import RANKS

# Create your views here.

def initialization(request):
    return render(request, 'explorer/index.html', {
            'name': 'Oazo',
            'fullname': 'Oazo',
            'version': 1.0,
        })

def lookup(request, value):
    """
    Autocomplete tool that returns the right results
    from a given string.
    """
    language = 'fr'
    limit = 15

    # Add entries until limit is reached
    def add_entries(result, taxons, entries):
        # Loop through provided entries
        for e in entries:
            # Check if taxon has not been entered already
            if e.taxon.tid not in taxons:
                miniature = e.taxon.default_photo
                link = None
                if miniature is not None:
                    link = 'https://inaturalist-open-data.s3.amazonaws.com/photos/{0}/square.{1}'.format(miniature.pid, miniature.extension)
                # Add the entry
                result['values'].append({
                    'taxon': e.taxon.tid,
                    'vernacular': e.name.lower(),
                    'scientific': e.taxon.name,
                    'type': RANKS[e.taxon.rank]['fr'],
                    'typesorting': e.taxon.rank,
                    'picture': link
                })
                # Add the taxon as being added
                taxons.append(e.taxon.tid)
                # Break the loop if limit is reached
                if len(result['values']) > (limit - 1):
                    break
        return result, taxons

    # Get the vernacular names starting with the value in priority
    startwith = Names.objects.filter(language=language, name__istartswith=value)[:limit]

    # Define the result dict
    result = { 'values': [] }
    # Storage to avoid same taxon
    taxons = []
    # Add entries
    result, taxons = add_entries(result, taxons, startwith)

    # If the length of the result is below the limit
    if len(result) < limit:
        # Look for entries containing the provided string
        contains = Names.objects.filter(language=language, name__icontains=value)[:limit - len(result)]
        # Add these entries
        result, taxons = add_entries(result, taxons, contains)

    # Map the table names to a dict ordered
    map = { v: i for i, v in enumerate(RANKS.keys()) }

    # Order the returned list of entries by their scientific names (common genus will be kept in order)
    result['values'] = sorted(result['values'], key=lambda d: d['scientific'])
    # Order the returned list of entries by their taxonomy
    result['values'] = sorted(result['values'], key=lambda d: map[d['typesorting']])

    # Return the JSON
    return JsonResponse(result)

def taxon(request, id=None):
    """
    Retrieve taxon informations.
    """
    def get_info(obj):
        if obj is None:
            return None
        else:
            v = obj.vernacular.all().filter(language='fr')           
            vernacular = v[0].name if v else None
            miniature = obj.default_photo
            link = None
            if miniature is not None:
                link = 'https://inaturalist-open-data.s3.amazonaws.com/photos/{0}/medium.{1}'.format(miniature.pid, miniature.extension)
            return {
                'id': obj.tid,
                'scientific': obj.name,
                'vernacular': vernacular,
                'type': RANKS[obj.rank]['fr'],
                'typesorting': obj.rank,
                'level': obj.level,
                'picture': link
            }

    result = { 'values': {} }

    taxon = Taxon.objects.get(tid=id)
    parent = taxon.parent
    siblings = parent.children.filter(rank=taxon.rank).exclude(tid=id)
    grandparent = parent.parent
    parentsiblings = grandparent.children.filter(rank=parent.rank).exclude(tid=parent.tid)
    children = taxon.children.all()

    if len(siblings) > 0:
        result['values']['siblings'] = [ get_info(taxon) ] + [ get_info(sibling) for sibling in siblings ]
    else:
        result['values']['siblings'] = [ get_info(taxon) ]

    if len(parentsiblings) > 0:
        result['values']['parents'] = [ get_info(parent) ] + [ get_info(sibling) for sibling in parentsiblings ]
    else:
        result['values']['parents'] = [ get_info(parent) ]

    if len(children) > 0:
        result['values']['children'] = [ get_info(child) for child in children ]
    else:
        result['values']['children'] = None
    
    result['values']['grandparent'] = [ get_info(grandparent) ]
    
    return JsonResponse(result)