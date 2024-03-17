from django.contrib.gis.db import models
from django.contrib.contenttypes.fields import GenericForeignKey, GenericRelation
from django.contrib.contenttypes.models import ContentType

class IUCN(models.Model):
    fr = models.CharField(db_column='fr', max_length=1000, blank=True, null=True)
    en = models.CharField(db_column='en', max_length=1000, blank=True, null=True)
    code = models.CharField(db_column='code', max_length=2, blank=True, null=True)
    class Meta:
        managed = True
        ordering = ('code',)
        db_table = 'explorer\".\"iucn'

class Vernacular(models.Model):
    taxon = models.IntegerField(db_column='taxon', blank=False, null=False, unique=False)
    name = models.CharField(db_column='name', max_length=1000, blank=False, null=False)
    language = models.CharField(db_column='language', max_length=2, blank=False, null=False)
    country = models.CharField(db_column='country', max_length=2, blank=True, null=True)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')
    class Meta:
        managed = True
        ordering = ('language', 'country', 'name',)
        db_table = 'explorer\".\"vernacular'
        indexes = [ models.Index(fields=["content_type", "object_id"]), ]
        constraints = [ models.UniqueConstraint(fields=['taxon', 'name', 'language', 'country'], name='vernacular_multiple_constraint') ]

class Taxon(models.Model):
    taxon = models.IntegerField(db_column='taxon', blank=True, null=True, unique=True)
    key = models.IntegerField(db_column='key', blank=False, null=False, unique=False)
    name = models.CharField(db_column='name', max_length=50, blank=True, null=True)
    fr = models.CharField(db_column='fr', max_length=100, blank=True, null=True)
    en = models.CharField(db_column='en', max_length=100, blank=True, null=True)
    vernacular = GenericRelation(Vernacular)
    geom = models.PolygonField(db_column='geom', srid=3857, null=True)
    class Meta:
        abstract = True

class Kingdom(Taxon):
    class Meta:
        managed = True
        ordering = ('key',)
        db_table = 'explorer\".\"kingdom'

class Phylum(Taxon):
    kingdom = models.ForeignKey(Kingdom, models.DO_NOTHING, db_column='kingdom', blank=True, null=True)
    class Meta:
        managed = True
        ordering = ('key',)
        db_table = 'explorer\".\"phylum'

class Class(Taxon):
    phylum = models.ForeignKey(Phylum, models.DO_NOTHING, db_column='phylum', blank=True, null=True)
    class Meta:
        managed = True
        ordering = ('key',)
        db_table = 'explorer\".\"class'

class Order(Taxon):
    classe = models.ForeignKey(Class, models.DO_NOTHING, db_column='class', blank=True, null=True)
    class Meta:
        managed = True
        ordering = ('key',)
        db_table = 'explorer\".\"order'

class Family(Taxon):
    order = models.ForeignKey(Order, models.DO_NOTHING, db_column='order', blank=True, null=True)
    class Meta:
        managed = True
        ordering = ('key',)
        db_table = 'explorer\".\"family'

class Genus(Taxon):
    family = models.ForeignKey(Family, models.DO_NOTHING, db_column='family', blank=True, null=True)
    class Meta:
        managed = True
        ordering = ('key',)
        db_table = 'explorer\".\"genus'

class Species(Taxon):
    scientific = models.CharField(db_column='scientific', max_length=1000, blank=True, null=True)
    generic = models.CharField(db_column='generic', max_length=500, blank=True, null=True)
    specific = models.CharField(db_column='specific', max_length=500, blank=True, null=True)
    infra = models.CharField(db_column='infra', max_length=500, blank=True, null=True)
    rank = models.CharField(db_column='rank', max_length=30, blank=True, null=True)
    status = models.CharField(db_column='status', max_length=30, blank=True, null=True)
    establishment = models.CharField(db_column='establishment', max_length=50, blank=True, null=True)
    genus = models.ForeignKey(Genus, models.DO_NOTHING, db_column='genus', blank=True, null=True)
    family = models.ForeignKey(Family, models.DO_NOTHING, db_column='family', blank=True, null=True)
    order = models.ForeignKey(Order, models.DO_NOTHING, db_column='order', blank=True, null=True)
    classe = models.ForeignKey(Class, models.DO_NOTHING, db_column='class', blank=True, null=True)
    phylum = models.ForeignKey(Phylum, models.DO_NOTHING, db_column='phylum', blank=True, null=True)
    kingdom = models.ForeignKey(Kingdom, models.DO_NOTHING, db_column='kingdom', blank=True, null=True)
    iucn = models.ForeignKey(IUCN, models.DO_NOTHING, db_column='iucn', blank=True, null=True)
    class Meta:
        managed = True
        ordering = ('key',)
        db_table = 'explorer\".\"species'

class Observations(models.Model):
    gbif = models.BigIntegerField(db_column='gbif', blank=True, null=True, unique=True)
    taxon = models.ForeignKey(Species, models.DO_NOTHING, db_column='taxon', blank=False, null=False)
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
        ordering = ('gbif',)
        db_table = 'explorer\".\"observations'

class Pictures(models.Model):
    observation = models.ForeignKey(Observations, models.DO_NOTHING, db_column='observation', blank=False, null=False)
    author = models.CharField(db_column='author', max_length=500, blank=True, null=True)
    link = models.CharField(db_column='link', max_length=500, blank=True, null=True)
    class Meta:
        managed = True
        db_table = 'explorer\".\"pictures'