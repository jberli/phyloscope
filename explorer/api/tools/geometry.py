import numpy as np

from shapely import Point, LineString, Polygon, MultiPolygon, STRtree, intersection
from shapely.ops import unary_union
from shapely.affinity import translate

def resample_line(line, step, keep_vertices=False):
    """
    Densify a line by adding vertices.

    This function densifies a line by adding a vertex every 'step' along the line.
    It preserves the first and last vertex of the line.
    
    Parameters
    ----------
    line : LineString
        The line to densify.
    step : float
        The step (in meters) to resample the geometry.
    keep_vertices : bool, optional
        If set to true, original vertices of the line are kept.
        This is useful to keep the exact same geographical shape.

    Returns
    -------
    LineString

    Examples
    --------
    >>> line = LineString([(1, 1), (5, 1)])
    >>> resample_line(line, 1)
    <LINESTRING (1 1, 2 1, 3 1, 4 1, 5 1)>
    """

    coords = list(line.coords)
    original = []

    if keep_vertices:
        for i in range(1, len(coords) - 1):
            c = coords[i]
            d = shapely.line_locate_point(line, shapely.Point(c))
            original.append((c, d))
    
    # Get the length of the line
    length = line.length 
    
    # Storage for final vertices, starting with the start of the line
    xy = [(line.coords[0])]
    
    for distance in np.arange(step, int(length), step):
        if keep_vertices:
            remove = 0
            for i, o in enumerate(original):
                if o[1] < distance:
                    xy.append(o[0])
                    remove += 1
            for r in range(0, remove):
                original.pop(0)

        # Interpolate a point every step along the old line
        point = line.interpolate(distance)
        # Add the tuple of coordinates
        xy.append((point.x, point.y))
    
    # Add the last point of the line if it doesn't already exist
    if xy[-1] != line.coords[-1]:
        xy.append(line.coords[-1])
        
    # Here, we return a new line with densified points.
    return LineString(xy)

