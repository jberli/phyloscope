import pyproj

def project(coordinates, epsg1=4326, epsg2=3857):
    """
    Reproject coordinates from epsg1 to epsg2.
    """
    proj = pyproj.Transformer.from_crs(epsg1, epsg2, always_xy=True)
    return proj.transform(coordinates[0], coordinates[1])