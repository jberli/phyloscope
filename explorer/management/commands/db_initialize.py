from django.core.management.base import BaseCommand

from explorer.api.update import update
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
            doit = prompt('''You are about to remove all entries from the database and rebuild it from scratch. Continue? ''')
        if (doit):
            update(True, limit=50000)
        else:
            print('Nothing was done')