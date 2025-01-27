import yaml

from explorer.models import Current
from explorer.api.taxonomy import get_taxon, get_range

def get_configuration():
    """
    Retrieve the configuration along with taxonomic information on the showcased taxon.
    """
    c = yaml.safe_load(open('explorer/static/explorer/conf/configuration.yaml', 'r'))
    current = Current.objects.all()[0].taxon
    c['taxonomy'] = get_taxon(c['languages']['current'], current.tid)
    # c['range'] = get_range(current.tid)
    return c