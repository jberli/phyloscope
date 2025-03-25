from django.core.management.base import BaseCommand

from explorer.api.iconic import update_iconic_taxon
from phyloscope.management.warnings import prompt

class Command(BaseCommand):
    help = 'Update iconic'

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
            doit = prompt('''You are about to update iconic taxon. This operation might take some time. Continue? ''')
        if (doit):
            update_iconic_taxon()
        else:
            print('Nothing was done')