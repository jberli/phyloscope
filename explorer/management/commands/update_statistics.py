from django.core.management.base import BaseCommand

from explorer.api.tools.statistics import calculate_statistics
from phyloscope.management.warnings import prompt

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
            doit = prompt('''You are about to calculate statistics. This operation might take some time. Continue? ''')
        if (doit):
            calculate_statistics()
        else:
            print('Nothing was done')