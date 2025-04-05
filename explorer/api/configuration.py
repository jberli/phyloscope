import yaml
import csv

def get_configuration():
    """
    Retrieve the configuration along with taxonomic information on the showcased taxon.
    """
    c = yaml.load(open('explorer/static/explorer/conf/configuration.yaml', 'r'), Loader=yaml.FullLoader)

    r = open('.update/history', 'r')
    updates = list(csv.reader(r, delimiter='\t'))

    update = None
    initialization = None
    for u in reversed(updates):
        if u[4] == 'SUCCESS':
            update = u[2]
            break

    for u in reversed(updates):
        if u[0] == 'initialization' and u[4] == 'SUCCESS':
            initialization = u[2]
            break
    
    c['database'] = {
        'update': update,
        'initialization': initialization
    }

    return c