import os
import pause
import datetime
import shutil
import zipfile
import csv
import logging

from progress.bar import IncrementalBar, Bar
from django.db.models import Max

from explorer.api.tools.models import wipe_database, display_database_information
from explorer.api.tools.files import get_row_number, read_csv, read_entry, download
from explorer.api.tools.fetch import fetch_api

# Import models to access the database
from explorer.models import Taxon, Names, Photo 

def fetch_data(taxons, tmp, batch=30, maximum=10000):
    """
    Fetch the missing taxons using the iNaturalist API and write
    the results inside .csv files.
    """
    def insert_information(infos, writerinfos, writerphoto):
        for i in infos:
            # Write the information in the file
            writerinfos.writerow([
                i['id'], i['parent'], i['rank_level'], i['rank'],
                i['name'], i['extinct'], i['status'], i['wikipedia']
            ])
            # Add photo to the file
            for p in i['photo']:
                writerphoto.writerow(p)

    print(f'{len(taxons)} new taxons to fetch using iNaturalist API.')

    # Create a file to store infos on missing taxons
    winfos = open(f'{tmp}/taxa_infos.csv', 'w')
    writerinfos = csv.writer(winfos, delimiter='|')
    writerinfos.writerow([ 'id', 'parent', 'rank_level', 'rank', 'name', 'extinct', 'status', 'wikipedia' ])

    # Create a file to store photo infos
    wphoto = open(f'{tmp}/taxa_photos.csv', 'w')
    writerphoto = csv.writer(wphoto, delimiter='|')
    writerphoto.writerow([ 'id', 'taxon', 'default', 'license', 'extension', 'height', 'width' ])

    taxa = []
    before = datetime.datetime.now()
    bar = IncrementalBar('...fetching API     ', max=len(taxons), suffix='%(percent)d%%')
    nb_request = 0
    for i in taxons:
        taxa.append(i)
        # Wait until taxa has 30 entries before fetching info
        if len(taxa) >= batch:
            # Fetch information from iNaturalist API and insert them in files
            infos = fetch_api(taxa)
            insert_information(infos, writerinfos, writerphoto)
            # Reset taxa list
            taxa = []
            # Wait 1 second to avoid overloading the API
            pause.seconds(1)
            nb_request += 1

        # If the number of requests is above the daily threshold, wait 24 hours
        if nb_request >= maximum:
            print(' maximum requests, waiting 24 hours.')
            pause.days(1)
            # Reset the number of requests
            nb_request = 0

        bar.next()
    
    # Insert the remaining batch
    if len(taxa) > 0:
        infos = fetch_api(taxa)
        insert_information(infos, writerinfos, writerphoto)
        bar.next()
    bar.next()

    after = datetime.datetime.now()
    print(f' in {str(after - before)}')
    print()
    winfos.close()
    wphoto.close()

def insert_data(taxons, tmp):
    """
    Insert the fetched data in the database.
    """
    print("Inserting in database...")

    inb = get_row_number(f'{tmp}/taxa_infos.csv')
    ifields = [ 'id', 'parent', 'rank_level', 'rank', 'name', 'extinct', 'status', 'wikipedia' ]
    ir, ireader, iindexes = read_csv(f'{tmp}/taxa_infos.csv', ifields, '|')

    before = datetime.datetime.now()
    bar = IncrementalBar('...1/7 taxon               ', max=inb, suffix='%(percent)d%%')
    for row in ireader:
        entry = read_entry(row, ifields, iindexes)
        tid = int(entry['id'])
        taxon = Taxon(
            tid = tid,
            level = float(entry['rank_level']),
            rank = entry['rank'],
            name = entry['name'],
            status = entry['status'],
            wikipedia = entry['wikipedia'],
        )

        taxon.save()
        bar.next()
    bar.next()
    after = datetime.datetime.now()
    print(f' in {str(after - before)}')

    pnb = get_row_number(f'{tmp}/taxa_photos.csv')
    pfields = [ 'id', 'taxon', 'default', 'license', 'extension', 'height', 'width' ]
    pr, preader, pindexes = read_csv(f'{tmp}/taxa_photos.csv', pfields, '|')

    before = datetime.datetime.now()
    bar = IncrementalBar('...2/7 photo               ', max=pnb, suffix='%(percent)d%%') 
    for row in preader:
        entry = read_entry(row, pfields, pindexes)
        tid = int(entry['taxon'])
        if tid in taxons:
            photo = Photo(
                pid = int(entry['id']),
                taxon_id = Taxon.objects.get(tid=tid),
                default = entry['default'],
                license = entry['license'],
                extension = entry['extension'] if len(entry['extension']) < 5 else None,
                height = int(entry['height']) if len(entry['height']) > 0 else None,
                width = int(entry['width']) if len(entry['width']) > 0 else None,
            )
            photo.save()
        bar.next()
    bar.next()
    after = datetime.datetime.now()
    print(f' in {str(after - before)}')

    nenb = get_row_number(f'{tmp}/VernacularNames-english.csv')
    nefields = ['id', 'vernacularName', 'language', 'countryCode']
    ner, nereader, neindexes = read_csv(f'{tmp}/VernacularNames-english.csv', nefields, ',')

    before = datetime.datetime.now()
    bar = IncrementalBar('...3/7 english vernacular  ', max=nenb, suffix='%(percent)d%%')
    for row in nereader:
        entry = read_entry(row, nefields, neindexes)
        tid = int(entry['id'])
        if tid in taxons:
            name = Names(
                taxon = Taxon.objects.get(tid=tid),
                name = entry['vernacularName'],
                language = entry['language'],
                country = entry['countryCode'],
            )
            name.save()
        bar.next()
    bar.next()
    after = datetime.datetime.now()
    print(f' in {str(after - before)}')

    nfnb = get_row_number(f'{tmp}/VernacularNames-french.csv')
    nffields = ['id', 'vernacularName', 'language', 'countryCode']
    nfr, nfreader, nfindexes = read_csv(f'{tmp}/VernacularNames-french.csv', nffields, ',')

    before = datetime.datetime.now()
    bar = IncrementalBar('...4/7 french vernacular   ', max=nfnb, suffix='%(percent)d%%')
    for row in nfreader:
        entry = read_entry(row, nffields, nfindexes)
        tid = int(entry['id'])
        if tid in taxons:
            name = Names(
                taxon = Taxon.objects.get(tid=tid),
                name = entry['vernacularName'],
                language = entry['language'],
                country = entry['countryCode'],
            )
            name.save()
        
        bar.next()
    bar.next()
    after = datetime.datetime.now()
    print(f' in {str(after - before)}')

    # Add the name of life in french if it doesn't exist already
    if len(Taxon.objects.filter(tid=48460)) > 0:
        taxon = Taxon.objects.get(tid=48460)
        if len(Names.objects.filter(taxon=taxon, language='fr')) == 0:
            Names(name='vie', taxon=taxon, language='fr', country='').save()

    inb = get_row_number(f'{tmp}/taxa_infos.csv')
    ifields = [ 'id', 'parent' ]
    ir, ireader, iindexes = read_csv(f'{tmp}/taxa_infos.csv', ifields, '|')

    before = datetime.datetime.now()
    bar = IncrementalBar('...5/7 find parents        ', max=inb, suffix='%(percent)d%%')
    for row in ireader:
        entry = read_entry(row, ifields, iindexes)
        tid = int(entry['id'])
        parent_id = int(entry['parent'])
        if tid in taxons:
            if len(Taxon.objects.filter(tid=tid)) > 0:
                taxon = Taxon.objects.get(tid=tid)
                if len(Taxon.objects.filter(tid=parent_id)) > 0:
                    parent = Taxon.objects.get(tid=parent_id)
                    taxon.parent = parent
                    taxon.save()
        bar.next()
    bar.next()
    after = datetime.datetime.now()
    print(f' in {str(after - before)}')

    taxa = Taxon.objects.order_by('level')
    highest = taxa.last().level

    before = datetime.datetime.now()
    bar = IncrementalBar('...6/7 count species       ', max=len(taxa), suffix='%(percent)d%%')
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
    bar = IncrementalBar('...7/7 calculate percentage', max=len(taxa), suffix='%(percent)d%%')
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

