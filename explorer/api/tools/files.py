import csv
import sys

from urllib.request import urlretrieve

def read_csv(file, fields, delimiter):
    """
    Read a csv file and return the opened file, the reader, and the indexes of the provided fields name.
    """
    r = open(file, 'r')
    reader = csv.reader(r, delimiter=delimiter)
    colnames = next(reader)
    indexes = []
    for i, col in enumerate(colnames):
        if col in fields:
            indexes.append(i)
    if len(indexes) != len(fields):
        raise Exception('The number of fields does not match the given file.')
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
    """
    Get the number of rows inside a csv file.
    """
    r = open(file, 'r')
    reader = csv.reader(r, delimiter='\t')
    row_count = sum(1 for row in reader)
    r.close()
    return row_count

def download(url, filename):
    """
    Download a file from the given URL.
    """
    urlretrieve(url, filename)