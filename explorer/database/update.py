import csv
import pyproj
import datetime

from django.contrib.gis.geos import Point
from explorer.models import Kingdom, Phylum, Class, Order, Family, Genus, Species, IUCN, Observations

def update_database():
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

    # Retrieve existing taxonomy
    taxonomy = {
        'kingdom': list(*Kingdom.objects.order_by().values_list('key').distinct()),
        'phylum': list(*Phylum.objects.order_by().values_list('key').distinct()),
        'class': list(*Class.objects.order_by().values_list('key').distinct()),
        'order': list(*Order.objects.order_by().values_list('key').distinct()),
        'family': list(*Family.objects.order_by().values_list('key').distinct()),
        'genus': list(*Genus.objects.order_by().values_list('key').distinct()),
        'taxon': list(*Species.objects.order_by().values_list('taxon').distinct()),
        'iucn': list(*IUCN.objects.order_by().values_list('code').distinct()),
    }
        
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

            # Update the taxonomy for this entry
            __update_taxonomy(entry, taxonomy, iucn)

            count += 1

def __update_taxonomy(entry, taxonomy, iucn):
    """
    Update the taxonomy by adding kingdom, phylum, class, order, family, genus and species if needed.
    Add observations no matter what.
    """
    # Get keys to the entry's taxonomy
    k = int(entry['kingdomKey']) if len(entry['kingdomKey']) > 0 else None
    p = int(entry['phylumKey']) if len(entry['phylumKey']) > 0 else None
    c = int(entry['classKey']) if len(entry['classKey']) > 0 else None
    o = int(entry['orderKey']) if len(entry['orderKey']) > 0 else None
    f = int(entry['familyKey']) if len(entry['familyKey']) > 0 else None
    g = int(entry['genusKey']) if len(entry['genusKey']) > 0 else None
    s = int(entry['speciesKey']) if len(entry['speciesKey']) > 0 else None

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

    # Retrieve IUCN status
    ciucn = entry['iucnRedListCategory']
    tiucn = taxonomy['iucn']

    # Taxon key
    taxon = entry['acceptedTaxonKey']
    ttaxon = taxonomy['taxon']

    if taxon not in ttaxon and taxon is not None:
        print(taxon, entry['genericName'], entry['specificEpithet'])
        sentry = Species(
            taxon = int(taxon),
            key = s,
            scientific = entry['acceptedScientificName'],
            name = species,
            generic = entry['genericName'],
            specific = entry['specificEpithet'],
            rank = entry['taxonRank'],
            status = entry['taxonomicStatus'],
            iucn = IUCN.objects.get(code=ciucn)
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
        sentry.save()
        ttaxon.append(taxon)

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

    # Retrieve latitude and longitude of observation
    lat, lon = float(entry['decimalLatitude']), float(entry['decimalLongitude'])
    # Project coordinates to 3857
    projected = project([lon, lat], 4326, 3857)

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
    
    # Add the observation not matter what
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
        date = datetime.datetime.strptime(time, formating),
        lat = lat,
        lon = lon,
        uncertainty = float(uncertainty) if len(uncertainty) > 0 else None,
        geom = Point(x=projected[0], y=projected[1], srid=3857)
    )

def project(coordinates, epsg1=4326, epsg2=3857):
    """
    Reproject coordinates from epsg1 to epsg2.
    """
    proj = pyproj.Transformer.from_crs(epsg1, epsg2, always_xy=True)
    return proj.transform(coordinates[0], coordinates[1])