from django.urls import path
from . import views

urlpatterns = [
    path('', views.initialization),
    path('configuration/', views.configuration),
    path('search/<str:lang>/<str:value>/', views.search),
    path('taxon/<str:lang>/<int:id>/', views.taxon),
    path('children/<str:lang>/<int:id>/', views.children),
    path('parent/<str:lang>/<int:id>/', views.parent),
    path('range/<int:id>/', views.range),
]