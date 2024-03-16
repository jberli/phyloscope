from django.shortcuts import render

# Create your views here.

def initialization(request):
    return render(request, 'explorer/index.html', {
            'name': 'explorer',
            'fullname': 'explorer',
            'version': 1.0,
        })