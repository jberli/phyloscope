from django.urls import path
from . import views

urlpatterns = [
    path('', views.initialization),
    path('lookup/<str:value>/', views.lookup),
    path('taxon/<int:id>/', views.taxon)
]