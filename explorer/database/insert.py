import os
import csv
import time
import pyinaturalist as inat
import wikipedia
from bs4 import BeautifulSoup
import requests

from progress.bar import Bar
from explorer.models import Taxon, Names, Photo, Observations

from explorer.database.tools.files import read_csv, read_entry, get_row_number, write_json
from explorer.database.tools.geography import project
from explorer.database.tools.database import (
    display_database_information,
    get_taxonomy,
    insert_species,
    update_taxonomy,
    get_date,
    get_taxon_id
)

def inset_data():
    """
    Insert data into the database after preprocessing.
    TODO: Make the code work for updates only.
    """

    # Fetch API information from iNaturalist
    # Returns two rows for taxon and photo
    def fetch_api(taxa):
        e = inat.get_taxa_by_id(taxa)
        rows = []
        prows = []
        for entry in e['results']:
            taxon_id = entry['id']
            parent_id = entry['parent_id']
            rank_level = entry['rank_level']
            rank = entry['rank']
            name = entry['name']
            extinct = entry['extinct']

            default_photo = None
            if entry['default_photo'] is not None:
                if entry['default_photo']['license_code'] is not None:
                    default_photo = entry['default_photo']['id']
            if default_photo is None:
                for p in entry['taxon_photos']:
                    if p['photo']['license_code'] is not None:
                        default_photo = p['photo']['id']
                        break

            for p in entry['taxon_photos']:
                if p['photo']['license_code'] is not None:
                    height, width = p['photo']['original_dimensions']['height'], p['photo']['original_dimensions']['width']
                    extension = p['photo']['url'].split('.')[-1]
                    prows.append([ p['photo']['id'], taxon_id, p['photo']['license_code'], extension, height, width ])

            status_fr, status_world = None, None
            for key, value in entry.items():
                if key == 'conservation_statuses':
                    for v in value:
                        if 'authority' in v:
                            if v['place'] is not None:
                                if v['place']['name'] == 'France':
                                    status_fr = v['status']
                            else:
                                status_world = v['status']

            # wikipage = None
            # if entry['wikipedia_url'] is not None:
            #     page = requests.get(entry['wikipedia_url'])
            #     soup = BeautifulSoup(page.content, 'html.parser')
            #     links = [(el.get('lang'), el.get('title')) for el in soup.select('li.interlanguage-link > a')]
            #     for language, title in links:
            #         if language == 'fr':
            #             page_title = title.split(u' – ')[0]
            #             wikipedia.set_lang(language)
            #             page = wikipedia.page(page_title)
            #             wikipage = page.url

            rows.append([ taxon_id, parent_id, rank_level, rank, name, extinct, default_photo, status_world, status_fr ])
        return rows, prows

######################################################################
##### CREATE THE TAXA_TMP FILE WITH TAXA PRESENTS INSIDE THE OBSERVATION FILE

    # # Observations and taxa files
    # ofile = 'explorer/database/data/observations.csv'
    # tfile = 'explorer/database/data/taxa_ancestry.csv'

    # # Get the number of rows in the observation file
    # onb = get_row_number(ofile)
    # tnb = get_row_number(tfile)

    # ofields =  ['taxonID']
    # tfields =  ['taxon_id', 'ancestry', 'rank_level', 'rank', 'name']
    # # Read the observation csv file
    # ro, oreader, oindexes = read_csv(ofile, ofields)
    # rt, treader, tindexes = read_csv(tfile, tfields)

    # # Storage for distinct taxon id in observations
    # distinct = []
    # with Bar('Retrieve distinct taxon from observations...', max=onb, fill='#', suffix='%(percent)d%%') as bar:
    #     for row in oreader:
    #         if int(row[oindexes[0]]) not in distinct:
    #             distinct.append(int(row[oindexes[0]]))
    #         bar.next()
    
    # print('Found {0} distinct taxon in observations.'.format(len(distinct)))

    # with Bar('Retrieve missing ancestry taxon ids...', max=tnb, fill='#', suffix='%(percent)d%%') as bar:
    #     for row in treader:
    #         entry = read_entry(row, tfields, tindexes)
    #         if int(entry['taxon_id']) in distinct:
    #             ancestry = entry['ancestry'].split('/')
    #             for a in ancestry:
    #                 parent = int(a) if len(a) > 0 else None
    #                 if parent is not None and parent not in distinct:
    #                     distinct.append(parent)
    #         bar.next()
    # rt.close()

    # print('Added {0} distinct taxon.'.format(len(distinct)))

    # newpath = r'explorer/database/data/tmp' 
    # if not os.path.exists(newpath):
    #     os.makedirs(newpath)

    # w = open('explorer/database/data/tmp/taxa_tmp.csv', 'w')
    # writer = csv.writer(w, delimiter='\t')

    # for row in distinct:
    #     writer.writerow([row])

    # w.close()
    # print('Wrote {0} distinct taxon into the file.'.format(len(distinct)))
    # w.close()
    # print('Wrote {0} distinct taxon into the file.'.format(count))

