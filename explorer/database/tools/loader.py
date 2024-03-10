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
    with open(rfile, 'r') as r:
        reader = csv.reader(r, delimiter=delimiter)

        # Open a new file to write as text and create the writer
        with open(wfile, 'wt') as w:
            writer = csv.writer(w, delimiter=delimiter)

            # Get the header row and write it
            header = next(reader)

            if column in header:
                index = header.index(column)
            else:
                raise Exception('No column named {0}.'.format(column))

            writer.writerow(header)

            # Loop through remaining rows
            for row in reader:
                # Write the row if the index is the same as the wanted column
                if row[index] == value:
                    writer.writerow(row)

def display_present(column):
    # Open the file to read and create the reader
    with open('explorer/database/data/occurrence.txt', 'r') as r:
        reader = csv.reader(r, delimiter='\t')
        header = next(reader)
        if column in header:
                index = header.index(column)
        else:
            raise Exception('No column named {0}.'.format(column))
        for row in reader:
            v = row[index]
            if v != '':
                print(v)

def display_absent(column):
    # Open the file to read and create the reader
    with open('explorer/database/data/occurrence.txt', 'r') as r:
        reader = csv.reader(r, delimiter='\t')
        header = next(reader)
        if column in header:
                index = header.index(column)
        else:
            raise Exception('No column named {0}.'.format(column))
        counter = 0
        for row in reader:
            v = row[index]
            if v == '':
                print(row)
                counter += 1

def write_geojson(data, filename, crs):
    gdf = gpd.GeoDataFrame(data, crs=crs)

    records = gdf.to_records()
    for n in records:
        print(n)

    gdf.to_file('{0}.geojson'.format(filename), driver='GeoJSON')