from django.core.management.base import BaseCommand

from explorer.api.showcase import update_taxon
from phyloscope.management.warnings import prompt

class Command(BaseCommand):
    help = 'Update the taxon of the day'

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
            doit = prompt('''You are about to update the taxon of the week. Continue? ''')
        if (doit):
            update_taxon()
        else:
            print('Nothing was done')