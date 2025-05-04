from django.core.management.base import BaseCommand

from explorer.api.tools.models import display_database_information

class Command(BaseCommand):
    def handle(self, *args, **options):
        display_database_information()