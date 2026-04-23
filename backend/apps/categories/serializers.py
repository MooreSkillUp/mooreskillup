from rest_framework import serializers

from .models import Category, Subcategory


class SubcategorySerializer(serializers.ModelSerializer):
    categoryId = serializers.UUIDField(source="category_id", read_only=True)

    class Meta:
        model = Subcategory
        fields = (
            "id",
            "category",
            "categoryId",
            "name",
            "slug",
            "description",
            "is_active",
            "created_at",
            "updated_at",
        )
        extra_kwargs = {
            "category": {"write_only": True},
        }


class CategorySerializer(serializers.ModelSerializer):
    subcategories = SubcategorySerializer(many=True, read_only=True)
    program = serializers.CharField(source="name", read_only=True)

    class Meta:
        model = Category
        fields = (
            "id",
            "name",
            "program",
            "slug",
            "description",
            "is_active",
            "subcategories",
            "created_at",
            "updated_at",
        )
