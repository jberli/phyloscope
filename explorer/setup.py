import yaml

configuration = open('explorer/static/explorer/conf/configuration.yaml', 'r')
APP_CONFIGURATION = yaml.safe_load(configuration)