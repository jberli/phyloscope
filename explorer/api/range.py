import os
import pause
import requests
import datetime
import shutil
import json
import multiprocessing as mp

from progress.bar import IncrementalBar
from geopandas import read_file
from shapely import MultiPolygon, from_wkt, make_valid, union
from shapely.ops import unary_union
from django.contrib.gis.geos import GEOSGeometry

from explorer.models import Taxon
from explorer.api.tools.files import download
from explorer.api.tools.geometry import connect_antimeridian, make_overlap_antimeridian, smooth_multipolygon, enlarge_small_parts

def get_range(index):
    """
    Get the range from a given taxon index.
    """
    taxon = Taxon.objects.get(tid=index)
    r = taxon.range
    t = taxon.rank
    if taxon.range is not None:
        r = r.wkt
    else:
        r = ''
    return {
        'range': r,
        'typesorting': t
    }

def update_range():
    """
    Fetch taxon range and update the database.
    """

    # DOWNLOAD GEOPACKAGES
    urlmeta = 'https://inaturalist-open-data.s3.us-east-1.amazonaws.com/geomodel/geopackages/latest/metadata.json'
    urlgpkg = 'https://inaturalist-open-data.s3.us-east-1.amazonaws.com/geomodel/geopackages/latest/iNaturalist_geomodel'

    directory = '.update'
    tmp = 'range'
    pathtmp = f'{directory}/{tmp}'

    if not os.path.exists(pathtmp):
        os.makedirs(pathtmp)
    
    # Download the metadata file
    r = requests.get(urlmeta)
    # Parse to json
    metadata = json.loads(r.content)

    inb = len(metadata['collections'].keys())
    before = datetime.datetime.now()
    bar = IncrementalBar('...Downloading range files     ', max=inb, suffix='%(percent)d%%')
    # Loop through each collection
    for k, info in metadata['collections'].items():
        if info['archives'] > 1:
            for i in range(1, info['archives'] + 1):
                try:
                    download(f'{urlgpkg}_{k}_{i}.gpkg', f'{directory}/{tmp}/{k}_{i}.gpkg')
                except:
                    pass
        else:
            try:
                download(f'{urlgpkg}_{k}.gpkg', f'{directory}/{tmp}/{k}.gpkg')
            except:
                pass
        bar.next()
    bar.next()
    after = datetime.datetime.now()
    print(f' in {str(after - before)}')

    # INSERT RANGES FROM GEOPACKAGES
    osdir = os.fsencode(pathtmp)
    inb = len(os.listdir(osdir))
    for f in sorted(os.listdir(osdir)):
        before = datetime.datetime.now()
        filename = os.fsdecode(f)
        file = os.path.join(pathtmp, filename)
        gdf = read_file(file)
        gdf = gdf.to_crs('EPSG:3857')

        bar = IncrementalBar(f'...Inserting {filename} ', max=gdf.shape[0], suffix='%(percent)d%%')
        for i, entry in gdf.iterrows():
            tid = entry.taxon_id
            geom = entry.geometry
            taxon = Taxon.objects.filter(tid=tid)
            if len(taxon) > 0:
                # Fill in the gap along the antimeridian before inserting
                filled = connect_antimeridian(geom)
                taxon[0].range = GEOSGeometry(filled.wkt, srid=3857)
                taxon[0].rstate = 'original'
                taxon[0].save()
            bar.next()
        bar.next()
        after = datetime.datetime.now()
        print(f' in {str(after - before)}')

    # ADD RANGES UP THE TAXONOMY
    before = datetime.datetime.now()
    taxons = Taxon.objects.filter(rstate='init').order_by('level')

    bar = IncrementalBar(f'...Adding range to ancestry ', max=len(taxons), suffix='%(percent)d%%')
    for taxon in taxons:
        children = taxon.children.all()
        if len(children) > 0:
            geometry = None
            for child in children:
                if child.range is not None:
                    multi = from_wkt(child.range.wkt)
                    if geometry is None:
                        geometry = multi
                    else:
                        geometry = unary_union([ make_valid(geometry), multi ])
            if geometry is not None:
                if geometry.geom_type == 'Polygon':
                    geometry = MultiPolygon([geometry])

                taxon.range = GEOSGeometry(geometry.wkt, srid=3857)
                taxon.rstate = 'unioned'
                taxon.save()
        bar.next()
    
    bar.finish()
    after = datetime.datetime.now()

    # CORRECT GEOMETRIES
    before = datetime.datetime.now()
    ct = Taxon.objects.filter(rstate__in=['original', 'unioned']).count()

    bar = IncrementalBar(f'...Correcting geometries    ', max=ct)

    # with transaction.atomic():
    for taxon in Taxon.objects.all().iterator():
        if taxon.rstate in ['original', 'unioned']:
            state = taxon.rstate
            if state == 'original':
                rstate = 'ofinal'
            else:
                rstate = 'ufinal'

            multi = from_wkt(taxon.range.wkt)
            geometry = enlarge_small_parts(multi)
            geometry = make_overlap_antimeridian(geometry)
            geometry = smooth_multipolygon(geometry)

            taxon.range = GEOSGeometry(geometry.wkt, srid=3857)
            taxon.rstate = rstate
            taxon.save()

            bar.next()
    
    bar.finish()
    after = datetime.datetime.now()

    print(f' in {str(after - before)}')
    shutil.rmtree(pathtmp)