import os
import pause
import datetime
import shutil
import zipfile
import csv
import logging
import pandas as pd
import numpy as np

from progress.bar import IncrementalBar, Bar
from django.db.models import Max

from explorer.api.tools.models import wipe_database, display_database_information
from explorer.api.tools.files import get_row_number, read_csv, read_entry, download
from explorer.api.tools.fetch import fetch_api
from explorer.api.tools.iconic import update_iconic_taxon
from explorer.api.configuration import get_configuration

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
            try:
                # Fetch information from iNaturalist API and insert them in files
                infos = fetch_api(taxa)
                insert_information(infos, writerinfos, writerphoto)
            except:
                print('error when fetching batch. Skipping...')

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
    bar = IncrementalBar('...1/5 taxon               ', max=inb, suffix='%(percent)d%%')
    for row in ireader:
        entry = read_entry(row, ifields, iindexes)
        if entry['id'] != '':
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
    bar = IncrementalBar('...2/5 photo               ', max=pnb, suffix='%(percent)d%%') 
    for row in preader:
        entry = read_entry(row, pfields, pindexes)
        if entry['taxon'] != '':
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
    bar = IncrementalBar('...3/5 english vernacular  ', max=nenb, suffix='%(percent)d%%')
    for row in nereader:
        entry = read_entry(row, nefields, neindexes)
        if entry['id'] != '':
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
    bar = IncrementalBar('...4/5 french vernacular   ', max=nfnb, suffix='%(percent)d%%')
    for row in nfreader:
        entry = read_entry(row, nffields, nfindexes)
        if entry['id'] != '':
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
    bar = IncrementalBar('...5/5 find parents        ', max=inb, suffix='%(percent)d%%')
    for row in ireader:
        entry = read_entry(row, ifields, iindexes)
        tid = int(entry['id'])
        if entry['parent'] != '':
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

def get_taxonomy_from_file(directory, limit=None, update=True):
    pathzip = f'{directory}/taxonomy.zip'

    # Download the file inside the data folder
    print('Downloading taxonomy file...')
    download('https://www.inaturalist.org/taxa/inaturalist-taxonomy.dwca.zip', pathzip)

    # Extract the zip file in a temporary file
    with zipfile.ZipFile(pathzip, 'r') as z:
        z.extractall(directory)

    print('Finding missing taxa...')
    typesorting = get_configuration()['typesorting']

    mapper = {}
    # Create a custom mapper to order data according to the typesorting
    for typesort, entry in typesorting.items():
        mapper[typesort] = entry['level']

    # Retrieve the list of taxon index already present in database
    taxons = [ x['tid'] for x in list(Taxon.objects.order_by('tid').values('tid').distinct()) ]
    # Columns to keep
    tokeep = [ 'id', 'scientificName', 'taxonRank' ]

    # Read the taxa file as a Panda dataframe
    df = pd.read_csv(f'{directory}/taxa.csv', sep=',')
    # Drop unwanted columns
    df = df.drop(df.columns.difference(tokeep), axis=1)
    # Add a new column with the custom level mapper
    df['level'] = df['taxonRank'].map(mapper)

    # Sort the dataframe by level in descending order (Life -> species)
    df = df.sort_values(by=['level'], ascending=False)
    # Convert id and level to numeric
    df['id'] = pd.to_numeric(df['id'])
    df['level'] = pd.to_numeric(df['level'])

    # The list of taxon present in database absent from the fetched file
    absent = [ i for i in taxons if int(i) not in df.id.values ]

    if update:
        # Remove already present taxa
        mask = df['id'].isin(taxons)
        df = df[-mask]

    # If a limit has been specified, dump data above the value
    if limit is not None:
        df = df.head(limit)

    # Create the list of new taxon id to fetch
    return df['id'].to_list(), absent

def add_missing_parents(directory):
    # Retrieve the list of taxon index already present in database
    orphans = [ x.tid for x in list(Taxon.objects.filter(parent__isnull=True)) ]
    
    # If new taxons were found (should be if limit > 0 and taxonomy file is not empty)
    if len(orphans) > 0:
        # Fetch data and write in csv files
        fetch_data(orphans, directory)

        inb = get_row_number(f'{directory}/taxa_infos.csv')
        ifields = [ 'id', 'parent', 'rank_level', 'rank', 'name', 'extinct', 'status', 'wikipedia' ]
        ir, ireader, iindexes = read_csv(f'{directory}/taxa_infos.csv', ifields, '|')

        before = datetime.datetime.now()
        bar = IncrementalBar('...Add missing parents     ', max=inb, suffix='%(percent)d%%')
        for row in ireader:
            entry = read_entry(row, ifields, iindexes)
            tid = int(entry['id'])
            if entry['parent'] != '':
                parent_id = int(entry['parent'])
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

