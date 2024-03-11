import sys
import csv
import pyproj
import datetime

from django.contrib.gis.geos import Point
from django.utils.timezone import make_aware
from explorer.models import Kingdom, Phylum, Class, Order, Family, Genus, Species, IUCN, Observations, Vernacular

def test():
    pass

def update_vernacular():
    """
    Update vernacular name table using the GBIF backbone dataset.
    """
    # Raise csl field size limit
    csv.field_size_limit(sys.maxsize)

    # Read the vernacular names file
    fields = ['taxonID', 'vernacularName', 'language', 'countryCode']
    languages = ['en', 'fr']

    with open('explorer/database/data/backbone/VernacularName.tsv', 'r') as r:
        reader = csv.reader(r, delimiter='\t')
        # Get the columns name
        colnames = next(reader)
        index = colnames.index('taxonID')

        vernaculars = list(Vernacular.objects.order_by('taxon').values('taxon', 'name', 'language', 'country').distinct())
        print(vernaculars)

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

        count = 0
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

            language = entry['language']

            if language in languages:
                taxon = int(entry['taxonID']) if len(entry['taxonID']) > 0 else None

                if taxon is not None and taxon in taxons:
                    name, country = entry['vernacularName'], entry['countryCode']
                    add = True
                    for v in vernaculars:
                        if v['taxon'] == taxon:
                            if v['name'] == name:
                                if v['language'] == language:
                                    if v['country'] == country:
                                        print('yo')
                                        add = False

                    # if add:
                    #     Vernacular(
                    #         name = name,
                    #         taxon = Species.objects.get(taxon = taxon),
                    #         language = language,
                    #         country = country
                    #     ).save()
                    # else:
                    print(taxon, name, language, country)

                    if count > 50:
                        break
                    count += 1

def insert_missing_species():
    """
    Add missing species inside the species table.
    It can be because observations are sensible (for the gray wolf for example).
    It can be for conservation reasons.
    """
    # Wanted fields
    fields = [
        'acceptedTaxonKey', 'acceptedScientificName', 'taxonRank', 'taxonomicStatus',
        'kingdom', 'kingdomKey', 'phylum', 'phylumKey', 'class', 'classKey', 'order', 'orderKey',
        'family', 'familyKey', 'genus', 'genusKey', 'species', 'speciesKey', 'iucnRedListCategory'
    ]

    # Retrieve existing taxonomy
    taxonomy = get_taxonomy()

    # Read the species file
    with open('explorer/database/data/species.csv', 'r') as r:
        reader = csv.reader(r, delimiter='\t')
        # Get the columns name
        colnames = next(reader)
        # Get the accepted taxon column name
        index = colnames.index('acceptedTaxonKey')

        indexes = []
        for i, col in enumerate(colnames):
            if col in fields:
                indexes.append(i)
        
        if len(indexes) != len(fields):
            raise Exception('The number of fields does not match the occurrence.txt file.')

        # Loop through remaining rows
        for row in reader:
            # If the taxon is missing from the database
            if int(row[index]) not in taxonomy['taxon']:
                # Reconstruct the entry by removing unwanted columns
                values = []
                j = 0
                for i, value in enumerate(row):
                    if i in indexes:
                        values.append(value)
                        j += 1

                # Make a dict from the entry and the fields
                entry = dict(zip(fields, values))

                # Retrieve the taxon key of the entry
                taxon = int(entry['acceptedTaxonKey']) if len(entry['acceptedTaxonKey']) > 0 else None
                # Retrieve already present taxon keys
                ttaxon = taxonomy['taxon']

                # If the taxon is missing, inserting a new species
                if taxon not in ttaxon and taxon is not None:
                    name = entry['species'].split(' ', 1)
                    entry['genericName'] = name[0]
                    if len(name) > 1:
                        entry['specificEpithet'] = name[1]
                    else:
                        entry['specificEpithet'] = ''
                    insert_taxon(entry, taxonomy)


