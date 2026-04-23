from rest_framework import permissions, viewsets

from common.permissions import IsAdminUserRole

from .models import Category, Subcategory
from .serializers import CategorySerializer, SubcategorySerializer


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.filter(is_active=True).prefetch_related("subcategories")
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return Category.objects.filter(is_active=True).prefetch_related("subcategories")


class AdminCategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all().prefetch_related("subcategories")
    serializer_class = CategorySerializer
    permission_classes = [IsAdminUserRole]


class AdminSubcategoryViewSet(viewsets.ModelViewSet):
    queryset = Subcategory.objects.select_related("category").all()
    serializer_class = SubcategorySerializer
    permission_classes = [IsAdminUserRole]

    def get_queryset(self):
        queryset = Subcategory.objects.select_related("category").all()
        category_id = self.request.query_params.get("category")
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        return queryset