def gaussian_smoothing(geometry, sigma=30, sample=None, densify=True):
    """
    Smooth a line or a polygon and attenuate its inflexion points.

    The gaussian smoothing has been studied by Babaud *et al.* :footcite:p:`babaud:1986`
    for image processing, and by Plazanet :footcite:p:`plazanet:1996`
    for the generalisation of cartographic features.

    Parameters
    ----------
    geometry : LineString or Polygon
        The line or polygon to smooth.
        If a line is provided, the first and last vertexes are kept.
        If a polygon is provided, every vertex is smoothed.
    sigma : float, optional
        Gaussian filter strength. Default value to 30, which is a high value.
    sample : float, optional
        The length in meter between each nodes after resampling the geometry.
        If not provided, the sample is derived from the geometry and is the average distance between
        each consecutive vertex.
    densify : bool, optional
        Whether the resulting geometry should keep the new vertex density. Default to True.

    Returns
    -------
    LineString or Polygon

    References
    ----------
    .. footbibliography::

    Examples
    --------
    >>> line = LineString([(0, 0), (1, 1), (2, 0), (5, 3)])
    >>> c4.gaussian_smoothing(line, 1)
    <LINESTRING (0 0, 1.666666666666667 0.6051115971014416, 3.333333333333334 1.6051115971014418, 5 3)>

    >>> polygon = Polygon([(0, 0), (0, 1), (1, 1), (1, 0), (0, 0)])
    >>> c4.gaussian_smoothing(polygon, 1)
    <POLYGON ((0.1168459780814714 0.3005282653219513, ... 0.1168459780814714 0.3005282653219513))>
    """
    # Extend the given set of points at its first and last points of k points using central inversion.
    def extend(line, interval):
        # Compute the central inversion of a position. origin is the center of symmetry and p is the point to inverse.
        def central_inversion(origin, p):
            x = 2 * origin[0] - p[0]
            y = 2 * origin[1] - p[1]
            return (x,y)
        
        # Get the coordinates of the vertices
        coords = list(line.coords)
        # Get the first and last vertex
        first, last = coords[0], coords[-1]

        # Get the index of the penultimate vertex
        # -2 is to avoid taking the last vertex
        pen = len(coords) - 2

        # Set the start of the line as the central inversion of n first vertices (n = interval)
        result = [central_inversion(first, coords[i]) for i in range(interval, 0, -1)]

        # Add the full line as the middle part of the line
        result.extend(coords)

        # Add the end of the line as the central inversion of n last vertices (n = interval)
        result.extend([central_inversion(last, coords[i]) for i in range(pen, pen - interval, -1)])

        return LineString(result)

    polygon = None
    ring = None
    geomtype = geometry.geom_type
    if geomtype == 'LineString':
        polygon = False
        ring = geometry
    elif geomtype == 'Polygon':
        polygon = True
        ring = geometry.exterior
    else:
        raise Exception("{0} geometry cannot be smoothed.".format(geomtype))

    coords = list(ring.coords)

    if sample is None:
        distances = []
        for i in range(0, len(coords) - 1):
            v1, v2 = coords[i], coords[i + 1]
            distances.append(Point(v1).distance(Point(v2)))
        avg = (sum(distances) / len(distances))
        sample = avg

    # First resample the line, making sure there is a maximum distance between two consecutive vertices
    resampled = resample_line(ring, sample)

    # Calculate the interval (number of vertex to take into consideration when smoothing)
    interval = round(4 * sigma / sample)
    # If the interval is longer than the input line, we change the interval and recalculate the sigma
    if interval >= len(resampled.coords):
        interval = len(resampled.coords) - 1
        sigma = interval * sample / 4
    
    # Compute gaussian coefficients
    c2 = -1.0 / (2.0 * sigma * sigma)
    c1 = 1.0 / (sigma * np.sqrt(2.0 * np.pi))

    # Compute the gaussian weights and their sum
    weights = []
    total = 0
    for k in range (0, interval + 1):
        weight = c1 * np.exp(c2 * k * k)
        weights.append(weight)
        total += weight
        if k > 0:
            total += weight
    
    rline = list(resampled.coords)
    length = len(rline)

    if polygon:
        extended = LineString(rline[-interval:] + rline + rline[:interval])
    else:
        # Extend the line at its first and last points with central inversion
        extended = extend(resampled, interval)

    smoothed_coords = []
    for i in range(0, length):
        x, y = 0, 0
        for k in range(-interval , interval + 1):
            p1 = extended.coords[i - k + interval]
            x += weights[abs(k)] * p1[0] / total
            y += weights[abs(k)] * p1[1] / total
        smoothed_coords.append((x,y))

    if densify:
        final_coords = smoothed_coords
    else:
        # Only return the points matching the input points in the resulting filtered line
        final_coords = []
        # Stores for index of already treated vertices
        done = []
        # Loop through initial vertices
        for point in coords:
            # Set the distance to infinite
            distance = float("inf")
            nearest = None
            # Loop through smoothed coordinates
            for i in range(len(smoothed_coords)):
                # Check that the index has not been already added
                if i not in done:
                    # Calculate distance from the point
                    d = shapely.Point(smoothed_coords[i]).distance(Point(point))
                    if d < distance:
                        # Update distance and nearest index if below existing
                        distance, nearest = d, i

            # If a nearest point has been found, add it to the new line
            if nearest is not None:
                final_coords.append(smoothed_coords[nearest])
                # Add the index as treated already
                done.append(nearest)
            else:
                final_coords.append(point)
    
    result = None
    if polygon:
        final_coords.append(final_coords[0])
        result = Polygon(final_coords)
    else:
        # Replace first and last vertex by the line's original ones
        final_coords[0] = Point(coords[0])
        final_coords[-1] = Point(coords[-1])
        result = LineString(final_coords)
    
    return result

