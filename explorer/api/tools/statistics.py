import datetime
from progress.bar import IncrementalBar

from explorer.models import Taxon

def calculate_statistics():
    taxa = Taxon.objects.order_by('level')
    highest = taxa.last().level

    before = datetime.datetime.now()
    bar = IncrementalBar('...1/2 count species       ', max=len(taxa), suffix='%(percent)d%%')
    for t in taxa:
        children = t.children.all()
        if len(children) == 0:
            t.count_species = 1
            t.save()
        else:
            total = 0
            add = True
            for child in children:
                if child.count_species is None:
                    add = False
                    break
                total += child.count_species
            if add:
                t.count_species = total
                t.save()
        bar.next()
    bar.next()
    after = datetime.datetime.now()
    print(f' in {str(after - before)}')

    done = []
    before = datetime.datetime.now()
    bar = IncrementalBar('...2/2 calculate percentage', max=len(taxa), suffix='%(percent)d%%')
    for t in taxa:
        parent = t.parent
        if parent is not None:
            if parent.tid not in done:
                count = parent.count_species
                siblings = parent.children.all()
                for sibling in siblings:
                    scount = sibling.count_species
                    sibling.percentage_parent = 100 * scount / count
                    sibling.save()
                done.append(parent.tid)
        bar.next()
    bar.next()
    after = datetime.datetime.now()
    print(f' in {str(after - before)}')
    bar.finish()