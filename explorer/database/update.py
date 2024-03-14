import sys
import csv
import pyproj
import datetime
import wikipedia
from bs4 import BeautifulSoup
import requests

from django.db import connections
from django.contrib.gis.geos import Point
from django.utils.timezone import make_aware
from explorer.models import Kingdom, Phylum, Class, Order, Family, Genus, Species, IUCN, Observations, Vernacular

def test():
    # Raise csl field size limit
    csv.field_size_limit(sys.maxsize)
    # Read the vernacular names file
    fields = [
        'gbifID', 'license', 'basisOfRecord', 'catalogNumber', 'recordedBy', 'sex', 'lifeStage', 'reproductiveCondition',
        'occurrenceStatus', 'eventDate', 'decimalLatitude', 'decimalLongitude', 'coordinateUncertaintyInMeters',
        'kingdom', 'phylum', 'class', 'order', 'family', 'genus', 'genericName', 'specificEpithet',
        'taxonRank', 'taxonomicStatus', 'taxonKey', 'acceptedTaxonKey',
        'kingdomKey', 'phylumKey',	'classKey',	'orderKey',	'familyKey', 'genusKey', 'speciesKey', 'species',
        'acceptedScientificName', 'iucnRedListCategory'
    ]

    r, reader, indexes = read_csv('explorer/database/data/occurrence.csv', fields)

    for row in reader:
        # Reconstruct the entry by removing unwanted columns
        values = []
        j = 0
        for i, value in enumerate(row):
            if i in indexes:
                values.append(value)
                j += 1

        # Make a dict from the entry and the fields
        entry = dict(zip(fields, values))

        if entry['acceptedTaxonKey'] == '1':
            print(entry)
            
    r.close()

def test1():
    # Raise csl field size limit
    csv.field_size_limit(sys.maxsize)

    # Read the vernacular names file
    fields = ['taxonID', 'vernacularName', 'language', 'countryCode']

    with open('explorer/database/data/vernacular.csv', 'r') as r:
        reader = csv.reader(r, delimiter='\t')
        # Get the columns name
        colnames = next(reader)

        indexes = []
        for i, col in enumerate(colnames):
            if col in fields:
                indexes.append(i)
        
        if len(indexes) != len(fields):
            raise Exception('The number of fields does not match the vernacular names file.')

        species = Species.objects.all()
        taxons = []
        for s in species:
            taxons.append(s.taxon)

        for row in reader:
            # Reconstruct the entry by removing unwanted columns
            values = []
            j = 0
            for i, value in enumerate(row):
                if i in indexes:
                    values.append(value)
                    j += 1

            # Make a dict from the entry and the fields
            entry = dict(zip(fields, values))

            v = entry['vernacularName']
            t = entry['taxonID']
            l = entry['language']

            if l == 'en':
                if t == '9':
                    title = wikipedia.search(v)[0]
                    page = requests.get('http://en.wikipedia.org/wiki/{0}'.format(title))
                    soup = BeautifulSoup(page.content, 'html.parser')
                    links = [(el.get('lang'), el.get('title')) for el in soup.select('li.interlanguage-link > a')]
                    for lang, title in links:
                        if lang == 'fr':
                            page_title = title.split(u' – ')[0]
                            print(page_title)

def update_establishment():
    """
    Update establishment status table using the GBIF backbone dataset.
    """
    # Raise csl field size limit
    csv.field_size_limit(sys.maxsize)

    # Read the vernacular names file
    fields = ['taxonID', 'countryCode', 'establishmentMeans']

    with open('explorer/database/data/distribution.csv', 'r') as r:
        reader = csv.reader(r, delimiter='\t')
        # Get the columns name
        colnames = next(reader)

        indexes = []
        for i, col in enumerate(colnames):
            if col in fields:
                indexes.append(i)
        
        if len(indexes) != len(fields):
            raise Exception('The number of fields does not match the vernacular names file.')

        species = Species.objects.all()
        taxons = []
        for s in species:
            taxons.append(s.taxon)

        for row in reader:
            entry = read_entry(row, fields, indexes)
            
            if entry['countryCode'] == 'FR' and len(entry['establishmentMeans']) > 0:
                taxon = int(entry['taxonID']) if len(entry['taxonID']) > 0 else None
                if taxon is not None and taxon in taxons:
                    establishment = entry['establishmentMeans']
                    t = Species.objects.get(taxon=taxon)
                    t.establishment = establishment
                    t.save()

