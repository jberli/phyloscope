import json

from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse

from explorer.models import Vernacular
from explorer.database.tools.database import TABLE_NAMES

# Create your views here.

def initialization(request):
    return render(request, 'explorer/index.html', {
            'name': 'Oazo',
            'fullname': 'Oazo',
            'version': 1.0,
        })

@csrf_exempt
def lookup(request):
    if request.method == 'POST':
        value = json.load(request)['str']
        vernaculars = Vernacular.objects.filter(language='fr', name__istartswith=value).order_by('name')
        result = { 'values': [] }
        for v in vernaculars:
            r = { 'vernacular': v.name.lower(), 'scientific': v.content_object.name, 'type': TABLE_NAMES[v.content_type.name]['fr'] }
            if r not in result['values']:
                result['values'].append(r)
                if len(result['values']) > 9:
                    break
    return JsonResponse(result)