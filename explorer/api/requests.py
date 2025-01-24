import random

from explorer.models import Taxon, Current
from explorer.api.tools.models import clean_tables

def update_taxon():
    """
    Update the current showcased taxon
    """
    # Get all species
    taxons = Taxon.objects.filter(rank='species')
    # Create a list of indexes
    indexes = list(taxons.values('tid'))
    # Select a random index
    index = random.randint(0, len(indexes))
    # Get a random taxon
    taxon = taxons[index]
    # Clean the current taxon
    clean_tables('explorer', 'current')
    # Create a new entry for the current taxon
    current = Current(taxon = taxon).save()