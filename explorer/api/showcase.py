import random
import requests
import yaml
import wikipediaapi as wiki
import xml.dom.minidom

from explorer.models import Taxon
from explorer.api.tools.models import clean_tables

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
        wikipedia = wiki.Wikipedia(user_agent='phyloscope.org', language=l)
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
        r = True if taxon.range is not None else False
        w = has_wikipedia(taxon.wikipedia)

        if r and w:
            print(f'Taxon {taxon.name} ({taxon.tid}) has range and wikipedia page, setting as showcased.')

            # Load the configuration file
            filename = 'explorer/static/explorer/conf/configuration.yaml'
            data = yaml.load(open(filename, 'r'), Loader=yaml.FullLoader)

            # Update the current taxon id
            data['taxonomy']['current'] = taxon.tid

            # Write the file
            with open(filename, 'w') as yamlfile:
                yamlfile.write(yaml.dump(data, default_flow_style=False))
            break
        else:
            if not r:
                print(f'Taxon {taxon.name} ({taxon.tid}) has no range.')
            if not w:
                print(f'Taxon {taxon.name} ({taxon.tid}) has no wikipedia page.')