def initialize(limit=None, batch=30, maximum=10000):
    """
    Initialize the database: wipe the existing one, download the taxonomy, fetch
    information through the API and insert them.

    Also retrieve the taxon ranges, process them and insert them.
    """
    print("Initializing database...")

    # Set the temp fil directory
    directory = '.update'

    # Create or erase the history file
    whistory = open(f'{directory}/history', 'w')
    start = datetime.datetime.now()
    whistory.write('INIT\t')
    whistory.write(f'{start.strftime('%Y-%m-%d %H:%M:%S')}\t')
    whistory.close()

    pathtmp = f'{directory}/tmp'

    if not os.path.exists(pathtmp):
        os.makedirs(pathtmp)
    
    status = 'FAIL'
    try:
        # Get the list of taxon
        new_taxons, absents = get_taxonomy_from_file(pathtmp, limit, False)
        print()

        # If new taxons were found (should be if limit > 0 and taxonomy file is not empty)
        if len(new_taxons) > 0:
            # Fetch data and write in csv files
            fetch_data(new_taxons, pathtmp, batch, maximum)

            # Wipe the database.
            wipe_database()

            # Inserting fetched data in database.
            insert_data(new_taxons, pathtmp)
        else:
            print(f'No new taxon to add in database. Ending.')

        # Add missing parents
        add_missing_parents(pathtmp)
        print()

        # Display database information
        display_database_information()

        status = 'SUCCESS'

    except:
        raise Exception('An error occured.')

    finally:
        # Get current time
        end = datetime.datetime.now()
        # Open history file and write new line with end time
        whistory = open(f'{directory}/history', 'a')
        whistory.write(f'{end.strftime('%Y-%m-%d %H:%M:%S')}\t')
        # Write elapsed time
        elapsed = end - start
        whistory.write(f'{elapsed}\t')
        # Write status (FAIL or SUCCESS)
        whistory.write(status)
        whistory.close()

        # Remove temp taxonomy file
        print('Cleaning temporary files...')
        # shutil.rmtree(pathtmp)

def update(limit=None, batch=30, maximum=10000):
    """
    Update the database.

    First, download the full taxonomy list, compare taxon id to get missing taxons or taxons
    that do not exist anymore and remove or add them and propagate changes.
    """
    print("Updating database...")

    directory = '.update'

    number_update = get_row_number(f'{directory}/history') 
    whistory = open(f'{directory}/history', 'a')

    if number_update > 0:
        whistory.write(f'\n')

    # Get the current date
    start = datetime.datetime.now()
    whistory.write('UPDATE\t')
    whistory.write(f'{start.strftime('%Y-%m-%d %H:%M:%S')}\t')
    whistory.close()

    pathtmp = f'{directory}/tmp'

    if not os.path.exists(pathtmp):
        os.makedirs(pathtmp)

    status = 'FAIL'
    try:
        # Get the list of taxon
        new_taxons, absents = get_taxonomy_from_file(pathtmp, limit, True)
        print()

        # Remove entries not existing in updated taxonomy file
        for index in absents:
            Taxon.objects.filter(tid=index).delete()

        # If missing taxons were found
        if len(new_taxons) > 0:
            # Fetch data and write in csv files
            fetch_data(new_taxons, pathtmp, batch, maximum)

            # Inserting fetched data in database.
            insert_data(new_taxons, pathtmp)
        else:
            print(f'No new taxon to add in database. Ending.')

        # Add missing parents
        add_missing_parents(pathtmp)
        print()

        # Display database information
        display_database_information()

        status = 'SUCCESS'

    except:
        raise Exception('An error occured.')

    finally:
        end = datetime.datetime.now()
        whistory = open(f'{directory}/history', 'a')
        whistory.write(f'{end.strftime('%Y-%m-%d %H:%M:%S')}\t')
        elapsed = end - start
        whistory.write(f'{elapsed}\t')
        whistory.write(status)
        whistory.close()

        print('Cleaning temporary files...')
        shutil.rmtree(pathtmp)