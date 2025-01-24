import datetime
import random 

from django.utils.timezone import make_aware
from django.db import connection
from django.db.models import F
from django.db.models import Max

from explorer.models import Taxon, Names, Photo

def get_random_model(model):
    """
    Return a random entry in the given model.
    """
    max_id = model.objects.all().aggregate(max_id=Max("id"))['max_id']
    while True:
        pk = random.randint(1, max_id)
        m = model.objects.filter(pk=pk).first()
        if m:
            return m

def wipe_database():
    """
    Remove all entry from every tables in the explorer schema.
    """
    print('Wiping database...')
    tables = [ 'names', 'photo', 'taxon' ]
    for t in tables:
        clean_tables('explorer', t)

def clean_tables(schema, *tables):
    """
    Remove every entry of the given tables inside the given schema.
    """
    with connection.cursor() as cursor:
        for table in tables:
            t = "delete from %s.%s" % (schema, table)
            s = "alter sequence %s.%s_id_seq restart with 1" % (schema, table)
            cursor.execute(t)
            cursor.execute(s)

def display_database_information(db='phylopedia'):
    """
    Display database information.
    """
    with connection.cursor() as cursor:
        q = 'SELECT datname as db_name, pg_size_pretty(pg_database_size(datname)) as db_usage FROM pg_database;'
        cursor.execute(q)
        for t in cursor.fetchall():
            if t[0] == db:
                print('Database {0} size on disk: {1}.'.format(db, t[1]))
                tcount = Taxon.objects.all().count()
                ncount = Names.objects.all().count()
                pcount = Photo.objects.all().count()
                print(f'{tcount} taxons - {ncount} vernacular names - {pcount} photos')

def get_taxonomy():
    """
    Retrieve the already existing taxonomy from the database.
    """
    return {
        'kingdom': [x['key'] for x in  list(Kingdom.objects.order_by('key').values('key').distinct())],
        'phylum': [x['key'] for x in  list(Phylum.objects.order_by('key').values('key').distinct())],
        'class': [x['key'] for x in  list(Class.objects.order_by('key').values('key').distinct())],
        'order': [x['key'] for x in  list(Order.objects.order_by('key').values('key').distinct())],
        'family': [x['key'] for x in  list(Family.objects.order_by('key').values('key').distinct())],
        'genus': [x['key'] for x in  list(Genus.objects.order_by('key').values('key').distinct())],
        'species': [x['key'] for x in  list(Species.objects.order_by('key').values('key').distinct())],
        'taxon': [x['taxon'] for x in  list(Species.objects.order_by('taxon').values('taxon').distinct())],
        'iucn': [x['code'] for x in  list(IUCN.objects.order_by('code').values('code').distinct())]
    }

def get_taxon_id():
    return {
        'kingdom': [x['taxon'] for x in  list(Kingdom.objects.order_by('taxon').values('taxon').distinct())],
        'phylum': [x['taxon'] for x in  list(Phylum.objects.order_by('taxon').values('taxon').distinct())],
        'class': [x['taxon'] for x in  list(Class.objects.order_by('taxon').values('taxon').distinct())],
        'order': [x['taxon'] for x in  list(Order.objects.order_by('taxon').values('taxon').distinct())],
        'family': [x['taxon'] for x in  list(Family.objects.order_by('taxon').values('taxon').distinct())],
        'genus': [x['taxon'] for x in  list(Genus.objects.order_by('taxon').values('taxon').distinct())],
        'species': [x['taxon'] for x in  list(Species.objects.order_by('taxon').values('taxon').distinct())],
    }

def get_iucn():
    """
    Get a dict with correspondance of IUCN status.
    """
    return {
        'EX': ['Extinct', 'Éteinte'],
        'EW': ['Extinct in the wild', "Éteinte à l'état sauvage"],
        'CR': ['Critically endangered', "En danger critique d'extinction"],
        'EN': ['Endangered', 'En danger'],
        'VU': ['Vulnerable', 'Vulnérable'],
        'NT': ['Near threatened', 'Quasi menacée'],
        'CD': ['Conservation dependent', 'Dépendente de la conservation'],
        'LC': ['Least concern', 'Préoccupation mineure'],
        'DD': ['Data deficient', 'Données insuffisantes'],
        'NE': ['Not evaluated', 'Non-évaluée']
    }

def get_date(time):
    """
    Return a date object or None if conversion did not work.
    """
    formating = None
    if len(time) == 10:
        formating = '%Y-%m-%d'
    elif len(time) == 16:
        formating = '%Y-%m-%dT%H:%M'
    elif len(time) == 17:
        formating = '%Y-%m-%dT%H:%MZ'
    elif len(time) == 19:
        formating = '%Y-%m-%dT%H:%M:%S'
    elif len(time) == 20:
        formating = '%Y-%m-%dT%H:%M:%SZ'
    elif len(time) == 25:
        time = time[:22] + time[23:]
        formating = '%Y-%m-%dT%H:%M:%S%z'
    
    if formating is not None:
        if len(time) < 24 :
            return make_aware(datetime.datetime.strptime(time, formating))
        else:
            return datetime.datetime.strptime(time, formating)
    else:
        return None