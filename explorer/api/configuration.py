import yaml

from explorer.api.range import get_range
from explorer.api.taxonomy import get_taxon

def get_configuration():
    """
    Retrieve the configuration along with taxonomic information on the showcased taxon.
    """
    c = yaml.load(open('explorer/static/explorer/conf/configuration.yaml', 'r'), Loader=yaml.FullLoader)
    return c