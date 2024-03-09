import geopandas as gpd
import csv
import pyproj
import shapely

def extract(rfile, wfile, column, value, delimiter='\t'):
    """
    Create a new csv file by selecting data from an other.
    Parameters
    ----------
    rfile : str
        The name of the file to read.
    wfile : str
        The name of the file to write.
    column : str
        The name of the column to sample.
    value : str
        The value of the selected column.
    delimiter : str optional
        The delimiter of the csv files.
    """
    # Open the file to read and create the reader
    with open('data/{0}.csv'.format(rfile), 'r') as r:
        reader = csv.reader(r, delimiter=delimiter)
        data = list(reader)

        # Open a new file to write as text and create the writer
        with open('data/{0}.csv'.format(wfile), 'wt') as w:
            writer = csv.writer(w, delimiter=delimiter)

            # Retrieve the index of the column
            index = get_column_index(data, column)

            # Get the header row and write it
            header = data[0]
            writer.writerow(header)

            # Loop through remaining rows
            for i in range(1, len(data) - 1):
                row = data[i]
                # Write the row if the index is the same as the wanted column
                if row[index] == value:
                    writer.writerow(row)

def get_column_index(data, column):
    """
    Return the index of the column from the data.
    Parameters
    ----------
    data : list
        List of data from a csv file reader.
    column : str
        The name of the column to get the index from.
    """
    # Get the header
    header = data[0]
    # Return the index of the column name if it is found
    if column in header:
        return header.index(column)
    else:
        raise Exception('No column named {0}.'.format(column))

def get_observations(data, xcol, ycol):
    """
    Export observations from a data list.
    """
    xindex = get_column_index(data, xcol)
    yindex = get_column_index(data, ycol)

    observations = []
    for i in range(1, len(data) - 1):
        row = data[i]
        x, y = row[xindex], row[yindex]
        coords = project([x, y])
        observations.append({'geometry': shapely.Point(coords)})
    
    return observations

def project(coordinates, epsg1=4326, epsg2=3857):
    """
    Reproject coordinates from epsg1 to epsg2.
    """
    proj = pyproj.Transformer.from_crs(epsg1, epsg2, always_xy=True)
    return proj.transform(coordinates[0], coordinates[1])

def write_geojson(data, filename, crs):
    gdf = gpd.GeoDataFrame(data, crs=crs)

    records = gdf.to_records()
    for n in records:
        print(n)

    gdf.to_file('{0}.geojson'.format(filename), driver='GeoJSON')