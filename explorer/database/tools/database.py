import datetime 

from django.utils.timezone import make_aware
from django.db import connection
from django.db.models import F

RANKS = {
    'stateofmatter': { 'en': 'State of matter', 'fr': 'État de la matière' },
    'kingdom': { 'en': 'Kingdom', 'fr': 'Règne' },
    'phylum': { 'en': 'Phylum', 'fr': 'Phylum' },
    'subphylum': { 'en': 'Subphylum', 'fr': 'Sous-phylum' },
    'superclass': { 'en': 'Superclass', 'fr': 'Super-classe' },
    'class': { 'en': 'Class', 'fr': 'Classe' },
    'subclass': { 'en': 'Subclass', 'fr': 'Sous-classe' },
    'infraclass': { 'en': 'Infraclass', 'fr': 'Classe interne' },
    'subterclass': { 'en': 'Subterclass', 'fr': 'Sous-classe interne' },
    'superorder': { 'en': 'Superorder', 'fr': 'Super-ordre' },
    'order': { 'en': 'Order', 'fr': 'Ordre' },
    'suborder': { 'en': 'Suborder', 'fr': 'Sous-ordre' },
    'infraorder': { 'en': 'Infraorder', 'fr': 'Infra-ordre' },
    'parvorder': { 'en': 'Parvorder', 'fr': 'Micro-ordre' },
    'zoosection': { 'en': 'Zoosection', 'fr': 'Section animale' },
    'zoosubsection': { 'en': 'Zoosubsection', 'fr': 'Sous-section animale' },
    'superfamily': { 'en': 'Superfamily', 'fr': 'Super-famille' },
    'epifamily': { 'en': 'Epifamily', 'fr': 'Épifamille' },
    'family': { 'en': 'Family', 'fr': 'Famille' },
    'subfamily': { 'en': 'Subfamily', 'fr': 'Sous-famille' },
    'supertribe': { 'en': 'Supertribe', 'fr': 'Super-tribu' },
    'tribe': { 'en': 'Tribe', 'fr': 'Tribu' },
    'subtribe': { 'en': 'Subtribe', 'fr': 'Sous-tribu' },
    'genus': { 'en': 'genus', 'fr': 'Genre' },
    'genushybrid': { 'en': 'Genushybrid', 'fr': 'Genre hybride' },
    'subgenus': { 'en': 'Subgenus', 'fr': 'Sous-genre' },
    'section': { 'en': 'Section', 'fr': 'Section' },
    'subsection': { 'en': 'Subsection', 'fr': 'Sous-section' },
    'complex': { 'en': 'Complex', 'fr': 'Complexe' },
    'hybrid': { 'en': 'Hybrid', 'fr': 'Hybride' },
    'species': { 'en': 'Species', 'fr': 'Espèce' },
    'variety': { 'en': 'Variety', 'fr': 'Variété' },
    'subspecies': { 'en': 'Subspecies', 'fr': 'Sous-espèce' },
    'infrahybrid': { 'en': 'Infrahybrid', 'fr': 'Infra-hybride' },
    'form': { 'en': 'Form', 'fr': 'Forme' }, 
}

def wipe_database():
    """
    Remove all entry from every tables.
    """
    tables = [
        'vernacular', 'pictures', 'observations', 'species', 'genus',
        'family', 'order', 'class', 'phylum', 'kingdom', 'iucn'
    ]
    for t in tables:
        clean_tables('explorer', t)

def clean_tables(schema, *tables):
    with connection.cursor() as cursor:
        for table in tables:
            t = "delete from %s.%s" % (schema, table)
            s = "alter sequence %s.%s_id_seq restart with 1" % (schema, table)
            cursor.execute(t)
            cursor.execute(s)

def display_database_information(db='oazo'):
    """
    Display database information.
    """
    with connection.cursor() as cursor:
        q = 'SELECT datname as db_name, pg_size_pretty(pg_database_size(datname)) as db_usage FROM pg_database;'
        cursor.execute(q)
        for t in cursor.fetchall():
            if t[0] == db:
                print('{0} database size on disk: {1}.'.format(db, t[1]))

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

