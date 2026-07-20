from django.db import models
from django.utils.text import slugify

from common.models import TimeStampedModel, UUIDPrimaryKeyModel


class Category(UUIDPrimaryKeyModel, TimeStampedModel):
    name = models.CharField(max_length=150, unique=True)
    slug = models.SlugField(max_length=180, unique=True, blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    # Community link shown to students on this track (WhatsApp/Discord group, etc.).
    community_url = models.URLField(blank=True)
    community_label = models.CharField(max_length=60, blank=True)
    banner_theme = models.CharField(max_length=40, default="default", blank=True)
    accent_color = models.CharField(max_length=20, default="#FC6104", blank=True)
    # Lower numbers appear first in browse and admin lists.
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ("display_order", "name")

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Subcategory(UUIDPrimaryKeyModel, TimeStampedModel):
    category = models.ForeignKey("categories.Category", on_delete=models.CASCADE, related_name="subcategories")
    name = models.CharField(max_length=150)
    slug = models.SlugField(max_length=180, blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("category", "name")

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(f"{self.category.name}-{self.name}")
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name
