import pyinaturalist as inat

from explorer.api.tools.information import IUCN

def fetch_api(taxa):
    def treat_photo(t, p, default):
        height, width = p['original_dimensions']['height'], p['original_dimensions']['width']
        extension = p['url'].split('.')[-1]
        return [ p['id'], t['id'], default, p['license_code'], extension, height, width ]

    e = inat.get_taxa_by_id(taxa)
    batch = []
    for entry in e['results']:
        taxon = {
            'id': entry['id'],
            'parent': entry['parent_id'],
            'rank_level': entry['rank_level'],
            'rank': entry['rank'],
            'name': entry['name'],
            'extinct': entry['extinct'],
        }

        taxon['photo'] = []
        added = []
        default_photo = False
        if entry['default_photo'] is not None:
            if entry['default_photo']['license_code'] is not None:
                photo = treat_photo(taxon, entry['default_photo'], True)
                taxon['photo'].append(photo)
                added.append(photo[0])
                default_photo = True

        for p in entry['taxon_photos']:
            if p['photo']['license_code'] is not None:
                if p['photo']['id'] not in added:
                    if default_photo:
                        photo = treat_photo(taxon, p['photo'], False)
                    else:
                        photo = treat_photo(taxon, p['photo'], True)
                        default_photo = True
                    taxon['photo'].append(photo)
                    added.append(photo[0])

        status = None
        for key, value in entry.items():
            if key == 'conservation_statuses':
                for v in value:
                    if 'authority' in v:
                        if v['place'] is None:
                            status = v['status']

        if status == 'Extinct':
            status == 'EX'

        iucn = list(IUCN.keys())
        taxon['status'] = status if status in iucn else None
        taxon['wikipedia'] = entry['wikipedia_url']

        batch.append(taxon)

    return batch