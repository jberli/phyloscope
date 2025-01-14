from django.core.management.base import BaseCommand

from explorer.database.tools.database import display_database_information

class Command(BaseCommand):
    def handle(self, *args, **options):
        display_database_information()