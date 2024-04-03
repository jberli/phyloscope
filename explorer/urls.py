from django.urls import path
from . import views

urlpatterns = [
    path('', views.initialization),
    path('taxonoftheday/', views.taxonoftheday),
    path('lookup/<str:value>/', views.lookup),
    path('taxon/<int:id>/', views.taxon),
    path('children/<int:id>/', views.children),
    path('parent/<int:id>/', views.parent),
]