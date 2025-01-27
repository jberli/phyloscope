from explorer.models import Names, Taxon, Photo

def lookup(language, value):
    """
    Returns best taxon according to the provided string.
    """
    # Add entries until limit is reached
    def add_entries(names, taxons, e, vernacular=None):
        # Check if taxon has not been entered already
        if e.tid not in taxons:
            miniature = Photo.objects.filter(taxon_id=e, default=True)
            # e.default_photo
            link = None
            if len(miniature) > 0:
                link = 'https://inaturalist-open-data.s3.amazonaws.com/photos/{0}/square.{1}'.format(miniature[0].pid, miniature[0].extension)
            if vernacular is None:
                vernaculars = Names.objects.filter(language=language, taxon=e)
                if len(vernaculars) > 0:
                    vernacular = vernaculars[0].name
            else:
                vernacular = vernacular.lower()
            # Add the entry
            names.append({
                'taxon': e.tid,
                'vernacular': vernacular,
                'scientific': e.name,
                'type': RANKS[e.rank][language],
                'typesorting': e.rank,
                'picture': link
            })
            # Add the taxon as being added
            taxons.append(e.tid)
        return names, taxons

    # Add scientific names
    def add_scientific(names, taxons, entries):
        # Loop through provided entries
        for e in entries:
            names, taxons = add_entries(names, taxons, e)
            # Break the loop if limit is reached
            if len(names) > (limit - 1):
                break
        return names, taxons


    # Add entries until limit is reached
    def add_vernacular(names, taxons, entries):
        # Loop through provided entries
        for e in entries:
            names, taxons = add_entries(names, taxons, e.taxon, e.name)
            # Break the loop if limit is reached
            if len(names) > (limit - 1):
                break
        return names, taxons

    if value == 'grisou':
        limit -= 1

    # Get the vernacular names starting with the value in priority
    startwith = Names.objects.filter(language=language, name__unaccent__istartswith=value)[:limit]

    # Define the result dict
    names = []
    # Storage to avoid same taxon
    taxons = []

    if value == 'grisou':
        names, taxons = add_vernacular(names, taxons, Names.objects.filter(language=language, taxon__tid=3017))

    # Add entries
    names, taxons = add_vernacular(names, taxons, startwith)

    # If the length of the result is below the limit
    if len(names) < limit:
        # Get the scientific names starting with the value in priority
        scientific_startwith = Taxon.objects.filter(name__istartswith=value)[:limit]
        # Add these entries
        names, taxons = add_scientific(names, taxons, scientific_startwith)

    # If the length of the result is below the limit
    if len(names) < limit:
        # Look for entries containing the provided string
        contains = Names.objects.filter(language=language, name__unaccent__icontains=value)[:limit - len(names)]
        # Add these entries
        names, taxons = add_vernacular(names, taxons, contains)

     # If the length of the result is below the limit
    if len(names) < limit:
        # Get the scientific names containing the provided string
        scientific_contains = Taxon.objects.filter(name__unaccent__icontains=value)[:limit - len(names)]
        # Add these entries
        names, taxons = add_scientific(names, taxons, scientific_contains)

    # Map the table names to a dict ordered
    map = { v: i for i, v in enumerate(RANKS.keys()) }

    # Order the returned list of entries by their scientific names (common genus will be kept in order)
    names = sorted(names, key=lambda d: d['scientific'])
    # Order the returned list of entries by their taxonomy
    names = sorted(names, key=lambda d: map[d['typesorting']])

    return names