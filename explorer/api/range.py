import os
import pause
import requests
import datetime
import json

from progress.bar import IncrementalBar
from geopandas import read_file
from django.contrib.gis.geos import GEOSGeometry

from explorer.models import Taxon
from explorer.api.tools.files import download

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
    bar = IncrementalBar('...1/2 downloading range files     ', max=inb, suffix='%(percent)d%%')
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

    osdir = os.fsencode(pathtmp)
    
    inb = len(os.listdir(osdir))
    before = datetime.datetime.now()
    bar = IncrementalBar('...2/2 inserting range in database ', max=inb, suffix='%(percent)d%%')
    for f in os.listdir(osdir):
        filename = os.fsdecode(f)
        file = os.path.join(pathtmp, filename)
        gdf = read_file(file)
        gdf = gdf.to_crs('EPSG:3857')
    
        for i, entry in gdf.iterrows():
            tid = entry.taxon_id
            geom = entry.geometry

            taxon = Taxon.objects.filter(tid=tid)
            if len(taxon) > 0:
                taxon[0].range = GEOSGeometry(geom.wkt, srid=3857)
                taxon[0].save()
        bar.next()
    bar.next()
    after = datetime.datetime.now()
    print(f' in {str(after - before)}')


# def get_iucn_range(index):
#     """
#     Get the range from iNaturalist KML range.
#     """
#     rangeurl = f'https://www.inaturalist.org/taxa/{index}/range.kml'
#     response = requests.get(rangeurl)

#     if response.status_code == 429:
#         pause.seconds(10)
#         get_iucn_range(index)
#     else:
#         string = ''
#         try:
#             # If the KML is parsable return the kml as a string
#             xml.dom.minidom.parseString(response.content)
#             string = response.content.decode()
#         except:
#             string = ''
#         finally:
#             return string

# def update_range1(all=False):
#     """
#     Fetch taxon range from iNaturalist and update the database.
#     """
#     before = datetime.datetime.now()

#     # Get the list of all species
#     taxons = Taxon.objects.filter(rank='species', range__isnull=True).order_by('tid')

#     bar = IncrementalBar(f'...Fetching {len(taxons)} taxons ', max=len(taxons), suffix='%(percent)d%%')

#     for taxon in taxons:
#         check = True
#         if not all:
#             if not taxon.present:
#                 check = False

#         if check:
#             r = get_iucn_range(taxon.tid)
#             if r != '':
#                 r = r.replace("http://earth.google.com/kml/2.1", "http://www.opengis.net/kml/2.2")
#                 try:
#                     k = kml.KML().from_string(bytes(r, encoding='utf-8'))
#                 except:
#                     taxon.present = False
#                     taxon.save()
#                     continue

#                 p = list(find_all(k, of_type=Placemark))
#                 if len(p) > 0:
#                     geom = GEOSGeometry(p[0].geometry.wkt, srid=4326)
#                     geom.transform(3857)
#                     s = force_2d(from_wkt(geom.wkt))
#                     add = True
#                     if s.geom_type == 'Polygon':
#                         s = MultiPolygon([s])
#                     elif s.geom_type == 'MultiPolygon':
#                         pass
#                     else:
#                         add = False

#                     if add:
#                         geom = GEOSGeometry(s.wkt, srid=3857)
#                         taxon.range = geom
#                         taxon.present = True
#                         taxon.save()
#                     else:
#                         taxon.present = False
#                         taxon.save()
#                 else:
#                     taxon.present = False
#                     taxon.save()
#             else:
#                 taxon.present = False
#                 taxon.save()

#         bar.next()
#     bar.next()
#     after = datetime.datetime.now()
#     print(f' in {str(after - before)}')

# def update_ancestry_range1():
#     """
#     Update the range of species ancestry.
#     """
#     taxons = Taxon.objects.all().order_by('level')

#     min_islands = 1000000000
#     min_holes = 100000000000

#     bar = IncrementalBar(f'...Adding range to ancestry ', max=len(taxons), suffix='%(percent)d%%')
#     for taxon in taxons:
#         children = taxon.children.all()
#         if len(children) > 0:
#             geometry = None
#             for child in children:
#                 multi = child.range
#                 if multi is not None:
#                     for simple in multi:
#                         s = make_valid(from_wkt(simple.wkt))
#                         if s.area > min_islands:
#                             s = simplify(s, 10000)
#                             if geometry is None:
#                                 geometry = make_valid(s)
#                             else:

#                                 try:
#                                     geometry = union(make_valid(geometry), make_valid(s))
#                                 except:
#                                     pass

#             if geometry is not None:
#                 part = []
#                 if geometry.geom_type == 'Polygon':
#                     part.append(geometry)
#                 else:
#                     for p in geometry.geoms:
#                         if p.geom_type == 'Polygon':
#                             interiors = []
#                             for interior in p.interiors:
#                                 poly = Polygon(interior)
#                                 if poly.area > min_holes:
#                                     interiors.append(interior)
#                             temp_poly = Polygon(p.exterior.coords, holes=interiors)
#                             part.append(temp_poly)

#                 geometry = MultiPolygon(part)
#                 taxon.range = GEOSGeometry(geometry.wkt, srid=3857)
#                 taxon.save()

#         bar.next()
#     bar.next()
#     bar.finish()