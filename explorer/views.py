from django.shortcuts import render
from django.http import JsonResponse, HttpResponse

from explorer.api.configuration import get_configuration
from explorer.api.range import get_range
from explorer.api.search import lookup
from explorer.api.taxonomy import get_taxon, get_children, get_parents

def initialization(request):
    return render(request, 'explorer/index.html', {
            'name': 'phyloscope',
            'fullname': 'phyloscope',
            'version': 1.0,
        })

def configuration(request):
    """
    Returns the configuration file with the showcased taxon.
    """
    config = get_configuration()
    return JsonResponse(config)

def search(request, lang, value, limit=15):
    """
    Autocomplete tool that returns the right results from a given string.
    """
    names = lookup(lang, value, limit)
    return JsonResponse({'values': names})

def taxon(request, lang, id):
    """
    Retrieve taxonomic information from an id.
    """
    result = get_taxon(lang, id)
    return JsonResponse(result)

def range(request, id):
    """
    Retrieve the range of a taxon given its index.
    """
    result = get_range(id)
    return HttpResponse(result)

def parents(request, lang, id):
    """
    Get only the parents of a given taxon id.
    """
    parents = get_parents(lang, id)
    return JsonResponse(parents)

def children(request, lang, id):
    """
    Get only the new children from a given taxon id.
    """
    children = get_children(lang, id)
    return JsonResponse(children)