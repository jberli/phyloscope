import json

from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse

from explorer.models import Vernacular

# Create your views here.

def initialization(request):
    return render(request, 'explorer/index.html', {
            'name': 'Oazo',
            'fullname': 'Oazo',
            'version': 1.0,
        })

@csrf_exempt
def lookup(request):
    q = request.GET.get('term', '')
    print(q)

        # dates = Edges.objects.filter(date__istartswith=q).order_by('date').distinct('date')
    #     results = []
    #     for date in dates:
    #         date_json = {}
    #         # Jquery UI demande une clé 'value'
    #         date_json['value'] = date.date
    #         results.append(date_json)
    #         data = json.dumps(results)
    # else:
    #     data = 'fail'

    return JsonResponse({'alat': 123})