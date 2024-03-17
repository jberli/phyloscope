from django.urls import path
from . import views

urlpatterns = [
    path('', views.initialization, name='index'),
    path('lookup/', views.lookup, name='lookup')
]