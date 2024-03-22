import geopandas as gpd
import pandas
import csv
import sys

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
    gdf.to_file('{0}.geojson'.format(filename), driver='GeoJSON')

def write_json(data, filename):
    df = pandas.DataFrame.from_dict(data)
    df.to_json('{0}.json'.format(filename))

def read_csv(file, fields):
    """
    Read a csv file and return the opened file, the reader, and the indexes of the provided fields name.
    """
    r = open(file, 'r')
    reader = csv.reader(r, delimiter='\t')
    colnames = next(reader)
    indexes = []
    for i, col in enumerate(colnames):
        if col in fields:
            indexes.append(i)
    if len(indexes) != len(fields):
        raise Exception('The number of fields does not match the occurrence.txt file.')
    return r, reader, indexes

def read_entry(row, fields, indexes):
    """
    Construct the entry dictionnary.
    """
    # Reconstruct the entry by removing unwanted columns
    values = []
    j = 0
    for i, value in enumerate(row):
        if i in indexes:
            values.append(value)
            j += 1

    # Make a dict from the entry and the fields
    return dict(zip(fields, values))

def get_row_number(file):
    r = open(file, 'r')
    reader = csv.reader(r, delimiter='\t')
    row_count = sum(1 for row in reader)
    r.close()
    return row_count

def progress(count, total, suffix=''):
    bar_len = 60
    filled_len = int(round(bar_len * count / float(total)))
    percents = round(100.0 * count / float(total), 1)
    bar = '=' * filled_len + '-' * (bar_len - filled_len)
    sys.stdout.write('[%s] %s%s ...%s\r' % (bar, percents, '%', suffix))
    sys.stdout.flush()