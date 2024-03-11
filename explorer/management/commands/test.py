from django.core.management.base import BaseCommand

from explorer.database.update import test

class Command(BaseCommand):
    def handle(self, *args, **options):
        test()