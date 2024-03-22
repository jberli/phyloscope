import json
import random

from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse

from explorer.models import Names, Photo
from explorer.database.tools.database import TABLE_NAMES

# Create your views here.

def initialization(request):
    return render(request, 'explorer/index.html', {
            'name': 'Oazo',
            'fullname': 'Oazo',
            'version': 1.0,
        })

@csrf_exempt
def lookup(request, language='fr', limit=10):
    """
    Autocomplete tool that returns the right results
    from a given string.
    """
    # Add entries until limit is reached
    def add_entries(result, taxons, entries):
        # Loop through provided entries
        for e in entries:
            t = e.taxon
            # Check if taxon has not been entered already
            if t not in taxons:
                pictures = Photo.objects.filter(observation__taxon__taxon=t)
                count = pictures.count()
                link = None
                if count > 0:
                    link = pictures[random.randint(0, count - 1)].link
                # Add the entry
                result['values'].append({
                    'taxon': t,
                    'vernacular': e.name.lower(),
                    'scientific': e.content_object.name,
                    'type': TABLE_NAMES[e.content_type.name]['fr'],
                    'typesorting': e.content_type.name,
                    'picture': link
                })
                # Add the taxon as being added
                taxons.append(e.taxon)
                # Break the loop if limit is reached
                if len(result['values']) > (limit - 1):
                    break
        return result, taxons

    # Check the method is Post
    if request.method == 'POST':
        # Retrieve the wanted string
        value = json.load(request)['str']

        # Get the vernacular names starting with the value in priority
        startwith = Names.objects.filter(language=language, name__istartswith=value).order_by('name')

        # Define the result dict
        result = { 'values': [] }
        # Storage to avoid same taxon
        taxons = []
        # Add entries
        result, taxons = add_entries(result, taxons, startwith)

        # If the length of the result is below 10
        if len(result) < limit:
            # Look for entries containing the provided string
            contains = Names.objects.filter(language='fr', name__icontains=value).order_by('name')
            # Add these entries
            result, taxons = add_entries(result, taxons, contains)

    # Map the table names to a dict ordered
    map = { v: i for i, v in enumerate(TABLE_NAMES.keys()) }

    # Order the returned list of entries by their scientific names (common genus will be kept in order)
    result['values'] = sorted(result['values'], key=lambda d: d['scientific'])
    # Order the returned list of entries by their taxonomy
    result['values'] = sorted(result['values'], key=lambda d: map[d['typesorting']])
    # Return the JSON
    return JsonResponse(result)