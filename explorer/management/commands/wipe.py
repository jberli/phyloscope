from django.core.management.base import BaseCommand

from explorer.maintenance.tools.models import wipe_database
from phylopedia.management.warnings import prompt

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
            doit = prompt('''You are about to remove all entries from the database. Continue? ''')
        if (doit):
            wipe_database()
        else:
            print('Nothing was done')