def connect_antimeridian(multipolygon):
    """
    When the provided multipolygon as parts close to the antimeridian,
    fill the gap to snap the part to the antimeridian (min x or max x).
    """

    def remap(value, start1, stop1, start2, stop2):
        return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1))

    # Calculate min max coordinates from 3857 projection 
    minimum = -np.pi * 6378137
    maximum = np.pi * 6378137

    # Construct filler rectangles along the antimeridian
    minwidth = 10000
    maxwidth = 500000
    minheight = 20000
    maxheight = 100000
    squares = []
    total = minimum
    while total < maximum:
        xmin, ymin = minimum, total
        height = remap(abs(ymin), 0, maximum, minheight, maxheight)
        width = remap(abs(ymin), 0, maximum, minwidth, maxwidth)
        xmax, ymax = minimum + width, total + height
        squares.append(Polygon([[xmin, ymin], [xmin, ymax], [xmax, ymax], [xmax, ymin], [xmin, ymin]]))
        total += height
    
    total = minimum
    while total < maximum:
        xmax, ymin = maximum, total
        height = remap(abs(ymin), 0, maximum, minheight, maxheight)
        width = remap(abs(ymin), 0, maximum, minwidth, maxwidth)
        xmin, ymax = maximum - width, total + height
        squares.append(Polygon([[xmin, ymin], [xmin, ymax], [xmax, ymax], [xmax, ymin], [xmin, ymin]]))
        total += height

    # Keep only intersecting filler rectangles
    tree = STRtree(squares)
    indexes = tree.query(multipolygon, predicate='intersects')
    intersecting = []
    for i, s in enumerate(squares):
        if i in indexes:
            intersecting.append(s)

    # Union intersecting rectangles with the original polygon
    union = unary_union(intersecting + [x for x in multipolygon.geoms])

    # Clip the intersecting polygons using the projection bounds
    filled = intersection(union, Polygon([[minimum, minimum], [minimum, maximum], [maximum, maximum], [maximum, minimum], [minimum, minimum]]))
    if filled.geom_type == 'Polygon':
        filled = MultiPolygon([filled])

    return filled

def enlarge_small_parts(multipolygon):
    """
    Enlarge small parts of a multipolygon given a threshold.
    """
    # Calculate min max coordinates from 3857 projection 
    minimum = -np.pi * 6378137
    maximum = np.pi * 6378137

    enlarged = []
    for p in multipolygon.geoms:
        # Enlarge smaller sub polygons to enhance them
        if p.area < 10000000000:
            enlarged.append(p.buffer(40000))
        else:
            enlarged.append(p)
    unioned = unary_union(enlarged)

    if unioned.geom_type == 'Polygon':
        unioned = MultiPolygon([unioned])

    # Clip the intersecting polygons using the projection bounds
    clipped = intersection(unioned, Polygon([[minimum, minimum], [minimum, maximum], [maximum, maximum], [maximum, minimum], [minimum, minimum]]))
    
    if clipped.geom_type == 'Polygon':
        clipped = MultiPolygon([clipped])

    return clipped

