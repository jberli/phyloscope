import random
import requests
import yaml
import wikipediaapi as wiki
import xml.dom.minidom

from explorer.models import Taxon, Current
from explorer.api.tools.models import clean_tables

def has_range(index):
    """
    Returns True if the taxon has a range file from iNaturalist.
    Instead returns False
    """
    response = requests.get(f'https://www.inaturalist.org/taxa/{index}/range.kml')
    try:
        # If the KML is parsable, the range is present
        xml.dom.minidom.parseString(response.content)
        has = True
    except:
        has = False
    finally:
        return has

def has_wikipedia(url):
    """
    Returns True if the taxon has a Wikipedia page with a summary.
    Instead returns False
    """
    configuration = yaml.safe_load(open('explorer/static/explorer/conf/configuration.yaml', 'r'))
    languages = configuration['languages']['available']
    name = url.split('/')[-1].replace(" ", "_")
    has_all = True
    for l in languages:
        wikipedia = wiki.Wikipedia(user_agent='phylopedia.org', language=l)
        page = wikipedia.page(name)
        if not page.exists():
            has_all = False
        else:
            if len(page.summary) == 0:
                has_all = False
    return has_all

def update_taxon(ranks=['species']):
    """
    Update the current showcased taxon
    """
    print('Updating showcased taxon...')

    # Get all species
    taxons = Taxon.objects.filter(rank__in=ranks)
    # Create a list of indexes
    indexes = list(taxons.values('tid'))

    while True:
        # Select a random index
        index = random.randint(0, len(indexes))
        # Get a random taxon
        taxon = taxons[index]

        # Checking if taxon has range and wikipedia page
        r = has_range(taxon.tid)
        w = has_wikipedia(taxon.wikipedia)

        if r and w:
            print(f'Taxon {taxon.name} ({taxon.tid}) has range and wikipedia page, setting as showcased.')
            # Clean the current taxon
            clean_tables('explorer', 'current')
            # Create a new entry for the current taxon
            current = Current(taxon = taxon).save()
            break
        else:
            if not r:
                print(f'Taxon {taxon.name} ({taxon.tid}) has no range.')
            if not w:
                print(f'Taxon {taxon.name} ({taxon.tid}) has no wikipedia page.')