def update_vernacular():
    """
    Update vernacular name table using the GBIF backbone dataset.
    Can take a long time as it's looking for duplicates on four columns before adding.
    """
    # Raise csl field size limit
    csv.field_size_limit(sys.maxsize)

    # Read the vernacular names file
    fields = ['taxonID', 'vernacularName', 'language', 'countryCode']
    languages = ['en', 'fr']

    with open('explorer/database/data/vernacular.csv', 'r') as r:
        reader = csv.reader(r, delimiter='\t')
        # Get the columns name
        colnames = next(reader)

        vernaculars = list(Vernacular.objects.order_by('taxon').values('taxon', 'name', 'language', 'country').distinct())

        indexes = []
        for i, col in enumerate(colnames):
            if col in fields:
                indexes.append(i)
        
        if len(indexes) != len(fields):
            raise Exception('The number of fields does not match the vernacular names file.')

        species = Species.objects.all()
        taxons = []
        for s in species:
            taxons.append(s.taxon)

        for row in reader:
            entry = read_entry(row, fields, indexes)

            language = entry['language']

            if language in languages:
                taxon = int(entry['taxonID']) if len(entry['taxonID']) > 0 else None

                if taxon is not None and taxon in taxons:
                    name, country = entry['vernacularName'], entry['countryCode']
                    add = True
                    for v in vernaculars:
                        t = Species.objects.get(taxon=taxon).pk
                        if v['taxon'] == t:
                            if v['name'] == name:
                                if v['language'] == language:
                                    if v['country'] == country:
                                        add = False
                                        break

                    if add:
                        print('adding taxon n°{0}: {1} in {2} {3}'.format(taxon, name, language, country))
                        Vernacular(
                            name = name,
                            taxon = Species.objects.get(taxon = taxon),
                            language = language,
                            country = country
                        ).save()

def update_taxonomy():
    """
    Create the taxonomy in the database.
    """
    # Wanted fields
    fields = [
        'acceptedTaxonKey', 'acceptedScientificName', 'taxonRank', 'taxonomicStatus',
        'kingdom', 'kingdomKey', 'phylum', 'phylumKey', 'class', 'classKey', 'order', 'orderKey',
        'family', 'familyKey', 'genus', 'genusKey', 'species', 'speciesKey', 'iucnRedListCategory'
    ]

    taxonomy = get_taxonomy()
    r, reader, indexes = read_csv('explorer/database/data/species.csv', fields)
    ttaxon = taxonomy['taxon']

    for row in reader:
        # Create the entry
        entry = read_entry(row, fields, indexes)

        taxon = int(entry['acceptedTaxonKey']) if len(entry['acceptedTaxonKey']) > 0 else None
        species = int(entry['speciesKey']) if len(entry['speciesKey']) > 0 else None

        if species is not None:
            if taxon not in ttaxon:
                name = entry['species'].split(' ', 2)
                entry['genericName'] = name[0]
                entry['specificEpithet'] = ''
                entry['infraspecificEpithet'] = ''

                if len(name) > 1:
                    entry['specificEpithet'] = name[1]
                    if len(name) > 2:
                        entry['infraspecificEpithet'] = name[2]
                    
                insert_species(taxon, entry, taxonomy)
                ttaxon.append(taxon)

