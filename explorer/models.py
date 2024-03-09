from django.contrib.gis.db import models

class Kingdom(models.Model):
    name = models.CharField(max_length=50, blank=True, null=True)
    class Meta:
        managed = True
        db_table = 'explorer\".\"kingdom'

class Phylum(models.Model):
    name = models.CharField(max_length=50, blank=True, null=True)
    kingdom = models.ForeignKey('Kingdom', models.DO_NOTHING, db_column='kingdom', blank=True, null=True)
    class Meta:
        managed = True
        db_table = 'explorer\".\"phylum'

class Class(models.Model):
    name = models.CharField(max_length=50, blank=True, null=True)
    phylum = models.ForeignKey('Phylum', models.DO_NOTHING, db_column='phylum', blank=True, null=True)
    class Meta:
        managed = True
        db_table = 'explorer\".\"class'

class Order(models.Model):
    name = models.CharField(max_length=50, blank=True, null=True)
    classe = models.ForeignKey('Class', models.DO_NOTHING, db_column='classe', blank=True, null=True)
    class Meta:
        managed = True
        db_table = 'explorer\".\"order'

class Family(models.Model):
    name = models.CharField(max_length=50, blank=True, null=True)
    order = models.ForeignKey('Order', models.DO_NOTHING, db_column='order', blank=True, null=True)
    class Meta:
        managed = True
        db_table = 'explorer\".\"family'

class Genus(models.Model):
    name = models.CharField(max_length=50, blank=True, null=True)
    family = models.ForeignKey('Family', models.DO_NOTHING, db_column='family', blank=True, null=True)
    geom = models.PolygonField(srid=3857, null=True)
    class Meta:
        managed = True
        db_table = 'explorer\".\"genus'

class Species(models.Model):
    name = models.CharField(max_length=50, blank=True, null=True)
    genus = models.ForeignKey('Genus', models.DO_NOTHING, db_column='genus', blank=True, null=True)
    geom = models.PolygonField(srid=3857, null=True)
    class Meta:
        managed = True
        db_table = 'explorer\".\"species'