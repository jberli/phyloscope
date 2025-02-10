from django.urls import path
from . import views

urlpatterns = [
    path('', views.initialization),
    path('configuration/', views.configuration),
    path('search/<str:lang>/<str:value>/', views.search),
    path('taxon/<str:lang>/<int:id>/', views.taxon),
    path('range/<int:id>/', views.range),
    path('children/<str:lang>/<int:id>/', views.children),
    path('parents/<str:lang>/<int:id>/', views.parents),
    path('description/<str:lang>/<int:id>/', views.description),
]