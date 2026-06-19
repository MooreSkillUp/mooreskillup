from rest_framework import permissions, viewsets

from common.rbac import AdminActionsPerViewSetAction
from apps.platform.audit import record_audit

from .models import Category, Subcategory
from .serializers import CategorySerializer, SubcategorySerializer


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.filter(is_active=True).prefetch_related("subcategories")
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return Category.objects.filter(is_active=True).prefetch_related("subcategories")


class AdminCategoryViewSet(AdminActionsPerViewSetAction, viewsets.ModelViewSet):
    queryset = Category.objects.all().prefetch_related("subcategories")
    serializer_class = CategorySerializer
    admin_actions = {
        "list": ("categories:view",),
        "retrieve": ("categories:view",),
        "create": ("categories:create",),
        "update": ("categories:edit",),
        "partial_update": ("categories:edit",),
        "destroy": ("categories:delete",),
    }




    def perform_create(self, serializer):
        instance = serializer.save()
        record_audit(self.request, "category.create", resource_type="category",
                     resource_id=instance.id, resource_name=str(instance))

    def perform_update(self, serializer):
        instance = serializer.save()
        record_audit(self.request, "category.update", resource_type="category",
                     resource_id=instance.id, resource_name=str(instance))

    def perform_destroy(self, instance):
        record_audit(self.request, "category.delete", resource_type="category",
                     resource_id=instance.id, resource_name=str(instance))
        instance.delete()


class AdminSubcategoryViewSet(AdminActionsPerViewSetAction, viewsets.ModelViewSet):
    queryset = Subcategory.objects.select_related("category").all()
    serializer_class = SubcategorySerializer
    admin_actions = {
        "list": ("categories:view",),
        "retrieve": ("categories:view",),
        "create": ("categories:create",),
        "update": ("categories:edit",),
        "partial_update": ("categories:edit",),
        "destroy": ("categories:delete",),
    }

    def get_queryset(self):
        queryset = Subcategory.objects.select_related("category").all()
        category_id = self.request.query_params.get("category")
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        return queryset