def insert_observations():
    """
    Insert all observations from the occurrences file.
    """
    fields = [
        'gbifID', 'license', 'basisOfRecord', 'catalogNumber', 'recordedBy', 'sex', 'lifeStage', 'reproductiveCondition',
        'occurrenceStatus', 'eventDate', 'decimalLatitude', 'decimalLongitude', 'coordinateUncertaintyInMeters',
        'kingdom', 'phylum', 'class', 'order', 'family', 'genus', 'genericName', 'specificEpithet', 'infraspecificEpithet',
        'taxonRank', 'taxonomicStatus', 'taxonKey', 'acceptedTaxonKey',
        'kingdomKey', 'phylumKey',	'classKey',	'orderKey',	'familyKey', 'genusKey', 'speciesKey', 'species',
        'acceptedScientificName', 'iucnRedListCategory'
    ]

    taxonomy = get_taxonomy()
    r, reader, indexes = read_csv('explorer/database/data/occurrence.csv', fields)

    # Retrieve already present taxon keys
    ttaxon = taxonomy['taxon']
    count = 0

    for row in reader:
        # Create the entry
        entry = read_entry(row, fields, indexes)

        # Retrieve the taxon key of the entry
        taxon = int(entry['acceptedTaxonKey']) if len(entry['acceptedTaxonKey']) > 0 else None
        species = int(entry['speciesKey']) if len(entry['speciesKey']) > 0 else None
        
        # Do not enter the observation if species key is None
        if species is not None:
            # If the species is missing, inserting a new species
            if taxon not in ttaxon:
                print("inserted {0} observations.".format(count))
                count = 0
                insert_species(taxon, entry, taxonomy)
                ttaxon.append(taxon)

            # Retrieve latitude and longitude of observation
            lat, lon = float(entry['decimalLatitude']), float(entry['decimalLongitude'])
            # Project coordinates to 3857
            projected = project([lon, lat], 4326, 3857)

            # Get the time and convert it to time format
            time = entry['eventDate']
            formating, date = None, None
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
                date = make_aware(datetime.datetime.strptime(time, formating))
            
            uncertainty = entry['coordinateUncertaintyInMeters']
            catalog = entry['catalogNumber']
            
            # Add the observation
            Observations(
                gbif = int(entry['gbifID']),
                taxon = Species.objects.get(taxon=taxon),
                license = entry['license'],
                basis = entry['basisOfRecord'],
                catalog = int(catalog) if len(catalog) > 0 else None,
                author = entry['recordedBy'],
                sex = entry['sex'],
                stage = entry['lifeStage'],
                condition = entry['reproductiveCondition'],
                status = entry['occurrenceStatus'],
                date = date,
                lat = lat,
                lon = lon,
                uncertainty = float(uncertainty) if len(uncertainty) > 0 else None,
                geom = Point(x=projected[0], y=projected[1], srid=3857)
            ).save()

            count += 1

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

    print('adding species n°{0}: {1} {2} - {3} {4} {5} {6} {7} {8}'.format(s, generic, specific, kingdom, phylum, classe, order, family, genus))

    # Retrivee already present taxonomy
    tkingdom = taxonomy['kingdom']
    tphylum = taxonomy['phylum']
    tclasse = taxonomy['class']
    torder = taxonomy['order']
    tfamily = taxonomy['family']
    tgenus = taxonomy['genus']

    # Add the IUCN status if it doesn't already exists
    if ciucn not in tiucn and ciucn is not None:
        IUCN(code = ciucn, en=iucn[ciucn]).save()
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

def project(coordinates, epsg1=4326, epsg2=3857):
    """
    Reproject coordinates from epsg1 to epsg2.
    """
    proj = pyproj.Transformer.from_crs(epsg1, epsg2, always_xy=True)
    return proj.transform(coordinates[0], coordinates[1])

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

def get_iucn():
    """
    Get a dict with correspondance of IUCN status.
    """
    return {
        'EX': 'Extinct',
        'EW': 'Extinct in the wild',
        'CR': 'Critically endangered',
        'EN': 'Endangered',
        'VU': 'Vulnerable',
        'NT': 'Near threatened',
        'CD': 'Conservation dependent',
        'LC': 'Least concern',
        'DD': 'Data deficient',
        'NE': 'Not evaluated'
    }

def read_csv(file, fields):
    """
    Read a csv file and return the opened file, the reader, and the indexes of the provided fields name.
    """
    r = open(file, 'r')
    reader = csv.reader(r, delimiter='\t')
    colnames = next(reader)
    indexes = []
    for i, col in enumerate(colnames):
        if col in fields:
            indexes.append(i)
    if len(indexes) != len(fields):
        raise Exception('The number of fields does not match the occurrence.txt file.')
    return r, reader, indexes

def read_entry(row, fields, indexes):
    """
    Construct the entry dictionnary.
    """
    # Reconstruct the entry by removing unwanted columns
    values = []
    j = 0
    for i, value in enumerate(row):
        if i in indexes:
            values.append(value)
            j += 1

    # Make a dict from the entry and the fields
    return dict(zip(fields, values))

def wipe_database():
    """
    Remove all entry from every tables.
    """
    tables = [
        'iucn', 'kingdom', 'phylum', 'class', 'order',
        'family', 'genus', 'species', 'observations', 'vernacular'
    ]
    for t in tables:
        clean_tables('explorer', tables)

def clean_tables(schema, *tables):
    with connections[schema].cursor() as cursor:
        for table in tables:
            t = "delete from %s.%s" % (schema, table)
            s = "alter sequence %s.%s_id_seq restart with 1" % (schema, table)
            cursor.execute(t)
            cursor.execute(s)