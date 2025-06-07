import yaml
import csv

def get_configuration(language):
    """
    Retrieve the configuration along with taxonomic information on the showcased taxon.
    """
    c = yaml.load(open('explorer/static/explorer/conf/configuration.yaml', 'r'), Loader=yaml.FullLoader)

    r = open('.update/history', 'r')
    updates = list(csv.reader(r, delimiter='\t'))
    updates.pop()
    
    if len(updates) > 0:
        c['update'] = updates.pop()[2]
    else:
        c['update'] = None

    if language in c['languages']['available']:
        c['languages']['current'] = language

    return c