####################################################################################
## ADD PARENT TAXON API INFO AND PHOTOS

    # tfile = 'explorer/database/data/tmp/taxa_tmp.csv'
    # # Get the number of rows in the taxa file
    # tnb = get_row_number(tfile)
    # r = open(tfile, 'r')
    # reader = csv.reader(r, delimiter='\t')

    # w = open('explorer/database/data/tmp/taxa_inat_tmp1.csv', 'w')
    # writer = csv.writer(w, delimiter='\t')
    # writer.writerow([ 'taxon_id', 'parent_id', 'rank_level', 'rank', 'name', 'extinct', 'photo_id', 'status_world', 'status_fr' ])
    # wp = open('explorer/database/data/tmp/photo_inat_tmp1.csv', 'w')
    # writerp = csv.writer(wp, delimiter='\t')
    # writerp.writerow([ 'photo_id', 'taxon_id', 'license', 'extension', 'height', 'width' ])

    # taxa = []
    # with Bar('Fetching API information...', max=tnb, fill='#', suffix='%(percent)d%%') as bar:
    #     for row in reader:
    #         taxa.append(row[0])
    #         if len(taxa) > 29:
    #             rows, rowsp = fetch_api(taxa)
    #             writer.writerows(rows)
    #             writerp.writerows(rowsp)
    #             taxa = []
    #             time.sleep(1)
    #         bar.next()

    #     if len(taxa) > 0:
    #         rows, rowsp = fetch_api(taxa)
    #         writer.writerows(rows)
    #         writerp.writerows(rowsp)        
    
####################################################################################
## UPDATE MISSING PARENT TAXON API INFO (RUN MANUALLY UNTIL NO PARENT IS MISSING)

    # tfile = 'explorer/database/data/tmp/taxa_inat_tmp.csv'

    # # Get the number of rows in the taxa file
    # tnb = get_row_number(tfile)

    # r = open(tfile, 'r')
    # reader = csv.reader(r, delimiter='\t')
    # colnames = next(reader)

    # w = open('explorer/database/data/tmp/taxa_inat_tmp.csv', 'a')
    # writer = csv.writer(w, delimiter='\t')
    # wp = open('explorer/database/data/tmp/photo_inat_tmp.csv', 'a')
    # writerp = csv.writer(wp, delimiter='\t')

    # children = []
    # parents = []
    # for row in reader:
    #     p = int(row[1]) if len(row[1]) > 0 else None
    #     if p is not None:
    #         parents.append(p)
    #     children.append(int(row[0]))

    # count = 0
    # taxa = []
    # for i, p in enumerate(parents):
    #     if p not in children:
    #         count += 1
    #         taxa.append(p)
    #         if len(taxa) > 29:
    #             rows, rowsp = fetch_api(taxa)
    #             writer.writerows(rows)
    #             writerp.writerows(rowsp)
    #             taxa = []
    #             time.sleep(1)

    # if len(taxa) > 0:
    #     rows, rowsp = fetch_api(taxa)
    #     writer.writerows(rows)
    #     writerp.writerows(rowsp)
    
    # print(count)

