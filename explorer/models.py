from django.contrib.gis.db import models

class Taxon(models.Model):
    tid = models.IntegerField(db_column='tid', blank=False, null=False, unique=True)
    parent = models.ForeignKey('self', models.DO_NOTHING, blank=True, null=True, related_name='children')
    level = models.FloatField(db_column='level', blank=False, null=False)
    rank = models.CharField(db_column='rank', max_length=50, blank=False, null=False)
    name = models.CharField(db_column='name', max_length=200, blank=False, null=False)
    status_world = models.CharField(db_column='iucn_world', max_length=2, blank=True, null=True)
    status_france =  models.CharField(db_column='iucn_france', max_length=2, blank=True, null=True)
    wikipedia = models.CharField(db_column='wikipedia', max_length=500, blank=True, null=True)
    default_photo = models.ForeignKey('Photo', models.DO_NOTHING, db_column='default_photo', blank=True, null=True)
    count_observation = models.IntegerField(db_column='count_observation', blank=True, null=True)
    count_species = models.IntegerField(db_column='count_species', blank=True, null=True)
    percentage_parent = models.FloatField(db_column='percentage_parent', blank=True, null=True)
    class Meta:
        managed = True
        ordering = ('tid',)
        db_table = 'explorer\".\"taxon'

class Observations(models.Model):
    oid = models.IntegerField(db_column='oid', blank=False, null=False, unique=True)
    taxon = models.ForeignKey('Taxon', models.DO_NOTHING, db_column='taxon', blank=False, null=False)
    license = models.CharField(db_column='license', max_length=50, blank=True, null=True)
    basis = models.CharField(db_column='basis', max_length=100, blank=True, null=True)
    catalog = models.BigIntegerField(db_column='catalog', unique=True)
    author = models.CharField(db_column='author', max_length=500, blank=True, null=True)
    sex = models.CharField(db_column='sex', max_length=50, blank=True, null=True)
    stage = models.CharField(db_column='stage', max_length=50, blank=True, null=True)
    condition = models.CharField(db_column='condition', max_length=100, blank=True, null=True)
    status = models.CharField(db_column='status', max_length=50, blank=True, null=True)
    date = models.DateTimeField(db_column='date', blank=True, null=True)
    lat = models.FloatField(db_column='lat', blank=True, null=True)
    lon = models.FloatField(db_column='lon', blank=True, null=True)
    uncertainty = models.FloatField(db_column='uncertainty', blank=True, null=True)
    geom = models.PointField(db_column='geom', srid=3857, null=True)
    class Meta:
        managed = True
        ordering = ('oid',)
        db_table = 'explorer\".\"observations'

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
    license = models.CharField(db_column='license', max_length=50, blank=True, null=True)
    extension = models.CharField(db_column='extension', max_length=10, blank=True, null=True)
    height = models.IntegerField(db_column='height', blank=True, null=True)
    width = models.IntegerField(db_column='width', blank=True, null=True)
    class Meta:
        managed = True
        ordering = ('pid',)
        db_table = 'explorer\".\"photo'