import sys
import csv
import wikipedia
from bs4 import BeautifulSoup
import requests

from django.contrib.gis.geos import Point
from django.db import IntegrityError

from explorer.models import Kingdom, Phylum, Class, Order, Family, Genus, Species, Observations, Vernacular, Pictures
from explorer.database.tools.files import read_csv, read_entry, get_row_number, progress
from explorer.database.tools.geography import project
from explorer.database.tools.database import (
    display_database_information,
    get_taxonomy,
    insert_species,
    update_taxonomy,
    get_date,
    get_taxon_id
)

def test():
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
            lang = entry['language']

            if lang == 'en':
                if t == '9':
                    title = wikipedia.search(v)[0]
                    page = requests.get('http://en.wikipedia.org/wiki/{0}'.format(title))
                    soup = BeautifulSoup(page.content, 'html.parser')
                    links = [(el.get('lang'), el.get('title')) for el in soup.select('li.interlanguage-link > a')]
                    for language, title in links:
                        if language == 'fr':
                            page_title = title.split(u' – ')[0]
                            print(page_title)

def update_establishment(distribution):
    """
    Update establishment status table using the GBIF backbone dataset.
    """
    # Raise csl field size limit
    csv.field_size_limit(sys.maxsize)

    # Read the distribution names file
    fields = ['taxonID', 'countryCode', 'establishmentMeans']
    r, reader, indexes = read_csv(distribution, fields)
    taxons = [ x['taxon'] for x in  list(Species.objects.order_by('taxon').values('taxon').distinct()) ]

    total = get_row_number(distribution)
    count = 0

    for row in reader:
        progress(count, total, suffix='Progress')
        entry = read_entry(row, fields, indexes)
        if entry['countryCode'] == 'FR' and len(entry['establishmentMeans']) > 0:
            taxon = int(entry['taxonID']) if len(entry['taxonID']) > 0 else None
            if taxon is not None and taxon in taxons:
                establishment = entry['establishmentMeans']
                t = Species.objects.get(taxon=taxon)
                t.establishment = establishment
                t.save()
        count += 1

def insert_vernacular(vernacular):
    """
    Update vernacular name table using the GBIF backbone dataset.
    Can take a long time as it's looking for duplicates on four columns before adding.
    """
    # Raise csl field size limit
    csv.field_size_limit(sys.maxsize)

    # Read the vernacular names file
    fields = ['taxonID', 'vernacularName', 'language', 'countryCode']
    languages = ['en', 'fr']

    r, reader, indexes = read_csv(vernacular, fields)
    taxons = get_taxon_id()

    total = get_row_number(vernacular)
    count = 0

    for row in reader:
        progress(count, total, suffix='Progress')
        entry = read_entry(row, fields, indexes)
        language = entry['language']

        if language in languages:
            taxon = int(entry['taxonID']) if len(entry['taxonID']) > 0 else None
            if taxon is not None:
                name, country = entry['vernacularName'], entry['countryCode']
                try:
                    content = None
                    if taxon in taxons['kingdom']:
                        content = Kingdom.objects.get(taxon=taxon)
                    elif taxon in taxons['phylum']:
                        content = Phylum.objects.get(taxon=taxon)
                    elif taxon in taxons['class']:
                        content = Class.objects.get(taxon=taxon)
                    elif taxon in taxons['order']:
                        content = Order.objects.get(taxon=taxon)
                    elif taxon in taxons['family']:
                        content = Family.objects.get(taxon=taxon)
                    elif taxon in taxons['genus']:
                        content = Genus.objects.get(taxon=taxon)
                    elif taxon in taxons['species']:
                        content = Species.objects.get(taxon=taxon)

                    if content is not None:
                        Vernacular(
                            taxon=taxon,
                            name = name,
                            language = language,
                            country = country,
                            content_object = content
                        ).save()
                except IntegrityError:
                    pass
        count += 1

def insert_observations(observations):
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
    r, reader, indexes = read_csv(observations, fields)

    # Retrieve already present taxon keys
    ttaxon = taxonomy['taxon']
    total = get_row_number(observations)
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
                progress(count, total, suffix="adding species: {0}".format(entry['acceptedScientificName']))
                insert_species(taxon, entry, taxonomy)
                ttaxon.append(taxon)

            # Retrieve latitude and longitude of observation
            lat, lon = float(entry['decimalLatitude']), float(entry['decimalLongitude'])
            # Project coordinates to 3857
            projected = project([lon, lat], 4326, 3857)

            # Get the time and convert it to time format
            date = get_date(entry['eventDate'])
            
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

    r.close()
    add_missing_species()
    update_taxonomy()
    display_database_information()

def add_missing_species():
    """
    Add missing species to the database by comparing with the species.csv file.
    """
    # Wanted fields
    fields = [
        'acceptedTaxonKey', 'acceptedScientificName', 'taxonRank', 'taxonomicStatus',
        'kingdom', 'kingdomKey', 'phylum', 'phylumKey', 'class', 'classKey', 'order', 'orderKey',
        'family', 'familyKey', 'genus', 'genusKey', 'species', 'speciesKey', 'iucnRedListCategory'
    ]

    taxonomy = get_taxonomy()
    r, reader, indexes = read_csv('explorer/database/data/inaturalist/species.csv', fields)

    ttaxon = taxonomy['taxon']

    for row in reader:
        # Create the entry
        entry = read_entry(row, fields, indexes)

        species = int(entry['speciesKey']) if len(entry['speciesKey']) > 0 else None
        taxon = int(entry['acceptedTaxonKey']) if len(entry['acceptedTaxonKey']) > 0 else None

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
    
    display_database_information()
    r.close()

def insert_pictures(multimedia):
    """
    Populate the pictures table using the multimedia file complimenting observations.
    """
    # Wanted fields
    fields = [ 'gbifID', 'identifier', 'created', 'creator' ]
    r, reader, indexes = read_csv(multimedia, fields)
    listid = [x['gbif'] for x in  list(Observations.objects.order_by('gbif').values('gbif').distinct())]
    
    total = get_row_number(multimedia)
    print('{0} rows to read.'.format(total))
    count = 0
    for row in reader:
        entry = read_entry(row, fields, indexes)
        gbif = int(entry['gbifID']) if len(entry['gbifID']) > 0 else None

        if gbif is not None:
            if gbif in listid:
                Pictures(
                    observation=Observations.objects.get(gbif=gbif),
                    author=entry['creator'],
                    link=entry['identifier']
                ).save()
        
        progress(count, total, suffix="Progress")
        count += 1

    r.close()
    display_database_information()