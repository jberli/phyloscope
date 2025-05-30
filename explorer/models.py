from django.contrib.gis.db import models

class Taxon(models.Model):
    tid = models.IntegerField(db_column='tid', blank=False, null=False, unique=True)
    parent = models.ForeignKey('self', models.DO_NOTHING, blank=True, null=True, related_name='children')
    level = models.FloatField(db_column='level', blank=False, null=False)
    rank = models.CharField(db_column='rank', max_length=50, blank=False, null=False)
    iconic = models.CharField(db_column='iconic', max_length=50, blank=True, null=True)
    name = models.CharField(db_column='name', max_length=200, blank=False, null=False)
    status = models.CharField(db_column='status', max_length=2, blank=True, null=True)
    wikipedia = models.CharField(db_column='wikipedia', max_length=500, blank=True, null=True)
    count_species = models.IntegerField(db_column='count_species', blank=True, null=True)
    percentage_parent = models.FloatField(db_column='percentage_parent', blank=True, null=True)
    range = models.MultiPolygonField(db_column='range', srid=3857, blank=True, null=True, unique=False)
    rstate = models.CharField(db_column='rstate', max_length=10, blank=False, null=False, default='init')

    # Percentage children status
    ex = models.IntegerField(db_column='ex', default=0)
    ew = models.IntegerField(db_column='ew', default=0)
    cr = models.IntegerField(db_column='cr', default=0)
    en = models.IntegerField(db_column='en', default=0)
    vu = models.IntegerField(db_column='vu', default=0)
    nt = models.IntegerField(db_column='nt', default=0)
    cd = models.IntegerField(db_column='cd', default=0)
    lc = models.IntegerField(db_column='lc', default=0)
    dd = models.IntegerField(db_column='dd', default=0)
    ne = models.IntegerField(db_column='ne', default=0)
    un = models.IntegerField(db_column='un', default=0)

    class Meta:
        managed = True
        ordering = ('tid',)
        db_table = 'explorer\".\"taxon'

class Names(models.Model):
    taxon = models.ForeignKey('Taxon', models.DO_NOTHING, db_column='taxon', blank=False, null=False, related_name='vernacular')
    name = models.CharField(db_column='name', max_length=500, blank=False, null=False)
    language = models.CharField(db_column='language', max_length=2, blank=False, null=False)
    country = models.CharField(db_column='country', max_length=50, blank=True, null=True)
    class Meta:
        managed = True
        db_table = 'explorer\".\"names'

class Photo(models.Model):
    pid = models.IntegerField(db_column='pid', blank=False, null=False, unique=False)
    taxon_id = models.ForeignKey('Taxon', models.DO_NOTHING, db_column='taxon_id', blank=True, null=True)
    default = models.BooleanField(db_column='default', default=False, null=False)
    license = models.CharField(db_column='license', max_length=50, blank=True, null=True)
    extension = models.CharField(db_column='extension', max_length=10, blank=True, null=True)
    height = models.IntegerField(db_column='height', blank=True, null=True)
    width = models.IntegerField(db_column='width', blank=True, null=True)
    class Meta:
        managed = True
        ordering = ('pid',)
        db_table = 'explorer\".\"photo'