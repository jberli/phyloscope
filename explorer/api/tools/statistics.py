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
            if t.status == 'EX':
                t.ex = 1
            elif t.status == 'EW':
                t.ew = 1
            elif t.status == 'CR':
                t.cr = 1
            elif t.status == 'EN':
                t.en = 1
            elif t.status == 'VU':
                t.vu = 1
            elif t.status == 'NT':
                t.nt = 1
            elif t.status == 'CD':
                t.cd = 1
            elif t.status == 'LC':
                t.lc = 1
            elif t.status == 'DD':
                t.dd = 1
            elif t.status == 'NE':
                t.ne = 1
            elif t.status == 'UN':
                t.un = 1

            t.count_species = 1
            t.save()
        else:
            add = True
            total = ex = ew = cr = en = vu = nt = cd = lc = dd = ne = un = 0
            for child in children:
                if child.count_species is None:
                    add = False
                    break
                total += child.count_species
                ex += child.ex
                ew += child.ew
                cr += child.cr
                en += child.en
                vu += child.vu
                nt += child.nt
                cd += child.cd
                lc += child.lc
                dd += child.dd
                ne += child.ne
                un += child.un
            if add:
                t.ex = ex
                t.ew = ew
                t.cr = cr
                t.en = en
                t.vu = vu
                t.nt = nt
                t.cd = cd
                t.lc = lc
                t.dd = dd
                t.ne = ne
                t.un = un
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