def update(initialize=False, batch=30, maximum=10000, limit=20000):
    """
    Update the database.
    """
    if initialize:
        print("Initializing database...")
        utype = 'initialization'
    else:
        print("Updating database...")
        utype = 'update'

    directory = '.update'
    tmp = 'tmp'

    number_update = get_row_number(f'{directory}/history') 
    whistory = open(f'{directory}/history', 'a')

    if number_update > 0:
        whistory.write(f'\n')

    # Get the current date
    start = datetime.datetime.now()
    whistory.write(f'{utype}\t')
    whistory.write(f'start:{start.strftime('%Y-%m-%d %H:%M:%S')}\t')
    whistory.close()
    # Set the file name with the current date
    filename = f'taxonomy'
    filezip = f'{filename}.zip'
    pathtmp = f'{directory}/{tmp}'
    pathzip = f'{pathtmp}/{filezip}'

    if not os.path.exists(pathtmp):
        os.makedirs(pathtmp)

    status = 'FAIL'
    try:
        # Download the file inside the data folder
        print('Downloading taxonomy file...')
        download('https://www.inaturalist.org/taxa/inaturalist-taxonomy.dwca.zip', pathzip)

        # Extract the zip file in a temporary file
        with zipfile.ZipFile(pathzip, 'r') as z:
            z.extractall(pathtmp)

        # Retrieve the list of taxon index already present in database
        taxons = [ x['tid'] for x in list(Taxon.objects.order_by('tid').values('tid').distinct()) ]

        # Get the number of rows and retrieve the file reader
        nb = get_row_number(f'{pathtmp}/taxa.csv')
        tfields = [ 'id', 'scientificName', 'taxonRank' ]
        r, reader, indexes = read_csv(f'{pathtmp}/taxa.csv', tfields, ',')

        # Counter for missing taxon indexes
        tnb = 0
        new_taxons = []
        for row in reader:
            tid = int(row[indexes[0]])
            if tid not in taxons:
                new_taxons.append(tid)

                tnb += 1
                if limit is not None:
                    if tnb >= limit:
                        break

        print()
        # If missing taxons were found
        if len(new_taxons) > 0:
            # Fetch data and write in csv files
            fetch_data(new_taxons, pathtmp)

            # If initialize mode is true, wipe the database
            if initialize:
                wipe_database()

            # Inserting fetched data in database.
            insert_data(new_taxons, pathtmp)
        else:
            print(f'No new taxon to add in database. Ending.')

        # Display database information
        display_database_information()

        status = 'SUCCESS'

    except:
        raise Exception('An error occured.')

    finally:
        end = datetime.datetime.now()
        whistory = open(f'{directory}/history', 'a')
        whistory.write(f'end:{end.strftime('%Y-%m-%d %H:%M:%S')}\t')
        elapsed = end - start
        whistory.write(f'elapsed:{elapsed}\t')
        whistory.write(status)
        whistory.close()

        print('Cleaning temporary files...')
        shutil.rmtree(pathtmp)