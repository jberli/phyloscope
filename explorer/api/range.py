import os
import pause
import requests
import datetime
import json
import multiprocessing as mp

from progress.bar import IncrementalBar
from geopandas import read_file
from shapely import MultiPolygon, from_wkt, make_valid, union
from shapely.ops import unary_union
from django.contrib.gis.geos import GEOSGeometry

from explorer.models import Taxon
from explorer.api.tools.files import download
from explorer.api.tools.geometry import correct_geometry

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
    # urlmeta = 'https://inaturalist-open-data.s3.us-east-1.amazonaws.com/geomodel/geopackages/latest/metadata.json'
    # urlgpkg = 'https://inaturalist-open-data.s3.us-east-1.amazonaws.com/geomodel/geopackages/latest/iNaturalist_geomodel'

    directory = '.update'
    tmp = 'range'
    pathtmp = f'{directory}/{tmp}'

    # if not os.path.exists(pathtmp):
    #     os.makedirs(pathtmp)
    
    # # Download the metadata file
    # r = requests.get(urlmeta)
    # # Parse to json
    # metadata = json.loads(r.content)

    # inb = len(metadata['collections'].keys())
    # before = datetime.datetime.now()
    # bar = IncrementalBar('...Downloading range files     ', max=inb, suffix='%(percent)d%%')
    # # Loop through each collection
    # for k, info in metadata['collections'].items():
    #     if info['archives'] > 1:
    #         for i in range(1, info['archives'] + 1):
    #             try:
    #                 download(f'{urlgpkg}_{k}_{i}.gpkg', f'{directory}/{tmp}/{k}_{i}.gpkg')
    #             except:
    #                 pass
    #     else:
    #         try:
    #             download(f'{urlgpkg}_{k}.gpkg', f'{directory}/{tmp}/{k}.gpkg')
    #         except:
    #             pass
    #     bar.next()
    # bar.next()
    # after = datetime.datetime.now()
    # print(f' in {str(after - before)}')

    # osdir = os.fsencode(pathtmp)
    
    # inb = len(os.listdir(osdir))
    # before = datetime.datetime.now()
   
    # for f in sorted(os.listdir(osdir)):
    #     filename = os.fsdecode(f)
    #     file = os.path.join(pathtmp, filename)
    #     gdf = read_file(file)
    #     gdf = gdf.to_crs('EPSG:3857')

    #     bar = IncrementalBar(f'...Inserting {filename} ', max=gdf.shape[0], suffix='%(percent)d%%')
    #     for i, entry in gdf.iterrows():
    #         tid = entry.taxon_id
    #         geom = entry.geometry
    #         taxon = Taxon.objects.filter(tid=tid)
    #         if len(taxon) > 0:
    #             taxon[0].range = GEOSGeometry(geom.wkt, srid=3857)
    #             taxon[0].save()
    #         bar.next()
    #     bar.next()
    #     after = datetime.datetime.now()
    #     print(f' in {str(after - before)}')

    before = datetime.datetime.now()
    taxons = Taxon.objects.all().order_by('level')
    # bar = IncrementalBar(f'...Adding range to ancestry ', max=len(taxons), suffix='%(percent)d%%')

    # # Use 12 CPU cores
    # threads = 12

    # chunk_size = len(taxons) // threads
    # row_chunks = [taxons[i:i + chunk_size] for i in range(0, len(taxons), chunk_size)]

    # chunks = []
    # chunk = []
    # for taxon in taxons:
    #     if len(chunk) >= 12:
    #         chunks.append(chunk)
    #         chunk = []
    #     else:
    #         chunk.append(taxon)
    
    # if len(chunk) > 0:
    #     chunks.append(chunk)

    # def calculate_range(taxon):
    #     children = taxon.children.all()
    #     if len(children) > 0:
    #         geometry = None
    #         for child in children:
    #             multi = child.range
    #             if multi is not None:
    #                 for simple in multi:
    #                     s = make_valid(from_wkt(simple.wkt))
    #                     if geometry is None:
    #                         geometry = s
    #                     else:
    #                         geometry = union(make_valid(geometry), make_valid(s))
    #         if geometry is not None:
    #             part = []
    #             if geometry.geom_type == 'Polygon':
    #                 part.append(geometry)
    #             else:
    #                 part += geometry.geoms
    #             geometry = MultiPolygon(part)
    #             taxon.range = GEOSGeometry(geometry.wkt, srid=3857)
    #             taxon.save()

    # for chunk in chunks:
    #     with mp.Pool(processes=threads) as pool:
    #         results = pool.map_async(calculate_range, chunk)
    #     bar.next()

    for taxon in taxons:
        print(taxon.tid, taxon.rank, taxon.name)
        children = taxon.children.all()
        if len(children) > 0:
            geometry = None
            for child in children:
                multi = child.range
                if geometry is None:
                    geometry = multi
                else:
                    geometry = unary_union([make_valid(geometry), multi])
            if geometry is not None:
                part = []
                if geometry.geom_type == 'Polygon':
                    part.append(geometry)
                else:
                    part += geometry.geoms
                geometry = MultiPolygon(part)
                taxon.range = GEOSGeometry(geometry.wkt, srid=3857)
                taxon.save()
    #     bar.next()
    
    # bar.finish()
    after = datetime.datetime.now()

    print(f' in {str(after - before)}')