def make_overlap_antimeridian(multipolygon):
    """
    Make the geometry overlaps the antimeridian if the resulting multipolygon
    is thinner (max east-west length) than the original.

    The bounded argument defines whether the provided multipolygon is constrained
    within the actual bounds of the 3857 projection.
    """

    # Calculate min max coordinates from 3857 projection 
    minimum = -np.pi * 6378137
    maximum = np.pi * 6378137

    # Return True or False if the provided meridian intersects with other polygons
    def is_bound(x, tree):
        # Create the actual meridian of x value
        meridian = LineString([[x, maximum], [x, minimum]])
        # Get the list of polygons intersecting this meridian
        t = tree.query(meridian, predicate='intersects')
        # If only one exists, it is a bounding x, returns true
        if len(t) == 1:
            return True
        else:
            return False

    # Sort polygons by their min x
    minsorted = sorted(list(multipolygon.geoms), key=lambda b: b.bounds[0])
    # Sort polygons by their max x
    maxsorted = sorted(list(multipolygon.geoms), key=lambda b: b.bounds[2])

    # This variable will store min x and max x of groups of polygons if
    # the associated meridian (with those x values) doesn't intersect with an other polygon
    bounds = []

    # Flag to know if the first min x polygon touches the antimeridian
    touchfirst = True if minsorted[0].bounds[0] == minimum else False
    # Flag to know if the last max x polygon touches the antimeridian
    touchlast = True if maxsorted[-1].bounds[2] == maximum else False

    # Add the antimeridian to the bounds if a polygon touches it
    if touchfirst:
        bounds.append([minimum])

    # Create an index for the minsorted polygons
    tree = STRtree(minsorted)

    # Loop through x values from east to west
    for i, poly in enumerate(minsorted):
        b = poly.bounds
        xmin = b[0]
        xmax = b[2]

        # HERE, TREAT THE MIN X OF THE CURRENT GROUP
        # Do not add the x value if already done before the loop
        add = False if touchfirst and i == 0 else True

        if add and is_bound(xmin, tree):
            bounds.append([xmin])
        
        # HERE, TREAT THE MAX X OF THE CURRENT GROUP
        # Do not add the x value if it will be done after the loop
        add = False if touchlast and i == (len(minsorted) - 1) else True

        if add and is_bound(xmax, tree):
            # Adding the xmax bound along with the xmin
            bounds[-1].append(xmax)

    # Add the antimeridian to the bounds if a polygon touches it at the end
    if touchlast:
        bounds[-1].append(maximum)

    distxmin = abs(minimum - bounds[0][0])
    distxmax = abs(maximum - bounds[-1][-1])
    mindistance = distxmin + distxmax

    pair = []
    previous = bounds[0]
    for i in range(1, len(bounds)):
        current = bounds[i]
        d = current[0] - previous[-1]
        if d > mindistance:
            pair = [ current[0], previous[-1] ]
            mindistance = d
        previous = current

    if len(pair) > 0:
        result = []
        if abs(minimum - pair[0]) > abs(maximum - pair[1]):
            shift = -maximum * 2
            for poly in minsorted:
                if poly.centroid.coords[0][0] > pair[1]:
                    result.append(translate(poly, shift))
                else:
                    result.append(poly)
        else:
            shift = maximum * 2
            for poly in minsorted:
                if poly.centroid.coords[0][0] < pair[0]:
                    result.append(translate(poly, shift))
                else:
                    result.append(poly)

        result = MultiPolygon(result)
    else:
        result = MultiPolygon(minsorted)

    unioned = unary_union(result)
    if unioned.geom_type == 'Polygon':
        unioned = MultiPolygon([unioned])

    return unioned

def smooth_multipolygon(multipolygon):
    """
    Smooth a multipolygon and optimize resulting shapes.
    """

    def remove_flat_angles(coordinates, tolerance=1):
        coords = list(coordinates)
        coords.pop()

        result = []
        for i in range(0, len(coords)):
            c0 = coords[i - 1] if i > 0 else coords[-1]
            c1 = coords[i]
            c2 = coords[i + 1] if i < len(coords) - 1 else coords[0]
            angle = abs(np.degrees(np.arctan2(c1[1] - c2[1], c1[0] - c2[0]) - np.arctan2(c1[1] - c0[1], c1[0] - c0[0])))

            if not abs(angle - 180) < tolerance:
                result.append(c1)            

        return result
        
    smoothed = []
    sigma=30000
    sample=30000
    for s in multipolygon.geoms:
        exterior = gaussian_smoothing(s, sigma, sample).exterior.coords
        exterior = remove_flat_angles(exterior)
        interiors = []
        for i in s.interiors:
            if i.length > sample:
                s = gaussian_smoothing(Polygon(i), sigma, sample)
                if (s.area > 1000000000):
                    interiors.append(remove_flat_angles(s.exterior.coords))
        if len(interiors) > 0:
            smoothed.append(Polygon(exterior, interiors))
        else:
            smoothed.append(Polygon(exterior))
        
    smoothed = MultiPolygon(smoothed)
    
    if smoothed.geom_type == 'Polygon':
        smoothed = MultiPolygon([smoothed])
    
    return smoothed