#################################################################################################################
####### INSERT TAXON INSIDE THE DATABASE

    # # Observations and taxa files
    # tfile = 'explorer/database/data/tmp/taxa_pb_tmp.csv'

    # # Get the number of rows in the observation file
    # tnb = get_row_number(tfile)
    
    # tfields =  [ 'taxon_id', 'parent_id', 'rank_level', 'rank', 'name', 'photo_id', 'status_world', 'status_fr' ]

    # # Read the observation csv file
    # rt, treader, tindexes = read_csv(tfile, tfields)

    # wp = open('explorer/database/data/tmp/taxa_pb.csv', 'w')
    # writerp = csv.writer(wp, delimiter='\t')

    # with Bar('Insert taxa in database...', max=tnb, fill='#', suffix='%(percent)d%%') as bar:
    #     for row in treader:
    #         entry = read_entry(row, tfields, tindexes)
    #         taxon = Taxon(
    #             tid = int(entry['taxon_id']),
    #             level = float(entry['rank_level']),
    #             rank = entry['rank'],
    #             name = entry['name'],
    #             status_world = entry['status_world'],
    #             status_france = entry['status_fr'],
    #         )

    #         parent_id = int(entry['parent_id']) if len(entry['parent_id']) > 0 else None
    #         if parent_id is not None:
    #             if len(Taxon.objects.filter(tid=parent_id)) > 0:
    #                 parent = Taxon.objects.get(tid=parent_id)
    #                 taxon.parent = parent
    #             else:
    #                 writerp.writerow(row)
    #         else:
    #                 writerp.writerow(row)
   
    #         taxon.save()
    #         bar.next()

###################################################################
####### INSERT MISSING TAXON 

    # # Observations and taxa files
    # tfile = 'explorer/database/data/tmp/taxa_inat_tmp.csv'

    # # Get the number of rows in the observation file
    # tnb = get_row_number(tfile)
    
    # tfields =  [ 'taxon_id', 'parent_id', 'rank_level', 'rank', 'name', 'photo_id', 'status_world', 'status_fr' ]

    # # Read the observation csv file
    # rt, treader, tindexes = read_csv(tfile, tfields)

    # wp = open('explorer/database/data/tmp/taxa_pb.csv', 'w')
    # writerp = csv.writer(wp, delimiter='\t')

    # taxons = [x['tid'] for x in  list(Taxon.objects.order_by('tid').values('tid').distinct())]

    # with Bar('Insert taxa in database...', max=tnb, fill='#', suffix='%(percent)d%%') as bar:
    #     for row in treader:
    #         entry = read_entry(row, tfields, tindexes)
    #         if int(entry['taxon_id']) not in taxons:
    #             taxon = Taxon(
    #                 tid = int(entry['taxon_id']),
    #                 level = float(entry['rank_level']),
    #                 rank = entry['rank'],
    #                 name = entry['name'],
    #                 status_world = entry['status_world'],
    #                 status_france = entry['status_fr'],
    #             )

    #             parent_id = int(entry['parent_id']) if len(entry['parent_id']) > 0 else None
    #             if parent_id is not None:
    #                 if len(Taxon.objects.filter(tid=parent_id)) > 0:
    #                     parent = Taxon.objects.get(tid=parent_id)
    #                     taxon.parent = parent
    #                 else:
    #                     writerp.writerow(row)
    #             else:
    #                     writerp.writerow(row)
            
    #             taxon.save()
    #         bar.next()

####################################################################
# UPDATE MISSING PARENT ID

    # # Observations and taxa files
    # tfile = 'explorer/database/data/tmp/taxa_inat_tmp.csv'

    # # Get the number of rows in the observation file
    # tnb = get_row_number(tfile)
    
    # tfields =  [ 'taxon_id', 'parent_id', 'rank_level', 'rank', 'name', 'photo_id', 'status_world', 'status_fr' ]

    # # Read the observation csv file
    # rt, treader, tindexes = read_csv(tfile, tfields)

    # wp = open('explorer/database/data/tmp/taxa_pb.csv', 'w')
    # writerp = csv.writer(wp, delimiter='\t')

    # taxons = [x['tid'] for x in  list(Taxon.objects.order_by('tid').values('tid').distinct())]

    # with Bar('Insert taxa in database...', max=tnb, fill='#', suffix='%(percent)d%%') as bar:
    #     for row in treader:
    #         entry = read_entry(row, tfields, tindexes)
    #         if len(entry['parent_id']) > 0:
    #             t = Taxon.objects.get(tid=int(entry['taxon_id']))
    #             if t.parent_id is None:
    #                 parent = Taxon.objects.get(tid=int(entry['parent_id']))
    #                 t.parent_id = parent
    #                 t.save()
    #     bar.next()


