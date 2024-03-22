from django.core.management.base import BaseCommand

from explorer.database.insert import inset_data
from oazo.management.warnings import prompt

class Command(BaseCommand):
    help = 'Update database'

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
            inset_data()
        else:
            print('Nothing was done')