import yaml

def get_configuration():
    """
    Retrieve the configuration along with taxonomic information on the showcased taxon.
    """
    c = yaml.load(open('explorer/static/explorer/conf/configuration.yaml', 'r'), Loader=yaml.FullLoader)
    return c