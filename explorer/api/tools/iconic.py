import datetime
from progress.bar import IncrementalBar

from explorer.models import Taxon

ICONIC = {
    47115: 'mollusc', 85493: 'crustacean', 372739: 'insect', 205907: 'trilobite', 144128: 'myriapod',
    333781: 'trilobite', 245097: 'arachnid', 47534: 'jellyfish', 20978: 'amphibian', 40151: 'mammal',
    26036: 'reptile', 47273: 'shark', 3: 'bird', 47178: 'fish', 60450: 'fish', 52319: 'worm', 47491: 'worm',
    68104: 'other', 54960: 'worm', 48824: 'other', 1517206: 'dinosaur', 703470: 'dinosaur', 151817: 'cell',
    85497: 'fish', 1365642: 'dinosaur', 714997: 'fish', 797045: 'eel', 130868: 'other', 129726: 'other',
    211191: 'other', 122158: 'other', 124337: 'other', 51280: 'worm', 126917: 'other', 151826: 'other',
    51508: 'jellyfish', 51836: 'worm', 151829: 'other', 68235: 'other', 151827: 'other', 151830: 'other',
    151832: 'other', 63142: 'worm', 151838: 'other', 151831: 'other', 47549: 'starfish', 151833: 'other',
    774624: 'other', 151836: 'other', 151837: 'other', 48051: 'other', 151828: 'other', 884506: 'other',
    48222: 'cell', 47170: 'mushroom', 47126: 'plant', 67333: 'bacteria', 131236: 'virus', 47686: 'cell',
}

def update_iconic_taxon():
    """
    Update the iconic taxon name
    """
    taxons = Taxon.objects.order_by('-level')
    bar = IncrementalBar('...Add iconic taxon        ', max=len(taxons), suffix='%(percent)d%%')
    before = datetime.datetime.now()

    def update_children(children, filename):
        if len(children) > 0:
            for child in children:
                child.iconic = filename
                child.save()
                bar.next()
                update_children(child.children.all(), filename)

    for t, filename in ICONIC.items():
        bar.next()
        taxa = Taxon.objects.filter(tid=t)

        if len(taxa) > 0:
            taxon = taxa[0]
            taxon.iconic = filename
            taxon.save()
            update_children(taxon.children.all(), filename)
        
        bar.next()
    
    bar.next()
    after = datetime.datetime.now()
    print(f' in {str(after - before)}')