def update_taxonomy():
    """
    Update the taxonomy by adding the taxon id field above genus.
    """
    Kingdom.objects.update(taxon=F('key'))
    Phylum.objects.update(taxon=F('key'))
    Class.objects.update(taxon=F('key'))
    Order.objects.update(taxon=F('key'))
    Family.objects.update(taxon=F('key'))
    Genus.objects.update(taxon=F('key'))

def insert_species(taxon, entry, taxonomy):
    """
    Insert a new species in the database.
    """
    k = int(entry['kingdomKey']) if len(entry['kingdomKey']) > 0 else None
    p = int(entry['phylumKey']) if len(entry['phylumKey']) > 0 else None
    c = int(entry['classKey']) if len(entry['classKey']) > 0 else None
    o = int(entry['orderKey']) if len(entry['orderKey']) > 0 else None
    f = int(entry['familyKey']) if len(entry['familyKey']) > 0 else None
    g = int(entry['genusKey']) if len(entry['genusKey']) > 0 else None
    s = int(entry['speciesKey']) if len(entry['speciesKey']) > 0 else None

    # Retrieve IUCN status
    iucn = get_iucn()
    ciucn = entry['iucnRedListCategory'] if len(entry['iucnRedListCategory']) > 0 else None
    tiucn = taxonomy['iucn']

    # Retrieve the entry's taxonomy name
    kingdom = entry['kingdom']
    phylum = entry['phylum']
    classe = entry['class']
    order = entry['order']
    family = entry['family']
    genus = entry['genus']

    species = entry['species']
    generic = entry['genericName']
    specific = entry['specificEpithet']
    infra = entry['infraspecificEpithet']

    # Retrivee already present taxonomy
    tkingdom = taxonomy['kingdom']
    tphylum = taxonomy['phylum']
    tclasse = taxonomy['class']
    torder = taxonomy['order']
    tfamily = taxonomy['family']
    tgenus = taxonomy['genus']

    # Add the IUCN status if it doesn't already exists
    if ciucn not in tiucn and ciucn is not None:
        IUCN(code = ciucn, fr=iucn[ciucn][1], en=iucn[ciucn][0]).save()
        tiucn.append(ciucn)

    # Handle taxonomic tree by adding entries when they does not exist
    if k not in tkingdom and k is not None:
        Kingdom(key = k, name = kingdom).save()
        tkingdom.append(k)
    if p not in tphylum and p is not None:
        if k is not None:
            Phylum(key = p, name = phylum, kingdom = Kingdom.objects.get(key = k)).save()
        else:
            Phylum(key = p, name = phylum).save()
        tphylum.append(p)
    if c not in tclasse and c is not None:
        if p is not None:
            Class(key = c, name = classe, phylum = Phylum.objects.get(key = p)).save()
        else:
            Class(key = c, name = classe).save()
        tclasse.append(c)
    if o not in torder and o is not None:
        if c is not None:
            Order(key = o, name = order, classe = Class.objects.get(key = c)).save()
        else:
            Order(key = o, name = order).save()
        torder.append(o)
    if f not in tfamily and f is not None:
        if o is not None:
            Family(key = f, name = family, order = Order.objects.get(key = o)).save()
        else:
            Family(key = f, name = family).save()
        tfamily.append(f)
    if g not in tgenus and g is not None:
        if f is not None:
            Genus(key = g, name = genus, family = Family.objects.get(key = f)).save()
        else:
            Genus(key = g, name = genus).save()
        tgenus.append(g)

    sentry = Species(
        key=s,
        taxon = taxon,
        scientific = entry['acceptedScientificName'],
        name = species,
        generic = generic,
        specific = specific,
        infra = infra,
        rank = entry['taxonRank'],
        status = entry['taxonomicStatus'],
    )

    if g is not None:
        sentry.genus = Genus.objects.get(key=g)
    if f is not None:
        sentry.family = Family.objects.get(key=f)
    if o is not None:
        sentry.order = Order.objects.get(key=o)
    if c is not None:
        sentry.classe = Class.objects.get(key=c)
    if p is not None:
        sentry.phylum = Phylum.objects.get(key=p)
    if k is not None:
        sentry.kingdom = Kingdom.objects.get(key=k)
    if ciucn is not None:
        sentry.iucn = IUCN.objects.get(code=ciucn)

    sentry.save()

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
    
    if formating is not None:
        return make_aware(datetime.datetime.strptime(time, formating))
    else:
        return None