####################################################################
######### INSERT PHOTOS WITH TAXON FOREIGN KEY

    # tfile = 'explorer/database/data/tmp/photo_inat_tmp1.csv'
    # tnb = get_row_number(tfile)
    # tfields =  [ 'photo_id', 'taxon_id', 'license', 'extension', 'height', 'width' ]
    # rt, treader, tindexes = read_csv(tfile, tfields)

    # wp = open('explorer/database/data/tmp/photo_pb.csv', 'w')
    # writerp = csv.writer(wp, delimiter='\t')
    # writerp.writerow(['photo_id', 'taxon_id'])

    # taxons = [x['tid'] for x in  list(Taxon.objects.order_by('tid').values('tid').distinct())]

    # with Bar('Insert taxa in database...', max=tnb, fill='#', suffix='%(percent)d%%') as bar:
    #     for row in treader:
    #         entry = read_entry(row, tfields, tindexes)
    #         photo_id = int(entry['photo_id'])
    #         taxon_id = int(entry['taxon_id'])
    #         license = entry['license']
    #         extension = entry['extension']
    #         height = int(entry['height']) if len(entry['height']) > 0 else None
    #         width = int(entry['width']) if len(entry['width']) > 0 else None

    #         if taxon_id in taxons:
    #             taxon = Taxon.objects.get(tid=taxon_id)
    #             Photo(
    #                 pid=photo_id,
    #                 taxon_id=taxon,
    #                 license=license,
    #                 extension=extension,
    #                 height=height,
    #                 width=width
    #             ).save()
    #         else:
    #             writerp.writerow([photo_id, taxon_id])
    #         bar.next()

####################################################################
######### UPDATE TAXON TO ADD FOREIGN KEY TO THE DEFAULT PHOTO

    # tfile = 'explorer/database/data/tmp/taxa_inat_tmp.csv'
    # tnb = get_row_number(tfile)
    # tfields =  [ 'taxon_id', 'parent_id', 'rank_level', 'rank', 'name', 'photo_id', 'status_world', 'status_fr' ]
    # rt, treader, tindexes = read_csv(tfile, tfields)

    # wp = open('explorer/database/data/tmp/photo_pb.csv', 'w')
    # writerp = csv.writer(wp, delimiter='\t')
    # writerp.writerow(['photo_id', 'taxon_id'])

    # with Bar('Update taxon default photo...', max=tnb, fill='#', suffix='%(percent)d%%') as bar:
    #     for row in treader:
    #         entry = read_entry(row, tfields, tindexes)
    #         taxon_id = int(entry['taxon_id'])
    #         photo_id = int(entry['photo_id']) if len(entry['photo_id']) else None

    #         if photo_id is not None:
    #             photos = Photo.objects.filter(pid=photo_id)
    #             if len(photos) > 0:
    #                 taxon = Taxon.objects.get(tid=taxon_id)
    #                 taxon.default_photo = photos[0]
    #             else:
    #                 writerp.writerow([photo_id, taxon_id])
    #         bar.next()

#####################################################################

    tfile = 'explorer/database/data/tmp/names_en.csv'
    tnb = get_row_number(tfile)
    tfields =  [ 'taxon_id', 'name', 'language', 'country' ]
    rt, treader, tindexes = read_csv(tfile, tfields)

    # wp = open('explorer/database/data/tmp/photo_pb.csv', 'w')
    # writerp = csv.writer(wp, delimiter='\t')
    # writerp.writerow(['photo_id', 'taxon_id'])

    taxons = [x['tid'] for x in  list(Taxon.objects.order_by('tid').values('tid').distinct())]

    with Bar('Update taxon default photo...', max=tnb, fill='#', suffix='%(percent)d%%') as bar:
        for row in treader:
            entry = read_entry(row, tfields, tindexes)
            taxon_id = int(entry['taxon_id'])
            if taxon_id in taxons:
                name, language, country = entry['name'], entry['language'], entry['country']
                taxon = Taxon.objects.get(tid=taxon_id)
                Names(
                    taxon=taxon,
                    name=name,
                    language=language,
                    country=country
                ).save()

            bar.next()

#####################################################################

    # pfile = 'explorer/database/data/photo_inat_tmp.csv'
    # pnb = get_row_number(pfile)
    # pfields =  [ 'photo_id', 'taxon_id', 'license_code', 'author', 'height', 'width' ]
    # ro, oreader, oindexes = read_csv(pfile, pfields)

    # with Bar('Insert photos in database...', max=pnb, fill='#', suffix='%(percent)d%%') as bar:
    #     for row in oreader:

    #         bar.next()

######################################################################

    