def insert_data():
    """
    Function to update the observations table. Beware that no duplicate checking is made.
    """
    fields = [
        'gbifID', 'license', 'basisOfRecord', 'catalogNumber', 'recordedBy', 'sex', 'lifeStage', 'reproductiveCondition',
        'occurrenceStatus', 'eventDate', 'decimalLatitude', 'decimalLongitude', 'coordinateUncertaintyInMeters',
        'kingdom', 'phylum', 'class', 'order', 'family', 'genus', 'genericName', 'specificEpithet',
        'taxonRank', 'taxonomicStatus', 'taxonKey', 'acceptedTaxonKey',
        'kingdomKey', 'phylumKey',	'classKey',	'orderKey',	'familyKey', 'genusKey', 'speciesKey', 'species',
        'acceptedScientificName', 'iucnRedListCategory'
    ]

    taxonomy = get_taxonomy()

    # Open the occurrence file to read and create the reader
    with open('explorer/database/data/occurrence.txt', 'r') as r:
        # Create the reader
        reader = csv.reader(r, delimiter='\t')
        # Get the columns name
        colnames = next(reader)

        indexes = []
        for i, col in enumerate(colnames):
            if col in fields:
                indexes.append(i)
        
        if len(indexes) != len(fields):
            raise Exception('The number of fields does not match the occurrence.txt file.')

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

            # Retrieve the taxon key of the entry
            taxon = int(entry['acceptedTaxonKey']) if len(entry['acceptedTaxonKey']) > 0 else None
            # Retrieve already present taxon keys
            ttaxon = taxonomy['taxon']

            # If the taxon is missing, inserting a new species
            if taxon not in ttaxon and taxon is not None:
                insert_taxon(entry, taxonomy)
            
            # Insert a new observation
            insert_observation(entry)

def insert_observation(entry):
    """
    Insert an observation.
    """
    # Get the taxon key
    taxon = int(entry['acceptedTaxonKey']) if len(entry['acceptedTaxonKey']) > 0 else None

    # Retrieve latitude and longitude of observation
    lat, lon = float(entry['decimalLatitude']), float(entry['decimalLongitude'])
    # Project coordinates to 3857
    projected = project([lon, lat], 4326, 3857)

    # Get the time and convert it to time format
    time = entry['eventDate']
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
    else:
        raise Exception('Date could not be processed: {0}'.format(time))

    uncertainty = entry['coordinateUncertaintyInMeters']
    catalog = entry['catalogNumber']

    date = make_aware(datetime.datetime.strptime(time, formating))
    
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

def insert_taxon(entry, taxonomy):
    """
    Insert a new species in the database.
    """
    # Retrieve the taxon key of the entry
    taxon = int(entry['acceptedTaxonKey']) if len(entry['acceptedTaxonKey']) > 0 else None
    # Retrieve already present taxon keys
    ttaxon = taxonomy['taxon']

    if taxon not in ttaxon and taxon is not None:
        print('adding taxon n°{0}: {1}'.format(taxon, entry['acceptedScientificName']))

        # Get keys to the entry's taxonomy
        k = int(entry['kingdomKey']) if len(entry['kingdomKey']) > 0 else None
        p = int(entry['phylumKey']) if len(entry['phylumKey']) > 0 else None
        c = int(entry['classKey']) if len(entry['classKey']) > 0 else None
        o = int(entry['orderKey']) if len(entry['orderKey']) > 0 else None
        f = int(entry['familyKey']) if len(entry['familyKey']) > 0 else None
        g = int(entry['genusKey']) if len(entry['genusKey']) > 0 else None
        s = int(entry['speciesKey']) if len(entry['speciesKey']) > 0 else None

        iucn = {
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

        # Retrieve IUCN status
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

        # Retrivee already present taxonomy
        tkingdom = taxonomy['kingdom']
        tphylum = taxonomy['phylum']
        tclasse = taxonomy['class']
        torder = taxonomy['order']
        tfamily = taxonomy['family']
        tgenus = taxonomy['genus']

        # Add the IUCN status if it doesn't already exists
        if ciucn not in tiucn and ciucn is not None:
            IUCN(code = ciucn, status=iucn[ciucn]).save()
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
            taxon = taxon,
            key = s,
            scientific = entry['acceptedScientificName'],
            name = species,
            generic = entry['genericName'],
            specific = entry['specificEpithet'],
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
        ttaxon.append(taxon)

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
        'taxon': [x['taxon'] for x in  list(Species.objects.order_by('taxon').values('taxon').distinct())],
        'iucn': [x['code'] for x in  list(IUCN.objects.order_by('code').values('code').distinct())]
    }