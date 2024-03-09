from django.core.management.base import BaseCommand

from explorer.database.update import *
from oazo.management.warnings import prompt

class Command(BaseCommand):
    help = 'Initialize application'

    def add_arguments(self, parser):
        parser.add_argument(
            '--nocheck',
            action='store_true',
            help='Ignore warning and proceed.',
        )

    def handle(self, *args, **options):
        if options['nocheck']:
            doit = True
        else:
            doit = prompt(
'''You are about to add entries to the database.
This operation might take some time, continue?
''')
        if (doit):
            print('Updating database...')
            update_database()
        else:
            print('Nothing was done')